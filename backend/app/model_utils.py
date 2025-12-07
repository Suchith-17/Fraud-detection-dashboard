# app/model_utils.py

"""

Robust model utilities for the fraud project.

- Loads model & pipeline from app/artifacts/*.joblib

- Exposes predict_single, batch_predict, explain_single

- Builds SHAP explainer (tries booster/tree explainer first; falls back to KernelExplainer)

"""


import joblib
import traceback
from pathlib import Path
import numpy as np
import shap
import time

# relative imports (works when run as app.* package)
from .data_gen import create_dataset


BASE = Path(__file__).resolve().parent
ART_DIR = BASE / "artifacts"
MODEL_PATH = ART_DIR / "model.joblib"
PIPE_PATH = ART_DIR / "pipeline.joblib"

_model = None
_pipeline = None
_explainer = None
_explainer_built_at = None


def load_artifacts():
    """Load model and pipeline into module-level variables."""
    global _model, _pipeline, _explainer, _explainer_built_at

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model artifact missing: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)

    if _pipeline is None:
        if not PIPE_PATH.exists():
            raise FileNotFoundError(f"Pipeline artifact missing: {PIPE_PATH}")
        _pipeline = joblib.load(PIPE_PATH)

    # Try to lazily initialize explainer (but don't fail startup if it fails)
    if _explainer is None:
        try:
            # prefer native booster when available
            try:
                booster = _model.get_booster()
            except Exception:
                booster = None

            if booster is not None:
                # try TreeExplainer on booster (may fail for some saved formats)
                _explainer = shap.TreeExplainer(booster)
                _explainer_built_at = time.time()
            else:
                # fallback to wrapper
                _explainer = shap.TreeExplainer(_model)
                _explainer_built_at = time.time()
        except Exception:
            # leave _explainer = None and fallback to KernelExplainer later
            _explainer = None


def _ensure_loaded():
    if _model is None or _pipeline is None:
        load_artifacts()


# -----------------------
# Prediction helpers
# -----------------------
def predict_single(tx: dict) -> float:
    """
    Predict fraud probability for a single transaction dict.
    Returns float probability for class 1.
    """
    _ensure_loaded()
    import pandas as pd

    df = pd.DataFrame([tx])
    X = _pipeline.transform(df)
    prob = _model.predict_proba(X)[:, 1][0]
    return float(prob)


def batch_predict(txs: list) -> list:
    """
    Predict probabilities for a list of transaction dicts.
    Returns list of floats.
    """
    _ensure_loaded()
    import pandas as pd

    df = pd.DataFrame(txs)
    X = _pipeline.transform(df)
    probs = _model.predict_proba(X)[:, 1]
    return [float(p) for p in probs]


# -----------------------
# Explainability
# -----------------------
def explain_single(tx: dict, top_k: int = 6):
    """
    Return a dict with either {'explanations': [ {feature, shap_value, value}, ... ] }
    or {'error': 'message'} on failure.

    The function:
     - preprocesses the tx via pipeline.transform
     - tries TreeExplainer (fast)
     - if TreeExplainer not available/failed, uses KernelExplainer (slower but robust)
    """
    _ensure_loaded()
    import pandas as pd

    try:
        # prepare data
        df = pd.DataFrame([tx])
        X = _pipeline.transform(df)

        # Try using prebuilt _explainer or build on-the-fly
        if _explainer is not None:
            try:
                shap_values = _explainer.shap_values(X)
            except Exception:
                # if explainer present but fails, clear it and fallback
                try:
                    # attempt booster-based on the fly
                    booster = None
                    try:
                        booster = _model.get_booster()
                    except Exception:
                        booster = None
                    if booster is not None:
                        local_expl = shap.TreeExplainer(booster)
                    else:
                        local_expl = shap.TreeExplainer(_model)
                    shap_values = local_expl.shap_values(X)
                except Exception:
                    shap_values = None
        else:
            shap_values = None

        # If shap_values still None -> fallback to KernelExplainer
        if shap_values is None:
            try:
                # create a small background dataset using create_dataset
                bg_df = create_dataset(n_users=40, tx_per_user=3)  # ~120 rows
                # Ensure columns align: transform the background with pipeline
                bg_X = _pipeline.transform(bg_df)

                # Make sure background for KernelExplainer is a plain array (not a masker)
                if hasattr(bg_X, "values"):
                    bg_arr = np.asarray(bg_X.values)
                else:
                    bg_arr = np.asarray(bg_X)

                # function for kernel explainer expects transformed input
                def predict_for_ke(z):
                    # z is transformed array (n_samples, n_features_transformed)
                    return _model.predict_proba(z)[:, 1]

                # choose a small background subset for speed and stability
                if bg_arr.ndim == 2 and bg_arr.shape[0] > 50:
                    bg_for_ke = bg_arr[:50]
                else:
                    bg_for_ke = bg_arr

                # IMPORTANT: pass a plain array/dataframe to KernelExplainer,
                # not a shap.maskers.* object (older code used maskers incorrectly).
                ke = shap.KernelExplainer(predict_for_ke, bg_for_ke)
                # nsamples small for speed; increase if you want better accuracy
                shap_values = ke.shap_values(X, nsamples=100)
            except Exception as e:
                return {"error": f"Failed to compute explanations (fallback): {str(e)}"}

        # normalize shap_values to numpy array
        if isinstance(shap_values, list):
            # binary classification, shap may return list per class -> choose class 1 if present
            if len(shap_values) >= 2:
                arr = np.array(shap_values[1])
            else:
                arr = np.array(shap_values[0])
        else:
            arr = np.array(shap_values)

        # If arr is (n_samples, n_features) pick first row
        if arr.ndim == 2:
            shap_arr = arr[0]
        else:
            shap_arr = arr

        # Try to get feature names from pipeline (best-effort)
        feature_names = None
        try:
            # ColumnTransformer / pipeline support
            if hasattr(_pipeline, "get_feature_names_out"):
                feature_names = list(_pipeline.get_feature_names_out())
        except Exception:
            feature_names = None

        if not feature_names:
            # fallback: use numeric indices
            feature_names = [f"f_{i}" for i in range(len(shap_arr))]

        # Build value mapping (best-effort: transform df and map)
        try:
            transformed = X
            # if transformed is numpy array, no per-feature raw values; we will set value=None
            values = [None] * len(feature_names)
        except Exception:
            values = [None] * len(feature_names)

        # --- Insert helper to attach human-friendly raw_value mappings ---
        try:
            tx_simple = {k: v for k, v in df.iloc[0].to_dict().items()}

            def human_value_for_feat(fname):
                # examples: 'num__amount' -> 'amount' (numeric)
                #           'cat__country_NG' -> ('country', 'NG') lookup tx_simple['country'] == 'NG' -> 'NG'
                try:
                    if fname.startswith("num__"):
                        key = fname.split("num__")[-1]
                        return tx_simple.get(key, None)
                    if fname.startswith("cat__"):
                        # form: cat__{col}_{value}
                        rest = fname.split("cat__")[-1]
                        # split at last underscore to allow category names with underscores (rare)
                        parts = rest.rsplit("_", 1)
                        if len(parts) == 2:
                            col, val = parts
                            # If original tx has that column, return actual value or boolean
                            if col in tx_simple:
                                return tx_simple.get(col)
                            return val
                    # common sklearn get_feature_names_out outputs like 'country_NG' without prefix
                    # try to handle patterns like 'country_NG' or 'device_mobile'
                    if "_" in fname:
                        parts = fname.rsplit("_", 1)
                        col = parts[0]
                        val = parts[1]
                        if col in tx_simple:
                            return tx_simple.get(col)
                        return val
                    return tx_simple.get(fname, None)
                except Exception:
                    return None

            raw_values = [human_value_for_feat(fn) for fn in feature_names]
        except Exception:
            raw_values = [None] * len(feature_names)

        # Pair up names and shap values
        pairs = []
        L = min(len(feature_names), len(shap_arr))
        for i in range(L):
            pairs.append({
                "feature": feature_names[i],
                "shap_value": float(shap_arr[i]),
                "value": values[i],
                "raw_value": raw_values[i] if i < len(raw_values) else None,
            })

        # sort by absolute contribution
        pairs = sorted(pairs, key=lambda z: abs(z["shap_value"]), reverse=True)[:top_k]
        return {"explanations": pairs}

    except Exception as e:
        traceback.print_exc()
        return {"error": f"Unexpected explain error: {str(e)}"}

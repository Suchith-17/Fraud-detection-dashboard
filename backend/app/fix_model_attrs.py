import joblib
import shap
import numpy as np
from pathlib import Path
from .data_gen import create_dataset   # IMPORTANT FIX
import json
import traceback

BASE_DIR = Path(__file__).resolve().parent
ART_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ART_DIR / "model.joblib"
PIPE_PATH = ART_DIR / "pipeline.joblib"


# ============================================================
# GLOBALS
# ============================================================
_model = None
_pipeline = None
_explainer = None


# ============================================================
# LOAD ARTIFACTS
# ============================================================
def load_artifacts():
    global _model, _pipeline, _explainer

    if _model is not None and _pipeline is not None:
        return

    print("Loading model and pipeline...")
    _model = joblib.load(MODEL_PATH)
    _pipeline = joblib.load(PIPE_PATH)

    # Try booster-based TreeExplainer first
    try:
        try:
            booster = _model.get_booster()
        except Exception:
            booster = None

        if booster is not None:
            try:
                _explainer = shap.TreeExplainer(booster)
                print("SHAP TreeExplainer (booster) OK")
            except Exception:
                print("TreeExplainer(booster) failed. Falling back.")
                _explainer = None
        else:
            # try wrapper
            try:
                _explainer = shap.TreeExplainer(_model)
                print("SHAP TreeExplainer (wrapper) OK")
            except Exception:
                print("TreeExplainer(wrapper) failed.")
                _explainer = None

    except Exception:
        print("SHAP initialization fully failed. Using fallback later.")
        _explainer = None


# ============================================================
# PREDICT SINGLE
# ============================================================
def predict_single(tx: dict) -> float:
    load_artifacts()
    df = _pipeline.preprocess_single(tx)
    prob = _model.predict_proba(df)[0][1]
    return float(prob)


# ============================================================
# BATCH PREDICT
# ============================================================
def batch_predict(txs: list):
    load_artifacts()
    df = _pipeline.preprocess_many(txs)
    probs = _model.predict_proba(df)[:, 1]
    return [float(p) for p in probs]


# ============================================================
# EXPLAIN SINGLE — Includes SHAP Fallback
# ============================================================
def explain_single(tx: dict, top_k: int = 6):
    """
    Returns:
    {
        "explanations": [
            { "feature": "...", "shap_value": ..., "value": ... },
            ...
        ]
    }
    or:
    { "error": "message" }
    """
    load_artifacts()

    try:
        # preprocess one row
        df = _pipeline.preprocess_single(tx)
        x = df.iloc[[0]]

        # ----------------------------------------------------------
        # If TreeExplainer available, use it
        # ----------------------------------------------------------
        if _explainer is not None:
            print("Using TreeExplainer...")
            shap_vals = _explainer.shap_values(x)
            if isinstance(shap_vals, list):  # sometimes list for multiclass
                shap_vals = shap_vals[0]

        else:
            # ------------------------------------------------------
            # FALLBACK: KernelExplainer (slow but works always)
            # ------------------------------------------------------
            print("Using fallback KernelExplainer...")

            # Build background from auto-generated synthetic dataset
            bg_df = create_dataset(200)
            bg_X = _pipeline.preprocess_many(bg_df)

            def f_predict(arr):
                return _model.predict_proba(arr)[:, 1]

            explainer = shap.KernelExplainer(f_predict, bg_X[:50])
            shap_vals = explainer.shap_values(x)

        # ----------------------------------------------------------
        # Format output
        # ----------------------------------------------------------
        shap_vals = shap_vals.flatten().tolist()
        feature_names = list(x.columns)
        row = x.iloc[0].to_dict()

        pairs = []
        for fname, sval in zip(feature_names, shap_vals):
            pairs.append({
                "feature": fname,
                "shap_value": float(sval),
                "value": row.get(fname)
            })

        # Sort by absolute importance
        pairs = sorted(pairs, key=lambda z: abs(z["shap_value"]), reverse=True)
        pairs = pairs[:top_k]

        return {"explanations": pairs}

    except Exception as e:
        print("EXPLAIN ERROR:", e)
        traceback.print_exc()
        return {"error": f"Failed to compute explanations: {e}"}

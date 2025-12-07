# app/debug_shap_booster.py
import joblib
import shap
import traceback
import sys

print("python:", sys.version.splitlines()[0])
print("shap version:", getattr(shap, "__version__", "unknown"))

try:
    m = joblib.load('app/artifacts/model.joblib')
    print("loaded model:", type(m))
except Exception:
    print("failed loading model:")
    traceback.print_exc()
    raise SystemExit(1)

try:
    booster = m.get_booster()
    print("got booster:", type(booster))
except Exception:
    print("failed getting booster:")
    traceback.print_exc()
    booster = None

if booster is not None:
    try:
        expl = shap.TreeExplainer(booster)
        print("explainer ok (booster):", type(expl))
    except Exception:
        print("explainer failed for booster:")
        traceback.print_exc()
else:
    print("no booster available; cannot build explainer from booster")

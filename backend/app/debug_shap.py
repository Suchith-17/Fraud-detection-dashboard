# app/debug_shap.py
import joblib
import shap
import traceback
import sys
import platform

print("python:", sys.version.splitlines()[0])
print("platform:", platform.platform())
print("shap version:", getattr(shap, "__version__", "unknown"))

try:
    m = joblib.load('app/artifacts/model.joblib')
    print("model loaded:", type(m))
except Exception:
    print("failed loading model:")
    traceback.print_exc()
    raise SystemExit(1)

try:
    expl = shap.TreeExplainer(m)
    print("explainer ok:", type(expl))
except Exception:
    print("explainer failed:")
    traceback.print_exc()

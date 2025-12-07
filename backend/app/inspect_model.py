
# app/inspect_model.py
import joblib, json, traceback
from pathlib import Path

MODEL_PATH = Path('app/artifacts/model.joblib')
print("MODEL_PATH:", MODEL_PATH)
m = joblib.load(MODEL_PATH)
print("Model type:", type(m))

try:
    params = m.get_xgb_params()
    print("get_xgb_params():")
    print(json.dumps(params, indent=2))
except Exception:
    print("Failed to get_xgb_params():")
    traceback.print_exc()

try:
    booster = m.get_booster()
    print("\nBooster attributes (booster.attributes()):")
    attrs = booster.attributes()
    print(attrs)
    # try to show raw config head (may be large)
    try:
        raw = booster.save_raw()
        # print only beginning to avoid huge output
        print("\nbooster.save_raw() head (first 1000 bytes):")
        print(raw[:1000])
    except Exception as e:
        print("Could not save_raw():", e)
except Exception:
    print("Failed to inspect booster:")
    traceback.print_exc()

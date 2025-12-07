# explain_transform_debug.py  (place in backend/, NOT in app/)
import joblib, json, traceback
from pathlib import Path

PIPE = Path("app/artifacts/pipeline.joblib")
print("Loading pipeline from:", PIPE.resolve())

pipe = joblib.load(PIPE)
print("pipeline.feature_names_in_:", getattr(pipe, "feature_names_in_", None))
print("pipeline.get_feature_names_out() (first 30):", list(pipe.get_feature_names_out())[:30])

# sample transaction copied from the client logs (adjusted)
tx = {
  "user_id": 37,
  "amount": 1.0,
  "country": "NG",
  "device": "tablet",
  "merchant": "travel",
  "time_of_day": 7.383333333333334,
  "is_high_risk_country": 1,
  "avg_user_amount": 5.35,
  "label": 1,
  "amount_to_avg_ratio": 0.1869158529129247,
  "random_feat1": 0.010131184027743378,
  "hour": 7
}

print("\nAttempting to transform sample tx dict with pipeline.transform() ...")
try:
    import pandas as pd
    df = pd.DataFrame([tx])
    print("Input DF columns:", list(df.columns))
    X = pipe.transform(df)   # <-- this is where the real error will show
    print("Transform succeeded. Transformed shape:", getattr(X, "shape", None))
except Exception as e:
    print("EXCEPTION during transform:")
    traceback.print_exc()
    print("\nException str():", str(e))

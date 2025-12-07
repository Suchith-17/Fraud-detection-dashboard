# inspect_pipeline.py
import joblib, json, traceback
from pathlib import Path

p = Path("app/artifacts/pipeline.joblib")
print("PIPELINE PATH:", p.resolve())
try:
    pipe = joblib.load(p)
except Exception as e:
    print("FAILED to load pipeline:", e)
    raise SystemExit(1)

print("Pipeline type:", type(pipe))

# Try common attributes in order of usefulness
try:
    print("\n=== pipeline.get_feature_names_out() ===")
    try:
        print(list(pipe.get_feature_names_out()))
    except Exception as e:
        print("  get_feature_names_out() not available:", e)
except Exception:
    traceback.print_exc()

try:
    print("\n=== pipeline.feature_names_in_ ===")
    print(getattr(pipe, "feature_names_in_", None))
except Exception:
    traceback.print_exc()

# If it's an sklearn Pipeline, inspect steps
try:
    from sklearn.pipeline import Pipeline
    if isinstance(pipe, Pipeline):
        print("\nPipeline.named_steps:")
        for name, step in pipe.named_steps.items():
            print(" -", name, "->", type(step))
            try:
                print("   - step.feature_names_in_:", getattr(step, "feature_names_in_", None))
            except Exception as e:
                print("   - feature_names_in_ not available:", e)
            try:
                print("   - step.get_feature_names_out() (first 20):", list(step.get_feature_names_out())[:20])
            except Exception as e:
                print("   - get_feature_names_out() not available:", e)
except Exception:
    traceback.print_exc()

# If it's a ColumnTransformer, show transformer details
try:
    from sklearn.compose import ColumnTransformer
    if isinstance(pipe, ColumnTransformer):
        print("\nColumnTransformer transformers_:")
        print(pipe.transformers_)
except Exception:
    pass

print("\nDone.")

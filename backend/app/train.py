"""Train pipeline: preprocessing + XGBoost model.
Saves artifacts to app/artifacts/
"""
import os
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib
from data_gen import create_dataset

ROOT = Path(__file__).resolve().parent
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)

def train_and_save(n_users=1000, tx_per_user=30, random_state=42):
    print('Generating synthetic data...')
    df = create_dataset(n_users=n_users, tx_per_user=tx_per_user, seed=random_state)
    target = 'label'
    X = df.drop(columns=[target])
    y = df[target]

    # choose features
    numeric_features = ['amount', 'avg_user_amount', 'amount_to_avg_ratio', 'time_of_day', 'random_feat1', 'hour']
    categorical_features = ['country', 'device', 'merchant']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ]
    )

    pipeline = Pipeline(steps=[('pre', preprocessor)])

    X_trans = pipeline.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_trans, y, test_size=0.2, random_state=random_state, stratify=y)

    # XGBoost classifier
    print('Training XGBoost...')
    model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss', n_jobs=4)
    model.fit(X_train, y_train)

    preds = model.predict_proba(X_test)[:,1]
    pred_labels = (preds > 0.5).astype(int)

    print('ROC-AUC:', roc_auc_score(y_test, preds))
    print(classification_report(y_test, pred_labels))

    # save artifacts
    joblib.dump(model, ARTIFACTS / 'model.joblib')
    joblib.dump(pipeline, ARTIFACTS / 'pipeline.joblib')
    print(f'Artifacts saved to {ARTIFACTS}')

if __name__ == '__main__':
    train_and_save(n_users=1200, tx_per_user=40)

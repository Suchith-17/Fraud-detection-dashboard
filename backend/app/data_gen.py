"""Synthetic transaction generator for training and demo."""
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

COUNTRIES = ['IN', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NG', 'BR']
MERCHANT_CATEGORIES = ['electronics', 'grocery', 'fashion', 'travel', 'gaming', 'utilities']
DEVICE_TYPES = ['mobile', 'desktop', 'tablet']

def generate_user_profile(user_id):
    # returns historical average amount and fraud propensity
    avg_amount = max(5, np.random.exponential(50))
    fraud_propensity = np.random.beta(0.5, 20)  # most users low
    return {'user_id': user_id, 'avg_amount': avg_amount, 'fraud_propensity': fraud_propensity}

def simulate_transaction(user_profile, tx_time):
    amount = np.clip(np.random.normal(user_profile['avg_amount'], user_profile['avg_amount'] * 0.8), 1, 2000)
    country = random.choices(COUNTRIES, weights=[30,20,10,8,6,5,5,8,8])[0]
    device = random.choice(DEVICE_TYPES)
    merchant = random.choice(MERCHANT_CATEGORIES)
    # features
    time_of_day = tx_time.hour + tx_time.minute/60.0
    is_high_risk_country = 1 if country in ('NG','BR') else 0
    # base fraud chance influenced by user profile and odd behaviors
    base_fraud = user_profile['fraud_propensity']
    if amount > user_profile['avg_amount'] * 8:
        base_fraud += 0.35
    if is_high_risk_country:
        base_fraud += 0.15
    if device == 'desktop' and amount < 5:
        base_fraud += 0.05
    # merchant patterns
    if merchant == 'gaming' and amount > 100:
        base_fraud += 0.05

    fraud = np.random.rand() < base_fraud
    return {
        'user_id': user_profile['user_id'],
        'amount': round(float(amount),2),
        'country': country,
        'device': device,
        'merchant': merchant,
        'time_of_day': time_of_day,
        'is_high_risk_country': is_high_risk_country,
        'avg_user_amount': round(user_profile['avg_amount'],2),
        'label': int(fraud)
    }

def create_dataset(n_users=2000, tx_per_user=30, seed=42):
    random.seed(seed)
    np.random.seed(seed)
    users = [generate_user_profile(i) for i in range(n_users)]
    rows = []
    for u in users:
        # create a last tx time
        t0 = datetime.utcnow() - timedelta(days=30)
        for i in range(tx_per_user):
            t = t0 + timedelta(minutes=int(np.random.exponential(60*24)))
            rows.append(simulate_transaction(u, t))
    df = pd.DataFrame(rows)
    # simple derived features
    df['amount_to_avg_ratio'] = df['amount'] / (df['avg_user_amount'] + 1e-6)
    # random noise features
    df['random_feat1'] = np.random.rand(len(df))
    df['hour'] = (df['time_of_day'].astype(float)).astype(int)
    return df

if __name__ == '__main__':
    df = create_dataset(500, 40)
    print(df.head())
    df.to_csv('synthetic_transactions.csv', index=False)

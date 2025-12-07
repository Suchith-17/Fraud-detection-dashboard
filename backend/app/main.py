# app/main.py
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import random
from collections import Counter, defaultdict

# New Authentication and DB Imports
from .model_utils import predict_single, batch_predict, explain_single
from .data_gen import create_dataset
from .auth import create_access_token, verify_password, get_current_user, get_password_hash, oauth2_scheme, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES # Added ALGORITHM and ACCESS_TOKEN_EXPIRE_MINUTES imports for completeness if used
from .db import get_db
from .models import User

from sqlalchemy.orm import Session

app = FastAPI(title='Fraud Detection API (auth enabled)')

# Allow local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Simple in-memory recent transactions store (demo)
RECENT_TX = []

class Transaction(BaseModel):
    user_id: int
    amount: float
    country: str
    device: str
    merchant: str
    time_of_day: float # Feature is no longer used in the second version's Pydantic model, but kept for compatibility
    avg_user_amount: float
    random_feat1: float
    hour: int

class BatchRequest(BaseModel):
    transactions: List[Transaction]

class ExplainRequest(BaseModel):
    transaction: Transaction
    top_k: int = 6

@app.get('/health')
def health():
    return {'status': 'ok'}

# --- AUTHENTICATION ENDPOINT ---

@app.post("/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 token endpoint.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # Create the access token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- PROTECTED ENDPOINTS ---

@app.post('/predict')
def predict(tx: Transaction, current_user: User = Depends(get_current_user)):
    """
    Predict fraud score for a single transaction. Requires authentication.
    """
    j = tx.dict()
    # Note: predict_single returns {'score': float, 'label': int} in the original code,
    # but the second version assigned only the score, so we revert to the original behavior
    # to be safe, but check and adjust the storing logic based on the second version's structure.
    res = predict_single(j)
    
    # store for demo (using original logic for safer transaction storage)
    RECENT_TX.insert(0, {'tx': j, 'score': res.get('score', 0.0), 'label': res.get('label', 0)})
    if len(RECENT_TX) > 200:
        RECENT_TX.pop()
        
    return res # Returns {'score': float, 'label': int}

@app.post('/batch_predict')
def batch_predict_endpoint(req: BatchRequest, current_user: User = Depends(get_current_user)):
    """
    Predict fraud scores for a batch of transactions. Requires authentication.
    """
    txs = [t.dict() for t in req.transactions]
    res = batch_predict(txs)
    
    # Storing logic combined from both versions to handle different return structures
    # assuming batch_predict returns a list of scores or results.
    for t,r in zip(txs,res):
        score = r.get('score', r) if isinstance(r, dict) else r
        label = r.get('label', int(t.get('label',0))) if isinstance(r, dict) else int(t.get('label',0))
        RECENT_TX.insert(0, {'tx': t, 'score': score, 'label': label})

    RECENT_TX[:] = RECENT_TX[:200]
    return {'results': res}

@app.post('/explain')
def explain(req: ExplainRequest, current_user: User = Depends(get_current_user)):
    """
    Get SHAP explanations for a transaction. Requires authentication.
    """
    res = explain_single(req.transaction.dict(), top_k=req.top_k)
    return res

@app.post('/simulate')
def simulate(n_users: int = 100, tx_per_user: int = 5, current_user: User = Depends(get_current_user)):
    """
    Generates new transactions and adds them to the recent store. Requires authentication.
    """
    df = create_dataset(n_users=n_users, tx_per_user=tx_per_user)
    
    # pick some rows and insert into RECENT_TX (using logic from original simulate)
    for _, row in df.sample(min(100,len(df))).iterrows():
        j = row.to_dict()
        # Ensure numerical features are correctly typed
        j['random_feat1'] = float(j.get('random_feat1', 0.0))
        j['avg_user_amount'] = float(j.get('avg_user_amount', j.get('avg_user_amount', 0.0)))
        RECENT_TX.insert(0, {'tx': j, 'score': 0.0, 'label': int(j.get('label',0))})
        
    # keep store bounded (using logic from original simulate)
    RECENT_TX[:] = RECENT_TX[:2000]
    
    return {'inserted': min(100, len(df))}

# --- UNPROTECTED DATA ENDPOINTS (Restoring Original Logic) ---

@app.get('/transactions')
def recent_transactions(
    # Note: These parameters were missing from your second prompt version but are restored here
    # to maintain functionality for the frontend Dashboard's filtering/pagination/sorting.
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: Optional[int] = Query(None),
    merchant: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None), 
    sort_order: Optional[str] = Query("desc") 
):
    """
    Returns a slice of RECENT_TX with optional simple filtering and sorting.
    This endpoint remains UNPROTECTED for easier demo access to the data list.
    """
    items = RECENT_TX[:]  # copy

    # Filtering
    if user_id is not None:
        items = [i for i in items if i['tx'].get('user_id') == user_id]
    if merchant:
        items = [i for i in items if str(i['tx'].get('merchant','')).lower() == merchant.lower()]

    # Sorting: only support a small safe set
    if sort_by:
        key_map = {
            "score": lambda x: x.get('score', 0),
            "amount": lambda x: x.get('tx', {}).get('amount', 0),
            "hour": lambda x: x.get('tx', {}).get('hour', 0),
        }
        keyfn = key_map.get(sort_by)
        if keyfn:
            reverse = (sort_order != "asc")
            items.sort(key=keyfn, reverse=reverse)

    # Pagination (offset + limit)
    slice_items = items[offset: offset + limit]
    return {'transactions': slice_items, 'total': len(items), 'offset': offset, 'limit': limit}

@app.get('/transactions/summary')
def transactions_summary():
    """
    Returns summarized data (fraud counts, top merchants) for charting.
    This endpoint remains UNPROTECTED for easier demo access to the charts.
    """
    total = len(RECENT_TX)
    fraud_count = sum(1 for i in RECENT_TX if int(i.get('label', 0)) == 1)
    nonfraud_count = total - fraud_count

    # top merchants among frauds
    fraud_merchants = [i['tx'].get('merchant') for i in RECENT_TX if int(i.get('label',0)) == 1 and i['tx'].get('merchant')]
    merch_counts = Counter(fraud_merchants)
    top5 = [{'merchant': m, 'count': c} for m,c in merch_counts.most_common(5)]

    # frauds per hour
    counts_by_hour = defaultdict(int)
    for i in RECENT_TX:
        if int(i.get('label',0)) == 1:
            hr = i['tx'].get('hour')
            try:
                counts_by_hour[int(hr)] += 1
            except Exception:
                pass
    frauds_per_hour = [{'hour': h, 'count': counts_by_hour.get(h,0)} for h in range(24)]

    return {
        'fraud_vs_nonfraud': {'fraud': fraud_count, 'nonfraud': nonfraud_count},
        'top_5_fraud_merchants': top5,
        'frauds_per_hour': frauds_per_hour,
        'total_transactions': total
    }


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
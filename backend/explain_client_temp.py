# explain_client_temp.py (place in backend/, NOT in app/)
import urllib.request as req
import json
import sys

def get(url):
    with req.urlopen(url) as r:
        return json.load(r)

def post(url, data):
    b = json.dumps(data).encode('utf-8')
    request = req.Request(url, data=b, headers={'Content-Type':'application/json'})
    with req.urlopen(request) as r:
        return json.load(r)

try:
    txs = get('http://127.0.0.1:8000/transactions?limit=5')
    print("=== /transactions (first item) ===")
    print(json.dumps(txs['transactions'][0], indent=2))
    tx = txs['transactions'][0]['tx']
    body = {'transaction': tx, 'top_k': 6}
    print("\\nPosting to /explain ... (this may take a few seconds)")
    res = post('http://127.0.0.1:8000/explain', body)
    print("\\n=== /explain response ===")
    print(json.dumps(res, indent=2))
except Exception as e:
    print("ERROR:", e)
    sys.exit(1)

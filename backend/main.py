from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sys
import os
import requests
import hashlib
from pymongo import MongoClient

# Add scripts directory to path to import local modules
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

from stockdata import get_stock_data, get_multiple_stocks, get_stock_data_range
from googlefin import get_bitcoin_price

app = FastAPI(title="GenAI Trading Dashboard API")

# MongoDB Setup
try:
    mongo_client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    db = mongo_client["trading_dashboard"]
    users_collection = db["users"]
    # Optional: trigger a fast connection check
    # mongo_client.admin.command('ping')
except Exception as e:
    print(f"Warning: Could not connect to MongoDB: {e}")
    users_collection = None

# Configure CORS to accept requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthParams(BaseModel):
    username: str
    password: Optional[str] = None

@app.post("/api/auth")
def auth_user(params: AuthParams):
    if users_collection is None:
        return {"success": False, "message": "Database not connected"}
    
    username = params.username.strip()
    password = params.password.strip() if params.password else ""
    
    # Simple hash for minimalistic secure storage
    hashed_password = hashlib.sha256(password.encode()).hexdigest() if password else ""
    
    user = users_collection.find_one({"username": username})
    
    if user:
        # User exists, verify password
        if user.get("password") == "":
            return {"success": True, "message": "Logged in successfully", "username": username}
        
        if not password and user.get("password") != "":
            return {"success": False, "message": "Password required"}
            
        if user.get("password") == hashed_password:
            return {"success": True, "message": "Logged in successfully", "username": username}
        else:
            return {"success": False, "message": "Invalid password"}
    else:
        # User doesn't exist, create
        new_user = {
            "username": username,
            "password": hashed_password
        }
        users_collection.insert_one(new_user)
        return {"success": True, "message": "Account created and logged in", "username": username}

@app.get("/api/health")
def health_check():
    return {"message": "FastAPI backend server is running"}

@app.get("/api/googlefin")
def get_google_finance():
    return get_bitcoin_price()

class GoogleFinParams(BaseModel):
    symbol: Optional[str] = None
    period: Optional[str] = None

@app.post("/api/googlefin")
def post_google_finance(params: GoogleFinParams):
    return get_bitcoin_price()

@app.get("/api/stock")
def get_stock(symbol: str = "AAPL", period: str = "6mo"):
    return get_stock_data(symbol, period)

@app.get("/api/stocks/multi")
def get_multi_stocks():
    return get_multiple_stocks()

@app.get("/api/stock/range")
def get_stock_range(
    symbol: str = "AAPL",
    start: str = None,
    end: str = None
):
    return get_stock_data_range(symbol, start, end)

@app.get("/api/search")
def search_stocks(q: str):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        url = (
            f"https://query2.finance.yahoo.com/v1/finance/search"
            f"?q={q}&quotesCount=20&newsCount=0"
            f"&enableFuzzyQuery=true&enableEnhancedTrivialQuery=true"
        )
        response = requests.get(url, headers=headers)
        data = response.json()

        # Filter to US equities and ETFs only
        US_EXCHANGES = {"NMS", "NYQ", "ASE", "PNK", "NYM", "NCM", "NGS", "OEM", "OQS"}
        VALID_QUOTE_TYPES = {"EQUITY", "ETF"}

        filtered = []
        for quote in data.get("quotes", []):
            quote_type = quote.get("quoteType", "")
            exchange = quote.get("exchange", "")
            # Accept if it's an equity or ETF on a US exchange
            if quote_type in VALID_QUOTE_TYPES and exchange in US_EXCHANGES:
                filtered.append({
                    "symbol": quote.get("symbol", ""),
                    "shortname": quote.get("shortname", quote.get("longname", "")),
                    "longname": quote.get("longname", ""),
                    "exchange": exchange,
                    "exchDisp": quote.get("exchDisp", ""),
                    "quoteType": quote_type,
                    "typeDisp": quote.get("typeDisp", ""),
                })

        return {"success": True, "quotes": filtered[:10]}
    except Exception as e:
        return {"success": False, "error": str(e), "quotes": []}

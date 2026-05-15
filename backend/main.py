from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import pathlib
import sys
import os
import requests
import hashlib
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file at project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Add scripts directory to path to import local modules
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

from stockdata import get_stock_data, get_multiple_stocks, get_stock_data_range
from googlefin import get_bitcoin_price
from chart_analyzer import analyze_chart
from backtest import run_backtest
from alpaca_config import get_paper_dashboard, submit_paper_order, get_volume_profile

app = FastAPI(title="GenAI Trading Dashboard API")

# MongoDB Setup
try:
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
    mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
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

class OHLCVItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    price: float
    volume: int

class AnalyzeChartParams(BaseModel):
    symbol: str
    company_name: str = "Unknown"
    sector: str = "Unknown"
    data: List[OHLCVItem]

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

@app.post("/api/analyze")
def analyze_chart_endpoint(params: AnalyzeChartParams):
    """Send visible chart OHLCV data to an LLM for technical analysis."""
    data_dicts = [item.model_dump() for item in params.data]
    result = analyze_chart(
        symbol=params.symbol,
        company_name=params.company_name,
        sector=params.sector,
        data=data_dicts,
    )
    return result


class BacktestRule(BaseModel):
    indicator: str
    condition: str
    value: str
    action: str

class BacktestParams(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = 10_000.0
    rules: List[BacktestRule]

class PaperOrderParams(BaseModel):
    symbol: str
    qty: float
    side: str
    order_type: str = "market"
    time_in_force: str = "day"

@app.post("/api/backtest")
def run_backtest_endpoint(params: BacktestParams):
    """Fetch OHLCV for the given symbol/range and run the rule-based backtest engine."""
    ohlcv = get_stock_data_range(params.symbol, params.start_date, params.end_date)
    if not ohlcv.get("success"):
        return {"success": False, "error": ohlcv.get("error", "Failed to fetch stock data")}
    if not ohlcv.get("historical"):
        return {"success": False, "error": f"No data found for {params.symbol} in the given date range."}

    rules_dicts = [r.model_dump() for r in params.rules]
    return run_backtest(ohlcv["historical"], rules_dicts, params.initial_capital)

@app.get("/api/alpaca/paper")
def get_alpaca_paper_dashboard():
    return get_paper_dashboard()

@app.post("/api/alpaca/paper/order")
def create_alpaca_paper_order(params: PaperOrderParams):
    return submit_paper_order(
        symbol=params.symbol,
        qty=params.qty,
        side=params.side,
        order_type=params.order_type,
        time_in_force=params.time_in_force,
    )

@app.get("/api/alpaca/volume-profile")
def get_alpaca_volume_profile(
    symbol: str,
    start: str = None,
    end: str = None,
    feed: str = "iex",
    bins: int = 24,
):
    return get_volume_profile(symbol=symbol, start=start, end=end, feed=feed, bins=bins)


# ---------------------------------------------------------------------------
# Serve the Vite-built frontend in production (only when dist/ exists)
# ---------------------------------------------------------------------------
_BACKEND_DIR = pathlib.Path(__file__).resolve().parent
_DIST_DIR = _BACKEND_DIR.parent / "dist"

if _DIST_DIR.is_dir():
    # Serve hashed asset files (JS, CSS, images) under /assets
    _ASSETS_DIR = _DIST_DIR / "assets"
    if _ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ASSETS_DIR)), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all: serve static files or fall back to index.html for SPA routing."""
        file_path = _DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_DIST_DIR / "index.html"))

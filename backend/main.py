from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Add scripts directory to path to import local modules
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

from stockdata import get_stock_data, get_multiple_stocks
from googlefin import get_bitcoin_price

app = FastAPI(title="GenAI Trading Dashboard API")

# Configure CORS to accept requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

import yfinance as yf
import json
import sys
from datetime import datetime, timedelta

def get_stock_data(symbol="AAPL", period="6mo"):
    """
    Fetch real-time stock data with comprehensive information
    """
    try:
        # Get stock data
        ticker = yf.Ticker(symbol)
        
        # Get historical price data
        hist = ticker.history(period=period)
        
        if hist.empty:
            return json.dumps({"error": f"No data found for symbol: {symbol}"})
        
        # Format historical data
        price_data = []
        for date, row in hist.iterrows():
            price_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(row["Close"], 2),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "volume": int(row["Volume"])
            })
        
        # Get real-time info
        info = ticker.info
        
        # Get current day's data
        current_price = info.get("currentPrice", info.get("regularMarketPrice", price_data[-1]["price"]))
        previous_close = info.get("previousClose", price_data[-2]["price"] if len(price_data) > 1 else current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close else 0
        
        # Company info
        company_info = {
            "symbol": symbol.upper(),
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", "N/A"),
            "52_week_high": info.get("fiftyTwoWeekHigh", 0),
            "52_week_low": info.get("fiftyTwoWeekLow", 0),
            "avg_volume": info.get("averageVolume", 0)
        }
        
        # Real-time stats
        real_time_stats = {
            "current_price": round(current_price, 2),
            "previous_close": round(previous_close, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "day_high": info.get("regularMarketDayHigh", price_data[-1]["high"]),
            "day_low": info.get("regularMarketDayLow", price_data[-1]["low"]),
            "volume": info.get("volume", price_data[-1]["volume"]),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        result = {
            "success": True,
            "company": company_info,
            "real_time": real_time_stats,
            "historical": price_data,
            "period": period,
            "data_points": len(price_data)
        }
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "symbol": symbol
        }

def get_multiple_stocks(symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]):
    """
    Fetch data for multiple stocks (summary only)
    """
    results = []
    
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            current_price = info.get("currentPrice", info.get("regularMarketPrice", 0))
            previous_close = info.get("previousClose", 0)
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100 if previous_close else 0
            
            results.append({
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "volume": info.get("volume", 0)
            })
        except Exception as e:
            results.append({
                "symbol": symbol,
                "error": str(e)
            })
    
    return {"stocks": results, "count": len(results)}

def get_stock_data_range(symbol="AAPL", start=None, end=None):
    """
    Fetch stock OHLCV data for a specific date range.
    Used for dynamic chart loading when the user scrolls/zooms.
    Returns only historical price data (no company info or real-time stats).
    """
    try:
        ticker = yf.Ticker(symbol)

        kwargs = {"interval": "1d"}
        if start:
            kwargs["start"] = start
        if end:
            kwargs["end"] = end

        hist = ticker.history(**kwargs)

        if hist.empty:
            return {
                "success": True,
                "historical": [],
                "symbol": symbol.upper(),
                "data_points": 0
            }

        price_data = []
        for date, row in hist.iterrows():
            price_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(row["Close"], 2),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "volume": int(row["Volume"])
            })

        return {
            "success": True,
            "historical": price_data,
            "symbol": symbol.upper(),
            "data_points": len(price_data)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "symbol": symbol
        }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch stock data")
    parser.add_argument("--symbol", default="AAPL", help="Stock symbol (e.g., AAPL, TSLA)")
    parser.add_argument("--period", default="6mo", help="Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)")
    parser.add_argument("--multi", action="store_true", help="Get multiple stocks summary")
    
    args = parser.parse_args()
    
    if args.multi:
        result = get_multiple_stocks()
    else:
        result = get_stock_data(args.symbol, args.period)
    
    print(result)

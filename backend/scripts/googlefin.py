import requests
import json
import sys

COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price"

def get_bitcoin_price():
    try:
        params = {
            "ids": "bitcoin",
            "vs_currencies": "usd",
            "include_24hr_change": "true"
        }
        
        response = requests.get(COINGECKO_API, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if "bitcoin" in data:
            price = data["bitcoin"]["usd"]
            change_24h = data["bitcoin"].get("usd_24h_change", 0)
            
            return {
                "price": f"${price:,.2f}",
                "price_raw": price,
                "change_24h": f"{change_24h:+.2f}%",
                "change_24h_raw": change_24h,
                "source": "CoinGecko"
            }
        else:
            return {"error": "Bitcoin data not found in response"}
            
    except requests.exceptions.RequestException as e:
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = get_bitcoin_price()
    print(result)

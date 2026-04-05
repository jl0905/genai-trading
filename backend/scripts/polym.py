from fastapi import FastAPI
import requests

app = FastAPI()

@app.get("/markets")
def get_polymarket_data():
    # Fetching the top 10 active markets by volume
    url = "https://gamma-api.polymarket.com/events"
    params = {
        "closed": "false",
        "limit": 10,
        "order": "volume24hr",
        "ascending": "false"
    }
    response = requests.get(url, params=params)
    return response.json()
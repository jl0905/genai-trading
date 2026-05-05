"""
Alpaca integration for paper trading and market-data powered indicators.

Replace the XXX values below with your Alpaca Trading API keys. Keep this file
private if you add real credentials.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import requests


ALPACA_API_KEY = "PKMTLI6NINGFYYOQHNOGUFH52Y"
ALPACA_SECRET_KEY = "sN7v4HqT3r868VP1SBywUwNnfzLGK346LeoTGWgyZkQ"

ALPACA_PAPER_BASE_URL = "https://paper-api.alpaca.markets"
ALPACA_DATA_BASE_URL = "https://data.alpaca.markets"
ALPACA_DEFAULT_FEED = "iex"


def _is_configured() -> bool:
    return (
        bool(ALPACA_API_KEY)
        and bool(ALPACA_SECRET_KEY)
        and ALPACA_API_KEY != "XXX"
        and ALPACA_SECRET_KEY != "XXX"
    )


def _headers() -> dict[str, str]:
    return {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    if not _is_configured():
        return {
            "success": False,
            "configured": False,
            "error": "Add your Alpaca API key and secret in backend/scripts/alpaca_config.py.",
        }

    try:
        response = requests.request(method, url, headers=_headers(), timeout=20, **kwargs)
        if response.status_code >= 400:
            try:
                details = response.json()
            except ValueError:
                details = response.text
            return {
                "success": False,
                "configured": True,
                "status_code": response.status_code,
                "error": details,
            }
        return {"success": True, "configured": True, "data": response.json()}
    except Exception as exc:
        return {"success": False, "configured": True, "error": str(exc)}


def get_paper_account() -> dict[str, Any]:
    return _request("GET", f"{ALPACA_PAPER_BASE_URL}/v2/account")


def get_paper_positions() -> dict[str, Any]:
    return _request("GET", f"{ALPACA_PAPER_BASE_URL}/v2/positions")


def get_paper_orders(status: str = "open", limit: int = 50) -> dict[str, Any]:
    params = {"status": status, "limit": max(1, min(int(limit), 100)), "direction": "desc"}
    return _request("GET", f"{ALPACA_PAPER_BASE_URL}/v2/orders", params=params)


def submit_paper_order(
    symbol: str,
    qty: float,
    side: str,
    order_type: str = "market",
    time_in_force: str = "day",
) -> dict[str, Any]:
    payload = {
        "symbol": symbol.upper().strip(),
        "qty": str(qty),
        "side": side.lower().strip(),
        "type": order_type.lower().strip(),
        "time_in_force": time_in_force.lower().strip(),
    }
    return _request("POST", f"{ALPACA_PAPER_BASE_URL}/v2/orders", json=payload)


def get_paper_dashboard() -> dict[str, Any]:
    account = get_paper_account()
    positions = get_paper_positions()
    orders = get_paper_orders("all", 20)

    return {
        "success": account.get("success") and positions.get("success") and orders.get("success"),
        "configured": account.get("configured", False),
        "account": account.get("data"),
        "positions": positions.get("data", []),
        "orders": orders.get("data", []),
        "errors": {
            "account": account.get("error"),
            "positions": positions.get("error"),
            "orders": orders.get("error"),
        },
    }


def _parse_iso(value: str | None, fallback: datetime) -> datetime:
    if not value:
        return fallback
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.fromisoformat(f"{value}T00:00:00+00:00")


def _iso_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _build_bins(low: float, high: float, count: int) -> list[dict[str, float]]:
    price_range = high - low
    if price_range <= 0:
        price_range = max(high * 0.01, 0.01)
        low -= price_range / 2
    bin_size = price_range / count
    return [
        {"low": low + index * bin_size, "high": low + (index + 1) * bin_size, "volume": 0.0}
        for index in range(count)
    ]


def _add_volume_to_bins(bins: list[dict[str, float]], price: float, volume: float) -> None:
    if not bins or volume <= 0:
        return
    first_low = bins[0]["low"]
    last_high = bins[-1]["high"]
    if last_high <= first_low:
        bins[0]["volume"] += volume
        return
    index = int((price - first_low) / ((last_high - first_low) / len(bins)))
    index = max(0, min(len(bins) - 1, index))
    bins[index]["volume"] += volume


def _volume_profile_from_trades(symbol: str, start_iso: str, end_iso: str, feed: str, bins: int) -> dict[str, Any]:
    trades: list[dict[str, Any]] = []
    next_page_token = None

    for _ in range(8):
        params = {
            "start": start_iso,
            "end": end_iso,
            "limit": 10000,
            "feed": feed,
        }
        if next_page_token:
            params["page_token"] = next_page_token

        result = _request(
            "GET",
            f"{ALPACA_DATA_BASE_URL}/v2/stocks/{symbol.upper()}/trades",
            params=params,
        )
        if not result.get("success"):
            return result

        data = result.get("data", {})
        trades.extend(data.get("trades", []))
        next_page_token = data.get("next_page_token")
        if not next_page_token:
            break

    prices = [float(trade.get("p", 0)) for trade in trades if trade.get("p") is not None]
    if not prices:
        return {"success": True, "data": None}

    profile_bins = _build_bins(min(prices), max(prices), bins)
    for trade in trades:
        _add_volume_to_bins(profile_bins, float(trade.get("p", 0)), float(trade.get("s", 0)))

    return {
        "success": True,
        "data": {
            "symbol": symbol.upper(),
            "source": f"alpaca_trades_{feed}",
            "bars": profile_bins,
            "trade_count": len(trades),
        },
    }


def _volume_profile_from_minute_bars(symbol: str, start_iso: str, end_iso: str, feed: str, bins: int) -> dict[str, Any]:
    params = {
        "start": start_iso,
        "end": end_iso,
        "timeframe": "1Min",
        "limit": 10000,
        "feed": feed,
    }
    result = _request("GET", f"{ALPACA_DATA_BASE_URL}/v2/stocks/{symbol.upper()}/bars", params=params)
    if not result.get("success"):
        return result

    bars_data = result.get("data", {}).get("bars", [])
    if not bars_data:
        return {
            "success": True,
            "data": {"symbol": symbol.upper(), "source": f"alpaca_1min_bars_{feed}", "bars": []},
        }

    lows = [float(bar.get("l", 0)) for bar in bars_data]
    highs = [float(bar.get("h", 0)) for bar in bars_data]
    profile_bins = _build_bins(min(lows), max(highs), bins)

    for bar in bars_data:
        low = float(bar.get("l", 0))
        high = float(bar.get("h", low))
        volume = float(bar.get("v", 0))
        typical_price = (high + low + float(bar.get("c", low))) / 3
        _add_volume_to_bins(profile_bins, typical_price, volume)

    return {
        "success": True,
        "data": {
            "symbol": symbol.upper(),
            "source": f"alpaca_1min_bars_{feed}",
            "bars": profile_bins,
            "bar_count": len(bars_data),
        },
    }


def get_volume_profile(
    symbol: str,
    start: str | None = None,
    end: str | None = None,
    feed: str = ALPACA_DEFAULT_FEED,
    bins: int = 24,
) -> dict[str, Any]:
    end_dt = _parse_iso(end, datetime.now(timezone.utc))
    start_dt = _parse_iso(start, end_dt - timedelta(days=5))
    bin_count = max(8, min(int(bins), 80))
    feed_name = (feed or ALPACA_DEFAULT_FEED).lower()
    start_iso = _iso_utc(start_dt)
    end_iso = _iso_utc(end_dt)

    trade_profile = _volume_profile_from_trades(symbol, start_iso, end_iso, feed_name, bin_count)
    if trade_profile.get("success") and trade_profile.get("data"):
        trade_profile["data"]["start"] = start_iso
        trade_profile["data"]["end"] = end_iso
        return trade_profile

    bar_profile = _volume_profile_from_minute_bars(symbol, start_iso, end_iso, feed_name, bin_count)
    if bar_profile.get("success") and bar_profile.get("data"):
        bar_profile["data"]["start"] = start_iso
        bar_profile["data"]["end"] = end_iso
        bar_profile["data"]["trade_error"] = trade_profile.get("error")
    return bar_profile

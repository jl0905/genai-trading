"""
chart_analyzer.py
-----------------
Sends a snapshot of visible OHLCV data to the Google Gemini API and returns
a natural-language technical analysis of the price action.
"""

import os
import json
import requests
from statistics import mean, stdev


def _compute_metrics(data: list[dict]) -> dict:
    """Derive summary statistics from raw OHLCV rows."""
    closes = [d["price"] for d in data]
    opens  = [d["open"]  for d in data]
    highs  = [d["high"]  for d in data]
    lows   = [d["low"]   for d in data]
    volumes = [d["volume"] for d in data]

    start_price = closes[0]
    end_price   = closes[-1]
    pct_change  = ((end_price - start_price) / start_price) * 100

    return {
        "start_date":   data[0]["date"],
        "end_date":     data[-1]["date"],
        "trading_days": len(data),
        "start_price":  round(start_price, 2),
        "end_price":    round(end_price, 2),
        "pct_change":   round(pct_change, 2),
        "period_high":  round(max(highs), 2),
        "period_low":   round(min(lows), 2),
        "avg_close":    round(mean(closes), 2),
        "volatility":   round(stdev(closes), 2) if len(closes) > 1 else 0,
        "avg_volume":   int(mean(volumes)),
        "max_volume":   max(volumes),
        "min_volume":   min(volumes),
    }


def _build_prompt(symbol: str, company_name: str, sector: str,
                  metrics: dict, data: list[dict]) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for the LLM."""

    system_prompt = (
        "You are an expert financial technical analyst. The user will give you "
        "a snapshot of OHLCV candlestick data for a stock. Provide a clear, "
        "detailed analysis that covers:\n"
        "1. Overall trend direction and strength\n"
        "2. Key support and resistance levels observed in the data\n"
        "3. Notable candlestick patterns (e.g. doji, engulfing, hammer)\n"
        "4. Volume analysis — any spikes or divergences\n"
        "5. Possible catalysts or market context if the company/sector is well-known\n"
        "6. A brief forward-looking outlook based solely on the technical picture\n\n"
        "Write in a professional but accessible tone. Use bullet points and "
        "short paragraphs. Do NOT provide financial advice or specific buy/sell "
        "recommendations — frame everything as observational analysis."
    )

    # Build a compact text representation of the OHLCV rows
    ohlcv_lines = []
    for d in data:
        ohlcv_lines.append(
            f"{d['date']}  O:{d['open']}  H:{d['high']}  L:{d['low']}  "
            f"C:{d['price']}  V:{d['volume']}"
        )
    ohlcv_text = "\n".join(ohlcv_lines)

    user_prompt = (
        f"**Stock:** {symbol} — {company_name}\n"
        f"**Sector:** {sector}\n"
        f"**Visible window:** {metrics['start_date']} → {metrics['end_date']} "
        f"({metrics['trading_days']} trading days)\n\n"
        f"**Summary metrics:**\n"
        f"- Start price: ${metrics['start_price']}  →  End price: ${metrics['end_price']}  "
        f"({'+' if metrics['pct_change'] >= 0 else ''}{metrics['pct_change']}%)\n"
        f"- Period high: ${metrics['period_high']}  |  Period low: ${metrics['period_low']}\n"
        f"- Avg close: ${metrics['avg_close']}  |  Volatility (σ): ${metrics['volatility']}\n"
        f"- Avg volume: {metrics['avg_volume']:,}  |  Max volume: {metrics['max_volume']:,}\n\n"
        f"**Daily OHLCV data:**\n```\n{ohlcv_text}\n```\n\n"
        f"Please analyse this chart snapshot."
    )

    return system_prompt, user_prompt


def analyze_chart(symbol: str, company_name: str, sector: str,
                  data: list[dict]) -> dict:
    """
    Main entry point.  Accepts visible OHLCV rows and returns an AI analysis.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return {
            "success": False,
            "error": "OPENROUTER_API_KEY is not set. Please add it to your .env file.",
        }

    if not data or len(data) < 2:
        return {
            "success": False,
            "error": "Not enough data points to analyse. Zoom in to at least 2 bars.",
        }

    metrics = _compute_metrics(data)
    system_prompt, user_prompt = _build_prompt(
        symbol, company_name, sector, metrics, data
    )

    # --- Call OpenRouter REST API ---
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "tencent/hy3-preview:free",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        body = resp.json()

        # Extract generated text from OpenRouter response
        choices = body.get("choices", [])
        if not choices:
            return {"success": False, "error": "No response from OpenRouter API."}

        text = choices[0].get("message", {}).get("content", "").strip()

        return {
            "success": True,
            "analysis": text,
            "metrics": metrics,
        }

    except requests.exceptions.Timeout:
        return {"success": False, "error": "OpenRouter API request timed out."}
    except requests.exceptions.HTTPError as e:
        error_detail = ""
        try:
            error_detail = e.response.json().get("error", {}).get("message", str(e))
        except Exception:
            error_detail = str(e)
        return {"success": False, "error": f"OpenRouter API error: {error_detail}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

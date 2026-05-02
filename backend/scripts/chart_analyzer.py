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
        "- Overall trend direction and strength\n"
        "- Key support and resistance levels observed in the data\n"
        #"3. Notable candlestick patterns (e.g. doji, engulfing, hammer)\n"
        "- Volume analysis — any spikes or divergences\n"
        "- Possible catalysts or market context if the company/sector is well-known\n"
        "- A brief forward-looking outlook based solely on the technical picture\n\n"
        "Write in a professional but accessible tone. Use bullet points and "
        "short paragraphs. Do NOT provide financial advice or specific buy/sell "
        "recommendations — frame everything as observational analysis."
    )

    # Build a compact text representation of the OHLCV rows (last 30 days for snappiness)
    ohlcv_lines = []
    for d in data[-30:]:
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
        f"**Summary metrics (for full visible window):**\n"
        f"- Start price: ${metrics['start_price']}  →  End price: ${metrics['end_price']}  "
        f"({'+' if metrics['pct_change'] >= 0 else ''}{metrics['pct_change']}%)\n"
        f"- Period high: ${metrics['period_high']}  |  Period low: ${metrics['period_low']}\n"
        f"- Avg close: ${metrics['avg_close']}  |  Volatility (σ): ${metrics['volatility']}\n"
        f"- Avg volume: {metrics['avg_volume']:,}  |  Max volume: {metrics['max_volume']:,}\n\n"
        f"**Daily OHLCV data (last {len(data[-30:])} days):**\n```\n{ohlcv_text}\n```\n\n"
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
    try:
        from openai import OpenAI
        import openai
    except ImportError:
        return {"success": False, "error": "The 'openai' python package is not installed. Please run 'pip install openai'."}

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

        response = client.chat.completions.create(
            model="tencent/hy3-preview:free",
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ],
            temperature=0.7,
            extra_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "GenAI Trading Dashboard"
            },
            extra_body={"reasoning": {"enabled": True}}
        )

        if not response.choices:
            return {"success": False, "error": "No response from OpenRouter API."}

        message = response.choices[0].message
        content = message.content
        
        if not content:
            if hasattr(message, 'refusal') and message.refusal:
                return {"success": False, "error": f"Model refused: {message.refusal}"}
            return {"success": False, "error": "Model returned an empty response."}

        # Add reasoning output if the model provided it
        text = content.strip()
        reasoning_text = None
        
        # Depending on how the openai SDK maps OpenRouter's extra fields
        if hasattr(message, 'reasoning_details'):
            reasoning_text = message.reasoning_details
        elif hasattr(message, 'reasoning'):
            reasoning_text = message.reasoning
        elif hasattr(message, 'model_extra') and message.model_extra:
            reasoning_text = message.model_extra.get('reasoning')

        return {
            "success": True,
            "analysis": text,
            "metrics": metrics,
            "reasoning": reasoning_text,
        }

    except openai.APIConnectionError as e:
        return {"success": False, "error": "Failed to connect to OpenRouter API."}
    except openai.RateLimitError as e:
        return {"success": False, "error": "OpenRouter API rate limit exceeded."}
    except openai.APIError as e:
        return {"success": False, "error": f"OpenRouter API error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

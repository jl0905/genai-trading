"""
chart_analyzer.py
-----------------
Sends a snapshot of visible OHLCV data to the Google Gemini API and returns
a natural-language technical analysis of the price action.
"""

import os
from statistics import mean, stdev
from google import genai
from google.genai import errors as genai_errors

# Alias that always points at the current Flash model — avoids the
# "model no longer available to new users" retirement errors.
GEMINI_MODEL = "gemini-flash-latest"


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

    system_prompt = """You are an expert financial technical analyst. The user will give you a snapshot of OHLCV candlestick data for a stock. Provide a brief analysis that covers:

- possible catalysts or market context for why the price is moving the way it is (Label this section 'MARKET CONTEXT')

- Overall trend direction and strength (Label this section 'PRICE TREND')

- A brief forward-looking outlook based solely on the technical picture (Label this section 'OUTLOOK')

Write in a professional but accessible tone. Use bullet points and short paragraphs.

Here is an example of the formatting you should use:

MARKET CONTEXT
Apple recently reported a "standout" Q2 2026 earnings beat, with EPS of $2.01 (up 22% year-over-year) and revenue of $111.2 billion.  

Record March quarter revenue for iPhone was driven by high demand for the iPhone 17 lineup, alongside successful launches of the M4 iPad Air and the new MacBook Neo.  

The market is reacting to the news of Tim Cook stepping down as CEO. While such news often creates uncertainty, the strong financial performance and the appointment of Greg Abel to key leadership roles (supported by Berkshire Hathaway's recent commentary) have maintained investor confidence.

Investors are closely watching component costs, specifically a global memory shortage that could slightly compress future margins.  

PRICE TREND
The trend is strongly bullish in the short-to-medium term.  

Following the earnings gap up on May 1st, the stock reached prices near $280.14.  

The stock recently broke out of a "rectangle formation" (sideways consolidation) above resistance at $269. The Relative Strength Index (RSI) is rising, confirming momentum, though some analysts warn it is approaching "overbought" territory after a 15% gain in April.  

OUTLOOK
With the $269 resistance now acting as support, the technical setup points toward a primary target of $308 in the coming months.  

Immediate downside protection is found at $271 (recent close) and $257.

While the chart looks favorable, the stock is trading at a P/E of approximately 33.8x, which is a premium compared to its historical average. A failure to hold above $270 could trigger a "retest" of the $250 level before further upside."""

    # Build a compact text representation of the OHLCV rows for the visible window
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
        f"**Summary metrics (for full visible window):**\n"
        f"- Start price: ${metrics['start_price']}  →  End price: ${metrics['end_price']}  "
        f"({'+' if metrics['pct_change'] >= 0 else ''}{metrics['pct_change']}%)\n"
        f"- Period high: ${metrics['period_high']}  |  Period low: ${metrics['period_low']}\n"
        f"- Avg close: ${metrics['avg_close']}  |  Volatility (σ): ${metrics['volatility']}\n"
        f"- Avg volume: {metrics['avg_volume']:,}  |  Max volume: {metrics['max_volume']:,}\n\n"
        f"**Daily OHLCV data ({len(data)} days in visible window):**\n```\n{ohlcv_text}\n```\n\n"
        f"Please analyse this chart snapshot."
    )

    return system_prompt, user_prompt


def analyze_chart(symbol: str, company_name: str, sector: str,
                  data: list[dict]) -> dict:
    """
    Main entry point.  Accepts visible OHLCV rows and returns an AI analysis.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "success": False,
            "error": "GEMINI_API_KEY is not set. Please add it to your .env file.",
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

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            ),
        )

        content = response.text
        if not content:
            return {"success": False, "error": "Model returned an empty response."}

        return {
            "success": True,
            "analysis": content.strip(),
            "metrics": metrics,
            "reasoning": None,
        }

    except genai_errors.ClientError as e:
        if e.code == 429:
            return {"success": False, "error": "Gemini API rate limit exceeded — free tier quota used up. Try again later."}
        return {"success": False, "error": f"Gemini API error: {e.message or str(e)}"}
    except genai_errors.ServerError as e:
        return {"success": False, "error": f"Gemini API is currently unavailable: {e.message or str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

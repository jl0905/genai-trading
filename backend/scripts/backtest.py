"""
backtest.py
-----------
Pure-Python backtesting engine for the Strategy Builder.

Supported indicators (value field):
    SMA 20, SMA 50, SMA 200, EMA 20, RSI 14, MACD, Price

Supported conditions:
    Crosses Above, Crosses Below, Is Greater Than, Is Less Than, Equals

Supported actions:
    Buy, Sell, Close Position, Do Nothing
"""

from __future__ import annotations
from typing import Any


# ---------------------------------------------------------------------------
# Indicator computation helpers
# ---------------------------------------------------------------------------

def _sma(closes: list[float], period: int) -> list[float | None]:
    result: list[float | None] = [None] * len(closes)
    for i in range(period - 1, len(closes)):
        result[i] = sum(closes[i - period + 1 : i + 1]) / period
    return result


def _ema(closes: list[float], period: int) -> list[float | None]:
    result: list[float | None] = [None] * len(closes)
    if len(closes) < period:
        return result
    k = 2.0 / (period + 1)
    # Seed with SMA of the first `period` bars
    seed = sum(closes[:period]) / period
    result[period - 1] = seed
    for i in range(period, len(closes)):
        result[i] = closes[i] * k + result[i - 1] * (1 - k)
    return result


def _rsi(closes: list[float], period: int = 14) -> list[float | None]:
    result: list[float | None] = [None] * len(closes)
    if len(closes) < period + 1:
        return result

    gains, losses = [], []
    for i in range(1, period + 1):
        delta = closes[i] - closes[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    for i in range(period, len(closes)):
        if i > period:
            delta = closes[i] - closes[i - 1]
            avg_gain = (avg_gain * (period - 1) + max(delta, 0.0)) / period
            avg_loss = (avg_loss * (period - 1) + max(-delta, 0.0)) / period

        if avg_loss == 0:
            result[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            result[i] = 100.0 - (100.0 / (1 + rs))

    return result


def _macd_line(closes: list[float]) -> list[float | None]:
    """Returns the MACD line (EMA12 - EMA26)."""
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    result: list[float | None] = []
    for e12, e26 in zip(ema12, ema26):
        if e12 is None or e26 is None:
            result.append(None)
        else:
            result.append(e12 - e26)
    return result


def _macd_signal(closes: list[float]) -> list[float | None]:
    """Returns the MACD Signal line (EMA 9 of the MACD line)."""
    macd = _macd_line(closes)
    # Extract only non-None values, compute EMA 9, then map back
    signal: list[float | None] = [None] * len(macd)
    period = 9
    # Find the first valid MACD index
    valid_indices = [i for i, v in enumerate(macd) if v is not None]
    if len(valid_indices) < period:
        return signal
    # Seed with SMA of first `period` valid MACD values
    seed_indices = valid_indices[:period]
    seed = sum(macd[i] for i in seed_indices) / period
    k = 2.0 / (period + 1)
    signal[seed_indices[-1]] = seed
    ema_val = seed
    for j in range(period, len(valid_indices)):
        idx = valid_indices[j]
        ema_val = macd[idx] * k + ema_val * (1 - k)
        signal[idx] = ema_val
    return signal


def _bollinger_bands(closes: list[float], period: int = 20, num_std: float = 2.0
                     ) -> tuple[list[float | None], list[float | None]]:
    """Returns (upper_band, lower_band) Bollinger Bands."""
    sma = _sma(closes, period)
    upper: list[float | None] = [None] * len(closes)
    lower: list[float | None] = [None] * len(closes)
    for i in range(period - 1, len(closes)):
        window = closes[i - period + 1 : i + 1]
        mean = sma[i]
        variance = sum((x - mean) ** 2 for x in window) / period
        std = variance ** 0.5
        upper[i] = mean + num_std * std
        lower[i] = mean - num_std * std
    return upper, lower


def _build_indicator_series(closes: list[float]) -> dict[str, list[float | None]]:
    bb_upper, bb_lower = _bollinger_bands(closes, 20, 2.0)
    return {
        "SMA 20":       _sma(closes, 20),
        "SMA 50":       _sma(closes, 50),
        "SMA 200":      _sma(closes, 200),
        "EMA 20":       _ema(closes, 20),
        "RSI 14":       _rsi(closes, 14),
        "MACD":         _macd_line(closes),
        "MACD Signal":  _macd_signal(closes),
        "BB Upper":     bb_upper,
        "BB Lower":     bb_lower,
        "Price":        [float(c) for c in closes],   # always available
    }


# ---------------------------------------------------------------------------
# Value resolver — converts the rule's "value" string to a float at bar i
# ---------------------------------------------------------------------------

def _resolve_value(value_str: str, series: dict[str, list], bar_idx: int) -> float | None:
    """
    If `value_str` matches a known indicator key, return its value at `bar_idx`.
    Otherwise try to parse it as a plain float literal.
    """
    stripped = value_str.strip()
    if stripped in series:
        return series[stripped][bar_idx]
    try:
        return float(stripped)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Condition evaluation
# ---------------------------------------------------------------------------

def _evaluate_condition(
    condition: str,
    left_curr: float | None,
    left_prev: float | None,
    right_curr: float | None,
    right_prev: float | None,
) -> bool:
    if left_curr is None or right_curr is None:
        return False

    if condition == "Is Greater Than":
        return left_curr > right_curr
    if condition == "Is Less Than":
        return left_curr < right_curr
    if condition == "Equals":
        return abs(left_curr - right_curr) < 1e-9

    # Cross conditions need the previous bar
    if left_prev is None or right_prev is None:
        return False
    if condition == "Crosses Above":
        return left_prev <= right_prev and left_curr > right_curr
    if condition == "Crosses Below":
        return left_prev >= right_prev and left_curr < right_curr

    return False


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

def run_backtest(
    data: list[dict[str, Any]],
    rules: list[dict[str, str]],
    initial_capital: float = 10_000.0,
) -> dict[str, Any]:
    """
    Parameters
    ----------
    data : list of OHLCV dicts  {date, open, high, low, price, volume}
    rules : list of rule dicts  {indicator, condition, value, action}
    initial_capital : starting cash in USD

    Returns
    -------
    dict with keys: success, metrics, equity_curve, trades
    """
    if not data or len(data) < 2:
        return {"success": False, "error": "Not enough data to run a backtest (need at least 2 bars)."}

    # Use the actual closing price for indicator computation and trade execution
    closes = [float(d["price"]) for d in data]
    dates  = [d["date"] for d in data]

    series = _build_indicator_series(closes)

    # ---- Validate: enough data for the indicators referenced in rules ----
    INDICATOR_MIN_BARS = {
        "SMA 20": 20, "SMA 50": 50, "SMA 200": 200,
        "EMA 20": 20, "RSI 14": 15, "MACD": 26,
        "MACD Signal": 35, "BB Upper": 20, "BB Lower": 20,
        "Price": 1,
    }
    for rule in rules:
        for key in ("indicator", "value"):
            name = rule.get(key, "")
            min_bars = INDICATOR_MIN_BARS.get(name)
            if min_bars and len(data) < min_bars:
                return {
                    "success": False,
                    "error": (
                        f"Not enough data for {name} — it needs at least "
                        f"{min_bars} bars, but only {len(data)} bars were "
                        f"returned for this date range. Try widening the "
                        f"start/end dates."
                    ),
                }

    # ---- Simulation state ----
    cash: float   = initial_capital
    shares: float = 0.0
    in_position   = False
    entry_price   = 0.0
    entry_date    = ""

    equity_curve: list[dict] = []
    trades: list[dict]       = []

    def current_equity(idx: int) -> float:
        return cash + shares * closes[idx]

    peak_equity = initial_capital
    max_drawdown = 0.0

    for i, (date, close) in enumerate(zip(dates, closes)):
        # Evaluate each rule in priority order
        for rule in rules:
            indicator = rule.get("indicator", "Price")
            condition = rule.get("condition", "")
            value_str = rule.get("value", "")
            action    = rule.get("action", "Do Nothing")

            if action == "Do Nothing":
                continue

            left_curr  = series.get(indicator, [None] * len(closes))[i]
            left_prev  = series.get(indicator, [None] * len(closes))[i - 1] if i > 0 else None
            right_curr = _resolve_value(value_str, series, i)
            right_prev = _resolve_value(value_str, series, i - 1) if i > 0 else None

            fired = _evaluate_condition(condition, left_curr, left_prev, right_curr, right_prev)
            if not fired:
                continue

            if action == "Buy" and not in_position and cash > 0:
                shares      = cash / close
                cash        = 0.0
                in_position = True
                entry_price = close
                entry_date  = date
                break  # first matching rule wins per bar

            elif action in ("Sell", "Close Position") and in_position:
                proceeds  = shares * close
                pnl_pct   = (close / entry_price - 1) * 100
                trades.append({
                    "entry_date":  entry_date,
                    "exit_date":   date,
                    "entry_price": round(entry_price, 4),
                    "exit_price":  round(close, 4),
                    "pnl_pct":     round(pnl_pct, 2),
                })
                cash        = proceeds
                shares      = 0.0
                in_position = False
                break

        # Record equity
        eq = current_equity(i)
        equity_curve.append({"date": date, "equity": round(eq, 2)})

        # Track drawdown
        if eq > peak_equity:
            peak_equity = eq
        drawdown = (peak_equity - eq) / peak_equity * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # Close any open position at the last bar
    if in_position:
        close = closes[-1]
        pnl_pct = (close / entry_price - 1) * 100
        trades.append({
            "entry_date":  entry_date,
            "exit_date":   dates[-1],
            "entry_price": round(entry_price, 4),
            "exit_price":  round(close, 4),
            "pnl_pct":     round(pnl_pct, 2),
            "open":        True,  # still open at end of window
        })
        cash    = shares * close
        shares  = 0.0

    final_equity    = cash
    total_return    = (final_equity / initial_capital - 1) * 100
    winning_trades  = [t for t in trades if t["pnl_pct"] > 0]
    win_rate        = (len(winning_trades) / len(trades) * 100) if trades else 0.0
    buy_and_hold    = (closes[-1] / closes[0] - 1) * 100

    return {
        "success": True,
        "metrics": {
            "total_return_pct":  round(total_return, 2),
            "buy_and_hold_pct":  round(buy_and_hold, 2),
            "win_rate_pct":      round(win_rate, 1),
            "total_trades":      len(trades),
            "max_drawdown_pct":  round(max_drawdown, 2),
            "final_equity":      round(final_equity, 2),
            "initial_capital":   initial_capital,
        },
        "equity_curve": equity_curve,
        "trades":        trades,
    }

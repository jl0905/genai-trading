import React, { useState, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { api } from '../api.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INDICATOR_OPTIONS = ['SMA 20', 'SMA 50', 'SMA 200', 'EMA 20', 'RSI 14', 'MACD', 'Price'];
const CONDITIONS = ['Crosses Above', 'Crosses Below', 'Is Greater Than', 'Is Less Than', 'Equals'];
const ACTIONS = ['Buy', 'Sell', 'Close Position', 'Do Nothing'];

// Conditions that expect another indicator as right-hand value
const CROSS_CONDITIONS = new Set(['Crosses Above', 'Crosses Below']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const fmtPct = (n, alwaysSign = true) =>
  `${alwaysSign && n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

// Build the SVG polyline path string from an equity curve array
const buildEquityPath = (curve, w, h, padV = 20) => {
  if (!curve || curve.length < 2) return '';
  const values = curve.map((p) => p.equity);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  return curve
    .map((p, i) => {
      const x = (i / (curve.length - 1)) * w;
      const y = h - padV - ((p.equity - minV) / range) * (h - padV * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color, large = false }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
      borderRadius: '8px', padding: '16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flex: '1', minWidth: 0,
    }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: large ? '2rem' : '1.4rem', fontWeight: 'bold', color: color || 'var(--text-main)', textAlign: 'center' }}>
        {value}
      </div>
    </div>
  );
}

function EquityCurve({ curve }) {
  const W = 800;
  const H = 220;
  const path = buildEquityPath(curve, W, H);
  const areaPath = path ? `${path} L ${W} ${H} L 0 ${H} Z` : '';

  const values = curve.map((p) => p.equity);
  const isProfit = values[values.length - 1] >= values[0];
  const lineColor = isProfit ? 'var(--theme-primary)' : 'var(--theme-secondary)';
  const startPct  = isProfit ? '0.35' : '0.35';

  // Axis labels
  const minV = Math.min(...values);
  const maxV = Math.max(...values);

  return (
    <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '180px' }}>
      {/* Y-axis labels */}
      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBlock: '20px', pointerEvents: 'none' }}>
        {[maxV, (maxV + minV) / 2, minV].map((v, i) => (
          <span key={i} style={{ fontSize: '10px', color: 'var(--text-muted)', paddingRight: '4px' }}>
            {fmtCurrency(v)}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={startPct} />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#eqGradient)" />}
        {path && <path d={path} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" />}
      </svg>
    </div>
  );
}

function TradeLog({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No trades were executed in this date range.
      </div>
    );
  }

  const thStyle = {
    padding: '8px 10px', textAlign: 'left', fontSize: '0.75rem',
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-main)', fontWeight: 600, whiteSpace: 'nowrap',
  };
  const tdStyle = { padding: '7px 10px', fontSize: '0.82rem', borderBottom: '1px solid var(--border-main)', whiteSpace: 'nowrap' };

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '220px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-panel)' }}>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Entry Date</th>
            <th style={thStyle}>Exit Date</th>
            <th style={thStyle}>Entry Price</th>
            <th style={thStyle}>Exit Price</th>
            <th style={thStyle}>P&amp;L</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const isWin = t.pnl_pct > 0;
            return (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-main)' }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{t.entry_date}</td>
                <td style={tdStyle}>{t.exit_date}</td>
                <td style={tdStyle}>{fmtCurrency(t.entry_price)}</td>
                <td style={tdStyle}>{fmtCurrency(t.exit_price)}</td>
                <td style={{ ...tdStyle, color: isWin ? 'var(--theme-primary)' : 'var(--theme-secondary)', fontWeight: 'bold' }}>
                  {fmtPct(t.pnl_pct)}
                </td>
                <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {t.open ? '⬤ Open' : '✓ Closed'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const StrategyBuilder = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [rules, setRules] = useState([
    { id: 1, indicator: 'SMA 50', condition: 'Crosses Above', value: 'SMA 200', action: 'Buy' },
    { id: 2, indicator: 'SMA 50', condition: 'Crosses Below', value: 'SMA 200', action: 'Sell' },
  ]);
  const [settings, setSettings] = useState({
    symbol: 'AAPL',
    capital: '10000',
    startDate: '2022-01-01',
    endDate: '2024-12-31',
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [results, setResults] = useState(null);
  const [backtestError, setBacktestError] = useState(null);

  // ---------------------------------------------------------------------------
  // Rule CRUD
  // ---------------------------------------------------------------------------
  const addRule = () => {
    const newId = rules.length > 0 ? Math.max(...rules.map((r) => r.id)) + 1 : 1;
    setRules([...rules, { id: newId, indicator: 'Price', condition: 'Is Greater Than', value: 'SMA 50', action: 'Buy' }]);
  };

  const removeRule = (id) => setRules(rules.filter((r) => r.id !== id));

  const updateRule = (id, field, value) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  // ---------------------------------------------------------------------------
  // Backtest
  // ---------------------------------------------------------------------------
  const runBacktest = async () => {
    setIsBacktesting(true);
    setResults(null);
    setBacktestError(null);

    try {
      const payload = {
        symbol:          settings.symbol.trim().toUpperCase(),
        start_date:      settings.startDate,
        end_date:        settings.endDate,
        initial_capital: parseFloat(settings.capital) || 10000,
        rules:           rules.map(({ indicator, condition, value, action }) => ({
          indicator, condition, value, action,
        })),
      };

      const data = await api.runBacktest(payload);
      if (data.success) {
        setResults(data);
      } else {
        setBacktestError(data.error || 'Backtest failed with an unknown error.');
      }
    } catch (err) {
      setBacktestError(err.message || 'Network error — is the backend running?');
    } finally {
      setIsBacktesting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const metrics = results?.metrics;
  const returnPositive = metrics ? metrics.total_return_pct >= 0 : true;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const s = useMemo(() => ({
    container: {
      display: 'flex', flexDirection: 'row', height: '100%', width: '100%',
      padding: '20px', gap: '20px', backgroundColor: 'var(--bg-main)',
      color: 'var(--text-main)', overflow: 'hidden', boxSizing: 'border-box',
    },
    panel: {
      backgroundColor: 'var(--bg-panel)', borderRadius: '12px', padding: '20px',
      border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column',
      gap: '16px', overflowY: 'auto',
    },
    input: {
      backgroundColor: 'var(--bg-main)', color: 'var(--text-main)',
      border: '1px solid var(--border-main)', padding: '8px 12px', borderRadius: '6px',
      outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '0.875rem',
    },
    btn: {
      backgroundColor: 'var(--theme-primary)', color: '#fff', border: 'none',
      padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
      fontWeight: 'bold', fontFamily: 'inherit', transition: 'opacity 0.2s',
    },
    ruleCard: {
      backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
      borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column',
      gap: '10px', position: 'relative',
    },
  }), []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={s.container}>
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div style={{ ...s.panel, flex: '0 0 420px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Strategy Builder</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Define IF/THEN rules and backtest them against real OHLCV data.
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-main)', margin: '4px 0' }} />

        {/* Configuration */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticker Symbol</label>
              <input
                style={s.input}
                value={settings.symbol}
                onChange={(e) => setSettings({ ...settings, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g. AAPL"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Capital ($)</label>
              <input
                style={s.input}
                type="number"
                value={settings.capital}
                onChange={(e) => setSettings({ ...settings, capital: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Date</label>
              <input style={s.input} type="date" value={settings.startDate} onChange={(e) => setSettings({ ...settings, startDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Date</label>
              <input style={s.input} type="date" value={settings.endDate} onChange={(e) => setSettings({ ...settings, endDate: e.target.value })} />
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-main)', margin: '4px 0' }} />

        {/* Rule Builder */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Trading Rules</h3>
          <button
            style={{ ...s.btn, backgroundColor: 'transparent', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', padding: '5px 12px', fontSize: '0.82rem' }}
            onClick={addRule}
          >
            + Add Rule
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rules.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px dashed var(--border-main)', borderRadius: '8px' }}>
              No rules defined. Add a rule to start.
            </div>
          ) : (
            rules.map((rule, index) => {
              const isCrossCondition = CROSS_CONDITIONS.has(rule.condition);
              return (
                <div key={rule.id} style={s.ruleCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--theme-primary)', fontSize: '0.82rem' }}>Rule {index + 1}</strong>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--theme-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}
                      onClick={() => removeRule(rule.id)}
                      title="Remove Rule"
                    >
                      &times;
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr auto 1fr', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IF</span>

                    {/* Indicator (left-hand side) */}
                    <select
                      style={{ ...s.input, padding: '6px 8px', cursor: 'pointer' }}
                      value={rule.indicator}
                      onChange={(e) => updateRule(rule.id, 'indicator', e.target.value)}
                    >
                      {INDICATOR_OPTIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>

                    {/* Condition */}
                    <select
                      style={{ ...s.input, padding: '6px 8px', cursor: 'pointer' }}
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                    >
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Value: indicator dropdown for cross conditions, text input otherwise */}
                    {isCrossCondition ? (
                      <select
                        style={{ ...s.input, padding: '6px 8px', cursor: 'pointer' }}
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                      >
                        {INDICATOR_OPTIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    ) : (
                      <input
                        style={{ ...s.input, padding: '6px 8px' }}
                        placeholder="Value or indicator"
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                      />
                    )}

                    <span style={{ fontWeight: 'bold', fontSize: '0.78rem', color: 'var(--text-muted)' }}>THEN</span>

                    {/* Action */}
                    <select
                      style={{
                        ...s.input, padding: '6px 8px', cursor: 'pointer',
                        borderColor: rule.action === 'Buy' ? 'var(--theme-primary)' : rule.action === 'Sell' || rule.action === 'Close Position' ? 'var(--theme-secondary)' : 'var(--border-main)',
                        color: rule.action === 'Buy' ? 'var(--theme-primary)' : rule.action === 'Sell' || rule.action === 'Close Position' ? 'var(--theme-secondary)' : 'var(--text-main)',
                        fontWeight: 'bold',
                      }}
                      value={rule.action}
                      onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                    >
                      {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <button
            style={{ ...s.btn, width: '100%', fontSize: '1rem', padding: '13px', opacity: isBacktesting ? 0.7 : 1 }}
            onClick={runBacktest}
            disabled={isBacktesting}
          >
            {isBacktesting ? `Running Backtest on ${settings.symbol}…` : '▶  Run Backtest'}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <div style={{ ...s.panel, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Backtest Results</h2>
          {metrics && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {settings.symbol} · {settings.startDate} → {settings.endDate}
            </span>
          )}
        </div>

        {/* ── Empty state ── */}
        {!results && !isBacktesting && !backtestError && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '16px' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Configure your strategy and run a backtest to see real results here.</span>
          </div>
        )}

        {/* ── Loading ── */}
        {isBacktesting && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: 'var(--text-muted)' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-main)', borderTopColor: 'var(--theme-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <div>Fetching data and simulating trades for <strong>{settings.symbol}</strong>…</div>
          </div>
        )}

        {/* ── Error ── */}
        {backtestError && !isBacktesting && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--theme-secondary)' }}>
            <div style={{ fontSize: '1.8rem' }}>⚠</div>
            <div style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px' }}>{backtestError}</div>
          </div>
        )}

        {/* ── Results ── */}
        {results && !isBacktesting && (
          <>
            {/* Metric cards row 1 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <StatCard
                label="Total Return"
                value={fmtPct(metrics.total_return_pct)}
                color={returnPositive ? 'var(--theme-primary)' : 'var(--theme-secondary)'}
                large
              />
              <StatCard
                label="Win Rate"
                value={`${metrics.win_rate_pct.toFixed(1)}%`}
              />
            </div>

            {/* Metric cards row 2 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <StatCard label="Total Trades" value={metrics.total_trades} />
              <StatCard
                label="Max Drawdown"
                value={`-${metrics.max_drawdown_pct.toFixed(2)}%`}
                color="var(--theme-secondary)"
              />
              <StatCard
                label="Final Equity"
                value={fmtCurrency(metrics.final_equity)}
                color={metrics.final_equity >= metrics.initial_capital ? 'var(--theme-primary)' : 'var(--theme-secondary)'}
              />
            </div>

            {/* Equity Curve */}
            <div style={{
              backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
              borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Portfolio Equity Curve
              </div>
              {results.equity_curve?.length >= 2
                ? <EquityCurve curve={results.equity_curve} />
                : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>Not enough data points to render chart.</div>
              }
            </div>

            {/* Trade Log */}
            <div style={{
              backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
              borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trade Log — {metrics.total_trades} trade{metrics.total_trades !== 1 ? 's' : ''}
              </div>
              <TradeLog trades={results.trades} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StrategyBuilder;

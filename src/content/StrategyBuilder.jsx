import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
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
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const values = curve.map((p) => p.equity);
  const isProfit = values[values.length - 1] >= values[0];

  // Resolve CSS variable colors for lightweight-charts (it needs raw hex/rgb)
  const getColor = (varName) => {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(varName).trim();
  };

  useEffect(() => {
    if (!containerRef.current || curve.length < 2) return;

    const lineColor = getColor(isProfit ? '--theme-primary' : '--theme-secondary');
    const bgColor = getColor('--bg-main');
    const textColor = getColor('--text-muted');
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontFamily: 'inherit',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
      },
      handleScroll: { vertTouchDrag: false },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      topColor: lineColor + '66',
      bottomColor: lineColor + '08',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => '$' + price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      },
      crosshairMarkerRadius: 4,
    });

    const data = curve
      .map((p) => ({ time: p.date, value: p.equity }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    areaSeries.setData(data);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [curve, isProfit, isDark]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '220px' }}
    />
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

  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState({
    symbol: 'AAPL',
    capital: '10000',
    startDate: '2022-01-01',
    endDate: '2024-12-31',
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [results, setResults] = useState(null);
  const [backtestError, setBacktestError] = useState(null);
  
  const requestRef = useRef(0);
  const debounceRef = useRef(null);

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

  const randomizeRules = () => {
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    setRules([
      { id: Date.now(), indicator: getRandom(INDICATOR_OPTIONS), condition: getRandom(CONDITIONS), value: getRandom(INDICATOR_OPTIONS), action: 'Buy' },
      { id: Date.now() + 1, indicator: getRandom(INDICATOR_OPTIONS), condition: getRandom(CONDITIONS), value: getRandom(INDICATOR_OPTIONS), action: 'Sell' },
    ]);
  };

  // ---------------------------------------------------------------------------
  // Backtest
  // ---------------------------------------------------------------------------
  const runBacktest = useCallback(async () => {
    const currentRequestId = ++requestRef.current;
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
      
      if (currentRequestId !== requestRef.current) return;

      if (data.success) {
        setResults(data);
      } else {
        setBacktestError(data.error || 'Backtest failed with an unknown error.');
      }
    } catch (err) {
      if (currentRequestId !== requestRef.current) return;
      setBacktestError(err.message || 'Network error — is the backend running?');
    } finally {
      if (currentRequestId === requestRef.current) {
        setIsBacktesting(false);
      }
    }
  }, [rules, settings]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // Don't auto-run if there are no rules defined
    if (rules.length === 0) return;
    debounceRef.current = setTimeout(() => {
      if (settings.symbol.trim() !== '') {
        runBacktest();
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(debounceRef.current);
  }, [runBacktest, settings.symbol]); // the dependency array ensures it runs when rules or settings change because runBacktest is wrapped in useCallback on them.

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
    // select extends input with enough right padding to clear the native dropdown arrow
    select: {
      backgroundColor: 'var(--bg-main)', color: 'var(--text-main)',
      border: '1px solid var(--border-main)', padding: '6px 28px 6px 8px', borderRadius: '6px',
      outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '0.875rem',
      cursor: 'pointer', appearance: 'auto',
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ ...s.btn, backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: '1px solid var(--text-main)', padding: '5px 12px', fontSize: '0.82rem' }}
              onClick={randomizeRules}
              title="Generate a random Buy/Sell strategy"
            >
              Randomize
            </button>
            <button
              style={{ ...s.btn, backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: '1px solid var(--text-main)', padding: '5px 12px', fontSize: '0.82rem' }}
              onClick={addRule}
            >
              + Add Rule
            </button>
          </div>
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
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}
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
                      style={s.select}
                      value={rule.indicator}
                      onChange={(e) => updateRule(rule.id, 'indicator', e.target.value)}
                    >
                      {INDICATOR_OPTIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>

                    {/* Condition */}
                    <select
                      style={s.select}
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                    >
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Value: indicator dropdown for cross conditions, text input otherwise */}
                    {isCrossCondition ? (
                      <select
                        style={s.select}
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
                        ...s.select,
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
            style={{ ...s.btn, width: '100%', fontSize: '1rem', padding: '13px', opacity: isBacktesting || rules.length === 0 ? 0.7 : 1 }}
            onClick={runBacktest}
            disabled={isBacktesting || rules.length === 0}
          >
            {isBacktesting ? `Running Backtest on ${settings.symbol}…` : rules.length === 0 ? 'Add rules to run a backtest' : '▶  Run Backtest'}
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

        {/* ── Skeleton state ── */}
        {!results && !isBacktesting && !backtestError && (
          <>
            <style>{`
              @keyframes skeletonShimmer {
                0%   { background-position: -400px 0; }
                100% { background-position: 400px 0; }
              }
            `}</style>
            {(() => {
              const skeletonBar = (width, height = '22px') => (
                <div style={{
                  width, height, borderRadius: '6px',
                  background: isDark
                    ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)'
                    : 'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
                  backgroundSize: '800px 100%',
                  animation: 'skeletonShimmer 1.8s infinite ease-in-out',
                }} />
              );
              const skeletonCard = () => (
                <div style={{
                  backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
                  borderRadius: '8px', padding: '16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flex: '1', minWidth: 0, gap: '10px',
                }}>
                  {skeletonBar('60%', '12px')}
                  {skeletonBar('45%', '28px')}
                </div>
              );
              return (
                <>
                  {/* Row 1 skeleton cards */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {skeletonCard()}{skeletonCard()}{skeletonCard()}
                  </div>
                  {/* Row 2 skeleton cards */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {skeletonCard()}{skeletonCard()}{skeletonCard()}
                  </div>
                  {/* Skeleton equity curve */}
                  <div style={{
                    backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
                    borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px',
                  }}>
                    {skeletonBar('180px', '12px')}
                    {skeletonBar('100%', '180px')}
                  </div>
                  {/* Skeleton trade log */}
                  <div style={{
                    backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)',
                    borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    {skeletonBar('120px', '12px')}
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px' }}>
                        {skeletonBar('12%', '14px')}{skeletonBar('18%', '14px')}{skeletonBar('18%', '14px')}{skeletonBar('14%', '14px')}{skeletonBar('14%', '14px')}{skeletonBar('12%', '14px')}{skeletonBar('10%', '14px')}
                      </div>
                    ))}
                  </div>
                  {/* Helpful hint */}
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
                    Add trading rules and run a backtest to populate these results.
                  </div>
                </>
              );
            })()}
          </>
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
                label="Strategy Return"
                value={fmtPct(metrics.total_return_pct)}
                color={returnPositive ? 'var(--theme-primary)' : 'var(--theme-secondary)'}
                large
              />
              <StatCard
                label="Buy & Hold"
                value={fmtPct(metrics.buy_and_hold_pct)}
                color={metrics.buy_and_hold_pct >= 0 ? 'var(--theme-primary)' : 'var(--theme-secondary)'}
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

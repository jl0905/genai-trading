import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { api } from '../api.js';
import { useTheme } from '../ThemeContext.jsx';

const LOAD_CHUNK_MONTHS = 6;
const LOAD_TRIGGER_BARS = 20;

export default function TvInteractiveChart() {
  const [stockData, setStockData] = useState([]);
  const [stockInfo, setStockInfo] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Chart refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Dynamic loading refs — used inside the range-change callback to avoid stale closures
  const stockDataRef = useRef([]);
  const oldestDateRef = useRef(null);
  const allHistoryLoadedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const visibleRangeRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const symbolRef = useRef(symbol);

  // Keep refs in sync with state
  useEffect(() => { symbolRef.current = symbol; }, [symbol]);

  // Chart theme variables
  const chartBg = isDark ? '#000000' : '#ffffff';
  const chartText = isDark ? '#d1d5db' : '#4b5563';
  const chartGrid = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const crosshairLine = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const labelBg = isDark ? '#1a1a2e' : '#e5e7eb';
  const chartBorder = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

  // --- Debounced search ---
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) { setSuggestions([]); return; }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.searchStocks(trimmed);
        if (res.success && res.quotes) {
          setSuggestions(res.quotes.filter(q => q.symbol && (q.shortname || q.longname)).slice(0, 10));
        }
      } catch (err) { console.error("Search failed", err); }
      finally { setSearchLoading(false); }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  // --- Tab visibility ---
  useEffect(() => {
    const handler = () => { isVisibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // --- Load more history (called from range-change callback via ref) ---
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMoreRef.current || allHistoryLoadedRef.current || !oldestDateRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const endDate = oldestDateRef.current;
      const startObj = new Date(endDate);
      startObj.setMonth(startObj.getMonth() - LOAD_CHUNK_MONTHS);
      const startDate = startObj.toISOString().split('T')[0];

      const data = await api.getStockDataRange(symbolRef.current, startDate, endDate);

      if (data.success) {
        if (data.historical.length === 0) {
          allHistoryLoadedRef.current = true;
        } else {
          const currentData = stockDataRef.current;
          const existingDates = new Set(currentData.map(d => d.date));
          const newData = data.historical.filter(d => !existingDates.has(d.date));

          if (newData.length === 0) {
            allHistoryLoadedRef.current = true;
          } else {
            // Save the visible range so we can restore it after setData
            visibleRangeRef.current = chartRef.current?.timeScale().getVisibleRange();

            const combined = [...newData, ...currentData].sort((a, b) => a.date.localeCompare(b.date));
            oldestDateRef.current = combined[0].date;
            stockDataRef.current = combined;
            setStockData(combined);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load more history', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []); // no deps — uses only refs

  // Stable ref for the callback so subscription never goes stale
  const loadMoreRef = useRef(loadMoreHistory);
  useEffect(() => { loadMoreRef.current = loadMoreHistory; }, [loadMoreHistory]);

  // --- Initial data fetch ---
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      initialLoadDoneRef.current = false;
      allHistoryLoadedRef.current = false;

      const data = await api.getStockData(symbol, '6mo');

      if (data.success && data.historical.length > 0) {
        stockDataRef.current = data.historical;
        oldestDateRef.current = data.historical[0].date;
        setStockData(data.historical);
        setStockInfo(data.company);
        setRealTimeData(data.real_time);
        setLastUpdate(new Date());
        initialLoadDoneRef.current = true;
      } else {
        setError(data.error || 'Failed to fetch stock data');
      }
    } catch (err) {
      setError(err.message || 'Error fetching stock data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // --- Background refresh (latest data only) ---
  const backgroundRefresh = useCallback(async () => {
    if (!initialLoadDoneRef.current) return;
    try {
      const data = await api.getStockData(symbol, '5d');
      if (data.success) {
        setRealTimeData(data.real_time);
        setStockInfo(data.company);
        setLastUpdate(new Date());

        // Update only the tail end of chart data
        if (candleSeriesRef.current && volumeSeriesRef.current) {
          for (const d of data.historical) {
            candleSeriesRef.current.update({
              time: d.date, open: d.open, high: d.high, low: d.low, close: d.price,
            });
            volumeSeriesRef.current.update({
              time: d.date, value: d.volume,
              color: d.price >= d.open ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 68, 68, 0.3)',
            });
          }
        }
      }
    } catch (_) { /* silently fail */ }
  }, [symbol]);

  // Kick off initial fetch + polling
  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      if (isVisibleRef.current) backgroundRefresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchInitialData, backgroundRefresh]);

  // --- Theme hot-swap on existing chart ---
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
      grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
      crosshair: {
        vertLine: { color: crosshairLine, labelBackgroundColor: labelBg },
        horzLine: { color: crosshairLine, labelBackgroundColor: labelBg },
      },
      rightPriceScale: { borderColor: chartBorder },
      timeScale: { borderColor: chartBorder },
    });
  }, [theme, chartBg, chartText, chartGrid, crosshairLine, labelBg, chartBorder]);

  // --- Create chart + set data ---
  useEffect(() => {
    if (!chartContainerRef.current || stockData.length === 0) return;

    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: chartBg },
          textColor: chartText,
          fontFamily: 'Courier New, monospace',
          fontSize: 12,
        },
        grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: crosshairLine, labelBackgroundColor: labelBg },
          horzLine: { color: crosshairLine, labelBackgroundColor: labelBg },
        },
        rightPriceScale: { borderColor: chartBorder, scaleMargins: { top: 0.1, bottom: 0.25 } },
        timeScale: { borderColor: chartBorder, timeVisible: false, secondsVisible: false },
        handleScroll: { vertTouchDrag: false },
      });

      candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#00d4ff', downColor: '#ff4444',
        borderUpColor: '#00d4ff', borderDownColor: '#ff4444',
        wickUpColor: '#00d4ff', wickDownColor: '#ff4444',
      });

      volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' }, priceScaleId: '',
      });
      volumeSeriesRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      // Subscribe: when user scrolls/zooms near the left edge, load more
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (logicalRange && logicalRange.from < LOAD_TRIGGER_BARS) {
          loadMoreRef.current?.();
        }
      });
    }

    const candleData = stockData
      .map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.price }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    const volumeData = stockData
      .map(d => ({
        time: d.date, value: d.volume,
        color: d.price >= d.open ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 68, 68, 0.3)',
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Restore view position when prepending, or fit content on first load
    if (visibleRangeRef.current) {
      chartRef.current.timeScale().setVisibleRange(visibleRangeRef.current);
      visibleRangeRef.current = null;
    } else if (!initialLoadDoneRef.current || stockData.length <= 130) {
      chartRef.current.timeScale().fitContent();
    }
  }, [stockData]);

  // --- Resize handler ---
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Cleanup chart on unmount ---
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, []);

  // --- Reset chart when symbol changes ---
  useEffect(() => {
    initialLoadDoneRef.current = false;
    allHistoryLoadedRef.current = false;
    oldestDateRef.current = null;
    stockDataRef.current = [];
    visibleRangeRef.current = null;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
  }, [symbol]);

  // --- Helpers ---
  const formatMarketCap = (cap) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap}`;
  };

  const formatVolume = (vol) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return `${vol}`;
  };

  // --- Render ---
  if (loading && stockData.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100vh', padding: '20px',
        backgroundColor: 'var(--bg-main)', fontFamily: 'Courier New, monospace', overflow: 'hidden'
      }}>
        <div style={{ color: 'var(--text-main)' }}>Loading candlestick data...</div>
      </div>
    );
  }

  if (error && stockData.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-main)', color: 'var(--chart-down)', fontFamily: 'Courier New, monospace'
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', padding: '20px',
      backgroundColor: 'var(--bg-main)', color: 'var(--text-main)',
      fontFamily: 'Courier New, monospace', overflow: 'hidden',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid var(--border-main)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{stockInfo?.symbol || symbol}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{stockInfo?.name || 'Loading...'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>[lightweight-charts]</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchInput.trim().toUpperCase();
              if (trimmed) { setSymbol(trimmed); setSearchInput(''); setShowSuggestions(false); }
            }}
            style={{ display: 'flex', gap: '0', alignItems: 'center' }}
          >
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(!!e.target.value.trim());
                }}
                onFocus={() => { if (searchInput.trim()) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search ticker..."
                style={{
                  backgroundColor: 'var(--bg-main)', color: 'var(--text-main)',
                  border: '2px solid var(--border-focus)', borderRight: 'none',
                  padding: '6px 10px', fontFamily: 'Courier New, monospace',
                  fontSize: '12px', width: '200px', outline: 'none'
                }}
              />
              {showSuggestions && (suggestions.length > 0 || searchLoading) && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, width: '300px', maxHeight: '300px',
                  overflowY: 'auto', backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-focus)', listStyle: 'none',
                  padding: 0, margin: 0, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {searchLoading && suggestions.length === 0 ? (
                    <li style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>Searching market...</li>
                  ) : (
                    suggestions.map(s => (
                      <li
                        key={`${s.symbol}-${s.exchDisp}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSymbol(s.symbol); setSearchInput(''); setShowSuggestions(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border-main)',
                          fontFamily: 'Courier New, monospace', fontSize: '12px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-panel)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <strong style={{ color: 'var(--accent)' }}>{s.symbol}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>{s.shortname || s.longname}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', pointerEvents: 'none', flexShrink: 0 }}>
                          {s.quoteType && (
                            <span style={{ fontSize: '9px', color: 'var(--bg-main)', backgroundColor: s.quoteType === 'ETF' ? '#9333ea' : 'var(--text-muted)', padding: '2px 4px', borderRadius: '4px' }}>
                              {s.quoteType}
                            </span>
                          )}
                          {s.exchDisp && (
                            <span style={{ fontSize: '9px', color: 'var(--bg-main)', backgroundColor: 'var(--text-muted)', padding: '2px 4px', borderRadius: '4px' }}>
                              {s.exchDisp}
                            </span>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <button type="submit" style={{
              backgroundColor: 'var(--text-main)', color: 'var(--bg-main)',
              border: '2px solid var(--border-focus)', padding: '6px 10px',
              fontFamily: 'Courier New, monospace', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>Go</button>
          </form>

          <button
            onClick={fetchInitialData}
            disabled={loading}
            style={{
              backgroundColor: loading ? 'var(--bg-panel)' : 'var(--text-main)',
              color: loading ? 'var(--text-muted)' : 'var(--bg-main)',
              border: '2px solid var(--border-focus)', padding: '6px 12px',
              fontFamily: 'Courier New, monospace', fontSize: '12px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
              opacity: loading ? 0.6 : 1
            }}
          >{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {/* Real-Time Stats */}
      {realTimeData && (
        <div style={{
          display: 'flex', gap: '30px', marginBottom: '15px', padding: '12px 15px',
          backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-main)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Current Price</div>
            <div style={{ color: realTimeData.change >= 0 ? 'var(--chart-up)' : 'var(--chart-down)', fontSize: '24px', fontWeight: 'bold' }}>
              ${realTimeData.current_price.toFixed(2)}
            </div>
            <div style={{ color: realTimeData.change >= 0 ? 'var(--chart-up)' : 'var(--chart-down)', fontSize: '13px' }}>
              {realTimeData.change >= 0 ? '+' : ''}{realTimeData.change.toFixed(2)} ({realTimeData.change_percent.toFixed(2)}%)
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Day Range</div>
            <div style={{ fontSize: '14px' }}>${realTimeData.day_low} - ${realTimeData.day_high}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Volume</div>
            <div style={{ fontSize: '14px' }}>{formatVolume(realTimeData.volume)}</div>
          </div>
          {stockInfo?.market_cap > 0 && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Market Cap</div>
              <div style={{ fontSize: '14px' }}>{formatMarketCap(stockInfo.market_cap)}</div>
            </div>
          )}
          {stockInfo?.pe_ratio && stockInfo.pe_ratio !== 'N/A' && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>P/E Ratio</div>
              <div style={{ fontSize: '14px' }}>{stockInfo.pe_ratio.toFixed(2)}</div>
            </div>
          )}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Last Updated</div>
            <div style={{ fontSize: '12px' }}>{lastUpdate?.toLocaleTimeString() || 'N/A'}</div>
            {loading && <div style={{ color: 'var(--accent)', fontSize: '11px' }}>Updating...</div>}
          </div>
        </div>
      )}

      {/* Chart info bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Scroll left or zoom out to load more history
          {isLoadingMore && <span style={{ color: 'var(--accent)', marginLeft: '12px' }}>⟳ Loading older data...</span>}
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#00d4ff', borderRadius: '2px' }}></span>
            Bullish
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#ff4444', borderRadius: '2px' }}></span>
            Bearish
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        style={{
          flex: 1, minHeight: 0,
          backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)'
        }}
      />
    </div>
  );
}

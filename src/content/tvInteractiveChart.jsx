import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { api } from '../api.js';

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corp.' }
];

const PERIODS = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1mo', label: '1 Month' },
  { value: '3mo', label: '3 Months' },
  { value: '6mo', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' },
  { value: '5y', label: '5 Years' },
  { value: '10y', label: '10 Years' },
  { value: 'ytd', label: 'YTD' },
  { value: 'max', label: 'Max' },
];

export default function TvInteractiveChart() {
  const [stockData, setStockData] = useState([]);
  const [stockInfo, setStockInfo] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('6mo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [ohlcVisible, setOhlcVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const isVisibleRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const prevDataMapRef = useRef(new Map());

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch stock data - initial load only (sets loading state)
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      initialLoadDoneRef.current = false;

      const data = await api.getStockData(symbol, period);

      if (data.success) {
        setStockData(data.historical);
        setStockInfo(data.company);
        setRealTimeData(data.real_time);
        setLastUpdate(new Date());
        initialLoadDoneRef.current = true;

        // Build lookup map for incremental updates
        const map = new Map();
        data.historical.forEach(d => map.set(d.date, d));
        prevDataMapRef.current = map;
      } else {
        setError(data.error || 'Failed to fetch stock data');
      }
    } catch (err) {
      setError(err.message || 'Error fetching stock data');
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  // Background refresh - incremental updates, no loading state, preserves chart position
  const backgroundRefresh = useCallback(async () => {
    if (!initialLoadDoneRef.current) return;
    try {
      const data = await api.getStockData(symbol, period);

      if (data.success) {
        const prevMap = prevDataMapRef.current;
        const newMap = new Map();
        data.historical.forEach(d => newMap.set(d.date, d));

        // Apply incremental updates directly to chart series
        if (candleSeriesRef.current && volumeSeriesRef.current) {
          for (const d of data.historical) {
            const prev = prevMap.get(d.date);
            const isNew = !prev;
            const isChanged = prev && (
              prev.price !== d.price || prev.open !== d.open ||
              prev.high !== d.high || prev.low !== d.low ||
              prev.volume !== d.volume
            );

            if (isNew || isChanged) {
              candleSeriesRef.current.update({
                time: d.date,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.price,
              });
              volumeSeriesRef.current.update({
                time: d.date,
                value: d.volume,
                color: d.price >= d.open ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 68, 68, 0.3)',
              });
            }
          }
        }

        prevDataMapRef.current = newMap;
        setStockData(data.historical);
        setStockInfo(data.company);
        setRealTimeData(data.real_time);
        setLastUpdate(new Date());
      }
    } catch (err) {
      // Silently fail on background refresh - don't disrupt UI
    }
  }, [symbol, period]);

  // Initial fetch and background polling
  useEffect(() => {
    fetchInitialData();

    const interval = setInterval(() => {
      if (isVisibleRef.current) {
        backgroundRefresh();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchInitialData, backgroundRefresh]);

  // Create chart and update data
  useEffect(() => {
    if (!chartContainerRef.current || stockData.length === 0) return;

    // Create chart if it doesn't exist
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#d1d5db',
          fontFamily: 'Courier New, monospace',
          fontSize: 12,
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(255, 255, 255, 0.3)',
            labelBackgroundColor: '#1a1a2e',
          },
          horzLine: {
            color: 'rgba(255, 255, 255, 0.3)',
            labelBackgroundColor: '#1a1a2e',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          scaleMargins: {
            top: 0.1,
            bottom: 0.25,
          },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          timeVisible: false,
          secondsVisible: false,
        },
        handleScroll: {
          vertTouchDrag: false,
        },
      });

      // Add candlestick series
      candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#00d4ff',
        downColor: '#ff4444',
        borderUpColor: '#00d4ff',
        borderDownColor: '#ff4444',
        wickUpColor: '#00d4ff',
        wickDownColor: '#ff4444',
      });

      // Add volume series
      volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      volumeSeriesRef.current.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Map stock data to lightweight-charts format
    const candleData = stockData.map(d => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.price,
    }));

    const volumeData = stockData.map(d => ({
      time: d.date,
      value: d.volume,
      color: d.price >= d.open ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 68, 68, 0.3)',
    }));

    // Sort by time (required by lightweight-charts)
    candleData.sort((a, b) => (a.time > b.time ? 1 : -1));
    volumeData.sort((a, b) => (a.time > b.time ? 1 : -1));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Only fit content on initial load (not on background refresh)
    if (!initialLoadDoneRef.current) {
      chartRef.current.timeScale().fitContent();
    }

  }, [stockData]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup chart on unmount
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

  // Reset chart when symbol/period changes
  useEffect(() => {
    initialLoadDoneRef.current = false;
    prevDataMapRef.current = new Map();
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
  }, [symbol, period]);

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

  // Skeleton loader
  if (loading && stockData.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        padding: '20px',
        backgroundColor: '#000000',
        fontFamily: 'Courier New, monospace',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '15px',
          borderBottom: '2px solid #333'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '80px', height: '24px', backgroundColor: '#222', borderRadius: '4px' }} />
            <div style={{ width: '120px', height: '16px', backgroundColor: '#222', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '150px', height: '36px', backgroundColor: '#222', borderRadius: '4px' }} />
            <div style={{ width: '120px', height: '36px', backgroundColor: '#222', borderRadius: '4px' }} />
            <div style={{ width: '100px', height: '36px', backgroundColor: '#222', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '30px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#111',
          border: '1px solid #333'
        }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              <div style={{ width: '80px', height: '12px', backgroundColor: '#222', marginBottom: '8px', borderRadius: '2px' }} />
              <div style={{ width: '100px', height: '28px', backgroundColor: '#222', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        <div style={{ height: 'calc(100% - 220px)', backgroundColor: '#111', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#444' }}>Loading candlestick data...</div>
        </div>
      </div>
    );
  }

  if (error && stockData.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ff4444',
        fontFamily: 'Courier New, monospace'
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      padding: '20px',
      backgroundColor: '#000000',
      fontFamily: 'Courier New, monospace',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '15px',
        borderBottom: '2px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>
            {stockInfo?.symbol || symbol}
          </h2>
          <span style={{ color: '#888', fontSize: '14px' }}>
            {stockInfo?.name || 'Loading...'}
          </span>
          <span style={{ color: '#555', fontSize: '12px' }}>
            [lightweight-charts]
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchInput.trim().toUpperCase();
              if (trimmed) {
                setSymbol(trimmed);
                setSearchInput('');
              }
            }}
            style={{ display: 'flex', gap: '0', alignItems: 'center' }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search ticker..."
              style={{
                backgroundColor: '#000',
                color: '#fff',
                border: '2px solid #fff',
                borderRight: 'none',
                padding: '8px 12px',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                width: '140px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#fff',
                color: '#000',
                border: '2px solid #fff',
                padding: '8px 12px',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Go
            </button>
          </form>

          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              border: '2px solid #fff',
              padding: '8px 12px',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {POPULAR_STOCKS.map(stock => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>


          <button
            onClick={fetchInitialData}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#666' : '#fff',
              color: '#000',
              border: '2px solid #fff',
              padding: '8px 16px',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Real-Time Stats */}
      {realTimeData && (
        <div style={{
          display: 'flex',
          gap: '30px',
          marginBottom: '15px',
          padding: '12px 15px',
          backgroundColor: '#111',
          border: '1px solid #333'
        }}>
          <div>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Current Price</div>
            <div style={{
              color: realTimeData.change >= 0 ? '#44ff44' : '#ff4444',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              ${realTimeData.current_price.toFixed(2)}
            </div>
            <div style={{
              color: realTimeData.change >= 0 ? '#44ff44' : '#ff4444',
              fontSize: '13px'
            }}>
              {realTimeData.change >= 0 ? '+' : ''}{realTimeData.change.toFixed(2)} ({realTimeData.change_percent.toFixed(2)}%)
            </div>
          </div>

          <div>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Day Range</div>
            <div style={{ color: '#fff', fontSize: '14px' }}>
              ${realTimeData.day_low} - ${realTimeData.day_high}
            </div>
          </div>

          <div>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Volume</div>
            <div style={{ color: '#fff', fontSize: '14px' }}>
              {formatVolume(realTimeData.volume)}
            </div>
          </div>

          {stockInfo?.market_cap > 0 && (
            <div>
              <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Market Cap</div>
              <div style={{ color: '#fff', fontSize: '14px' }}>
                {formatMarketCap(stockInfo.market_cap)}
              </div>
            </div>
          )}

          {stockInfo?.pe_ratio && stockInfo.pe_ratio !== 'N/A' && (
            <div>
              <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>P/E Ratio</div>
              <div style={{ color: '#fff', fontSize: '14px' }}>
                {stockInfo.pe_ratio.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Last Updated</div>
            <div style={{ color: '#fff', fontSize: '12px' }}>
              {lastUpdate?.toLocaleTimeString() || 'N/A'}
            </div>
            {loading && <div style={{ color: '#00d4ff', fontSize: '11px' }}>Updating...</div>}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ color: '#888', fontSize: '13px' }}>
          Candlestick chart with volume overlay - drag to pan, scroll to zoom
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#ffffff', fontSize: '13px' }}>
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
          flex: 1,
          minHeight: 0,
          backgroundColor: '#000000',
          border: '1px solid #333',
          marginBottom: '10px'
        }}
      />

      {/* Period Selector (Robinhood Style) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
      }}>
        {PERIODS.map(p => {
          const isActive = period === p.value;
          const shortLabel = p.label
            .replace(/Days?/i, 'D')
            .replace(/Months?/i, 'M')
            .replace(/Years?/i, 'Y')
            .replace(/\s+/g, '');

          return (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                backgroundColor: 'transparent',
                color: isActive ? '#00d4ff' : '#888',
                border: 'none',
                borderBottom: isActive ? '2px solid #00d4ff' : '2px solid transparent',
                padding: '8px 10px',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {shortLabel.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

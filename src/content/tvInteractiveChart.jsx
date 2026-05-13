import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { api } from '../api.js';
import { useTheme } from '../ThemeContext.jsx';

const LOAD_CHUNK_MONTHS = 6;
const LOAD_TRIGGER_BARS = 20;

const EDUCATION_TOPICS = {
  stockChart: {
    title: 'What is a stock chart?',
    readerSection: 'chart',
    body: "A stock chart is a visual record of how a stock's price changes over time. Each point or candle represents trading activity for a specific period, helping investors compare the opening price, closing price, highest price, lowest price, and volume. By reading the chart, you can quickly see whether the stock is trending upward, trending downward, or moving sideways.",
  },
  searchTicker: {
    title: 'Search ticker',
    readerSection: 'ticker',
    body: 'A ticker is the short symbol used to identify a publicly traded stock or ETF. For example, AAPL represents Apple and MSFT represents Microsoft. Searching a ticker changes the chart to show that security.',
  },
  currentPrice: {
    title: 'Current price',
    readerSection: 'current-price',
    body: 'The current price is the latest available trading price for the selected stock. The number below it shows how much the stock has moved compared with the previous close, both in dollars and percent.',
  },
  dayRange: {
    title: 'Day range',
    readerSection: 'day-range',
    body: 'The day range shows the lowest and highest prices reached during the current trading day. A wide range usually means the stock moved a lot during the session.',
  },
  volume: {
    title: 'Volume',
    readerSection: 'volume',
    body: 'Volume is the number of shares traded during the selected period. Higher volume means more market participation and can make a price move more meaningful.',
  },
  marketCap: {
    title: 'Market cap',
    readerSection: 'market-cap',
    body: "Market capitalization is the total market value of the company's shares. It is calculated by multiplying the share price by the number of shares outstanding.",
  },
  peRatio: {
    title: 'P/E ratio',
    readerSection: 'pe-ratio',
    body: "The price-to-earnings ratio compares a company's stock price with its earnings per share. Investors often use it to judge whether a stock looks expensive or inexpensive relative to its profits.",
  },
  greenCandle: {
    title: 'Green candle',
    readerSection: 'green-candle',
    body: 'A green candle means the stock closed higher than it opened for that candle period. The candle body shows the open-to-close move, while the thin wick shows the high and low.',
  },
  redCandle: {
    title: 'Red candle',
    readerSection: 'red-candle',
    body: 'A red candle means the stock closed lower than it opened for that candle period. The candle body shows the open-to-close move, while the thin wick shows the high and low.',
  },
  sma20: {
    title: 'SMA 20',
    readerSection: 'sma-20',
    body: 'A simple moving average smooths price by averaging the last set number of closing prices. SMA 20 averages the last 20 candles and is often used to see the short-term trend.',
  },
  sma200: {
    title: 'SMA 200',
    readerSection: 'sma-200',
    body: 'SMA 200 averages the last 200 daily candles. Traders often use it to understand the long-term trend and to compare whether price is above or below a major trend level.',
  },
  ema9: {
    title: 'EMA 9',
    readerSection: 'ema-9',
    body: 'An exponential moving average smooths price while giving more weight to recent candles. EMA 9 is a fast-moving indicator that can help show short-term momentum on a daily chart.',
  },
  vrvp: {
    title: 'VRVP',
    readerSection: 'vrvp',
    body: 'Visible Range Volume Profile estimates how much volume traded at each price area inside the currently visible chart window. Larger blocks show price zones where more trading activity occurred.',
  },
};

export default function TvInteractiveChart({ isActive = true, isCompact = false }) {
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
  const [showEducation, setShowEducation] = useState(false);
  const [selectedEducationTopic, setSelectedEducationTopic] = useState('stockChart');
  const [educationPanelPosition, setEducationPanelPosition] = useState({ x: 24, y: 260 });
  const [visibleIndicators, setVisibleIndicators] = useState({
    sma20: false,
    sma200: false,
    ema9: false,
    bbands: false,
    vrvp: false,
  });

  // AI analysis state
  const [analysisText, setAnalysisText] = useState('');
  const [analysisMetrics, setAnalysisMetrics] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [visibleRangeInfo, setVisibleRangeInfo] = useState(null);
  const [priceGaugeMarkers, setPriceGaugeMarkers] = useState(null);
  const [volumeProfileBars, setVolumeProfileBars] = useState([]);
  const [volumeProfileSource, setVolumeProfileSource] = useState('');

  const showAnalysisRef = useRef(false);
  useEffect(() => { showAnalysisRef.current = showAnalysis; }, [showAnalysis]);

  // Resize / drag state
  const [panelWidth, setPanelWidth] = useState(380);
  const panelWidthRef = useRef(380);
  useEffect(() => { panelWidthRef.current = panelWidth; }, [panelWidth]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, width: 0 });
  const isEducationDraggingRef = useRef(false);
  const educationDragStartRef = useRef({ mouseX: 0, mouseY: 0, panelX: 24, panelY: 260 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isEducationDraggingRef.current) {
        const nextX = educationDragStartRef.current.panelX + e.clientX - educationDragStartRef.current.mouseX;
        const nextY = educationDragStartRef.current.panelY + e.clientY - educationDragStartRef.current.mouseY;
        const maxX = Math.max(window.innerWidth - 340, 0);
        const maxY = Math.max(window.innerHeight - 160, 0);

        setEducationPanelPosition({
          x: Math.min(Math.max(nextX, 8), maxX),
          y: Math.min(Math.max(nextY, 8), maxY),
        });
        return;
      }

      if (!isDraggingRef.current) return;
      const deltaX = dragStartRef.current.x - e.clientX;
      const newWidth = dragStartRef.current.width + deltaX;

      if (!showAnalysisRef.current) {
        if (deltaX > 5) {
          setShowAnalysis(true);
        } else if (deltaX < -5) {
          return; // Ignore drag right when already closed
        } else {
          return; // Wait for drag threshold
        }
      }

      if (newWidth < 80) {
        if (dragStartRef.current.width > 0) {
          // Snap closed during drag only if we started from an open state
          setShowAnalysis(false);
          isDraggingRef.current = false;
          document.body.style.cursor = 'default';
          setPanelWidth(380);
        } else {
          // If we started from closed, just show the small width smoothly
          setPanelWidth(Math.max(newWidth, 6));
        }
      } else {
        setPanelWidth(Math.min(newWidth, window.innerWidth - 100));
      }
    };
    const handleMouseUp = () => {
      if (isEducationDraggingRef.current) {
        isEducationDraggingRef.current = false;
        document.body.style.cursor = 'default';
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = 'default';

        // Snap to minimum usable size ONLY if we just dragged it open from a completely closed state
        if (showAnalysisRef.current && dragStartRef.current.width === 0) {
          setPanelWidth((prev) => (prev < 250 ? 250 : prev));
        }

        // Force chart resize when dragging finishes
        setTimeout(() => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight
            });
          }
        }, 50);
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Chart refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const isVisibleRef = useRef(true);

  // Dynamic loading refs — used inside the range-change callback to avoid stale closures
  const stockDataRef = useRef([]);
  const oldestDateRef = useRef(null);
  const allHistoryLoadedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const visibleRangeRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  const initialFitDoneRef = useRef(false);
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
  const themePrimary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#8BA97F';
  const themePrimaryRgb = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary-rgb').trim() || '139, 169, 127';
  const themeSecondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim() || '#FF5A5A';
  const themeSecondaryRgb = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary-rgb').trim() || '255, 90, 90';
  const activeEducation = EDUCATION_TOPICS[selectedEducationTopic] || EDUCATION_TOPICS.stockChart;

  const getEducationHighlightStyle = (topic) => {
    if (!showEducation) return {};
    const isSelected = selectedEducationTopic === topic;

    return {
      border: `1px solid ${isSelected ? 'var(--theme-primary)' : 'rgba(var(--theme-primary-rgb), 0.45)'}`,
      boxShadow: isSelected
        ? '0 0 0 2px rgba(var(--theme-primary-rgb), 0.25), 0 0 18px rgba(var(--theme-primary-rgb), 0.35)'
        : '0 0 12px rgba(var(--theme-primary-rgb), 0.18)',
      backgroundColor: isSelected ? 'rgba(var(--theme-primary-rgb), 0.12)' : undefined,
      cursor: 'pointer',
      borderRadius: '4px',
      padding: '8px',
      margin: '-8px',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
    };
  };

  const selectEducationTopic = (topic) => {
    if (!showEducation) return;
    setSelectedEducationTopic(topic);
  };

  const openEducationTopic = useCallback((topic) => {
    setShowEducation(true);
    setSelectedEducationTopic(topic);
  }, []);

  const toggleIndicator = (indicator) => {
    setVisibleIndicators((current) => ({
      ...current,
      [indicator]: !current[indicator],
    }));
    selectEducationTopic(indicator);
  };

  const openReaderSection = (sectionId) => {
    if (!sectionId) return;

    window.dispatchEvent(new CustomEvent('open-reader-section', {
      detail: { sectionId },
    }));
  };

  const getTimeRangeDates = (timeRange) => {
    if (!timeRange) return null;

    return {
      from: typeof timeRange.from === 'string'
        ? timeRange.from
        : new Date(timeRange.from * 1000).toISOString().split('T')[0],
      to: typeof timeRange.to === 'string'
        ? timeRange.to
        : new Date(timeRange.to * 1000).toISOString().split('T')[0],
    };
  };

  const updatePriceGaugeMarkers = useCallback((timeRange = null) => {
    if (!candleSeriesRef.current || stockDataRef.current.length === 0) return;

    const rangeDates = getTimeRangeDates(timeRange || chartRef.current?.timeScale().getVisibleRange());
    const visibleData = rangeDates
      ? stockDataRef.current.filter(d => d.date >= rangeDates.from && d.date <= rangeDates.to)
      : stockDataRef.current;

    if (visibleData.length === 0) {
      setPriceGaugeMarkers(null);
      return;
    }

    const high = visibleData.reduce((highest, point) => (
      point.high > highest.high ? point : highest
    ), visibleData[0]);
    const low = visibleData.reduce((lowest, point) => (
      point.low < lowest.low ? point : lowest
    ), visibleData[0]);
    const highY = candleSeriesRef.current.priceToCoordinate(high.high);
    const lowY = candleSeriesRef.current.priceToCoordinate(low.low);

    if (highY == null || lowY == null) {
      setPriceGaugeMarkers(null);
      return;
    }

    setPriceGaugeMarkers({
      high: Number(high.high),
      low: Number(low.low),
      highY,
      lowY,
    });
  }, []);

  const updateVolumeProfile = useCallback(async (timeRange = null) => {
    if (!visibleIndicators.vrvp || !candleSeriesRef.current || stockDataRef.current.length === 0) {
      setVolumeProfileBars([]);
      setVolumeProfileSource('');
      return;
    }

    const rangeDates = getTimeRangeDates(timeRange || chartRef.current?.timeScale().getVisibleRange());
    const visibleData = rangeDates
      ? stockDataRef.current.filter(d => d.date >= rangeDates.from && d.date <= rangeDates.to)
      : stockDataRef.current;

    if (visibleData.length === 0) {
      setVolumeProfileBars([]);
      setVolumeProfileSource('');
      return;
    }

    const visibleHigh = Math.max(...visibleData.map(d => Number(d.high)));
    const visibleLow = Math.min(...visibleData.map(d => Number(d.low)));
    const priceRange = visibleHigh - visibleLow;

    if (!Number.isFinite(priceRange) || priceRange <= 0) {
      setVolumeProfileBars([]);
      setVolumeProfileSource('');
      return;
    }

    const binCount = 24;
    const profileWidth = Math.min(190, Math.max(110, (chartContainerRef.current?.clientWidth || 700) * 0.22));
    const renderBins = (bins, sourceLabel) => {
      const maxVolume = Math.max(...bins.map(bin => Number(bin.volume) || 0));
      if (!Number.isFinite(maxVolume) || maxVolume <= 0) {
        setVolumeProfileBars([]);
        setVolumeProfileSource('');
        return false;
      }

      const bars = bins
        .map((bin) => {
          const topY = candleSeriesRef.current.priceToCoordinate(Number(bin.high));
          const bottomY = candleSeriesRef.current.priceToCoordinate(Number(bin.low));
          if (topY == null || bottomY == null) return null;

          const volume = Number(bin.volume) || 0;
          return {
            top: Math.min(topY, bottomY),
            height: Math.max(Math.abs(bottomY - topY), 3),
            width: Math.max((volume / maxVolume) * profileWidth, 2),
            volume,
            price: (Number(bin.high) + Number(bin.low)) / 2,
            isPointOfControl: volume === maxVolume,
          };
        })
        .filter(Boolean);

      setVolumeProfileBars(bars);
      setVolumeProfileSource(sourceLabel);
      return bars.length > 0;
    };

    if (rangeDates) {
      try {
        const alpacaProfile = await api.getAlpacaVolumeProfile(
          symbolRef.current,
          rangeDates.from,
          rangeDates.to,
          'iex',
          binCount
        );
        const alpacaBins = alpacaProfile?.data?.bars || [];
        if (alpacaProfile.success && alpacaBins.length > 0 && renderBins(alpacaBins, alpacaProfile.data.source || 'alpaca')) {
          return;
        }
      } catch (err) {
        console.warn('Alpaca volume profile unavailable, using local estimate.', err);
      }
    }

    const binSize = priceRange / binCount;
    const bins = Array.from({ length: binCount }, (_, index) => ({
      low: visibleLow + index * binSize,
      high: visibleLow + (index + 1) * binSize,
      volume: 0,
    }));

    visibleData.forEach((point) => {
      const barLow = Number(point.low);
      const barHigh = Number(point.high);
      const barVolume = Number(point.volume) || 0;
      const lowIndex = Math.max(0, Math.floor((barLow - visibleLow) / binSize));
      const highIndex = Math.min(binCount - 1, Math.floor((barHigh - visibleLow) / binSize));
      const touchedBins = Math.max(highIndex - lowIndex + 1, 1);

      for (let index = lowIndex; index <= highIndex; index += 1) {
        bins[index].volume += barVolume / touchedBins;
      }
    });

    renderBins(bins, 'local_daily_estimate');
  }, [visibleIndicators.vrvp]);

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
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const backgroundRefresh = useCallback(async () => {
    if (!initialLoadDoneRef.current || !isActiveRef.current) return;
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
              color: d.price >= d.open ? `rgba(${themePrimaryRgb}, 0.3)` : `rgba(${themeSecondaryRgb}, 0.3)`,
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

  // Auto-retry every 1.5 seconds when there is a load error
  useEffect(() => {
    if (!error) return;
    const retryInterval = setInterval(() => {
      fetchInitialData();
    }, 1500);
    return () => clearInterval(retryInterval);
  }, [error, fetchInitialData]);

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
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 12,
        },
        grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: crosshairLine, labelBackgroundColor: labelBg },
          horzLine: { color: crosshairLine, labelBackgroundColor: labelBg },
        },
        rightPriceScale: { borderColor: chartBorder, scaleMargins: { top: 0.1, bottom: 0.25 } },
        timeScale: { borderColor: chartBorder, timeVisible: false, secondsVisible: false, fixRightEdge: true },
        handleScroll: { vertTouchDrag: false },
      });

      candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: themePrimary, downColor: themeSecondary,
        borderUpColor: themePrimary, borderDownColor: themeSecondary,
        wickUpColor: themePrimary, wickDownColor: themeSecondary,
      });

      volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' }, priceScaleId: '',
      });
      volumeSeriesRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      indicatorSeriesRef.current = {
        sma20: chartRef.current.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          visible: visibleIndicators.sma20,
        }),
        sma200: chartRef.current.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          visible: visibleIndicators.sma200,
        }),
        ema9: chartRef.current.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          visible: visibleIndicators.ema9,
        }),
        bbUpper: chartRef.current.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 2, // dashed
          priceLineVisible: false,
          lastValueVisible: false,
          visible: visibleIndicators.bbands,
        }),
        bbLower: chartRef.current.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 2, // dashed
          priceLineVisible: false,
          lastValueVisible: false,
          visible: visibleIndicators.bbands,
        }),
      };

      // Subscribe: when user scrolls/zooms near the left edge, load more
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (logicalRange && logicalRange.from < LOAD_TRIGGER_BARS) {
          loadMoreRef.current?.();
        }
      });

      let timeoutId = null;
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updatePriceGaugeMarkers(timeRange);
          updateVolumeProfile(timeRange);

          if (timeRange && stockDataRef.current.length > 0) {
            const rangeDates = getTimeRangeDates(timeRange);
            if (!rangeDates) return;

            const visibleData = stockDataRef.current.filter(d => d.date >= rangeDates.from && d.date <= rangeDates.to);
            if (visibleData.length > 0) {
              setVisibleRangeInfo({
                start: visibleData[0],
                end: visibleData[visibleData.length - 1]
              });
            }
          }
        }, 50);
      });

      chartRef.current.subscribeClick((param) => {
        if (!param?.point) return;

        const chartHeight = chartContainerRef.current?.clientHeight || 0;
        if (chartHeight > 0 && param.point.y > chartHeight * 0.76) {
          openEducationTopic('volume');
          return;
        }

        const candle = param.seriesData?.get(candleSeriesRef.current);
        if (!candle) return;

        openEducationTopic(candle.close >= candle.open ? 'greenCandle' : 'redCandle');
      });
    }

    const candleData = stockData
      .map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.price }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    const volumeData = stockData
      .map(d => ({
        time: d.date, value: d.volume,
        color: d.price >= d.open ? `rgba(${themePrimaryRgb}, 0.3)` : `rgba(${themeSecondaryRgb}, 0.3)`,
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    const sortedStockData = [...stockData].sort((a, b) => a.date.localeCompare(b.date));
    indicatorSeriesRef.current.sma20?.setData(calculateSMA(sortedStockData, 20));
    indicatorSeriesRef.current.sma200?.setData(calculateSMA(sortedStockData, 200));
    indicatorSeriesRef.current.ema9?.setData(calculateEMA(sortedStockData, 9));
    const bbData = calculateBollingerBands(sortedStockData, 20, 2);
    indicatorSeriesRef.current.bbUpper?.setData(bbData.upper);
    indicatorSeriesRef.current.bbLower?.setData(bbData.lower);
    indicatorSeriesRef.current.sma20?.applyOptions({ visible: visibleIndicators.sma20 });
    indicatorSeriesRef.current.sma200?.applyOptions({ visible: visibleIndicators.sma200 });
    indicatorSeriesRef.current.ema9?.applyOptions({ visible: visibleIndicators.ema9 });
    indicatorSeriesRef.current.bbUpper?.applyOptions({ visible: visibleIndicators.bbands });
    indicatorSeriesRef.current.bbLower?.applyOptions({ visible: visibleIndicators.bbands });

    // Restore view position when prepending, or fit content on first load
    if (visibleRangeRef.current) {
      chartRef.current.timeScale().setVisibleRange(visibleRangeRef.current);
      visibleRangeRef.current = null;
    } else if (isActive && (!initialFitDoneRef.current || stockData.length <= 130)) {
      chartRef.current.timeScale().fitContent();
      initialFitDoneRef.current = true;
    }
    setTimeout(() => updatePriceGaugeMarkers(), 0);
    setTimeout(() => updateVolumeProfile(), 0);
  }, [stockData, isActive, visibleIndicators, updatePriceGaugeMarkers, updateVolumeProfile]);

  // --- Resize handler (uses ResizeObserver to react to container width changes) ---
  const chartRowRef = useRef(null);
  useEffect(() => {
    const syncChartWidth = () => {
      if (chartRef.current && chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
        updatePriceGaugeMarkers();
        updateVolumeProfile();
      }
    };

    // ResizeObserver catches both window resizes AND layout shifts (e.g. analysis panel toggling)
    let ro;
    if (chartContainerRef.current) {
      ro = new ResizeObserver(syncChartWidth);
      ro.observe(chartContainerRef.current);
    }

    // Fallback for older browsers
    window.addEventListener('resize', syncChartWidth);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncChartWidth);
    };
  }, []);

  // --- Ensure chart renders and fits correctly when becoming active ---
  useEffect(() => {
    if (isActive && chartRef.current && chartContainerRef.current) {
      setTimeout(() => {
        if (chartRef.current && chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight
          });
          updatePriceGaugeMarkers();
          updateVolumeProfile();
          if (!initialFitDoneRef.current && stockDataRef.current.length > 0) {
            chartRef.current.timeScale().fitContent();
            initialFitDoneRef.current = true;
          }
        }
      }, 50);
    }
  }, [isActive, updatePriceGaugeMarkers, updateVolumeProfile]);

  // --- Force resize when analysis panel toggles or resizes ---
  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      setTimeout(() => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
          updatePriceGaugeMarkers();
          updateVolumeProfile();
        }
      }, 50); // Small delay to allow flexbox to calculate new layout
    }
  }, [showAnalysis, panelWidth, updatePriceGaugeMarkers, updateVolumeProfile]);

  useEffect(() => {
    updateVolumeProfile();
  }, [visibleIndicators.vrvp, updateVolumeProfile]);

  // --- Cleanup chart on unmount ---
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        indicatorSeriesRef.current = {};
      }
    };
  }, []);

  // --- Reset chart when symbol changes ---
  useEffect(() => {
    initialLoadDoneRef.current = false;
    initialFitDoneRef.current = false;
    allHistoryLoadedRef.current = false;
    oldestDateRef.current = null;
    stockDataRef.current = [];
    visibleRangeRef.current = null;

    // Reset AI analysis state so stale results / stuck loading don't persist
    setShowAnalysis(false);
    setAnalysisText('');
    setAnalysisMetrics(null);
    setAnalysisLoading(false);
    setAnalysisError(null);
    setVisibleRangeInfo(null);
    setPriceGaugeMarkers(null);
    setVolumeProfileBars([]);
    setVolumeProfileSource('');

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    }
  }, [symbol]);

  // --- Helpers ---
  const calculateSMA = (data, period) => {
    const result = [];
    let runningTotal = 0;

    data.forEach((point, index) => {
      runningTotal += point.price;
      if (index >= period) runningTotal -= data[index - period].price;

      if (index >= period - 1) {
        result.push({
          time: point.date,
          value: Number((runningTotal / period).toFixed(2)),
        });
      }
    });

    return result;
  };

  const calculateEMA = (data, period) => {
    if (data.length < period) return [];

    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, point) => sum + point.price, 0) / period;

    result.push({
      time: data[period - 1].date,
      value: Number(ema.toFixed(2)),
    });

    for (let i = period; i < data.length; i += 1) {
      ema = (data[i].price - ema) * multiplier + ema;
      result.push({
        time: data[i].date,
        value: Number(ema.toFixed(2)),
      });
    }

    return result;
  };

  const calculateBollingerBands = (data, period = 20, numStd = 2) => {
    const upper = [];
    const lower = [];

    data.forEach((point, index) => {
      if (index < period - 1) return;
      const window = data.slice(index - period + 1, index + 1);
      const mean = window.reduce((sum, p) => sum + p.price, 0) / period;
      const variance = window.reduce((sum, p) => sum + (p.price - mean) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      upper.push({ time: point.date, value: Number((mean + numStd * std).toFixed(2)) });
      lower.push({ time: point.date, value: Number((mean - numStd * std).toFixed(2)) });
    });

    return { upper, lower };
  };

  const calculateMACDSignal = (data) => {
    // MACD Line = EMA(12) - EMA(26)
    const ema12Data = calculateEMA(data, 12);
    const ema26Data = calculateEMA(data, 26);

    // Align by time — build a map for EMA 26
    const ema26Map = new Map(ema26Data.map(d => [d.time, d.value]));
    const macdLine = ema12Data
      .filter(d => ema26Map.has(d.time))
      .map(d => ({ time: d.time, value: Number((d.value - ema26Map.get(d.time)).toFixed(4)) }));

    if (macdLine.length < 9) return [];

    // Signal Line = EMA(9) of MACD Line
    const signalPeriod = 9;
    const k = 2 / (signalPeriod + 1);
    let ema = macdLine.slice(0, signalPeriod).reduce((sum, p) => sum + p.value, 0) / signalPeriod;
    const result = [{ time: macdLine[signalPeriod - 1].time, value: Number(ema.toFixed(4)) }];

    for (let i = signalPeriod; i < macdLine.length; i += 1) {
      ema = (macdLine[i].value - ema) * k + ema;
      result.push({ time: macdLine[i].time, value: Number(ema.toFixed(4)) });
    }

    return result;
  };

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

  // --- AI Analysis ---
  const analyzeVisibleRange = useCallback(async () => {
    if (analysisLoading) return; // prevent duplicate requests while in-flight

    if (!chartRef.current) {
      setAnalysisError('Chart is still loading. Please wait a moment and try again.');
      setShowAnalysis(true);
      return;
    }

    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();

    if (!visibleRange) {
      setAnalysisError('No visible range detected. Make sure the chart is loaded.');
      setShowAnalysis(true);
      return;
    }

    // lightweight-charts uses ISO date strings ('YYYY-MM-DD') as time values
    const fromStr = typeof visibleRange.from === 'string'
      ? visibleRange.from
      : new Date(visibleRange.from * 1000).toISOString().split('T')[0];
    const toStr = typeof visibleRange.to === 'string'
      ? visibleRange.to
      : new Date(visibleRange.to * 1000).toISOString().split('T')[0];

    // Filter data to the visible window
    const visibleData = stockDataRef.current.filter(
      d => d.date >= fromStr && d.date <= toStr
    );

    if (visibleData.length < 2) {
      setAnalysisError('Zoom in to at least 2 bars for a meaningful analysis.');
      setShowAnalysis(true);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisText('');
    setAnalysisMetrics(null);
    setShowAnalysis(true);

    try {
      const result = await api.analyzeChart({
        symbol: symbolRef.current,
        company_name: stockInfo?.name || symbolRef.current,
        sector: stockInfo?.sector || 'Unknown',
        data: visibleData,
      });

      if (result.success) {
        setAnalysisText(result.analysis);
        setAnalysisMetrics(result.metrics);
      } else {
        setAnalysisError(result.error || 'Analysis failed.');
      }
    } catch (err) {
      setAnalysisError(err.message || 'Failed to connect to analysis service.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [analysisLoading, stockInfo]);

  // Simple markdown-ish renderer: bold, bullets, headings
  const renderAnalysisText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Heading
      const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        const fontSize = level === 1 ? '16px' : level === 2 ? '14px' : '13px';
        return (
          <div key={i} style={{
            fontSize, fontWeight: 'bold', marginTop: i === 0 ? 0 : '14px',
            marginBottom: '6px', color: 'var(--accent)',
          }}>{content}</div>
        );
      }
      // Bullet
      if (line.match(/^\s*[-*•]\s+/)) {
        const content = line.replace(/^\s*[-*•]\s+/, '');
        return (
          <div key={i} style={{ paddingLeft: '16px', marginBottom: '4px', lineHeight: '1.6' }}>
            <span style={{ color: 'var(--accent)', marginRight: '8px' }}>▸</span>
            <span dangerouslySetInnerHTML={{
              __html: content
                .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-main)">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
            }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) return <div key={i} style={{ height: '8px' }} />;
      // Normal paragraph
      return (
        <div key={i} style={{ marginBottom: '6px', lineHeight: '1.6' }}>
          <span dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-main)">$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
          }} />
        </div>
      );
    });
  };

  // --- Render ---
  if (loading && stockData.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100vh', padding: '20px',
        backgroundColor: 'var(--bg-main)', fontFamily: 'var(--font-main)', overflow: 'hidden'
      }}>
        <div style={{ color: 'var(--text-main)' }}>Loading candlestick data...</div>
      </div>
    );
  }

  if (error && stockData.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '14px',
        backgroundColor: 'var(--bg-main)', fontFamily: 'var(--font-main)'
      }}>
        <div style={{ color: 'var(--chart-down)', fontSize: '14px' }}>Error: {error}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-muted)', fontSize: '13px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '14px', height: '14px',
            border: '2px solid var(--text-muted)',
            borderTopColor: 'var(--theme-primary)',
            borderRadius: '50%',
            animation: 'tv-spin 0.9s linear infinite',
          }} />
          Retrying...
          <style>{`@keyframes tv-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', padding: isCompact ? '10px' : '20px',
      backgroundColor: 'var(--bg-main)', color: 'var(--text-main)',
      fontFamily: 'var(--font-main)', overflowY: isCompact ? 'hidden' : 'auto', overflowX: 'hidden',
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
          <span style={{
            color: 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 'bold',
            border: '1px solid var(--border-main)',
            backgroundColor: 'var(--bg-panel)',
            padding: '4px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}>
            1D
          </span>

        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchInput.trim().toUpperCase();
              if (trimmed) { setSymbol(trimmed); setSearchInput(''); setShowSuggestions(false); }
            }}
            onClick={() => selectEducationTopic('searchTicker')}
            style={{
              display: 'flex',
              gap: '0',
              alignItems: 'center',
              ...getEducationHighlightStyle('searchTicker'),
            }}
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
                  padding: '6px 10px', fontFamily: 'var(--font-main)',
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
                          fontFamily: 'var(--font-main)', fontSize: '12px',
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
              fontFamily: 'var(--font-main)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>Go</button>
          </form>

          <button
            onClick={fetchInitialData}
            disabled={loading}
            style={{
              backgroundColor: loading ? 'var(--bg-panel)' : 'var(--text-main)',
              color: loading ? 'var(--text-muted)' : 'var(--bg-main)',
              border: '2px solid var(--border-focus)', padding: '6px 12px',
              fontFamily: 'var(--font-main)', fontSize: '12px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
              opacity: loading ? 0.6 : 1
            }}
          >{loading ? 'Loading...' : 'Refresh'}</button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 4px',
            ...getEducationHighlightStyle(
              selectedEducationTopic.startsWith('sma') || selectedEducationTopic.startsWith('ema') || selectedEducationTopic === 'vrvp'
                ? selectedEducationTopic
                : 'sma20'
            ),
          }}>
            {isCompact ? (
              <select
                onChange={(e) => {
                  if (e.target.value) toggleIndicator(e.target.value);
                  e.target.value = "";
                }}
                style={{
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  border: '2px solid var(--border-focus)',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-main)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              >
                <option value="">Indicators</option>
                {[
                  { id: 'sma20', label: 'SMA 20' },
                  { id: 'sma200', label: 'SMA 200' },
                  { id: 'ema9', label: 'EMA 9' },
                  { id: 'bbands', label: 'BB' },
                  { id: 'vrvp', label: 'VRVP' },
                ].map(ind => (
                  <option key={ind.id} value={ind.id}>
                    {visibleIndicators[ind.id] ? '✓ ' : ''}{ind.label}
                  </option>
                ))}
              </select>
            ) : (
              [
                { id: 'sma20', label: 'SMA 20', color: '#f59e0b' },
                { id: 'sma200', label: 'SMA 200', color: '#3b82f6' },
                { id: 'ema9', label: 'EMA 9', color: '#a855f7' },
                { id: 'bbands', label: 'BB', color: '#f59e0b' },
                { id: 'vrvp', label: 'VRVP', color: 'var(--theme-primary)' },
              ].map((indicator) => (
                <button
                  key={indicator.id}
                  type="button"
                  onClick={() => toggleIndicator(indicator.id)}
                  aria-pressed={visibleIndicators[indicator.id]}
                  style={{
                    backgroundColor: visibleIndicators[indicator.id] ? indicator.color : 'var(--bg-main)',
                    color: visibleIndicators[indicator.id] ? '#ffffff' : 'var(--text-main)',
                    border: `2px solid ${visibleIndicators[indicator.id] ? indicator.color : 'var(--border-focus)'}`,
                    padding: '6px 10px',
                    fontFamily: 'var(--font-main)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                  title={`${visibleIndicators[indicator.id] ? 'Hide' : 'Show'} ${indicator.label}`}
                >
                  {indicator.label}
                </button>
              ))
            )}
          </div>

          {!isCompact && (
            <button
              type="button"
              onClick={() => {
                setShowEducation((current) => !current);
                setSelectedEducationTopic('stockChart');
              }}
              aria-pressed={showEducation}
              style={{
                backgroundColor: showEducation ? 'var(--theme-primary)' : 'var(--bg-main)',
                color: showEducation ? 'var(--bg-main)' : 'var(--text-main)',
                border: `2px solid ${showEducation ? 'var(--theme-primary)' : 'var(--border-focus)'}`,
                padding: '6px 12px',
                fontFamily: 'var(--font-main)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Educate {showEducation ? 'On' : 'Off'}
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Stats */}
      {realTimeData && (
        <div style={{
          display: 'flex', gap: '30px', marginBottom: '15px', padding: '12px 15px',
          backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-main)',
          flexWrap: 'wrap'
        }}>
          <div
            onClick={() => selectEducationTopic('currentPrice')}
            style={getEducationHighlightStyle('currentPrice')}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Current Price</div>
            <div style={{ color: realTimeData.change >= 0 ? 'var(--chart-up)' : 'var(--chart-down)', fontSize: '24px', fontWeight: 'bold' }}>
              ${realTimeData.current_price.toFixed(2)}
            </div>
            <div style={{ color: realTimeData.change >= 0 ? 'var(--chart-up)' : 'var(--chart-down)', fontSize: '13px' }}>
              {realTimeData.change >= 0 ? '+' : ''}{realTimeData.change.toFixed(2)} ({realTimeData.change_percent.toFixed(2)}%)
            </div>
          </div>
          <div
            onClick={() => selectEducationTopic('dayRange')}
            style={getEducationHighlightStyle('dayRange')}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Day Range</div>
            <div style={{ fontSize: '14px' }}>${realTimeData.day_low} - ${realTimeData.day_high}</div>
          </div>
          <div
            onClick={() => selectEducationTopic('volume')}
            style={getEducationHighlightStyle('volume')}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Volume</div>
            <div style={{ fontSize: '14px' }}>{formatVolume(realTimeData.volume)}</div>
          </div>
          {stockInfo?.market_cap > 0 && (
            <div
              onClick={() => selectEducationTopic('marketCap')}
              style={getEducationHighlightStyle('marketCap')}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Market Cap</div>
              <div style={{ fontSize: '14px' }}>{formatMarketCap(stockInfo.market_cap)}</div>
            </div>
          )}
          {stockInfo?.pe_ratio && stockInfo.pe_ratio !== 'N/A' && (
            <div
              onClick={() => selectEducationTopic('peRatio')}
              style={getEducationHighlightStyle('peRatio')}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>P/E Ratio</div>
              <div style={{ fontSize: '14px' }}>{stockInfo.pe_ratio.toFixed(2)}</div>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
            {!isCompact && visibleRangeInfo && (
              <div style={{ textAlign: 'right', borderRight: '1px solid var(--border-main)', paddingRight: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Visible Window</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--text-main)' }}>{visibleRangeInfo.start.date}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                  <span style={{ color: 'var(--text-main)' }}>{visibleRangeInfo.end.date}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ${visibleRangeInfo.start.price.toFixed(2)} — ${visibleRangeInfo.end.price.toFixed(2)}
                </div>
              </div>
            )}
            
            {!isCompact && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Last Updated</div>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  {lastUpdate?.toLocaleTimeString() || 'N/A'}
                  {isLoadingMore && <span style={{ color: 'var(--theme-primary)', fontSize: '11px' }} title="Loading older data...">⟳</span>}
                </div>
                {loading && <div style={{ color: 'var(--theme-primary)', fontSize: '11px' }}>Updating...</div>}
              </div>
            )}

            {!isCompact && (
              <button
                onClick={analyzeVisibleRange}
                disabled={analysisLoading}
                style={{
                  backgroundColor: analysisLoading ? 'var(--bg-panel)' : 'var(--text-main)',
                  color: analysisLoading ? 'var(--text-muted)' : 'var(--bg-main)',
                  border: '2px solid var(--border-focus)',
                  padding: '8px 14px',
                  fontFamily: 'var(--font-main)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: analysisLoading ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: analysisLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {analysisLoading ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: '12px', height: '12px',
                      border: '2px solid var(--text-muted)', borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'ai-spin 0.8s linear infinite',
                    }} />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '14px' }}>✦</span>
                    AI Analyze
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart + Analysis Row */}
      <div ref={chartRowRef} style={{
        display: 'flex',
        flex: '1 1 0%',
        minHeight: '200px',
        minWidth: 0,
        gap: '0px',
      }}>
        {/* Chart Container */}
        <div
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-main)',
          }}
        >
          <div
            ref={chartContainerRef}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          />
          {priceGaugeMarkers && (
            <>
              <div style={{
                position: 'absolute',
                right: '8px',
                top: `${priceGaugeMarkers.highY}px`,
                transform: 'translateY(-50%)',
                zIndex: 18,
                pointerEvents: 'none',
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--bg-main)',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '4px 7px',
                borderRadius: '3px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                minWidth: '82px',
                textAlign: 'center',
              }}>
                HIGH ${priceGaugeMarkers.high.toFixed(2)}
              </div>
              <div style={{
                position: 'absolute',
                right: '8px',
                top: `${priceGaugeMarkers.lowY}px`,
                transform: 'translateY(-50%)',
                zIndex: 18,
                pointerEvents: 'none',
                backgroundColor: 'var(--theme-secondary)',
                color: 'var(--bg-main)',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '4px 7px',
                borderRadius: '3px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                minWidth: '82px',
                textAlign: 'center',
              }}>
                LOW ${priceGaugeMarkers.low.toFixed(2)}
              </div>
            </>
          )}
          {visibleIndicators.vrvp && volumeProfileBars.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: '96px',
              bottom: 0,
              width: '210px',
              zIndex: 14,
              pointerEvents: 'auto',
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: 0,
                padding: '4px 7px',
                backgroundColor: 'rgba(var(--theme-primary-rgb), 0.16)',
                border: '1px solid rgba(var(--theme-primary-rgb), 0.55)',
                color: 'var(--text-main)',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
                onClick={() => openEducationTopic('vrvp')}
              >
                VRVP{volumeProfileSource ? ` (${volumeProfileSource.replace('alpaca_', '').replaceAll('_', ' ')})` : ''}
              </div>
              {volumeProfileBars.map((bar, index) => (
                <div
                  key={`${bar.price}-${index}`}
                  onClick={() => openEducationTopic('vrvp')}
                  title={`${volumeProfileSource.startsWith('alpaca') ? 'Alpaca' : 'Approx'} volume near $${bar.price.toFixed(2)}: ${formatVolume(bar.volume)}`}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: `${bar.top}px`,
                    width: `${bar.width}px`,
                    height: `${bar.height}px`,
                    backgroundColor: bar.isPointOfControl
                      ? 'rgba(var(--theme-primary-rgb), 0.62)'
                      : 'rgba(var(--theme-primary-rgb), 0.28)',
                    border: bar.isPointOfControl
                      ? '1px solid rgba(var(--theme-primary-rgb), 0.9)'
                      : '1px solid rgba(var(--theme-primary-rgb), 0.16)',
                    borderRadius: '2px 0 0 2px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
          {showEducation && (
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              zIndex: 20,
              display: 'flex',
              gap: '10px',
              pointerEvents: 'auto',
            }}>
              <button
                type="button"
                onClick={() => selectEducationTopic('greenCandle')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  border: selectedEducationTopic === 'greenCandle'
                    ? '1px solid var(--theme-primary)'
                    : '1px solid rgba(var(--theme-primary-rgb), 0.55)',
                  backgroundColor: selectedEducationTopic === 'greenCandle'
                    ? 'rgba(var(--theme-primary-rgb), 0.18)'
                    : 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  boxShadow: selectedEducationTopic === 'greenCandle'
                    ? '0 0 0 2px rgba(var(--theme-primary-rgb), 0.25), 0 0 18px rgba(var(--theme-primary-rgb), 0.35)'
                    : '0 0 12px rgba(var(--theme-primary-rgb), 0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '12px',
                  height: '28px',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '5px',
                    top: 0,
                    width: '2px',
                    height: '28px',
                    backgroundColor: 'var(--theme-primary)',
                  }} />
                  <span style={{
                    position: 'absolute',
                    left: '1px',
                    top: '8px',
                    width: '10px',
                    height: '14px',
                    backgroundColor: 'var(--theme-primary)',
                  }} />
                </span>
                Green Candle
              </button>

              <button
                type="button"
                onClick={() => selectEducationTopic('redCandle')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  border: selectedEducationTopic === 'redCandle'
                    ? '1px solid var(--theme-secondary)'
                    : '1px solid rgba(var(--theme-secondary-rgb), 0.55)',
                  backgroundColor: selectedEducationTopic === 'redCandle'
                    ? 'rgba(var(--theme-secondary-rgb), 0.16)'
                    : 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  boxShadow: selectedEducationTopic === 'redCandle'
                    ? '0 0 0 2px rgba(var(--theme-secondary-rgb), 0.22), 0 0 18px rgba(var(--theme-secondary-rgb), 0.32)'
                    : '0 0 12px rgba(var(--theme-secondary-rgb), 0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '12px',
                  height: '28px',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '5px',
                    top: 0,
                    width: '2px',
                    height: '28px',
                    backgroundColor: 'var(--theme-secondary)',
                  }} />
                  <span style={{
                    position: 'absolute',
                    left: '1px',
                    top: '8px',
                    width: '10px',
                    height: '14px',
                    backgroundColor: 'var(--theme-secondary)',
                  }} />
                </span>
                Red Candle
              </button>
            </div>
          )}
        </div>

        {/* AI Analysis Panel — right side */}
        {showAnalysis && !isCompact ? (
          <div style={{
            width: `${panelWidth}px`,
            flexShrink: 0,
            marginLeft: '10px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-main)',
            borderRadius: '4px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            animation: 'ai-slideIn 0.3s ease-out',
          }}>
            {/* Drag Handle */}
            <div
              onMouseDown={(e) => {
                isDraggingRef.current = true;
                dragStartRef.current = { x: e.clientX, width: panelWidth };
                document.body.style.cursor = 'col-resize';
                e.preventDefault();
              }}
              style={{
                width: '6px',
                backgroundColor: 'var(--theme-primary)',
                cursor: 'col-resize',
                flexShrink: 0,
                opacity: 0.8,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.8}
              title="Drag to resize, drag right to close"
            />
            {/* Panel Content Wrapper */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
            }}>
              {/* Panel header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-main)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px' }}>✦</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>AI Technical Analysis</span>
                  {analysisMetrics && (
                    <span style={{
                      color: 'var(--text-muted)', fontSize: '11px',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      padding: '2px 8px', borderRadius: '10px',
                    }}>
                      {analysisMetrics.start_date} → {analysisMetrics.end_date}
                      {' • '}
                      <span style={{
                        color: analysisMetrics.pct_change >= 0 ? 'var(--chart-up)' : 'var(--chart-down)',
                        fontWeight: 'bold',
                      }}>
                        {analysisMetrics.pct_change >= 0 ? '+' : ''}{analysisMetrics.pct_change}%
                      </span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAnalysis(false)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '16px', padding: '0 4px',
                    fontFamily: 'var(--font-main)', lineHeight: 1,
                  }}
                  title="Close analysis"
                >✕</button>
              </div>

              {/* Panel body */}
              <div className="ai-panel-body" style={{
                padding: '14px 16px',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-main)',
                flex: 1,
              }}>
                {analysisLoading && (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '30px 0', gap: '12px',
                  }}>
                    <div style={{
                      width: '28px', height: '28px',
                      border: '3px solid var(--border-main)',
                      borderTopColor: 'var(--theme-primary)',
                      borderRadius: '50%',
                      animation: 'ai-spin 0.8s linear infinite',
                    }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Analyzing {symbolRef.current} chart data with AI…
                    </span>
                  </div>
                )}

                {analysisError && (
                  <div style={{
                    color: 'var(--chart-down)', padding: '12px',
                    backgroundColor: isDark ? 'rgba(255,68,68,0.08)' : 'rgba(255,68,68,0.06)',
                    borderRadius: '4px',
                  }}>
                    ⚠ {analysisError}
                  </div>
                )}

                {!analysisLoading && !analysisError && analysisText && (
                  <div>{renderAnalysisText(analysisText)}</div>
                )}
                {!analysisLoading && !analysisError && !analysisText && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>
                    No analysis available yet.<br /><br />Click <strong>AI Analyze</strong> to generate one for the visible chart window.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            onMouseDown={(e) => {
              isDraggingRef.current = true;
              dragStartRef.current = { x: e.clientX, width: 0 };
              document.body.style.cursor = 'col-resize';
              e.preventDefault();
            }}
            style={{
              width: '6px',
              flexShrink: 0,
              marginLeft: '10px',
              backgroundColor: 'var(--theme-primary)',
              borderRadius: '4px',
              cursor: 'col-resize',
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = 1}
            onMouseLeave={(e) => e.target.style.opacity = 0.7}
            title="Drag left to open and resize"
          />
        )}
      </div>

      {showEducation && (
        <div style={{
          position: 'fixed',
          left: `${educationPanelPosition.x}px`,
          top: `${educationPanelPosition.y}px`,
          width: '320px',
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: '45vh',
          zIndex: 2000,
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-main)',
          borderLeft: '4px solid var(--theme-primary)',
          borderRadius: '4px',
          boxShadow: isDark
            ? '0 16px 40px rgba(0, 0, 0, 0.55)'
            : '0 16px 40px rgba(0, 0, 0, 0.18)',
          color: 'var(--text-main)',
          overflow: 'hidden',
        }}>
          <div
            onMouseDown={(e) => {
              isEducationDraggingRef.current = true;
              educationDragStartRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                panelX: educationPanelPosition.x,
                panelY: educationPanelPosition.y,
              };
              document.body.style.cursor = 'move';
              e.preventDefault();
            }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-main)',
              cursor: 'move',
              userSelect: 'none',
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
            title="Drag to move"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>{activeEducation.title}</h3>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => openReaderSection(activeEducation.readerSection)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--theme-primary)',
                  color: 'var(--theme-primary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  padding: '4px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
                title={`Learn more about ${activeEducation.title}`}
              >
                Learn more
              </button>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowEducation(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '2px 4px',
              }}
              title="Close education panel"
            >
              x
            </button>
          </div>
          <div style={{
            padding: '12px 14px',
            overflowY: 'auto',
            maxHeight: 'calc(45vh - 42px)',
          }}>
            <p style={{
              margin: 0,
              color: 'var(--text-muted)',
              fontSize: '13px',
              lineHeight: 1.6,
            }}>
              {activeEducation.body}
            </p>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes ai-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ai-slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ai-panel-body::-webkit-scrollbar {
          display: none;
        }
        .ai-panel-body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

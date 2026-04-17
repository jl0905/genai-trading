import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { api } from '../api.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
  CandlestickController,
  CandlestickElement
);

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

// Detect key points: peaks, troughs, and significant price movements
const detectKeyPoints = (data, sensitivity = 3) => {
  const keyPoints = [];
  const windowSize = 5;
  
  for (let i = windowSize; i < data.length - windowSize; i++) {
    const current = data[i].price;
    const window = data.slice(i - windowSize, i + windowSize + 1);
    const prices = window.map(d => d.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    
    // Peak detection
    if (current === max && current > data[i-1].price && current > data[i+1].price) {
      const significance = (current - data[i-1].price) / data[i-1].price * 100;
      if (significance > 0.5) {
        keyPoints.push({
          index: i,
          type: 'peak',
          price: current,
          date: data[i].date,
          significance: significance,
          label: `Peak: $${current.toFixed(2)}`,
          description: `Local maximum at $${current.toFixed(2)}. Price increased ${significance.toFixed(2)}% before this peak.`
        });
      }
    }
    
    // Trough detection
    if (current === min && current < data[i-1].price && current < data[i+1].price) {
      const significance = (data[i-1].price - current) / data[i-1].price * 100;
      if (significance > 0.5) {
        keyPoints.push({
          index: i,
          type: 'trough',
          price: current,
          date: data[i].date,
          significance: significance,
          label: `Trough: $${current.toFixed(2)}`,
          description: `Local minimum at $${current.toFixed(2)}. Price dropped ${significance.toFixed(2)}% before this trough.`
        });
      }
    }
  }
  
  // Detect significant breakouts (price movements > 5%)
  for (let i = 1; i < data.length; i++) {
    const change = (data[i].price - data[i-1].price) / data[i-1].price * 100;
    if (Math.abs(change) > 5) {
      // Check if not already marked as peak/trough nearby
      const nearby = keyPoints.filter(kp => Math.abs(kp.index - i) <= 2);
      if (nearby.length === 0) {
        keyPoints.push({
          index: i,
          type: change > 0 ? 'breakout-up' : 'breakout-down',
          price: data[i].price,
          date: data[i].date,
          significance: Math.abs(change),
          label: `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`,
          description: `Significant price movement: ${change.toFixed(2)}% from $${data[i-1].price.toFixed(2)} to $${data[i].price.toFixed(2)}`
        });
      }
    }
  }
  
  return keyPoints.sort((a, b) => a.index - b.index);
};

export default function InteractiveChart() {
  const [stockData, setStockData] = useState([]);
  const [stockInfo, setStockInfo] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('6mo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [chartType, setChartType] = useState('line');
  const chartRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Track tab visibility to pause polling when hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch stock data
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getStockData(symbol, period);
      
      if (data.success) {
        setStockData(data.historical);
        setStockInfo(data.company);
        setRealTimeData(data.real_time);
        setLastUpdate(new Date());
        
        // Detect key points on real data
        const points = detectKeyPoints(data.historical);
        setKeyPoints(points);
      } else {
        setError(data.error || 'Failed to fetch stock data');
      }
    } catch (err) {
      setError(err.message || 'Error fetching stock data');
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  // Initial fetch and polling (only when tab is visible)
  useEffect(() => {
    fetchStockData();
    
    // Poll every 30 seconds for updates, but only if tab is visible
    const interval = setInterval(() => {
      if (isVisibleRef.current) {
        fetchStockData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchStockData]);
  
  const chartData = useMemo(() => {
    if (chartType === 'candlestick') {
      return {
        datasets: [{
          label: 'Price',
          data: stockData.map(d => ({
            x: new Date(d.date).getTime(),
            o: d.open,
            h: d.high,
            l: d.low,
            c: d.price
          })),
          borderColors: {
            up: '#44ff44',
            down: '#ff4444',
            unchanged: '#888888'
          },
          backgroundColors: {
            up: 'rgba(68, 255, 68, 0.5)',
            down: 'rgba(255, 68, 68, 0.5)',
            unchanged: 'rgba(136, 136, 136, 0.5)'
          }
        }]
      };
    }
    
    const prices = stockData.map(d => d.price);
    const dates = stockData.map(d => d.date);
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Price',
          data: prices,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };
  }, [stockData, keyPoints, chartType]);
  
  // Memoize chart options to prevent unnecessary re-renders
  const options = useMemo(() => {
    const isCandlestick = chartType === 'candlestick';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: isCandlestick ? 'Candlestick Chart - Click markers for details' : 'Interactive Stock Chart - Click markers for details',
          color: '#ffffff',
          font: {
            size: 16,
            family: 'Courier New, monospace'
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ffffff',
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              if (isCandlestick && items.length > 0 && items[0].raw?.x) {
                return new Date(items[0].raw.x).toLocaleDateString();
              }
              return items[0]?.label || '';
            },
            label: (context) => {
              if (isCandlestick) {
                const raw = context.raw;
                return [
                  `Open: $${raw.o.toFixed(2)}`,
                  `High: $${raw.h.toFixed(2)}`,
                  `Low: $${raw.l.toFixed(2)}`,
                  `Close: $${raw.c.toFixed(2)}`
                ];
              }
              return `Price: $${context.parsed.y.toFixed(2)}`;
            }
          }
        },
        annotation: {
          annotations: keyPoints.reduce((acc, point, idx) => {
            const color = point.type === 'peak' ? '#ff4444' : 
                          point.type === 'trough' ? '#44ff44' : '#ffaa00';
            
            acc[`point${idx}`] = {
              type: 'point',
              xValue: isCandlestick ? new Date(point.date).getTime() : point.date,
              yValue: point.price,
              backgroundColor: color,
              borderColor: '#ffffff',
              borderWidth: 2,
              radius: 10,
              hoverRadius: 14
            };
            
            return acc;
          }, {})
        }
      },
      scales: {
        x: isCandlestick ? {
          type: 'linear',
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            borderColor: '#ffffff'
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: 6,
            callback: (value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        } : {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            borderColor: '#ffffff'
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: 6
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            borderColor: '#ffffff'
          },
          ticks: {
            color: '#ffffff',
            maxTicksLimit: 6,
            callback: (value) => `$${value}`
          }
        }
      },
      onClick: (event, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const clickedPoint = keyPoints.find(kp => kp.index === index);
          
          if (clickedPoint) {
            setSelectedPoint(clickedPoint);
            setModalPosition({ x: event.x, y: event.y });
          }
        }
      }
    };
  }, [keyPoints, chartType]);
  
  const closeModal = () => {
    setSelectedPoint(null);
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
  
  // Skeleton loader for initial load - shows layout immediately
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
        {/* Header skeleton */}
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
        
        {/* Stats skeleton */}
        <div style={{
          display: 'flex',
          gap: '30px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#111',
          border: '1px solid #333'
        }}>
          {[1,2,3,4,5].map(i => (
            <div key={i}>
              <div style={{ width: '80px', height: '12px', backgroundColor: '#222', marginBottom: '8px', borderRadius: '2px' }} />
              <div style={{ width: '100px', height: '28px', backgroundColor: '#222', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        
        {/* Chart skeleton */}
        <div style={{ height: 'calc(100% - 220px)', backgroundColor: '#111', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#444' }}>Loading stock data...</div>
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
      overflow: 'hidden'
    }}>
      {/* Header with Stock Selector */}
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
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
          
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
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
            <option value="1mo">1 Month</option>
            <option value="3mo">3 Months</option>
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
          </select>
          
          <button
            onClick={() => setChartType(chartType === 'line' ? 'candlestick' : 'line')}
            style={{
              backgroundColor: chartType === 'candlestick' ? '#00d4ff' : '#fff',
              color: '#000',
              border: `2px solid ${chartType === 'candlestick' ? '#00d4ff' : '#fff'}`,
              padding: '8px 12px',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            {chartType === 'candlestick' ? 'Candle' : 'Line'}
          </button>
          
          <button
            onClick={() => {
              // Debounce refresh clicks
              if (refreshTimeoutRef.current) return;
              fetchStockData();
              refreshTimeoutRef.current = setTimeout(() => {
                refreshTimeoutRef.current = null;
              }, 1000);
            }}
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

      {/* Real-Time Stock Info */}
      {realTimeData && (
        <div style={{
          display: 'flex',
          gap: '30px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#111',
          border: '1px solid #333'
        }}>
          <div>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Current Price</div>
            <div style={{ 
              color: realTimeData.change >= 0 ? '#44ff44' : '#ff4444',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              ${realTimeData.current_price.toFixed(2)}
            </div>
            <div style={{ 
              color: realTimeData.change >= 0 ? '#44ff44' : '#ff4444',
              fontSize: '14px'
            }}>
              {realTimeData.change >= 0 ? '+' : ''}{realTimeData.change.toFixed(2)} ({realTimeData.change_percent.toFixed(2)}%)
            </div>
          </div>
          
          <div>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Day Range</div>
            <div style={{ color: '#fff', fontSize: '16px' }}>
              ${realTimeData.day_low} - ${realTimeData.day_high}
            </div>
          </div>
          
          <div>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Volume</div>
            <div style={{ color: '#fff', fontSize: '16px' }}>
              {formatVolume(realTimeData.volume)}
            </div>
          </div>
          
          {stockInfo?.market_cap > 0 && (
            <div>
              <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Market Cap</div>
              <div style={{ color: '#fff', fontSize: '16px' }}>
                {formatMarketCap(stockInfo.market_cap)}
              </div>
            </div>
          )}
          
          {stockInfo?.pe_ratio && (
            <div>
              <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>P/E Ratio</div>
              <div style={{ color: '#fff', fontSize: '16px' }}>
                {stockInfo.pe_ratio.toFixed(2)}
              </div>
            </div>
          )}
          
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Last Updated</div>
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
        marginBottom: '15px'
      }}>
        <div style={{ color: '#888', fontSize: '14px' }}>
          Click markers for analysis details
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#ffffff' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#ff4444', borderRadius: '50%' }}></span>
            Peak
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#44ff44', borderRadius: '50%' }}></span>
            Trough
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#ffaa00', borderRadius: '50%' }}></span>
            Breakout
          </span>
        </div>
      </div>
      
      {/* Chart */}
      <div style={{ height: 'calc(100% - 220px)', position: 'relative' }}>
        <Chart 
          ref={chartRef}
          type={chartType === 'candlestick' ? 'candlestick' : 'line'} 
          data={chartData} 
          options={options}
        />
      </div>
      
      {selectedPoint && (
        <div 
          style={{
            position: 'fixed',
            left: Math.min(modalPosition.x + 20, window.innerWidth - 300),
            top: Math.min(modalPosition.y, window.innerHeight - 200),
            backgroundColor: '#000000',
            border: '2px solid #ffffff',
            padding: '20px',
            borderRadius: '0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            maxWidth: '300px',
            color: '#ffffff'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: '1px solid #ffffff',
            paddingBottom: '10px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', textTransform: 'uppercase' }}>
              {selectedPoint.type === 'peak' ? '🔴 Peak Detected' : 
               selectedPoint.type === 'trough' ? '🟢 Trough Detected' : '🟡 Breakout'}
            </h3>
            <button 
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Date:</strong> {selectedPoint.date}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Price:</strong> ${selectedPoint.price.toFixed(2)}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Significance:</strong> {selectedPoint.significance.toFixed(2)}%
            </p>
            <p style={{ margin: '10px 0 0 0', padding: '10px', backgroundColor: '#111', borderLeft: '3px solid #00d4ff' }}>
              {selectedPoint.description}
            </p>
          </div>
        </div>
      )}
      
      {selectedPoint && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
          onClick={closeModal}
        />
      )}
    </div>
  );
}

import React, { useEffect, useRef, memo } from 'react';
import { useTheme } from '../ThemeContext.jsx';

function TradingViewWidget() {
  const container = useRef();
  const { theme } = useTheme();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": "NASDAQ:AAPL",
        "theme": "${theme}",
        "timezone": "${Intl.DateTimeFormat().resolvedOptions().timeZone}",
        "backgroundColor": "${theme === 'dark' ? '#000000' : '#ffffff'}",
        "gridColor": "${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [],
        "autosize": true
      }`;
    
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = `
          <div class="tradingview-widget-container__widget" style="height: calc(100% - 32px); width: 100%"></div>
          <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/symbols/NASDAQ-AAPL/" rel="noopener nofollow" target="_blank"><span class="blue-text">Chart</span></a><span class="trademark"> by TradingView</span></div>
        `;
      }
    };
  }, [theme]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%", backgroundColor: 'var(--bg-main)' }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/symbols/NASDAQ-AAPL/" rel="noopener nofollow" target="_blank"><span className="blue-text">Chart</span></a><span className="trademark"> by TradingView</span></div>
    </div>
  );
}

export default memo(TradingViewWidget);

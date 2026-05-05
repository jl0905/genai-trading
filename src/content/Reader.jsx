import React, { useCallback, useEffect, useRef, useState } from 'react';

const sections = [
  {
    id: 'stock',
    title: 'Stock',
    content: `
      <h2>Stock</h2>
      <p>A stock is a unit of ownership in a company. If you own a share, you own a small piece of that business. The value of the stock usually changes as investors update their expectations about the company's future revenue, profits, risks, and growth.</p>
      <p>Investors use stocks to participate in a company's upside. Traders use stocks because their prices move every day, creating opportunities to plan entries, exits, and risk.</p>
    `,
  },
  {
    id: 'chart',
    title: 'Chart',
    content: `
      <h2>Chart</h2>
      <p>A chart is a visual record of price over time. It helps investors see trend, volatility, range, and market behavior faster than a table of numbers.</p>
      <p>Most chart reading starts with three questions: Is price trending or ranging? Where has price reacted before? Is volume confirming the move?</p>
    `,
  },
  {
    id: 'ticker',
    title: 'Ticker',
    content: `
      <h2>Ticker</h2>
      <p>A ticker is the short symbol used to identify a stock or ETF. For example, AAPL represents Apple and SPY represents an ETF that tracks the S&P 500.</p>
      <p>Tickers are useful because many companies have similar names, multiple share classes, or listings on different exchanges. Searching by ticker helps make sure the chart and data belong to the security you actually want to study.</p>
    `,
  },
  {
    id: 'candlestick',
    title: 'Candlestick',
    content: `
      <h2>Candlestick</h2>
      <p>A candlestick shows the open, high, low, and close for one time period. On a daily chart, each candle represents one trading day.</p>
      <p>The body shows the distance between open and close. The wick shows the highest and lowest prices reached during that period. A green candle usually means the close was above the open. A red candle usually means the close was below the open.</p>
      <p>Candles are useful because they show both direction and pressure. A large green candle with strong volume can show aggressive buying. A long upper wick can show buyers pushed price up but sellers rejected that level.</p>
    `,
  },
  {
    id: 'green-candle',
    title: 'Green Candle',
    content: `
      <h2>Green Candle</h2>
      <p>A green candle means the stock closed higher than it opened during that candle period. On a 1D chart, it means buyers ended the day in control relative to where the day began.</p>
      <p>Green candles are useful when judging demand. A strong green candle off support can suggest buyers defended a level. A green candle through resistance can suggest a breakout, especially if volume expands at the same time.</p>
      <p>One green candle is not enough by itself. It becomes more meaningful when it appears at an important level, follows a clear setup, or confirms a larger trend.</p>
    `,
  },
  {
    id: 'red-candle',
    title: 'Red Candle',
    content: `
      <h2>Red Candle</h2>
      <p>A red candle means the stock closed lower than it opened during that candle period. On a 1D chart, it means sellers ended the day in control relative to where the day began.</p>
      <p>Red candles are useful for spotting selling pressure. A strong red candle at resistance can show rejection. A red candle below support can show a breakdown, especially when volume is higher than normal.</p>
      <p>Investors use red candles to manage risk, but context matters. A red candle during a healthy pullback may be normal. A red candle that breaks a major level can be more serious.</p>
    `,
  },
  {
    id: 'timeframe',
    title: 'Time Frame',
    content: `
      <h2>Time Frame</h2>
      <p>A time frame defines how much trading activity each candle represents. A 1D chart means each candle is one trading day. A 5-minute chart means each candle is five minutes.</p>
      <p>Longer time frames are usually better for identifying major trends and important levels. Shorter time frames show more detail but also more noise. A beginner should usually start with daily and weekly charts before making decisions from very short-term charts.</p>
    `,
  },
  {
    id: 'current-price',
    title: 'Current Price',
    content: `
      <h2>Current Price</h2>
      <p>The current price is the latest available traded price for the stock. It is the market's most recent estimate of what buyers and sellers agree the stock is worth right now.</p>
      <p>Investors compare current price with key levels, moving averages, prior highs, and prior lows. Current price above important levels can show strength. Current price below them can show weakness or caution.</p>
      <p>The current price should not be read alone. A price is more useful when paired with trend, volume, valuation, and risk.</p>
    `,
  },
  {
    id: 'day-range',
    title: 'Day Range',
    content: `
      <h2>Day Range</h2>
      <p>The day range shows the lowest and highest prices reached during the current trading day. It gives a quick view of intraday volatility.</p>
      <p>A wide day range can mean strong news, heavy trading, uncertainty, or a major battle between buyers and sellers. A narrow range can mean quiet trading or a pause before a larger move.</p>
      <p>Investors use the day range to understand where price is trading compared with the day's extremes. Closing near the high can show strength. Closing near the low can show weakness.</p>
    `,
  },
  {
    id: 'volume',
    title: 'Volume',
    content: `
      <h2>Volume</h2>
      <p>Volume is the number of shares traded during a period. It shows participation. A price move on high volume usually matters more than the same move on low volume because more buyers and sellers were involved.</p>
      <h3>Why volume is useful</h3>
      <ul>
        <li><strong>Confirms moves:</strong> Breakouts are more convincing when volume expands.</li>
        <li><strong>Spots weak moves:</strong> Price rising on fading volume can mean buyers are losing interest.</li>
        <li><strong>Shows attention:</strong> Unusual volume often means new information, institutional activity, or a shift in sentiment.</li>
      </ul>
      <p>Volume should not be used alone. It is most useful when compared with price action at key levels.</p>
    `,
  },
  {
    id: 'market-cap',
    title: 'Market Cap',
    content: `
      <h2>Market Cap</h2>
      <p>Market capitalization is the total market value of a company. It is calculated by multiplying the current share price by the number of shares outstanding.</p>
      <p>Market cap helps investors understand company size. Large-cap companies are often more established. Small-cap companies may have more growth potential but can also be more volatile and risky.</p>
      <p>Market cap is useful for comparing companies, but it does not say whether a stock is cheap or expensive by itself. It should be combined with revenue, earnings, growth, debt, and valuation metrics.</p>
    `,
  },
  {
    id: 'pe-ratio',
    title: 'P/E Ratio',
    content: `
      <h2>P/E Ratio</h2>
      <p>The price-to-earnings ratio compares a company's stock price with its earnings per share. A P/E of 25 means investors are paying about 25 dollars for each dollar of annual earnings.</p>
      <p>The P/E ratio is useful because it connects price to profitability. A high P/E may mean investors expect strong future growth. A low P/E may mean the stock is cheap, or it may mean the business has serious risks.</p>
      <p>P/E works best when comparing similar companies in the same industry. It is less useful for companies with negative earnings, unusual one-time profits, or very different growth rates.</p>
    `,
  },
  {
    id: 'volume-profile',
    title: 'Volume Profile',
    content: `
      <h2>Volume Profile</h2>
      <p>Volume profile shows how much volume traded at different price levels instead of at different times. A normal volume bar answers, "How many shares traded today?" A volume profile answers, "Where did most trading happen?"</p>
      <h3>Important ideas</h3>
      <ul>
        <li><strong>High-volume areas:</strong> Prices where many trades happened. These can act like zones of agreement or interest.</li>
        <li><strong>Low-volume areas:</strong> Prices where little trading happened. Price can sometimes move quickly through these areas because there was less prior activity.</li>
        <li><strong>Point of control:</strong> The price level with the most traded volume in the selected range.</li>
      </ul>
      <p>Investors use volume profile to find areas where price may pause, reverse, or accelerate. It is especially helpful when combined with support, resistance, and trend direction.</p>
    `,
  },
  {
    id: 'vrvp',
    title: 'VRVP',
    content: `
      <h2>Visible Range Volume Profile</h2>
      <p>Visible Range Volume Profile, often shortened to VRVP, shows volume by price level for only the candles currently visible on the chart. When you zoom or scroll, the profile updates to match that visible range.</p>
      <p>This is useful because it answers a different question than normal volume. Regular volume shows when trading happened. VRVP shows where trading happened in price.</p>
      <h3>How investors use it</h3>
      <ul>
        <li><strong>High-volume zones:</strong> Price areas where many shares traded. These can become important support or resistance zones.</li>
        <li><strong>Point of control:</strong> The highest-volume price area in the visible range. It can show where the market spent the most time agreeing on value.</li>
        <li><strong>Low-volume zones:</strong> Thin areas where price may move faster because there was less prior trading activity.</li>
      </ul>
      <p>VRVP should be treated as context, not a buy or sell signal by itself. It works best when combined with price trend, support and resistance, momentum, and risk management.</p>
    `,
  },
  {
    id: 'key-levels',
    title: 'Key Levels',
    content: `
      <h2>Key Levels</h2>
      <p>A key level is a price area where the stock has reacted before or where many market participants may make decisions. Key levels are usually zones, not exact single prices.</p>
      <h3>Common key levels</h3>
      <ul>
        <li>Previous highs and lows</li>
        <li>Breakout or breakdown areas</li>
        <li>Moving averages such as the 20-day or 200-day average</li>
        <li>High-volume price areas from volume profile</li>
        <li>Round numbers, such as 100, 150, or 200</li>
      </ul>
      <p>Key levels help investors plan. They can define where a setup becomes interesting, where risk may be managed, and where a trade idea is invalidated.</p>
    `,
  },
  {
    id: 'support',
    title: 'Support',
    content: `
      <h2>Support</h2>
      <p>Support is a price area where buyers have previously stepped in strongly enough to slow or reverse a decline. It does not guarantee price will bounce, but it identifies an area where demand has appeared before.</p>
      <p>Investors use support to look for potential entries, manage risk, or judge whether sellers are gaining control. If price breaks below support with strong volume, that support can fail and sometimes become resistance later.</p>
      <p>A good support zone is usually supported by evidence: prior lows, strong reactions, high volume, or a major moving average.</p>
    `,
  },
  {
    id: 'resistance',
    title: 'Resistance',
    content: `
      <h2>Resistance</h2>
      <p>Resistance is a price area where sellers have previously appeared strongly enough to slow or reverse a rally. It is an area where supply may overcome demand.</p>
      <p>Investors use resistance to identify possible profit targets, breakout points, or areas where a trade may become risky. A breakout above resistance is stronger when price closes above the level and volume expands.</p>
      <p>Like support, resistance is best treated as a zone. Price may briefly move above it before reversing, which is why confirmation and risk management matter.</p>
    `,
  },
  {
    id: 'momentum',
    title: 'Momentum',
    content: `
      <h2>Momentum</h2>
      <p>Momentum describes the speed and strength of a price move. A stock with strong upside momentum is not just moving up; it is moving up with force.</p>
      <h3>Ways to read momentum</h3>
      <ul>
        <li>Price making higher highs and higher lows</li>
        <li>Large candles in the direction of the trend</li>
        <li>Price staying above short-term moving averages</li>
        <li>RSI or MACD confirming strength</li>
        <li>Volume increasing during the move</li>
      </ul>
      <p>Momentum is useful because strong stocks often continue moving in the same direction for longer than expected. The risk is chasing after the move is already extended, so investors often wait for pullbacks or clean breakouts.</p>
    `,
  },
  {
    id: 'moving-average',
    title: 'Moving Average',
    content: `
      <h2>Moving Average</h2>
      <p>A moving average smooths price data by creating an updated average. It helps reduce noise and reveal trend direction.</p>
      <h3>Common examples</h3>
      <ul>
        <li><strong>EMA 9:</strong> A fast moving average often used to read short-term momentum.</li>
        <li><strong>SMA 20:</strong> A short-to-medium trend guide often used for pullbacks.</li>
        <li><strong>SMA 200:</strong> A long-term trend guide watched by many investors.</li>
      </ul>
      <p>Moving averages are useful as context, not magic signals. Price above a rising 200-day average often suggests a healthier long-term trend. Price below a falling 200-day average often suggests more caution.</p>
    `,
  },
  {
    id: 'ema-9',
    title: 'EMA 9',
    content: `
      <h2>EMA 9</h2>
      <p>The EMA 9 is a fast exponential moving average that gives more weight to recent price action. Because it reacts quickly, it is often used to read short-term momentum.</p>
      <p>When price holds above a rising EMA 9, it can show strong near-term demand. When price loses the EMA 9 after an extended rally, it can signal momentum is cooling.</p>
      <p>EMA 9 is useful for timing and momentum context, but it can create false signals in choppy markets. It is stronger when aligned with trend, volume, and key levels.</p>
    `,
  },
  {
    id: 'sma-20',
    title: 'SMA 20',
    content: `
      <h2>SMA 20</h2>
      <p>The SMA 20 is the average closing price over the last 20 candles. On a daily chart, it approximates about one month of trading activity.</p>
      <p>Investors use SMA 20 to understand the short-to-medium trend. In a healthy uptrend, price may pull back toward the SMA 20 and then continue higher. In a downtrend, the SMA 20 can act like resistance.</p>
      <p>SMA 20 is most useful when combined with support, resistance, and volume. A bounce from the SMA 20 on strong volume can be more meaningful than a quiet bounce.</p>
    `,
  },
  {
    id: 'sma-200',
    title: 'SMA 200',
    content: `
      <h2>SMA 200</h2>
      <p>The SMA 200 is the average closing price over the last 200 daily candles. It is one of the most widely watched long-term trend indicators.</p>
      <p>Price above a rising SMA 200 often suggests the stock is in a healthier long-term trend. Price below a falling SMA 200 often suggests more caution because the long-term trend may be weak.</p>
      <p>Many investors use SMA 200 as a broad filter. They may prefer long setups above it and avoid weaker setups below it. It is not a guarantee, but it helps define market context.</p>
    `,
  },
  {
    id: 'strategy-building',
    title: 'Building a Strategy',
    content: `
      <h2>Building a Strategy</h2>
      <p>A trading or investing strategy is a repeatable plan. It should define what you are looking for, when you enter, when you exit, and how much risk you accept.</p>
      <h3>A basic strategy framework</h3>
      <ul>
        <li><strong>Market condition:</strong> Is the overall market trending, choppy, bullish, or bearish?</li>
        <li><strong>Setup:</strong> What must be true before you care? Example: price is above the SMA 200 and pulling back to the SMA 20.</li>
        <li><strong>Trigger:</strong> What specific event causes action? Example: price closes above resistance on higher-than-average volume.</li>
        <li><strong>Risk:</strong> Where are you wrong? Example: below the recent swing low or failed breakout level.</li>
        <li><strong>Exit:</strong> Where do you take profit, reduce size, or stop out?</li>
      </ul>
      <p>A strategy is useful because it reduces emotional decision-making. Instead of asking "Do I feel like buying?" you ask "Does this match my rules?"</p>
    `,
  },
  {
    id: 'example-strategy',
    title: 'Example Strategy',
    content: `
      <h2>Example Strategy</h2>
      <p>Here is a simple educational example of a trend-following strategy. It is not a recommendation, but it shows how the pieces fit together.</p>
      <h3>Trend pullback idea</h3>
      <ul>
        <li><strong>Condition:</strong> Price is above the SMA 200, suggesting the long-term trend is positive.</li>
        <li><strong>Setup:</strong> Price pulls back toward the SMA 20 or a known support area.</li>
        <li><strong>Trigger:</strong> Price forms a strong green candle or closes back above the EMA 9.</li>
        <li><strong>Confirmation:</strong> Volume increases on the bounce.</li>
        <li><strong>Risk:</strong> Exit if price breaks below the support zone or recent swing low.</li>
        <li><strong>Target:</strong> Prior resistance, a measured move, or a trailing exit using the moving average.</li>
      </ul>
      <p>The value of this structure is that every decision has a reason. The investor is not predicting perfectly; they are managing probabilities and risk.</p>
    `,
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    content: `
      <h2>Risk Management</h2>
      <p>Risk management is the process of limiting damage when an idea is wrong. Even strong setups fail, so a strategy needs exits before entering.</p>
      <p>Good investors think in terms of risk and reward. If risking $1 per share, they may want a realistic path to make $2 or $3 per share. This does not guarantee success, but it helps avoid trades where the downside is larger than the likely upside.</p>
      <h3>Useful habits</h3>
      <ul>
        <li>Know the invalidation level before buying.</li>
        <li>Avoid putting too much capital into one idea.</li>
        <li>Do not move a stop lower simply because the trade is losing.</li>
        <li>Review trades to see whether rules were followed.</li>
      </ul>
    `,
  },
  {
    id: 'backtesting',
    title: 'Backtesting',
    content: `
      <h2>Backtesting</h2>
      <p>Backtesting means testing a strategy on historical data to see how it would have performed. It helps identify whether an idea has promise before using real money.</p>
      <p>A useful backtest should look at more than total return. It should also review drawdown, win rate, average gain, average loss, number of trades, and whether the strategy works across different market conditions.</p>
      <p>Backtests can be misleading if they are overfit. A strategy that is tuned perfectly to the past may fail in the future. The goal is not to create a perfect historical result; the goal is to learn whether the rules are reasonable and robust.</p>
    `,
  },
  {
    id: 'dividend',
    title: 'Dividend',
    content: `
      <h2>Dividend</h2>
      <p>A dividend is a portion of a company's earnings paid to shareholders. Dividend-paying companies are often more mature businesses, though dividends are never guaranteed.</p>
      <p>Long-term investors may use dividends as part of total return. Growth investors may prefer companies that reinvest profits instead of paying them out. Neither is automatically better; it depends on the investor's objective.</p>
    `,
  },
];

export default function Reader({ isActive = false }) {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);

  const scrollToSection = useCallback((sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { root: contentRef.current, threshold: 0.35 }
    );

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleReaderScroll = (event) => {
      const sectionId = event.detail?.sectionId;
      if (!sectionId) return;
      setTimeout(() => scrollToSection(sectionId), 0);
    };

    window.addEventListener('reader-scroll-to-section', handleReaderScroll);
    return () => window.removeEventListener('reader-scroll-to-section', handleReaderScroll);
  }, [scrollToSection]);

  useEffect(() => {
    if (!isActive) return;

    const sectionId = sessionStorage.getItem('readerTargetSection');
    if (!sectionId) return;

    setTimeout(() => scrollToSection(sectionId), 0);
  }, [isActive, scrollToSection]);

  return (
    <div className="reader-container" style={{
      display: 'flex',
      height: '100%',
      fontFamily: 'var(--font-main)',
      backgroundColor: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
    }}>
      <div className="table-of-contents" style={{
        width: '220px',
        borderRight: '1px solid #333333',
        overflowY: 'auto',
        padding: '16px 12px',
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
        height: '100%',
      }}>
        <h4 style={{
          marginBottom: '16px',
          color: '#999999',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontSize: '10px',
          fontWeight: '600',
        }}>Contents</h4>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sections.map(section => (
              <li key={section.id} style={{ marginBottom: '2px' }}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderLeft: activeSection === section.id ? '2px solid #ffffff' : '2px solid transparent',
                    backgroundColor: activeSection === section.id ? '#141414' : 'transparent',
                    color: activeSection === section.id ? '#ffffff' : '#b0b0b0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: activeSection === section.id ? '600' : '400',
                    letterSpacing: '0.3px',
                    transition: 'all 0.15s ease',
                    fontFamily: 'var(--font-main)',
                    borderRadius: 0,
                  }}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div
        className="reader-main-pane reader-scroll-hidden"
        style={{
          flex: 1,
          display: 'block',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '40px 60px 60px 40px',
          backgroundColor: '#000000',
          height: '100%',
        }}
        ref={contentRef}
      >
        <style>{`
          .reader-scroll-hidden::-webkit-scrollbar { display: none; }
          .reader-scroll-hidden { -ms-overflow-style: none; scrollbar-width: none; }
          .reader-article h2 {
            font-size: 28px;
            line-height: 1.2;
            margin: 0 0 16px;
            color: #ffffff;
          }
          .reader-article h3 {
            font-size: 15px;
            line-height: 1.4;
            margin: 24px 0 10px;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .reader-article p {
            color: #cfcfcf;
            font-size: 15px;
            line-height: 1.75;
            margin: 0 0 16px;
          }
          .reader-article ul {
            color: #cfcfcf;
            font-size: 15px;
            line-height: 1.7;
            margin: 0 0 18px;
            padding-left: 22px;
          }
          .reader-article li {
            margin-bottom: 8px;
          }
          .reader-article strong {
            color: #ffffff;
          }
        `}</style>
        <div style={{ maxWidth: '760px', margin: '0 auto', paddingLeft: '32px' }}>
          {sections.map(section => (
            <section
              key={section.id}
              id={section.id}
              ref={el => sectionRefs.current[section.id] = el}
              className="reader-article"
              style={{
                marginBottom: '68px',
                scrollMarginTop: '24px',
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: section.content }} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';

const generateEducationalContent = () => {
  const sections = [
    {
      id: 'intro',
      title: 'Introduction to Stock Graphs',
      content: `
        <h2>Understanding Stock Graphs: A Complete Guide</h2>
        <p>Stock graphs (also called stock charts) are visual representations of a stock's price movement over time. They are essential tools for investors and traders to analyze market trends, identify patterns, and make informed investment decisions.</p>
        <p>Whether you're a beginner investor or an experienced trader, understanding how to read stock graphs is fundamental to successful investing. This manual will guide you through every component of a stock graph and teach you how to use this powerful tool effectively.</p>
        <h3>Why Stock Graphs Matter</h3>
        <ul>
          <li><strong>Visual Analysis:</strong> Charts make complex price data easy to understand at a glance</li>
          <li><strong>Pattern Recognition:</strong> Identify trends, support levels, and resistance points</li>
          <li><strong>Timing Decisions:</strong> Determine optimal entry and exit points for trades</li>
          <li><strong>Risk Management:</strong> Assess volatility and potential price movements</li>
          <li><strong>Historical Context:</strong> Understand how a stock has performed over time</li>
        </ul>
      `
    },
    {
      id: 'price-axis',
      title: 'The Price Axis (Y-Axis)',
      content: `
        <h2>The Price Axis: Understanding Vertical Price Movement</h2>
        <p>The Y-axis (vertical axis) of a stock graph displays the stock's price. This is the most fundamental component of any stock chart, showing how much a share of the company costs at any given point in time.</p>
        <h3>Key Concepts:</h3>
        <ul>
          <li><strong>Price Scale:</strong> Usually shows dollar amounts, with higher prices at the top and lower prices at the bottom</li>
          <li><strong>Linear vs. Logarithmic:</strong> Linear scales show equal dollar changes, while logarithmic scales show equal percentage changes</li>
          <li><strong>Price Range:</strong> The difference between the highest and lowest prices shown on the chart</li>
          <li><strong>Precision:</strong> Most charts display prices to two decimal places (cents)</li>
        </ul>
        <h3>How to Read It:</h3>
        <p>When looking at the price axis, pay attention to the overall range. A stock trading between $50-$60 has different volatility characteristics than one trading between $500-$600, even if both have the same dollar-range spread. Consider the percentage movements rather than just dollar amounts.</p>
      `
    },
    {
      id: 'time-axis',
      title: 'The Time Axis (X-Axis)',
      content: `
        <h2>The Time Axis: Reading Horizontal Time Periods</h2>
        <p>The X-axis (horizontal axis) represents time. Stock graphs can display various timeframes, from minutes to decades, depending on your investment strategy and analysis needs.</p>
        <h3>Common Timeframes:</h3>
        <ul>
          <li><strong>Intraday:</strong> 1-minute, 5-minute, 15-minute, 30-minute, 1-hour charts for day trading</li>
          <li><strong>Daily:</strong> Each data point represents one trading day, ideal for swing traders</li>
          <li><strong>Weekly:</strong> Each bar/candle represents one week, used by position traders</li>
          <li><strong>Monthly:</strong> Each data point represents one month, preferred by long-term investors</li>
          <li><strong>Yearly:</strong> Long-term historical analysis and trend identification</li>
        </ul>
        <h3>Choosing the Right Timeframe:</h3>
        <p><strong>Day Traders:</strong> Use 1-15 minute charts for quick entry and exit decisions.</p>
        <p><strong>Swing Traders:</strong> Daily charts help identify trends lasting days to weeks.</p>
        <p><strong>Long-term Investors:</strong> Weekly and monthly charts reveal major trends and ignore daily noise.</p>
        <p>Remember: Multiple timeframes can be used together for confirmation. A stock showing an uptrend on daily, weekly, and monthly charts has stronger momentum than one only trending up on a single timeframe.</p>
      `
    },
    {
      id: 'price-lines',
      title: 'Price Lines and Candlesticks',
      content: `
        <h2>Price Lines and Candlestick Patterns</h2>
        <p>The main body of a stock graph shows price movement through either line charts or candlestick charts. Each represents price data differently and serves different analytical purposes.</p>
        <h3>Line Charts:</h3>
        <ul>
          <li><strong>Simple and Clean:</strong> Connects closing prices with a continuous line</li>
          <li><strong>Best For:</strong> Long-term trend analysis and identifying overall direction</li>
          <li><strong>Limitations:</strong> Doesn't show intraday volatility or open/high/low prices</li>
        </ul>
        <h3>Candlestick Charts:</h3>
        <p>Candlesticks provide four critical pieces of information for each time period:</p>
        <ul>
          <li><strong>Open:</strong> The price at the start of the time period</li>
          <li><strong>High:</strong> The highest price reached during the period</li>
          <li><strong>Low:</strong> The lowest price reached during the period</li>
          <li><strong>Close:</strong> The final price at the end of the period</li>
        </ul>
        <h3>Reading Candlesticks:</h3>
        <p><strong>Green/White Candles:</strong> Close price is higher than open price (bullish/buying pressure)</p>
        <p><strong>Red/Black Candles:</strong> Close price is lower than open price (bearish/selling pressure)</p>
        <p><strong>Long Bodies:</strong> Strong buying or selling pressure</p>
        <p><strong>Short Bodies:</strong> Weak price movement, indecision in the market</p>
        <p><strong>Long Shadows/Wicks:</strong> Price rejection - the market tested levels but reversed</p>
        <p><strong>Doji:</strong> Open and close are nearly equal, showing market indecision</p>
      `
    },
    {
      id: 'volume',
      title: 'Volume: The Confirmation Indicator',
      content: `
        <h2>Volume: Understanding Trading Activity</h2>
        <p>Volume represents the number of shares traded during a specific time period. It's typically displayed as bars at the bottom of the stock graph and is one of the most important confirming indicators for price movements.</p>
        <h3>Why Volume Matters:</h3>
        <ul>
          <li><strong>Confirms Trends:</strong> Rising prices on high volume = strong uptrend</li>
          <li><strong>Identifies Reversals:</strong> Price changes on unusually high volume may signal trend changes</li>
          <li><strong>Shows Conviction:</strong> High volume indicates strong participant interest</li>
          <li><strong>Signals Breakouts:</strong> Breakouts above resistance on high volume are more reliable</li>
          <li><strong>Reveals Weakness:</strong> Low volume during price rises suggests lack of conviction</li>
        </ul>
        <h3>Volume Patterns to Watch:</h3>
        <p><strong>High Volume + Price Increase:</strong> Strong buying interest, bullish signal</p>
        <p><strong>High Volume + Price Decrease:</strong> Strong selling pressure, bearish signal</p>
        <p><strong>Low Volume + Price Increase:</strong> Weak buying interest, potential reversal warning</p>
        <p><strong>Low Volume + Price Decrease:</strong> Lack of selling interest, may indicate bottoming</p>
        <p><strong>Volume Spikes:</strong> Sudden increases often accompany news events, earnings, or significant technical breakouts</p>
        <h3>Volume Moving Average:</h3>
        <p>Many charts include a volume moving average (typically 20-day or 50-day) to help identify whether current volume is above or below average. Volume above the moving average is considered significant.</p>
      `
    },
    {
      id: 'moving-averages',
      title: 'Moving Averages: Trend Indicators',
      content: `
        <h2>Moving Averages: Smoothing Price Action</h2>
        <p>Moving averages are trend-following indicators that smooth out price data to show the underlying direction. They appear as overlay lines on stock graphs and help identify trends, support/resistance, and potential reversal points.</p>
        <h3>Types of Moving Averages:</h3>
        <ul>
          <li><strong>Simple Moving Average (SMA):</strong> Average of prices over a set period. 50-day and 200-day SMAs are most popular for identifying major trends.</li>
          <li><strong>Exponential Moving Average (EMA):</strong> Gives more weight to recent prices, making it more responsive to current price action. Popular periods: 12-day and 26-day.</li>
        </ul>
        <h3>How to Use Moving Averages:</h3>
        <p><strong>Trend Identification:</strong> Price above a rising moving average = uptrend. Price below a falling moving average = downtrend.</p>
        <p><strong>Support and Resistance:</strong> Moving averages often act as dynamic support (in uptrends) or resistance (in downtrends).</p>
        <p><strong>Golden Cross:</strong> When 50-day SMA crosses above 200-day SMA. Bullish signal indicating long-term trend change.</p>
        <p><strong>Death Cross:</strong> When 50-day SMA crosses below 200-day SMA. Bearish signal warning of potential decline.</p>
        <p><strong>Price Crossovers:</strong> When price crosses above/below a moving average, it may signal trend change or continuation.</p>
        <h3>Multiple Moving Averages:</h3>
        <p>Traders often use multiple moving averages together. When shorter-term MAs cross above longer-term MAs, it suggests increasing momentum. The spacing between MAs indicates trend strength - wide spacing = strong trend, converging = weakening trend.</p>
      `
    },
    {
      id: 'support-resistance',
      title: 'Support and Resistance Levels',
      content: `
        <h2>Support and Resistance: Key Price Levels</h2>
        <p>Support and resistance are price levels where a stock has historically had difficulty falling below (support) or rising above (resistance). These levels appear as horizontal zones on stock graphs and are crucial for predicting price movements.</p>
        <h3>Understanding Support:</h3>
        <p>Support is a price level where buying interest is strong enough to overcome selling pressure. Think of it as a "floor" where the price tends to bounce back up.</p>
        <ul>
          <li><strong>Previous Lows:</strong> Areas where the stock has bottomed before often become support</li>
          <li><strong>Moving Averages:</strong> Can act as dynamic support in uptrends</li>
          <li><strong>Psychological Levels:</strong> Round numbers ($100, $50) often act as support due to order clustering</li>
          <li><strong>Volume Concentration:</strong> Areas with heavy volume often create support</li>
        </ul>
        <h3>Understanding Resistance:</h3>
        <p>Resistance is a price level where selling pressure overcomes buying interest, acting as a "ceiling" that the price struggles to break through.</p>
        <ul>
          <li><strong>Previous Highs:</strong> Areas where the stock has peaked before become resistance</li>
          <li><strong>Moving Averages:</strong> Can act as dynamic resistance in downtrends</li>
          <li><strong>Breakout Points:</strong> Old resistance can become new support once broken</li>
        </ul>
        <h3>Role Reversal:</h3>
        <p>One of the most important concepts: once support is broken, it often becomes resistance, and vice versa. When a stock breaks above resistance, that old resistance level may provide support on future pullbacks.</p>
        <h3>How to Use Support/Resistance:</h3>
        <p><strong>Entry Points:</strong> Buy near support with stop-loss just below</p>
        <p><strong>Exit Points:</strong> Consider taking profits near resistance</p>
        <p><strong>Breakout Trading:</strong> Enter when price breaks above resistance on high volume</p>
        <p><strong>Stop Loss Placement:</strong> Place stops just beyond support/resistance levels</p>
      `
    },
    {
      id: 'chart-patterns',
      title: 'Common Chart Patterns',
      content: `
        <h2>Chart Patterns: Recognizing Market Psychology</h2>
        <p>Chart patterns are recognizable formations created by price movements on stock graphs. These patterns reflect market psychology and can help predict future price direction. Learning to identify these patterns is essential for technical analysis.</p>
        <h3>Continuation Patterns (Trend Pauses):</h3>
        <p><strong>Flags and Pennants:</strong> Small consolidation periods after strong moves. Usually resolve in the direction of the previous trend.</p>
        <p><strong>Triangles:</strong> Ascending, descending, and symmetrical triangles show decreasing volatility. Breakouts typically continue the prior trend.</p>
        <p><strong>Cup and Handle:</strong> Bullish pattern resembling a tea cup. The "cup" is a rounded bottom, followed by a small "handle" consolidation before breakout.</p>
        <p><strong>Rectangles:</strong> Price oscillates between parallel support and resistance, indicating consolidation before trend continuation.</p>
        <h3>Reversal Patterns (Trend Changes):</h3>
        <p><strong>Head and Shoulders:</strong> Three peaks with middle peak highest. Most reliable reversal pattern. Neckline break confirms reversal.</p>
        <p><strong>Double Top/Bottom:</strong> Two similar highs (top) or lows (bottom). Indicates failed attempts to continue trend.</p>
        <p><strong>Rounding Bottom/Top:</strong> Gradual curved reversal showing slow shift in sentiment.</p>
        <p><strong>Wedges:</strong> Rising wedge (bearish) or falling wedge (bullish). Trend lines converge indicating weakening momentum.</p>
        <h3>How to Trade Patterns:</h3>
        <ol>
          <li><strong>Identification:</strong> Wait for clear pattern formation - don't anticipate</li>
          <li><strong>Confirmation:</strong> Wait for breakout with volume confirmation</li>
          <li><strong>Entry:</strong> Enter after confirmed breakout in expected direction</li>
          <li><strong>Target:</strong> Measure pattern height and project from breakout point</li>
          <li><strong>Stop Loss:</strong> Place stop on opposite side of pattern</li>
        </ol>
        <p><strong>Important:</strong> Patterns fail. Always use stop losses and never risk more than you can afford to lose on any single trade.</p>
      `
    },
    {
      id: 'technical-indicators',
      title: 'Technical Indicators',
      content: `
        <h2>Technical Indicators: Beyond Price and Volume</h2>
        <p>Technical indicators are mathematical calculations based on price, volume, or open interest. They appear as overlays or separate panels on stock graphs and help confirm trends, identify overbought/oversold conditions, and generate trading signals.</p>
        <h3>Momentum Indicators:</h3>
        <p><strong>Relative Strength Index (RSI):</strong> Measures speed and magnitude of price movements on a 0-100 scale.</p>
        <ul>
          <li>RSI above 70 = potentially overbought (may decline)</li>
          <li>RSI below 30 = potentially oversold (may bounce)</li>
          <li>Divergences between RSI and price warn of reversals</li>
        </ul>
        <p><strong>MACD (Moving Average Convergence Divergence):</strong> Shows relationship between two moving averages.</p>
        <ul>
          <li>MACD line crossing above signal line = bullish</li>
          <li>MACD line crossing below signal line = bearish</li>
          <li>Histogram shows momentum strength</li>
        </ul>
        <p><strong>Stochastic Oscillator:</strong> Compares closing price to price range over time.</p>
        <ul>
          <li>Above 80 = overbought</li>
          <li>Below 20 = oversold</li>
          <li>%K crossing %D generates signals</li>
        </ul>
        <h3>Volatility Indicators:</h3>
        <p><strong>Bollinger Bands:</strong> Three lines showing volatility channel around price.</p>
        <ul>
          <li>Upper band = resistance, lower band = support</li>
          <li>Price touching bands suggests potential reversal</li>
          <li>Narrow bands predict volatility expansion (big move coming)</li>
          <li>Price moving outside bands shows extreme momentum</li>
        </ul>
        <p><strong>Average True Range (ATR):</strong> Measures volatility and helps set stop losses.</p>
        <h3>Trend Indicators:</h3>
        <p><strong>Average Directional Index (ADX):</strong> Measures trend strength (not direction).</p>
        <ul>
          <li>ADX above 25 = strong trend</li>
          <li>ADX below 20 = weak trend or consolidation</li>
          <li>ADX rising = trend strengthening</li>
        </ul>
        <h3>Using Indicators Effectively:</h3>
        <p><strong>Don't Overload:</strong> Using too many indicators creates conflicting signals.</p>
        <p><strong>Combine Types:</strong> Use trend indicators with momentum indicators for confirmation.</p>
        <p><strong>Lagging Nature:</strong> Most indicators are based on past prices and lag behind current action.</p>
        <p><strong>Context Matters:</strong> Indicators behave differently in trending vs. ranging markets.</p>
      `
    },
    {
      id: 'using-charts',
      title: 'How to Use Stock Graphs',
      content: `
        <h2>Practical Application: Using Stock Graphs for Investing</h2>
        <p>Now that you understand the components of stock graphs, let's put it all together. This section covers practical strategies for using charts to make better investment decisions.</p>
        <h3>Step 1: Determine Your Time Horizon</h3>
        <p>Before analyzing any chart, know your investment timeline:</p>
        <ul>
          <li><strong>Day Trading (Minutes/Hours):</strong> Focus on 1-15 minute charts, volume, and immediate support/resistance</li>
          <li><strong>Swing Trading (Days/Weeks):</strong> Use daily charts, watch for patterns, use 20-50 day moving averages</li>
          <li><strong>Position Trading (Weeks/Months):</strong> Weekly charts, major trends, 50-200 day moving averages</li>
          <li><strong>Long-term Investing (Months/Years):</strong> Monthly charts, fundamental trends, ignore short-term noise</li>
        </ul>
        <h3>Step 2: Identify the Trend</h3>
        <p>Use these methods to determine trend direction:</p>
        <ol>
          <li><strong>Visual Inspection:</strong> Are highs and lows rising (uptrend) or falling (downtrend)?</li>
          <li><strong>Moving Averages:</strong> Price above rising MA = uptrend. Price below falling MA = downtrend.</li>
          <li><strong>Trend Lines:</strong> Connect highs/lows to visualize trend channels</li>
          <li><strong>Multiple Timeframes:</strong> Check daily, weekly, and monthly for alignment</li>
        </ol>
        <p><strong>Rule of Thumb:</strong> "The trend is your friend." Trade in the direction of the major trend.</p>
        <h3>Step 3: Find Entry Points</h3>
        <p>Look for these ideal entry scenarios:</p>
        <ul>
          <li><strong>Support Bounces:</strong> Price approaches support and shows reversal candles</li>
          <li><strong>Breakout Pullbacks:</strong> Price breaks resistance, pulls back to test old resistance as new support</li>
          <li><strong>Moving Average Bounces:</strong> Price touches rising moving average in uptrend</li>
          <li><strong>Pattern Completion:</strong> Clear patterns with volume confirmation</li>
          <li><strong>Oversold Bounces:</strong> RSI or Stochastic below 30 with bullish price action</li>
        </ul>
        <h3>Step 4: Set Exit Points</h3>
        <p>Plan your exits before entering:</p>
        <ul>
          <li><strong>Profit Targets:</strong> Previous resistance levels, pattern projections, or fixed percentages</li>
          <li><strong>Stop Losses:</strong> Below support, below moving averages, or based on ATR</li>
          <li><strong>Time Stops:</strong> Exit if trade doesn't work within expected timeframe</li>
          <li><strong>Trailing Stops:</strong> Raise stop as price moves in your favor to lock in profits</li>
        </ul>
        <h3>Step 5: Risk Management</h3>
        <p>Protect your capital with these rules:</p>
        <ul>
          <li><strong>Position Sizing:</strong> Risk no more than 1-2% of portfolio per trade</li>
          <li><strong>Risk-Reward Ratio:</strong> Aim for at least 2:1 (potential profit vs. potential loss)</li>
          <li><strong>Diversification:</strong> Don't put all capital in one stock or sector</li>
          <li><strong>Correlation:</strong> Avoid holding multiple stocks that move together</li>
        </ul>
      `
    },
    {
      id: 'practical-examples',
      title: 'Practical Examples',
      content: `
        <h2>Real-World Chart Analysis Examples</h2>
        <p>Let's apply what we've learned with practical examples of chart analysis scenarios.</p>
        <h3>Example 1: The Breakout Trade</h3>
        <p><strong>Setup:</strong> A stock has been trading between $45-$50 for three months (rectangle pattern). Volume has been declining during the consolidation.</p>
        <p><strong>What to Watch:</strong></p>
        <ul>
          <li>Price approaching the $50 resistance level</li>
          <li>Volume increasing as price nears resistance (indicating interest)</li>
          <li>RSI moving above 50 (momentum building)</li>
          <li>Moving averages aligning below price (support)</li>
        </ul>
        <p><strong>Entry:</strong> Buy when price closes above $50 on volume 50% above average.</p>
        <p><strong>Target:</strong> Pattern height ($5) projected above breakout = $55 target.</p>
        <p><strong>Stop:</strong> Below $49 (old resistance becomes support, allow some wiggle room).</p>
        <h3>Example 2: The Trend Following Trade</h3>
        <p><strong>Setup:</strong> Stock in clear uptrend, price above rising 50-day and 200-day moving averages.</p>
        <p><strong>What to Watch:</strong></p>
        <ul>
          <li>Price pulling back to touch the 50-day moving average</li>
          <li>Volume lower during the pullback (not heavy selling)</li>
          <li>RSI coming down from overbought but staying above 40</li>
          <li>Bullish candlestick pattern forming at the moving average</li>
        </ul>
        <p><strong>Entry:</strong> Buy when bullish candle completes at or near 50-day MA.</p>
        <p><strong>Target:</strong> Previous resistance or extend to next psychological level.</p>
        <p><strong>Stop:</strong> Below the 50-day MA or recent swing low.</p>
        <h3>Example 3: The Reversal Trade</h3>
        <p><strong>Setup:</strong> Stock has declined 30% over two months and is showing signs of bottoming.</p>
        <p><strong>What to Watch:</strong></p>
        <ul>
          <li>RSI showing bullish divergence (lower lows in price, higher lows in RSI)</li>
          <li>Volume spike on down days decreasing (selling exhaustion)</li>
          <li>Long lower shadows on candles (rejection of lower prices)</li>
          <li>Price approaching major support level from previous years</li>
        </ul>
        <p><strong>Entry:</strong> Wait for confirmation - first higher low or break of short-term downtrend.</p>
        <p><strong>Target:</strong> First resistance level, typically 20-50 day moving average.</p>
        <p><strong>Stop:</strong> Below recent low or support level.</p>
        <h3>Common Mistakes to Avoid:</h3>
        <ul>
          <li><strong>Chasing:</strong> Don't buy after large moves; wait for pullbacks</li>
          <li><strong>Averaging Down:</strong> Avoid adding to losing positions</li>
          <li><strong>Ignoring Stops:</strong> Always have predetermined exit points</li>
          <li><strong>Overtrading:</strong> Not every setup requires action</li>
          <li><strong>Confirmation Bias:</strong> Don't see what you want to see; be objective</li>
          <li><strong>Neglecting Context:</strong> Consider overall market conditions and sector trends</li>
        </ul>
      `
    },
    {
      id: 'conclusion',
      title: 'Conclusion and Next Steps',
      content: `
        <h2>Mastering Stock Graphs: Your Journey Forward</h2>
        <p>Congratulations on completing this educational manual on stock graphs and technical analysis. You now have a solid foundation in reading, interpreting, and using stock charts for investment decisions.</p>
        <h3>Key Takeaways:</h3>
        <ul>
          <li><strong>Stock graphs are visual tools</strong> that display price movement over time</li>
          <li><strong>Price and time axes</strong> form the foundation of every chart</li>
          <li><strong>Candlestick patterns</strong> reveal market psychology and four price points (open, high, low, close)</li>
          <li><strong>Volume confirms</strong> the strength of price movements</li>
          <li><strong>Moving averages</strong> smooth price action and identify trends</li>
          <li><strong>Support and resistance</strong> levels are battlegrounds between buyers and sellers</li>
          <li><strong>Chart patterns</strong> reflect collective market psychology</li>
          <li><strong>Technical indicators</strong> provide additional confirmation and signals</li>
          <li><strong>Always combine</strong> multiple factors for high-probability setups</li>
          <li><strong>Risk management</strong> is more important than any individual trade</li>
        </ul>
        <h3>Recommended Next Steps:</h3>
        <ol>
          <li><strong>Practice Chart Reading:</strong> Spend time daily looking at charts until pattern recognition becomes intuitive</li>
          <li><strong>Start a Journal:</strong> Document your analysis, trades, and lessons learned</li>
          <li><strong>Backtest Strategies:</strong> Test your ideas on historical data before risking real money</li>
          <li><strong>Paper Trade:</strong> Practice with simulated trading to build skills without financial risk</li>
          <li><strong>Study Continuously:</strong> Markets evolve; keep learning new patterns and strategies</li>
          <li><strong>Join Communities:</strong> Engage with other traders to share insights and learn from others</li>
        </ol>
        <h3>Final Thoughts:</h3>
        <p>Technical analysis through stock graphs is both an art and a science. While the tools and patterns provide structure, successful investing also requires discipline, emotional control, and continuous learning.</p>
        <p>Remember that no system is perfect. Even the best setups fail sometimes. What separates successful investors from unsuccessful ones is not being right every time, but managing risk effectively and learning from every experience.</p>
        <p><strong>Start small, stay disciplined, and never stop learning.</strong></p>
        <p style="text-align: center; margin-top: 40px; color: #666;">
          <em>"The stock market is a device for transferring money from the impatient to the patient."</em><br>
          — Warren Buffett
        </p>
      `
    }
  ];
  
  return sections;
};

export default function Reader() {
  const [sections, setSections] = useState([]);
  const [visibleSections, setVisibleSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [loading, setLoading] = useState(false);
  const sectionRefs = useRef({});
  const contentRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const allSections = generateEducationalContent();
    setSections(allSections);
    setVisibleSections(allSections.slice(0, 12));
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
      { threshold: 0.5 }
    );

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [visibleSections]);

  const loadMoreSections = useCallback(() => {
    if (loading) return;
    
    setLoading(true);
    
    const currentCount = visibleSections.length;
    const nextSections = sections.slice(currentCount, currentCount + 5);
    
    if (nextSections.length > 0) {
      setVisibleSections(prev => [...prev, ...nextSections]);
    }
    
    setLoading(false);
  }, [sections, visibleSections.length, loading]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMoreSections();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observerRef.current.observe(sentinel);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreSections, loading]);

  const scrollToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="reader-container" style={{ 
      display: 'flex', 
      height: '100vh',
      fontFamily: 'Courier New, monospace',
      backgroundColor: '#000000',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      <div className="table-of-contents" style={{ 
        width: '300px', 
        borderRight: '2px solid #ffffff', 
        overflowY: 'auto', 
        padding: '20px',
        backgroundColor: '#000000',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0
      }}>
        <h3 style={{ marginBottom: '20px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>Table of Contents</h3>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visibleSections.map(section => (
              <li key={section.id} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: '2px solid #ffffff',
                    backgroundColor: activeSection === section.id ? '#ffffff' : '#000000',
                    color: activeSection === section.id ? '#000000' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'background-color 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.id) {
                      e.target.style.backgroundColor = '#333333';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.id) {
                      e.target.style.backgroundColor = '#000000';
                    }
                  }}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="main-content" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: '40px',
        backgroundColor: '#000000',
        height: '100vh'
      }} ref={contentRef}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {visibleSections.map(section => (
            <section
              key={section.id}
              id={section.id}
              ref={el => sectionRefs.current[section.id] = el}
              style={{
                marginBottom: '60px',
                scrollMarginTop: '20px'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: section.content }} />
            </section>
          ))}
        </div>
        
        <div id="scroll-sentinel" style={{ height: '50px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ffffff' }}>
              Loading more content...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
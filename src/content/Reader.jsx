import React, { useState, useEffect, useRef, useCallback } from 'react';

const generateEducationalContent = () => {
  const sections = [
    {
      id: 'stock',
      title: 'Stock',
      content: `
        <h2>Stock</h2>
        <p>A stock is a unit of ownership in a company — If you own a stock, that makes you a shareholder, meaning that you may be eligible to receive dividends if the company succeeds and decides to pay them out. Also, you may have a vote in some company decisions.</p>
      `
    },
    {
      id: 'chart',
      title: 'Chart (Stock Graph)',
      content: `
        <h2>Chart (Stock Graph)</h2>
        <p>A chart is a visual representation of a stock's price movement over time. It helps investors quickly see whether a stock's value is trending up or down, making it easier to spot patterns and decide when to buy or sell.</p>
      `
    },
    {
      id: 'bull-market',
      title: 'Bull Market',
      content: `
        <h2>Bull Market</h2>
        <p>A bull market is a financial market condition where prices are rising or are expected to rise. The term is often used to describe a prolonged period of optimism and investor confidence.</p>
      `
    },
    {
      id: 'bear-market',
      title: 'Bear Market',
      content: `
        <h2>Bear Market</h2>
        <p>A bear market is a financial market condition where prices are falling or are expected to fall. It usually signifies a period of pessimism and a lack of investor confidence, often triggered by an economic downturn.</p>
      `
    },
    {
      id: 'volume',
      title: 'Volume',
      content: `
        <h2>Volume</h2>
        <p>Volume refers to the total number of shares of a stock traded during a specific period. High volume means a lot of shares are changing hands, which often confirms the strength of a price movement or trend.</p>
      `
    },
    {
      id: 'moving-average',
      title: 'Moving Average',
      content: `
        <h2>Moving Average</h2>
        <p>A moving average is an indicator that smooths out price data by creating a constantly updated average price. It helps filter out the random "noise" of daily price fluctuations to reveal the true underlying trend.</p>
      `
    },
    {
      id: 'dividend',
      title: 'Dividend',
      content: `
        <h2>Dividend</h2>
        <p>A dividend is a portion of a company's earnings paid out to its shareholders. Companies that are consistently profitable often distribute these cash rewards as a way to return value to their investors.</p>
      `
    },
    {
      id: 'candlestick',
      title: 'Candlestick',
      content: `
        <h2>Candlestick</h2>
        <p>A candlestick is a type of chart component showing a stock's opening, closing, high, and low prices for the day. A green candle means the price went up from the open, while a red candle means the price went down.</p>
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
      height: '100%',
      fontFamily: 'var(--font-main)',
      backgroundColor: '#000000',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Table of Contents — narrow, subtle sidebar */}
      <div className="table-of-contents" style={{ 
        width: '200px', 
        borderRight: '1px solid #333333', 
        overflowY: 'auto', 
        padding: '16px 12px',
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
        height: '100%',
        position: 'sticky',
        top: 0
      }}>
        <h4 style={{
          marginBottom: '16px', color: '#999999',
          textTransform: 'uppercase', letterSpacing: '2px',
          fontSize: '10px', fontWeight: '600'
        }}>Contents</h4>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visibleSections.map(section => (
              <li key={section.id} style={{ marginBottom: '2px' }}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    borderLeft: activeSection === section.id ? '2px solid #ffffff' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeSection === section.id ? '#ffffff' : '#b0b0b0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: activeSection === section.id ? '600' : '400',
                    letterSpacing: '0.3px',
                    transition: 'all 0.15s ease',
                    fontFamily: 'var(--font-main)',
                    borderRadius: 0
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.id) {
                      e.target.style.color = '#e0e0e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.id) {
                      e.target.style.color = '#b0b0b0';
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

      {/* Reading pane — hidden scrollbar, content skewed slightly right */}
      <div className="reader-main-pane reader-scroll-hidden" style={{ 
        flex: 1, 
        display: 'block',
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: '40px 60px 40px 40px',
        backgroundColor: '#000000',
        height: '100%'
      }} ref={contentRef}>
        <style>{`
          .reader-scroll-hidden::-webkit-scrollbar { display: none; }
          .reader-scroll-hidden { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div style={{ maxWidth: '720px', margin: '0 auto', paddingLeft: '40px' }}>
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
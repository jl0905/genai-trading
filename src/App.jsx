import { useState, useRef, useEffect } from 'react'
import './App.css'
import EntryVisual from './content/EntryVisual.jsx'
import Reader from './content/Reader.jsx'
import TvInteractiveChart from './content/tvInteractiveChart.jsx'
import StrategyBuilder from './content/StrategyBuilder.jsx'
import PaperTrading from './content/PaperTrading.jsx'
import SplineTab from './content/SplineTab.jsx'
import { useTheme } from './ThemeContext.jsx'

// Define your tab components here - easy to add new ones!
const tabComponents = {
  entryVisual: EntryVisual,
  reader: Reader,
  tvInteractiveChart: TvInteractiveChart,
  strategy: StrategyBuilder,
  paperTrading: PaperTrading,
  spline: SplineTab,
}

// Tab configuration - easy to modify and extend
const initialTabs = [
  { id: 'entryVisual', name: 'Home', component: tabComponents.entryVisual },
  { id: 'spline', name: 'Multi', component: tabComponents.spline },
  { id: 'tvInteractiveChart', name: 'Charts', component: tabComponents.tvInteractiveChart },
  { id: 'paperTrading', name: 'Paper', component: tabComponents.paperTrading },
  { id: 'strategy', name: 'Strategy', component: tabComponents.strategy },
  { id: 'reader', name: 'Reader', component: tabComponents.reader },
]

function App() {
  const [activeTab, setActiveTab] = useState('entryVisual')
  const [tabsList, setTabsList] = useState(initialTabs)
  const [draggedTabId, setDraggedTabId] = useState(null)
  const { theme, toggleTheme } = useTheme()

  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const loginRef = useRef(null)

  // --- Header pin/unpin ---
  const [headerPinned, setHeaderPinned] = useState(true)
  const [headerVisible, setHeaderVisible] = useState(true)
  const headerRef = useRef(null)
  const hoverZoneRef = useRef(null)
  const hideTimeoutRef = useRef(null)

  // Show header when hovering near the top edge; hide when leaving
  useEffect(() => {
    if (headerPinned) {
      setHeaderVisible(true)
      return
    }
    setHeaderVisible(false)

    const zone = hoverZoneRef.current
    const header = headerRef.current
    if (!zone || !header) return

    const show = () => {
      clearTimeout(hideTimeoutRef.current)
      setHeaderVisible(true)
    }
    const hide = () => {
      hideTimeoutRef.current = setTimeout(() => setHeaderVisible(false), 300)
    }

    zone.addEventListener('mouseenter', show)
    header.addEventListener('mouseenter', show)
    header.addEventListener('mouseleave', hide)

    return () => {
      clearTimeout(hideTimeoutRef.current)
      zone.removeEventListener('mouseenter', show)
      header.removeEventListener('mouseenter', show)
      header.removeEventListener('mouseleave', hide)
    }
  }, [headerPinned])

  useEffect(() => {
    function handleClickOutside(event) {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setShowLogin(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [loginRef])

  useEffect(() => {
    const handleOpenReaderSection = (event) => {
      const sectionId = event.detail?.sectionId
      if (!sectionId) return

      sessionStorage.setItem('readerTargetSection', sectionId)
      setActiveTab('reader')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('reader-scroll-to-section', {
          detail: { sectionId },
        }))
      }, 0)
    }

    window.addEventListener('open-reader-section', handleOpenReaderSection)
    return () => window.removeEventListener('open-reader-section', handleOpenReaderSection)
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginForm.username.trim()) {
      setLoginError('Username is required')
      return
    }
    setUser(loginForm.username.trim())
    setShowLogin(false)
    setLoginForm({ username: '', password: '' })
  }

  const handleLogout = () => {
    setUser(null)
    setShowLogin(false)
  }

  // Get the active component
  const ActiveComponent = tabsList.find(tab => tab.id === activeTab)?.component

  const handleDragStart = (e, id) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small timeout to allow the visual drag ghost to generate before changing opacity
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1';
    setDraggedTabId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropTargetId) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === dropTargetId) return;

    const draggedIndex = tabsList.findIndex(t => t.id === draggedTabId);
    const dropIndex = tabsList.findIndex(t => t.id === dropTargetId);

    const newTabs = [...tabsList];
    const [draggedItem] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(dropIndex, 0, draggedItem);

    setTabsList(newTabs);
  };

  return (
    <div className="app">
      {/* Invisible hover zone at the very top — triggers header reveal when unpinned */}
      {!headerPinned && (
        <div
          ref={hoverZoneRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '12px',
            zIndex: 999,
          }}
        />
      )}
      <header
        ref={headerRef}
        className="header"
        style={{
          ...(headerPinned
            ? {}
            : {
                position: 'fixed',
                top: headerVisible ? 0 : '-60px',
                left: 0,
                right: 0,
                zIndex: 1000,
                transition: 'top 0.25s ease',
                boxShadow: headerVisible ? '0 2px 12px rgba(0,0,0,0.18)' : 'none',
              }),
        }}
      >
        <nav className="tabs-container">
          <div style={{ marginRight: 'auto', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border-none"
              style={{ backgroundColor: theme === 'dark' ? 'var(--border-main)' : 'var(--accent)' }}
              title="Toggle Light/Dark Mode"
            >
              <span className="sr-only">Toggle theme</span>
              <span
                className={`flex items-center justify-center h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                  theme === 'dark' ? 'translate-x-[2px]' : 'translate-x-[22px]'
                }`}
              >
                <span style={{ 
                  fontSize: '12px', 
                  lineHeight: 1, 
                  fontWeight: '900',
                  color: theme === 'dark' ? '#000000' : 'var(--accent)' 
                }}>
                  {theme === 'dark' ? '−' : '+'}
                </span>
              </span>
            </button>

            {/* Pin / Unpin header toggle */}
            <button
              onClick={() => setHeaderPinned(prev => !prev)}
              title={headerPinned ? 'Unpin header' : 'Pin header'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: headerPinned ? 0.7 : 0.45,
                transition: 'opacity 0.2s ease',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-main)' }}
              >
                {/* Thumbtack / push-pin icon */}
                <path d="M12 17v5" />
                <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
                <path d="M7 11h10l-1 4H8l-1-4z" />
                {/* Diagonal strike-through when unpinned */}
                {!headerPinned && (
                  <line x1="3" y1="3" x2="21" y2="21" stroke="var(--text-main)" strokeWidth="2.5" />
                )}
              </svg>
            </button>
          </div>
          
          {tabsList.map((tab) => (
            <button
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              style={{ cursor: 'grab' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
          
          <div style={{ marginLeft: 'auto', paddingRight: '20px', display: 'flex', alignItems: 'center', position: 'relative' }} ref={loginRef}>
            {user ? (
              <button 
                onClick={handleLogout}
                className="tab"
                style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)' }}
              >
                Logout ({user})
              </button>
            ) : (
              <button 
                onClick={() => setShowLogin(!showLogin)}
                className="tab"
                style={{ backgroundColor: showLogin ? 'var(--accent)' : 'var(--bg-panel)', color: showLogin ? 'white' : 'var(--text-muted)' }}
              >
                Login
              </button>
            )}

            {showLogin && !user && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '20px',
                marginTop: '10px',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-main)',
                borderRadius: '8px',
                padding: '16px',
                width: '220px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 1000
              }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loginError && <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{loginError}</div>}
                  <input 
                    type="text" 
                    placeholder="Username" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-main)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <input 
                    type="password" 
                    placeholder="Password (Optional)" 
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-main)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      marginTop: '4px'
                    }}
                  >
                    Go
                  </button>
                </form>
              </div>
            )}
          </div>
        </nav>
      </header>
      
      <div className="main-content">
        {tabsList.map(tab => (
          <div 
            key={tab.id} 
            style={{ 
              display: activeTab === tab.id ? 'block' : 'none', 
              height: '100%',
              width: '100%',
              overflow: 'hidden'
            }}
          >
            <tab.component isActive={activeTab === tab.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

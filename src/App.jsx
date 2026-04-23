import { useState, useRef, useEffect } from 'react'
import './App.css'
import EntryVisual from './content/EntryVisual.jsx'
import TabBitcoin from './content/TabBitcoin.jsx'
import ToggleButton from './content/ToggleButton.jsx'
import ApiTest from './content/ApiTest.jsx'
import TradingViewChart from './content/TradingViewChart.jsx'
import Reader from './content/Reader.jsx'
import InteractiveChart from './content/InteractiveChart.jsx'
import TvInteractiveChart from './content/tvInteractiveChart.jsx'
import { useTheme } from './ThemeContext.jsx'

// Define your tab components here - easy to add new ones!
const tabComponents = {
  entryVisual: EntryVisual,
  tabBitcoin: TabBitcoin,
  toggleButton: ToggleButton,
  apiTest: ApiTest,
  tvChart: TradingViewChart,
  reader: Reader,
  interactiveChart: InteractiveChart,
  tvInteractiveChart: TvInteractiveChart,
}

// Tab configuration - easy to modify and extend
const initialTabs = [
  { id: 'entryVisual', name: '3D Donut', component: tabComponents.entryVisual },
  { id: 'tabBitcoin', name: 'Bitcoin Grid', component: tabComponents.tabBitcoin },
  { id: 'toggleButton', name: 'Toggle', component: tabComponents.toggleButton },
  { id: 'apiTest', name: 'API Test', component: tabComponents.apiTest },
  { id: 'tvChart', name: 'Charts', component: tabComponents.tvChart },
  // { id: 'interactiveChart', name: 'Key Points', component: tabComponents.interactiveChart },
  { id: 'tvInteractiveChart', name: 'TV Chart', component: tabComponents.tvInteractiveChart },
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setShowLogin(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [loginRef])

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
      <header className="header">
        <nav className="tabs-container">
          <div style={{ marginRight: 'auto', paddingLeft: '20px', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer border-none"
              style={{ backgroundColor: theme === 'dark' ? 'var(--accent)' : 'var(--border-main)' }}
              title="Toggle Light/Dark Mode"
            >
              <span className="sr-only">Toggle theme</span>
              <span
                className={`flex items-center justify-center h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                  theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                }`}
              >
                <span style={{ 
                  fontSize: '13px', 
                  lineHeight: 1, 
                  fontWeight: '900',
                  color: theme === 'dark' ? 'var(--accent)' : '#000000' 
                }}>
                  {theme === 'dark' ? '☾' : '☀'}
                </span>
              </span>
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
                style={{ backgroundColor: 'var(--surface-main)', color: 'var(--text-secondary)' }}
              >
                Logout ({user})
              </button>
            ) : (
              <button 
                onClick={() => setShowLogin(!showLogin)}
                className="tab"
                style={{ backgroundColor: showLogin ? 'var(--accent)' : 'var(--surface-main)', color: showLogin ? 'white' : 'var(--text-secondary)' }}
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
                backgroundColor: 'var(--surface-main)',
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
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  )
}

export default App

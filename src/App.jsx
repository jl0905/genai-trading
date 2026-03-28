import { useState } from 'react'
import './App.css'
import TabBitcoin from './content/TabBitcoin'
import EntryVisual from './content/EntryVisual'

function App() {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    { id: 0, name: 'Tab 1' },
    { id: 1, name: 'Tab 2' },
    { id: 2, name: 'Tab 3' }
  ]

  return (
    <div className="app">
      <header className="header">
        <nav className="tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </header>
      
      <div className="flex h-screen items-center justify-center">
        {/* <TabBitcoin/> */}
        <EntryVisual/>
        {/* <div className="content-section">
          {/* <h1>{tabs[activeTab].name}</h1>
          <p className="text-amber-400">Placeholder</p> */}
      </div>
    </div>
  )
}

export default App

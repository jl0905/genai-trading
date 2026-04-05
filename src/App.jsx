import { useState } from 'react'
import './App.css'
import EntryVisual from './content/EntryVisual.jsx'
import TabBitcoin from './content/TabBitcoin.jsx'
import ToggleButton from './content/ToggleButton.jsx'
import ApiTest from './content/ApiTest.jsx'
import TradingViewChart from './content/TradingViewChart.jsx'

// Define your tab components here - easy to add new ones!
const tabComponents = {
  entryVisual: EntryVisual,
  tabBitcoin: TabBitcoin,
  toggleButton: ToggleButton,
  apiTest: ApiTest,
  tvChart: TradingViewChart,
}

// Tab configuration - easy to modify and extend
const tabs = [
  { id: 'entryVisual', name: '3D Donut', component: tabComponents.entryVisual },
  { id: 'tabBitcoin', name: 'Bitcoin Grid', component: tabComponents.tabBitcoin },
  { id: 'toggleButton', name: 'Toggle', component: tabComponents.toggleButton },
  { id: 'apiTest', name: 'API Test', component: tabComponents.apiTest },
  { id: 'tvChart', name: 'Charts', component: tabComponents.tvChart },
]

function App() {
  const [activeTab, setActiveTab] = useState('entryVisual')

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="app">
      <header className="border-b-2 border-white bg-black">
        <nav className="flex justify-end p-0 m-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`bg-black text-white border-2 border-white border-b-none px-6 py-3 font-mono text-sm font-bold cursor-pointer transition-colors duration-100 uppercase tracking-wider hover:bg-gray-800 ${activeTab === tab.id ? 'bg-white text-black' : ''} ${tab.id !== tabs[tabs.length - 1].id ? 'border-r-0' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </header>
      
      <div className="flex h-screen items-center justify-center">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  )
}

export default App

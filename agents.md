# GenAI Trading Dashboard - Agent Reference

## Project Overview
A React-based financial dashboard with interactive stock charts, real-time data visualization, and technical analysis features. Built for the 2026 GenAI final project.

---

## Tech Stack

### Frontend
- **Framework**: React 19.2.4 + Vite 8.0.1
- **Styling**: TailwindCSS 4.2.2 with `@tailwindcss/vite`
- **Charts**: Chart.js 4.5.1 + react-chartjs-2 5.3.1 + chartjs-plugin-annotation 3.1.0
- **Build Tool**: Vite with HMR and ESLint

### Backend
- **Runtime**: Node.js with Express 5.2.1 (port 3001)
- **Python Integration**: Child process spawning for Python scripts
- **CORS**: Enabled for frontend communication
- **Scripts**: yfinance (stock data), requests (API calls)

---

## Project Structure

```
c:\Users\hambu\OneDrive\Documents\_personal\2026 GenAI final project draft\
├── src/
│   ├── content/           # Tab components
│   │   ├── EntryVisual.jsx       # 3D donut visualization
│   │   ├── TabBitcoin.jsx        # Bitcoin grid display
│   │   ├── ToggleButton.jsx      # Toggle UI component
│   │   ├── ApiTest.jsx           # API testing interface
│   │   ├── TradingViewChart.jsx  # TradingView integration
│   │   ├── InteractiveChart.jsx  # Main stock chart with key points
│   │   └── Reader.jsx            # Data reader component
│   ├── App.jsx            # Main app with tab navigation
│   ├── api.js             # API client functions
│   ├── App.css            # Global styles
│   └── index.css          # Tailwind entry
├── backend/
│   ├── server.js          # Express server with Python bridge
│   └── scripts/
│       ├── googlefin.py   # CoinGecko Bitcoin price fetcher
│       ├── stockdata.py   # yFinance stock data fetcher
│       ├── polym.py       # Polygon API script
│       └── testepic.py    # Test script
├── public/               # Static assets
├── package.json          # Frontend deps & scripts
└── vite.config.js        # Vite configuration
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run server` | Start production backend |
| `npm run server:dev` | Start backend with watch mode |
| `npm run start` | Concurrent frontend + backend dev |

---

## API Endpoints

### Backend (localhost:3001)
- `GET /api/health` - Health check
- `GET /api/googlefin` - Bitcoin price from CoinGecko
- `POST /api/googlefin` - Bitcoin price with params
- `GET /api/stock?symbol=AAPL&period=6mo` - Stock data via yFinance
- `GET /api/stocks/multi` - Multiple stocks summary

### Frontend API Client (`src/api.js`)
- `api.health()` - Check backend status
- `api.getBitcoinPrice()` - Fetch BTC price
- `api.getStockData(symbol, period)` - Fetch stock data
- `api.getMultipleStocks()` - Fetch multiple stocks

---

## Key Features

### InteractiveChart.jsx (Main Feature)
- **Real-time stock data** via yFinance (30s polling)
- **10 popular stocks**: AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META, NFLX, AMD, INTC
- **Time periods**: 1mo, 3mo, 6mo, 1y, 2y
- **Key point detection**: Peaks (red), Troughs (green), Breakouts (yellow)
- **Interactive modals** showing analysis details
- **Company stats**: Market cap, P/E ratio, day range, volume

### Tab System (App.jsx)
- 7 switchable tabs with styled navigation
- Components: EntryVisual, TabBitcoin, ToggleButton, ApiTest, TradingViewChart, InteractiveChart, Reader
- Black/white cyberpunk styling with monospace fonts

---

## Python Scripts

### stockdata.py
```bash
python stockdata.py --symbol=AAPL --period=6mo
python stockdata.py --multi
```
Periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max

### googlefin.py
Fetches Bitcoin price from CoinGecko API with 24h change.

---

## Environment Setup

1. **Node.js dependencies**: `npm install`
2. **Python dependencies**: `pip install yfinance requests`
3. **Start dev**: `npm run start` (runs both servers)
4. **Frontend only**: `npm run dev` (port 5173)
5. **Backend only**: `npm run server:dev` (port 3001)

---

## Important Notes

- Backend runs on port **3001** (separate from frontend)
- Python scripts must be in `backend/scripts/` directory
- API responses are JSON parsed from Python stdout
- Chart.js annotation plugin used for key point markers
- Windows environment - use PowerShell/cmd for commands

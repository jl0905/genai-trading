# GenAI Trading Dashboard - Agent Reference

A React-based financial dashboard with real-time stock charts and technical analysis for the 2026 GenAI final project.

## Tech Stack & Versions

**Frontend:**
- React (`^19.2.4`) & React DOM (`^19.2.4`)
- Vite (`^8.0.1`) with `@vitejs/plugin-react` (`^6.0.1`)
- TailwindCSS (`^4.2.2`) with `@tailwindcss/vite` (`^4.2.2`)
- Chart.js (`^4.5.1`) & `react-chartjs-2` (`^5.3.1`)
- chartjs-plugin-annotation (`^3.1.0`)
- chartjs-chart-financial (`^0.2.1`)
- lightweight-charts (`^5.1.0`)

**Backend & Scripts:**
- FastAPI & Uvicorn (Runs on Port 3000)
- Python integration natively via `main.py`
- Python Scripts: `yfinance`, `requests`

## Project Structure
- `src/`: React frontend (`App.jsx` handles 8 tabs, `api.js` connects to backend).
- `src/content/`: Tab components (e.g., `InteractiveChart.jsx`, `tvInteractiveChart.jsx`).
- `backend/main.py`: FastAPI server acting as the backend.
- `backend/scripts/`: Python scripts for data fetching (`stockdata.py`, `googlefin.py`).

## Essential Commands & Endpoints
- **Start App**: `npm run start` (Runs both frontend and backend concurrently)
- **Backend APIs** (localhost:3000): 
  - `GET /api/stock?symbol=AAPL&period=6mo`
  - `GET /api/stock/range?symbol=AAPL&start=2024-01-01&end=2024-07-01` — Date-range fetch for dynamic chart loading
  - `GET /api/stocks/multi`
  - `GET /api/googlefin`
  - `GET /api/search?q=AAPL` — Proxies Yahoo Finance search, filters to US equities & ETFs only (exchanges: NMS, NYQ, ASE, PNK, NYM, NCM, NGS, OEM, OQS; quoteTypes: EQUITY, ETF)
- **Frontend APIs**: Accessible via `api.js` (e.g., `api.getStockData()`, `api.getStockDataRange()`, `api.searchStocks(query)`).

## Key Components
- **InteractiveChart.jsx**: Uses Chart.js with the annotation plugin to show line/candlestick charts with peak/trough/breakout key points.
- **TvInteractiveChart.jsx**: Uses lightweight-charts for a sleek, TradingView-style candlestick view with volume overlays. Dynamic infinite-scroll loading — starts with 6 months, loads 6-month chunks as user scrolls/zooms left. Real-time 30s background polling.

## Important Notes
- Frontend: Port 5173 | Backend: Port 3000.
- Windows environment - use PowerShell or CMD.
- API endpoints return native Python dictionaries serialized by FastAPI.

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
- Express (`^5.2.1`) (Runs on Port 3001)
- cors (`^2.8.6`), dotenv (`^17.4.0`)
- concurrently (`^9.2.1`)
- Python Scripts: `yfinance`, `requests` (spawned via Node child process)

## Project Structure
- `src/`: React frontend (`App.jsx` handles 8 tabs, `api.js` connects to backend).
- `src/content/`: Tab components (e.g., `InteractiveChart.jsx`, `tvInteractiveChart.jsx`).
- `backend/server.js`: Express server acting as a bridge.
- `backend/scripts/`: Python scripts for data fetching (`stockdata.py`, `googlefin.py`).

## Essential Commands & Endpoints
- **Start App**: `npm run start` (Runs both frontend and backend concurrently)
- **Backend APIs** (localhost:3001): 
  - `GET /api/stock?symbol=AAPL&period=6mo`
  - `GET /api/stocks/multi`
  - `GET /api/googlefin`
- **Frontend APIs**: Accessible via `api.js` (e.g., `api.getStockData()`).

## Key Components
- **InteractiveChart.jsx**: Uses Chart.js with the annotation plugin to show line/candlestick charts with peak/trough/breakout key points.
- **TvInteractiveChart.jsx**: Uses lightweight-charts for a sleek, TradingView-style candlestick view with volume overlays. Real-time 30s background polling.

## Important Notes
- Frontend: Port 5173 | Backend: Port 3001.
- Windows environment - use PowerShell or CMD.
- API endpoints parse Python `stdout` into JSON.

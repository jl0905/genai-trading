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
- Python Scripts: `yfinance`, `requests`, `python-dotenv`
- AI Integration: OpenRouter Tencent Hy3 Preview API (`tencent/hy3-preview:free`) via REST — requires `OPENROUTER_API_KEY` in `.env`

## Project Structure
- `src/`: React frontend (`App.jsx` handles 8 tabs, `api.js` connects to backend).
- `src/content/`: Tab components (e.g., `InteractiveChart.jsx`, `tvInteractiveChart.jsx`).
- `backend/main.py`: FastAPI server acting as the backend.
- `backend/scripts/`: Python scripts for data fetching (`stockdata.py`, `googlefin.py`) and AI analysis (`chart_analyzer.py`).
- `.env`: Environment variables (not committed) — holds `OPENROUTER_API_KEY`.

## Essential Commands & Endpoints
- **Start App**: `npm run start` (Runs both frontend and backend concurrently). *Note: Making edits to the backend python scripts means we have to re-run `npm start` to see the changes.*
- **Backend APIs** (localhost:3000): 
  - `GET /api/stock?symbol=AAPL&period=6mo`
  - `GET /api/stock/range?symbol=AAPL&start=2024-01-01&end=2024-07-01` — Date-range fetch for dynamic chart loading
  - `GET /api/stocks/multi`
  - `GET /api/googlefin`
  - `GET /api/search?q=AAPL` — Proxies Yahoo Finance search, filters to US equities & ETFs only (exchanges: NMS, NYQ, ASE, PNK, NYM, NCM, NGS, OEM, OQS; quoteTypes: EQUITY, ETF)
  - `POST /api/analyze` — Sends visible OHLCV data to OpenRouter LLM (Tencent Hy3) for AI technical analysis (body: `{symbol, company_name, sector, data: [{date,open,high,low,price,volume}]}`)
- **Frontend APIs**: Accessible via `api.js` (e.g., `api.getStockData()`, `api.getStockDataRange()`, `api.searchStocks(query)`, `api.analyzeChart(payload)`).

## Key Components
- **InteractiveChart.jsx**: Uses Chart.js with the annotation plugin to show line/candlestick charts with peak/trough/breakout key points.
- **TvInteractiveChart.jsx**: Uses lightweight-charts for a sleek, TradingView-style candlestick view with volume overlays. Dynamic infinite-scroll loading — starts with 6 months, loads 6-month chunks as user scrolls/zooms left. Real-time 30s background polling. **AI Analyze button** captures the visible OHLCV window and sends it to the OpenRouter API, displaying the generated technical analysis in a collapsible, resizable side-panel to the right of the chart.

## Important Notes
- Frontend: Port 5173 | Backend: Port 3000.
- Windows environment - use PowerShell or CMD.
- API endpoints return native Python dictionaries serialized by FastAPI.

## Theming & Styling
- The app uses a centralized primary color variable `var(--theme-primary)` (default: `#8BA97F` / Sage Green) for all accent colors, bullish candle wicks, volume bars, AI analysis borders, and price numbers.
- The app uses a centralized secondary color variable `var(--theme-secondary)` (default: `#FF5A5A` / Red) for all bearish elements, downward candle wicks, and negative price numbers.
- If you need to tweak these colors, modify `--theme-primary` / `--theme-secondary` and their RGB counterparts in `src/index.css`. JS components automatically read these variables using `getComputedStyle`.
- **Fonts**: The global application font is controlled by the `--font-main` CSS variable in `src/index.css`. However, the interactive TradingView-style chart uses its own hardcoded font (Courier New) to keep its technical aesthetic unlinked from the rest of the UI.

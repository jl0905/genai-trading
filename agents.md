# GenAI Trading Dashboard - Agent Reference

A React-based financial dashboard with real-time stock charts, technical analysis, rule-based strategy backtesting, paper trading integration, and educational resources for the 2026 GenAI final project.

## Tech Stack & Versions

**Frontend:**
- React (`^19.2.4`) & React DOM (`^19.2.4`)
- Vite (`^8.0.1`) with `@vitejs/plugin-react` (`^6.0.1`)
- TailwindCSS (`^4.2.2`) with `@tailwindcss/vite` (`^4.2.2`)
- lightweight-charts (`^5.1.0`)
- `@splinetool/react-spline` & `@splinetool/runtime` for native 3D WebGL scenes
- Chart.js (`^4.5.1`) & `react-chartjs-2` (`^5.3.1`)
- chartjs-plugin-annotation (`^3.1.0`)
- chartjs-chart-financial (`^0.2.1`)
- concurrently (`^9.2.1`) for concurrent dev server management

**Backend & Scripts:**
- FastAPI & Uvicorn (Runs on Port 3000)
- Python integration natively via `main.py`
- Python Scripts & Packages: `yfinance`, `requests`, `python-dotenv`, `pymongo`, `pydantic`
- Database Integration: MongoDB (local connection on `mongodb://localhost:27017/` for user authentication storage)
- AI Integration: OpenRouter Tencent Hy3 Preview API (`tencent/hy3-preview:free`) via REST — requires `OPENROUTER_API_KEY` in `.env`
- Alpaca API Integration: For paper trading dashboard, simulated orders, and market-data volume profiles — configured in `alpaca_config.py`

## Project Structure
- `src/`: React frontend (`App.jsx` dynamically manages 6 core functional tabs with HTML5 drag-and-drop tab reordering; `api.js` connects to the backend endpoints).
- `src/content/`: Tab components (`EntryVisual.jsx`, `SplineTab.jsx`, `tvInteractiveChart.jsx`, `PaperTrading.jsx`, `StrategyBuilder.jsx`, `Reader.jsx`) and supportive UI subcomponents.
- `backend/main.py`: FastAPI application server serving all client-side data queries, integration tasks, backtesting simulations, and authentication flows.
- `backend/scripts/`: Python utility modules for data fetching (`stockdata.py`, `googlefin.py`), AI analysis formatting (`chart_analyzer.py`), pure-Python backtesting (`backtest.py`), and broker integrations (`alpaca_config.py`).
- `.env`: Environment variables file located at the project root (not committed) — securely retains `OPENROUTER_API_KEY`.

## Essential Commands & Endpoints
- **Start App**: `npm run start` (Runs both frontend dev server and FastAPI backend concurrently via `concurrently`). *Note: Modifying backend Python scripts requires terminating and re-running `npm start` to apply server-side updates.*
- **Backend APIs** (localhost:3000): 
  - `POST /api/auth` — Minimalistic secure authentication storing SHA-256 hashed credentials in MongoDB.
  - `GET /api/health` — API health check verification.
  - `GET /api/googlefin` & `POST /api/googlefin` — Proxies native Bitcoin price retrieval.
  - `GET /api/stock?symbol=AAPL&period=6mo` — Fetches standard stock historical intervals.
  - `GET /api/stock/range?symbol=AAPL&start=2024-01-01&end=2024-07-01` — Targeted date-range extraction for responsive client dynamic rendering.
  - `GET /api/stocks/multi` — Aggregated top stock market movers snapshot.
  - `GET /api/search?q=AAPL` — Proxies Yahoo Finance search, intelligently filtering exclusively to US equities and ETFs.
  - `POST /api/analyze` — Transmits currently visible OHLCV client snapshot window to OpenRouter LLM (Tencent Hy3) for AI-generated structural technical analysis.
  - `POST /api/backtest` — Executes pure-Python rule-based strategy simulations against verified historical OHLCV data arrays returning statistical performance metrics, trade logs, and equity progression traces.
  - `GET /api/alpaca/paper` — Interrogates configured Alpaca Paper Trading environment for portfolio valuations, current balances, active positions, and open/recent orders.
  - `POST /api/alpaca/paper/order` — Submits paper orders directly to the Alpaca simulation broker engine.
  - `GET /api/alpaca/volume-profile` — Computes detailed, granular Visible Range / Absolute Volume Profiles utilizing granular native trade logs or aggregated 1-minute base intervals.
- **Frontend APIs**: Centralized asynchronous wrapper clients housed in `src/api.js` (e.g., `api.login()`, `api.getStockDataRange()`, `api.analyzeChart()`, `api.runBacktest()`, `api.getAlpacaPaperDashboard()`, `api.submitAlpacaPaperOrder()`, `api.getAlpacaVolumeProfile()`).

## Key Components
- **EntryVisual.jsx**: Renders a premium, dynamic 3D ASCII art rotating visualization of Saturn/Donut sphere and equatorial rings directly onto the canvas, functioning as an immersive high-fidelity project home component. Supports manual cursor drag multi-axis rotation smoothly transitioning to continuous autonomous momentum loops.
- **SplineTab.jsx**: Re-implements the home tab's 3D rendering concepts using custom hardware-accelerated geometries via native **Three.js**. Features a rotating staircase formation of 10 cubes (4→3→2→1 layout) utilizing ultra-smooth `RoundedBoxGeometry` (`radius: 0.08`, `segments: 12`), rendered using premium pristine `MeshPhysicalMaterial` exhibiting high-end iridescent solid glass properties (`transmission: 0.9`, `opacity: 1.0`, `roughness: 0.15`, `clearcoat: 1.0`, `clearcoatRoughness: 0.0`, dynamic base color switching between `#eef4ff` in light mode and `#334155` in dark mode, `ior: 1.5`, `thickness: 1.5`, `dispersion: 2.5`, full thin-film holographic iridescence, and volumetric absorption via `attenuationColor` / `attenuationDistance`) dynamically set against a theme-responsive contrasting background (`#f0f4f8` in light mode, `#0f172a` in dark mode via a live `MutationObserver`) and illuminated via a complete `RoomEnvironment` enriched with sharp directional bevel highlights, brilliant camera-facing rim lighting, and vibrant pink/cyan `RectAreaLight` gradients. The entire staircase rotates as a single rigid body with click-and-drag manual rotation.
- **TvInteractiveChart.jsx**: Uses lightweight-charts for a sleek, TradingView-style high-performance candlestick viewport paired with absolute volume bar overlays. Features dynamic infinite-scroll pagination loading previous 6-month historical segments seamlessly on scroll/zoom interactions. Incorporates background live telemetry polling and an active **AI Analyze** trigger capturing user-visible window ranges to generate deep contextual insights rendered inside a resizable collateral drawer. Toggleable overlays include SMA 20, SMA 200, EMA 9, Bollinger Bands (upper/lower dashed bands), and VRVP.
- **PaperTrading.jsx**: Alpaca simulation gateway panel rendering active portfolio summaries (Buying Power, Cash, Portfolio Value), granular dynamic datatables mapping live paper positions/unrealized P&L, chronologically organized historical order registries, and dedicated forms supporting customized simulated order execution (Symbol, Side, Quantity).
- **StrategyBuilder.jsx**: Comprehensive conditional logic strategy framework builder supporting nested Indicator/Action rulesets. Incorporates advanced live UI performance optimizations including request debouncing, strict race-condition guards, custom stat card formatting (Strategy Return, Win Rate, Max Drawdown, Final Equity), responsive non-interactive static SVG equity curves, scrollable execution trade logs, a comparative **Buy & Hold** benchmark guide, and an exploratory **Randomize** scenario trigger. Supported Indicators: SMA 20/50/200, EMA 20, RSI 14, MACD, MACD Signal, BB Upper, BB Lower, Price.
- **Reader.jsx**: Rich interactive educational guide and glossary defining fundamental market dynamics, technical structures, volume behaviors, and strategic concepts. Outfitted with custom clean scrollbar-hidden interfaces, scroll-spy intersection observers activating table of contents navigation tabs dynamically, global messaging listeners enabling direct contextual links across auxiliary tabs, and full alignment with global light/dark layout tokens.

## Important Notes
- Frontend Dev Server runs natively on Port 5173 | Backend Server executes on Port 3000.
- Native Windows environment alignment — execution fully compatible across PowerShell or standard Command Prompt (CMD).
- API backends cleanly serialize native Python structures to strict JSON schemas consumed predictably by client architectures.

## Theming & Styling
- The application implements global custom primary CSS tokens via `var(--theme-primary)` (default: `#8BA97F` / Sage Green) styling accent elements, positive asset price counters, bullish candlesticks, volume indicators, and analytical focus highlights.
- Contrast tokening utilizes secondary configurations via `var(--theme-secondary)` (default: `#FF5A5A` / Red) assigning bold visual indicators for bearish pressure, descending pricing patterns, and critical drawdown boundaries.
- Theme overrides execute efficiently through adjusting core root color blocks directly within `src/index.css`. Client JS elements interrogate live layout elements via standard `getComputedStyle` patterns to preserve layout rendering parity.
- **Fonts**: Core display application text is cleanly bound to the `--font-main` CSS variable in `src/index.css`. Specialized chart components isolate display logic utilizing custom monospaced fallbacks to guarantee strict technical visual integrity.

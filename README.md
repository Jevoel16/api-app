<div align="center" id="top">

<img src="frontend/public/globe.svg" alt="ITD112 API Integration logo" width="72" height="72" />

# ITD112 API Integration

**Weather meets soil: combining Open-Meteo and SoilGrids data for five Mindanao sites.**

![Next.js](https://img.shields.io/badge/Next.js-16.3.8-blue?style=flat)
![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-blue?style=flat)
![Plotly.js](https://img.shields.io/badge/Plotly.js-4.1.1-blue?style=flat)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141.1-blue?style=flat)
![Streamlit](https://img.shields.io/badge/Streamlit-1.64.0-blue?style=flat)
![pandas](https://img.shields.io/badge/pandas-3.0.0-blue?style=flat)
![Python](https://img.shields.io/badge/Python-3.13-blue?style=flat)
![Node.js](https://img.shields.io/badge/Node.js-22-blue?style=flat)
![pytest](https://img.shields.io/badge/pytest-9.2.0-blue?style=flat)
![Vitest](https://img.shields.io/badge/Vitest-5.1.0-blue?style=flat)

![Version](https://img.shields.io/badge/version-0.2.4-green?style=flat)
![License](https://img.shields.io/badge/license-Sprucetrap_SAL_1.0-orange?style=flat)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat)
[![CI](https://github.com/Jevoel16/api-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Jevoel16/api-app/actions/workflows/ci.yml)

</div>

---

## Table of contents

- [About](#about)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## About

This repository contains two complete versions of a web application that integrates weather data from the **Open-Meteo API** and soil properties from the **SoilGrids REST API** for five sites in Mindanao (Iligan City, Malaybalay, Valencia, Davao (Calinan) and General Santos).

You can run either:

- **Option 1 – Baseline version:** a lightweight Streamlit monolith (`streamlit_app.py`).
- **Option 2 – Advanced version:** a full-stack FastAPI backend (`backend/`) with a Next.js frontend (`frontend/`).

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Features

### Baseline version (Streamlit)
- Integrates static topsoil data (0–5 cm) with daily weather metrics.
- Interactive Plotly visualizations: temperature trends, monthly water budgets, geospatial distribution.
- Handles API rate-limiting and persistent disk caching automatically.
- Uses the same `core/` HTTP client, parsers and join logic as the backend, so both versions report identical numbers.

### Advanced version (FastAPI + Next.js)
- **Depth dimension:** queries SoilGrids at `0-5cm`, `5-15cm` and `15-30cm` to show how soil texture changes down the profile.
- **Weather forecasts:** combines historical archive data with the 16-day Open-Meteo forecast.
- **Uncertainty tracking:** fetches the `Q0.05` and `Q0.95` percentiles from SoilGrids and shows them as error bars.
- **Data export:** download the site summary, daily records and soil profile as CSV (properly quoted) directly from the browser.
- **API log:** every upstream call is listed with provider, site, real HTTP status, cache status (Cached/Live) and timing.
- **Clear errors:** validation and upstream failures from the backend appear in a dismissible banner; the site list is loaded from `GET /api/sites`.
- Charts: temperature trend (7-day rolling mean), monthly rainfall vs evaporative demand, daily rainfall distribution, topsoil texture, depth profile, clay vs water balance, spatial distribution.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Baseline app | Python, Streamlit, Plotly, pandas, NumPy, requests |
| Backend | Python, FastAPI, Uvicorn, pandas, NumPy, requests, Pydantic |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Plotly.js (`react-plotly.js`), lucide-react, native `fetch` |
| Testing | pytest + FastAPI `TestClient` + Streamlit `AppTest` (Python), Vitest (frontend) |
| Data sources | [Open-Meteo](https://open-meteo.com/) (archive + forecast), [SoilGrids v2.0 REST API (ISRIC)](https://rest.isric.org/) |
| CI | GitHub Actions (see [Testing](#testing)) |

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Prerequisites

- **Python 3.13** (3.10+ should work) and `pip`
- **Node.js 22** and `npm` (for the advanced version's frontend)
- Internet access for the first run (later runs can be served from the disk cache)

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Installation

```bash
git clone https://github.com/Jevoel16/api-app.git
cd api-app
```

Create and activate a virtual environment (Windows shown; on macOS/Linux use `source .venv/bin/activate`):

```bash
python -m venv .venv
.venv\Scripts\activate
```

**Baseline version:**

```bash
pip install -r requirements.txt
```

**Advanced version:**

```bash
pip install -r backend/requirements.txt
cd frontend
npm install
```

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Configuration

No API keys are needed: both Open-Meteo and SoilGrids are free, keyless APIs. Python settings live in [`core/config.py`](core/config.py) and can be overridden with environment variables or a root `.env` file (copy [`.env.example`](.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `CACHE_DIR` | `./cache` | Disk cache for API responses (one JSON file per unique request, gitignored) |
| `FORECAST_TTL_S` | `10800` (3 h) | Age after which cached forecasts are refetched; archive and soil responses never expire |
| `SOILGRIDS_PAUSE_S` | `12` | Pause between live SoilGrids calls (fair use) |
| `HTTP_TIMEOUT_S` | `300` | Timeout for one upstream request |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated origins allowed to call the backend |

| Setting | Where | Value |
| --- | --- | --- |
| Sites, API URLs, variables, timezone | [`core/sources.py`](core/sources.py) | Five Mindanao sites, `Asia/Manila` |
| Backend URL used by the frontend | `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (see [`frontend/.env.example`](frontend/.env.example)) | `http://127.0.0.1:8000` |
| Streamlit theme | `.streamlit/config.toml` | Light theme, teal primary colour |

Delete the files in the cache folder to force fresh API calls.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Usage

### Option 1: Baseline version (Streamlit)

```bash
streamlit run streamlit_app.py
```

Open http://localhost:8501, then follow the app step by step: inputs → request → response → parsing → joining → analysis.

### Option 2: Advanced version (FastAPI + Next.js)

The app is split, so run the backend and frontend at the same time in two terminals.

**Terminal 1 – backend (FastAPI), from the repo root:**

```bash
.venv\Scripts\activate
uvicorn backend.app.main:app --reload
```

**Terminal 2 – frontend (Next.js):**

```bash
cd frontend
npm run dev
```

Open http://localhost:3000, choose sites and a date range under **Configure & Run**, and run the integration. Charts, the API log and CSV export appear once the data loads. Live SoilGrids calls are paced 12 s apart, so a first run with several sites takes a while.

#### Calling the API directly

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness check, returns `{"status": "ok", "version": "…"}` |
| `GET /api/sites` | The five study sites with coordinates |
| `POST /api/integrate` | Fetch, join and summarise weather + soil for chosen sites and dates |

`POST /api/integrate` on http://127.0.0.1:8000:

```bash
curl -X POST http://127.0.0.1:8000/api/integrate \
  -H "Content-Type: application/json" \
  -d '{"sites": ["Iligan City", "Malaybalay"], "start_date": "2025-01-01", "end_date": "2025-06-30"}'
```

The response holds `daily`, `summary`, `soil_long`, `active_sites` and `api_logs`; every field is typed in the OpenAPI schema at http://127.0.0.1:8000/docs. Soil values are in standard units (clay/sand/silt in %, pH, SOC in g/kg). Each `api_logs` entry has the real HTTP `status` of a live call, or `null` when it was served from cache.

Invalid input returns **422 Unprocessable Entity** with a message: an empty or unknown `sites` list, dates not in `YYYY-MM-DD` format, `start_date` after `end_date`, or an `end_date` in the future (the 16-day forecast is added automatically). If Open-Meteo or SoilGrids fails, the API returns **502 Bad Gateway** with the upstream message.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Project structure

```text
api-app/
├── streamlit_app.py        # Baseline Streamlit app
├── requirements.txt        # Baseline Python dependencies
├── .streamlit/config.toml  # Streamlit theme
├── core/                   # Shared data core used by the backend and Streamlit
│   ├── config.py           # Settings from env / .env
│   ├── sources.py          # Sites, API URLs, requested variables
│   ├── http.py             # Retrying HTTP client + disk cache
│   ├── parsing.py          # Open-Meteo / SoilGrids JSON → DataFrames
│   └── pipeline.py         # Fetch, join and summarise
├── tests/                  # pytest suite + trimmed API fixtures
├── cache/                  # Disk cache (JSON, gitignored)
├── requirements-dev.txt    # Test dependencies (pytest, httpx)
├── pyproject.toml          # pytest configuration
├── .env.example            # Optional settings
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app factory, CORS, error handling
│   │   ├── routes.py       # /api/health, /api/sites, /api/integrate
│   │   └── schemas.py      # Pydantic request/response models
│   └── requirements.txt    # Backend Python dependencies
├── frontend/
│   ├── src/app/            # Next.js App Router page (state + layout), root layout, styles
│   ├── src/components/     # Sidebar, tabs, banners and one file per chart (charts/)
│   ├── src/lib/            # API client, types, CSV export, stats helpers (+ *.test.ts)
│   ├── vitest.config.mts   # Vitest configuration
│   ├── .env.example        # NEXT_PUBLIC_API_URL
│   ├── public/             # Static assets
│   └── package.json        # Frontend scripts and dependencies
├── VERSION                 # Project version (kept in sync with frontend/package.json)
├── LICENSE
└── README.md
```

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Scripts

| Command | Where | What it does |
| --- | --- | --- |
| `streamlit run streamlit_app.py` | root | Start the baseline app on port 8501 |
| `uvicorn backend.app.main:app --reload` | root | Start the API on port 8000 with auto-reload |
| `npm run dev` | `frontend/` | Start the Next.js dev server on port 3000 |
| `npm run build` | `frontend/` | Production build (includes type-checking) |
| `npm run start` | `frontend/` | Serve the production build |
| `npm run lint` | `frontend/` | Run ESLint |
| `npm test` | `frontend/` | Run the Vitest unit tests |
| `python -m pytest` | root | Run the Python test suite |

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Testing

Python tests live in [`tests/`](tests) and run offline against trimmed real API responses in `tests/fixtures/`:

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Frontend unit tests (Vitest) cover the API client and its error messages, CSV escaping and the chart statistics helpers:

```bash
cd frontend && npm test
```

The Python tests cover the parsers (including SoilGrids `d_factor` scaling), the disk cache (hit, miss, TTL expiry, errors), the integration pipeline, the API (response shape, 422 validation, 502 on upstream failure, CORS) and the Streamlit app (rendered headlessly with Streamlit's `AppTest`).

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request to `main`:

- **Frontend:** `npm ci`, `npm run lint`, `npm test` (Vitest), `npm run build` (includes the TypeScript check) on Node 22.
- **Python:** installs `requirements-dev.txt`, runs a compile check on `core/`, `backend/` and `streamlit_app.py`, then `python -m pytest` on Python 3.13. The tests run offline against recorded fixtures.

Run the same checks locally before committing:

```bash
cd frontend && npm ci && npm run lint && npm test && npm run build
```

```bash
python -m compileall -q core backend streamlit_app.py
```

Manual checks:

1. `streamlit run streamlit_app.py` loads and every step renders for the default sites.
2. Backend starts and http://127.0.0.1:8000/docs lists `/api/health`, `/api/sites` and `/api/integrate`.
3. The `curl` request above returns JSON with all five keys.
4. Frontend at http://localhost:3000 renders all charts for the selected sites.
5. Re-running the same request shows **Cached** in the API log.
6. CSV export downloads a file with data.
7. `npm run build` in `frontend/` succeeds.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Cannot reach the backend" banner | Make sure the backend is running on `127.0.0.1:8000` (or set `NEXT_PUBLIC_API_URL`). If the frontend runs on another origin or port, add it to `CORS_ORIGINS`. Reload the page so the site list loads. |
| Backend returns 422 | Check the message: site names must match exactly, dates must be `YYYY-MM-DD`, start ≤ end, and end not in the future. |
| First run is very slow | Live SoilGrids calls are spaced 12 s apart to respect fair use; later runs use the cache. |
| HTTP 429 / 5xx from an API | Requests retry automatically with backoff; wait and try again. |
| Stale or odd data | Forecasts refresh on their own after 3 hours. For anything else, delete the JSON files in `cache/` and rerun. |
| Backend returns 502 | Open-Meteo or SoilGrids failed after retries (SoilGrids is a beta service and is sometimes paused). The message says which; try again later. |
| `ModuleNotFoundError: core` / `backend` | Start uvicorn from the repo root, not from `backend/`. |
| `uvicorn` / `streamlit` not found | Activate the virtual environment and reinstall the requirements. |
| Port already in use | Stop the other process on 3000 / 8000 / 8501, or pass another port (`--port`, `-p`). |

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Contributing

- **Branches:** `feat/short-description`, `fix/short-description`, `docs/…`, `chore/…`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) with the bumped SemVer version at the end of the subject, e.g. `feat: add CSV export (v1.4.0)`. Breaking change → major (minor while `0.x`), `feat` → minor, everything else → patch.
- Keep `VERSION`, `frontend/package.json` and the version badge in sync in the same commit.
- Update this README with every change.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## License

Licensed under the **Sprucetrap Source-Available License 1.0** – see [LICENSE](LICENSE). Non-commercial use, study and modification are allowed; copies and forks must keep the license, mark changes and credit:

> Based on ITD112 API Integration by Sprucetrap (https://github.com/Jevoel16)

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Author

**Sprucetrap** ([@Jevoel16](https://github.com/Jevoel16)) – ITD112 Laboratory Exercise 1: API Integration.

<p align="right"><a href="#top">back to top ↑</a></p>

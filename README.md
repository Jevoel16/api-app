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

![Version](https://img.shields.io/badge/version-0.1.4-green?style=flat)
![License](https://img.shields.io/badge/license-Sprucetrap_SAL_1.0-orange?style=flat)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat)

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

### Advanced version (FastAPI + Next.js)
- **Depth dimension:** queries SoilGrids at `0-5cm`, `5-15cm` and `15-30cm` to show how soil texture changes down the profile.
- **Weather forecasts:** combines historical archive data with the 16-day Open-Meteo forecast.
- **Uncertainty tracking:** fetches the `Q0.05` and `Q0.95` percentiles from SoilGrids and shows them as error bars.
- **Data export:** download raw CSV datasets directly from the browser.
- **API log:** every upstream call is listed with provider, site, cache status (Cached/Live) and timing.
- Charts: temperature trend (7-day rolling mean), monthly rainfall vs evaporative demand, daily rainfall distribution, topsoil texture, depth profile, clay vs water balance, spatial distribution.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Baseline app | Python, Streamlit, Plotly, pandas, NumPy, requests |
| Backend | Python, FastAPI, Uvicorn, pandas, NumPy, requests, Pydantic |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Plotly.js (`react-plotly.js`), axios, lucide-react |
| Data sources | [Open-Meteo](https://open-meteo.com/) (archive + forecast), [SoilGrids v2.0 REST API (ISRIC)](https://rest.isric.org/) |
| CI | GitHub Actions (planned, see [Testing](#testing)) |

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

No environment variables or API keys are needed: both Open-Meteo and SoilGrids are free, keyless APIs.

| Setting | Where | Value |
| --- | --- | --- |
| Disk cache | `cache/` (Streamlit), `backend/cache/` (FastAPI, relative to where Uvicorn runs) | One JSON file per unique request |
| SoilGrids fair-use pause | `SOILGRIDS_PAUSE_S` in `streamlit_app.py` and `backend/main.py` | 12 s between live SoilGrids calls |
| Timezone | `TIMEZONE` in `backend/main.py` | `Asia/Manila` |
| Backend URL used by the frontend | `frontend/src/app/page.tsx` | `http://127.0.0.1:8000/api/integrate` |
| Streamlit theme | `.streamlit/config.toml` | Light theme, teal primary colour |

Delete the files in a cache folder to force fresh API calls.

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

**Terminal 1 – backend (FastAPI):**

```bash
.venv\Scripts\activate
cd backend
uvicorn main:app --reload
```

**Terminal 2 – frontend (Next.js):**

```bash
cd frontend
npm run dev
```

Open http://localhost:3000, choose sites and a date range under **Configure & Run**, and run the integration. Charts, the API log and CSV export appear once the data loads. Live SoilGrids calls are paced 12 s apart, so a first run with several sites takes a while.

#### Calling the API directly

`POST /api/integrate` on http://127.0.0.1:8000:

```bash
curl -X POST http://127.0.0.1:8000/api/integrate \
  -H "Content-Type: application/json" \
  -d '{"sites": ["Iligan City", "Malaybalay"], "start_date": "2025-01-01", "end_date": "2025-06-30"}'
```

The response holds `daily`, `summary`, `soil_long`, `active_sites` and `api_logs`. Interactive docs are at http://127.0.0.1:8000/docs.

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Project structure

```text
api-app/
├── streamlit_app.py        # Baseline Streamlit app
├── requirements.txt        # Baseline Python dependencies
├── .streamlit/config.toml  # Streamlit theme
├── cache/                  # Baseline disk cache (JSON)
├── backend/
│   ├── main.py             # FastAPI app: fetch, parse, join, summarise
│   ├── requirements.txt    # Backend Python dependencies
│   └── cache/              # Backend disk cache (JSON)
├── frontend/
│   ├── src/app/            # Next.js App Router pages, layout, styles
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
| `uvicorn main:app --reload` | `backend/` | Start the API on port 8000 with auto-reload |
| `npm run dev` | `frontend/` | Start the Next.js dev server on port 3000 |
| `npm run build` | `frontend/` | Production build (includes type-checking) |
| `npm run start` | `frontend/` | Serve the production build |
| `npm run lint` | `frontend/` | Run ESLint |

<p align="right"><a href="#top">back to top ↑</a></p>

---

## Testing

There is no automated test suite yet. The planned CI (GitHub Actions) runs `npm ci`, `npm run lint` and `npm run build` for the frontend and a Python compile check for the backend and Streamlit app; it is on hold until the existing ESLint errors (`no-explicit-any` in `page.tsx`) are resolved.

Manual checks:

1. `streamlit run streamlit_app.py` loads and every step renders for the default sites.
2. Backend starts and http://127.0.0.1:8000/docs lists `POST /api/integrate`.
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
| Frontend shows a network error | Make sure the backend is running on `127.0.0.1:8000` before clicking run. |
| First run is very slow | Live SoilGrids calls are spaced 12 s apart to respect fair use; later runs use the cache. |
| HTTP 429 / 5xx from an API | Requests retry automatically with backoff; wait and try again. |
| Stale or odd data | Delete the JSON files in `cache/` or `backend/cache/` and rerun. |
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

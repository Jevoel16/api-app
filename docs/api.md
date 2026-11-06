# Backend API reference

The FastAPI backend runs on http://127.0.0.1:8000 (start it from the repo root with `uvicorn backend.app.main:app --reload`). Every request and response field is typed in the interactive OpenAPI docs at http://127.0.0.1:8000/docs.

[Back to README](../README.md)

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness check, returns `{"status": "ok", "version": "…"}` |
| `GET /api/sites` | The five study sites with coordinates |
| `POST /api/integrate` | Fetch, join and summarise weather + soil for chosen sites and dates |

## Example request

```bash
curl -X POST http://127.0.0.1:8000/api/integrate \
  -H "Content-Type: application/json" \
  -d '{"sites": ["Iligan City", "Malaybalay"], "start_date": "2025-01-01", "end_date": "2025-06-30"}'
```

## Response

The response holds five keys:

| Key | Contents |
| --- | --- |
| `daily` | One row per site and day: weather variables plus the joined topsoil values |
| `summary` | One row per site: rainfall, ET0, water balance, mean temperature, clay, pH, SOC |
| `soil_long` | Soil properties per site and depth (0–5, 5–15, 15–30 cm) with Q0.05 / Q0.95 |
| `active_sites` | The sites included in the result |
| `api_logs` | Every upstream call: provider, site, HTTP `status` (or `null` when served from cache), cache state, timing |

Soil values are in standard units: clay, sand and silt in %, pH, and SOC in g/kg (SoilGrids' `d_factor` is already applied). The 16-day forecast is appended automatically.

## Errors

| Status | When |
| --- | --- |
| **422 Unprocessable Entity** | Empty or unknown `sites`, dates not in `YYYY-MM-DD` format, `start_date` after `end_date`, or an `end_date` in the future. The body says which. |
| **502 Bad Gateway** | Open-Meteo or SoilGrids failed after retries. The body carries the upstream message. |

## Caching and pacing

Responses are cached as JSON files in `cache/` (see `CACHE_DIR`). Archive and soil responses never expire; forecasts are refetched after `FORECAST_TTL_S` (3 h by default). Live SoilGrids calls are spaced `SOILGRIDS_PAUSE_S` (12 s) apart for fair use, so a first run with several sites takes a while. Delete the files in `cache/` to force fresh calls.

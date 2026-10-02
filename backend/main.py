import hashlib
import json
import time
from datetime import date
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ==========================================
# STEP 0: API & Server Configuration
# ==========================================
app = FastAPI(title="ITD112 API Integration Backend")

# Allow the Next.js frontend (running on a different port) to access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_DIR = Path("cache")
SOILGRIDS_PAUSE_S = 12

# ==========================================
# DATA SOURCE CONSTANTS
# ==========================================
SITES = pd.DataFrame(
    [
        ("Iligan City", 8.200, 124.300),
        ("Malaybalay", 8.150, 125.130),
        ("Valencia", 7.900, 125.090),
        ("Davao (Calinan)", 7.190, 125.460),
        ("General Santos", 6.150, 125.150),
    ],
    columns=["site", "lat", "lon"],
)

SOIL_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
WEATHER_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
WEATHER_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Challenge Extension: We now request 3 depths and 3 values (mean + uncertainty quantiles)
SOIL_PROPERTIES = ["clay", "sand", "silt", "phh2o", "soc"]
SOIL_DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]
SOIL_VALUES = ["mean", "Q0.05", "Q0.95"]
DAILY_VARS = ["temperature_2m_mean", "precipitation_sum", "et0_fao_evapotranspiration"]
TIMEZONE = "Asia/Manila"

def http_session():
    """Sets up an HTTP session with automatic retry logic for robust network calls."""
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504, 429])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    return session

def send(req):
    """Handles sending requests and persistent disk caching."""
    CACHE_DIR.mkdir(exist_ok=True)
    
    j_req = json.dumps(req, sort_keys=True)
    hash_str = hashlib.md5(j_req.encode("utf-8")).hexdigest()
    cache_f = CACHE_DIR / f"{hash_str}.json"
    
    if cache_f.exists():
        with open(cache_f, "r") as f:
            return {"from_cache": True, "data": json.load(f)}
            
    r = http_session().get(req["url"], params=req["params"], timeout=300)
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"API Error: {r.text}")
        
    data = r.json()
    with open(cache_f, "w") as f:
        json.dump(data, f)
    return {"from_cache": False, "data": data}

def parse_weather(raw: dict, sites_df: pd.DataFrame, is_forecast: bool) -> pd.DataFrame:
    """Extracts daily weather variables from the raw Open-Meteo JSON into a DataFrame."""
    res = []
    # Handle single vs batch Open-Meteo responses gracefully
    locs = [raw] if "daily" in raw else raw
    
    for i, loc in enumerate(locs):
        d = loc.get("daily", {})
        if not d: continue
        
        df = pd.DataFrame(d)
        df["site"] = sites_df.iloc[i]["site"]
        df["is_forecast"] = is_forecast
        res.append(df)
        
    return pd.concat(res, ignore_index=True) if res else pd.DataFrame()

def parse_soil(raw: dict, site_name: str) -> pd.DataFrame:
    """Parses SoilGrids JSON, un-nesting properties, depths, and uncertainty values."""
    res = []
    props = raw.get("properties", {}).get("layers", [])
    
    for p in props:
        p_name = p.get("name")
        u = p.get("unit_measure", {}).get("target_multiplier", 1)
        for depth_data in p.get("depths", []):
            d_name = depth_data.get("label")
            vals = depth_data.get("values", {})
            row = {"site": site_name, "property": p_name, "depth": d_name}
            
            # Divide by the target multiplier (e.g., clay * 10 to get real %)
            for v_type in SOIL_VALUES:
                val = vals.get(v_type)
                row[v_type] = val / u if val is not None else np.nan
            res.append(row)
            
    return pd.DataFrame(res)

class IntegrationRequest(BaseModel):
    sites: List[str]
    start_date: str
    end_date: str

@app.post("/api/integrate")
def integrate_data(req: IntegrationRequest):
    """
    Main API endpoint. Executes Steps 1-4 of the pipeline and returns JSON to the frontend.
    """
    api_logs = []
    
    # ==========================================
    # STEP 1: Filter Active Sites
    # ==========================================
    active_sites = SITES[SITES["site"].isin(req.sites)].reset_index(drop=True)
    
    # ==========================================
    # STEP 2: Fetch Weather Data (Archive + Forecast)
    # ==========================================
    weather_dfs = []
    for i, row in active_sites.iterrows():
        site_df = active_sites.iloc[[i]]
        
        # We process one site at a time to prevent Open-Meteo timeouts on large date ranges
        w_arch_params = {
            "latitude": str(row["lat"]),
            "longitude": str(row["lon"]),
            "start_date": req.start_date,
            "end_date": req.end_date,
            "daily": ",".join(DAILY_VARS),
            "timezone": TIMEZONE,
        }
        t0 = time.time()
        arch_res = send({"url": WEATHER_ARCHIVE_URL, "params": w_arch_params})
        api_logs.append({
            "provider": "Open-Meteo (Archive)",
            "target": site_df.iloc[0]["site"],
            "status": "200 OK",
            "cache": "Cached" if arch_res["from_cache"] else "Live",
            "time_s": round(time.time() - t0, 3)
        })
        arch_df = parse_weather(arch_res["data"], site_df, is_forecast=False)
        
        # Challenge Extension: Fetch 16-day future forecast
        w_fore_params = {
            "latitude": str(row["lat"]),
            "longitude": str(row["lon"]),
            "forecast_days": 16,
            "daily": ",".join(DAILY_VARS),
            "timezone": TIMEZONE,
        }
        t1 = time.time()
        fore_res = send({"url": WEATHER_FORECAST_URL, "params": w_fore_params})
        api_logs.append({
            "provider": "Open-Meteo (Forecast)",
            "target": site_df.iloc[0]["site"],
            "status": "200 OK",
            "cache": "Cached" if fore_res["from_cache"] else "Live",
            "time_s": round(time.time() - t1, 3)
        })
        fore_df = parse_weather(fore_res["data"], site_df, is_forecast=True)
        
        weather_dfs.append(arch_df)
        weather_dfs.append(fore_df)
        
    weather_df = pd.concat(weather_dfs, ignore_index=True).drop_duplicates(subset=["site", "time"], keep="last")
    weather_df["time"] = pd.to_datetime(weather_df["time"])
    weather_df["month"] = weather_df["time"].dt.month
    
    # Calculate Water Balance (Rain - ET0)
    weather_df["water_balance_mm"] = weather_df["precipitation_sum"] - weather_df["et0_fao_evapotranspiration"]
    
    # ==========================================
    # STEP 3: Fetch Soil Data
    # ==========================================
    soil_dfs = []
    for i, row in active_sites.iterrows():
        s_params = [("lat", row["lat"]), ("lon", row["lon"])]
        for d in SOIL_DEPTHS:
            s_params.append(("depth", d))
        for v in SOIL_VALUES:
            s_params.append(("value", v))
        for p in SOIL_PROPERTIES:
            s_params.append(("property", p))
            
        t2 = time.time()
        res = send({"url": SOIL_URL, "params": s_params})
        api_logs.append({
            "provider": "SoilGrids",
            "target": row["site"],
            "status": "200 OK",
            "cache": "Cached" if res["from_cache"] else "Live",
            "time_s": round(time.time() - t2, 3)
        })
        soil_dfs.append(parse_soil(res["data"], row["site"]))
        
        # Respect SoilGrids rate limits
        if not res["from_cache"] and i < len(active_sites) - 1:
            time.sleep(SOILGRIDS_PAUSE_S)
            
    soil_long = pd.concat(soil_dfs, ignore_index=True)
    
    # ==========================================
    # STEP 4: Data Joining & Aggregation
    # ==========================================
    # We pivot only the 0-5cm depth "mean" values to create the summary table
    soil_0_5 = soil_long[soil_long["depth"] == "0-5cm"].copy()
    soil_wide = soil_0_5.pivot(index="site", columns="property", values="mean").reset_index()
    soil_wide = active_sites.merge(soil_wide, on="site", how="left")
    
    daily = weather_df.merge(soil_wide, on="site", how="left")
    
    # Group by site to generate total cumulative statistics (Historical only)
    summary = (
        daily[~daily["is_forecast"]].groupby("site", sort=False)
        .agg(
            rain_mm=("precipitation_sum", "sum"),
            et0_mm=("et0_fao_evapotranspiration", "sum"),
            water_balance_mm=("water_balance_mm", "sum"),
            temp_mean_c=("temperature_2m_mean", "mean"),
        )
        .reset_index()
        .merge(soil_wide, on="site")
    )
    
    # Convert DataFrames to dicts/lists for JSON serialization via FastAPI
    daily["time"] = daily["time"].astype(str)
    
    # Replace NaN with None so it translates correctly to JSON null
    summary = summary.replace({np.nan: None})
    soil_long = soil_long.replace({np.nan: None})
    daily = daily.replace({np.nan: None})
    
    return {
        "daily": daily.to_dict(orient="records"),
        "summary": summary.to_dict(orient="records"),
        "soil_long": soil_long.to_dict(orient="records"),
        "active_sites": active_sites.to_dict(orient="records"),
        "api_logs": api_logs
    }

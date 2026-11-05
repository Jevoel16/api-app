"""Fetch, join and aggregate weather + soil data for a set of sites."""

import time
from datetime import date
from typing import Callable

import pandas as pd

from core import http
from core.config import settings
from core.parsing import parse_soil, parse_weather
from core.sources import (
    DAILY_VARS,
    FORECAST_DAYS,
    SOIL_DEPTHS,
    SOIL_PROPERTIES,
    SOIL_URL,
    SOIL_VALUES,
    TIMEZONE,
    WEATHER_ARCHIVE_URL,
    WEATHER_FORECAST_URL,
)


def _log(provider: str, target: str, res: http.Fetched) -> dict:
    return {
        "provider": provider,
        "target": target,
        "status": res.status,
        "cache": "Cached" if res.from_cache else "Live",
        "time_s": round(res.elapsed_s, 3),
    }


def fetch_weather(sites: pd.DataFrame, start: date, end: date) -> tuple[pd.DataFrame, list[dict]]:
    """Archive weather for [start, end] plus a 16-day forecast, per site.

    One site per request keeps Open-Meteo from timing out on long ranges.
    """
    frames, logs = [], []
    for _, row in sites.iterrows():
        base = {
            "latitude": str(row["lat"]),
            "longitude": str(row["lon"]),
            "daily": ",".join(DAILY_VARS),
            "timezone": TIMEZONE,
        }
        arch = http.send(
            WEATHER_ARCHIVE_URL,
            {**base, "start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        logs.append(_log("Open-Meteo (Archive)", row["site"], arch))
        frames.append(parse_weather(arch.data, [row["site"]], is_forecast=False))

        fore = http.send(
            WEATHER_FORECAST_URL,
            {**base, "forecast_days": FORECAST_DAYS},
            max_age_s=settings.forecast_ttl_s,
        )
        logs.append(_log("Open-Meteo (Forecast)", row["site"], fore))
        frames.append(parse_weather(fore.data, [row["site"]], is_forecast=True))

    weather = pd.concat(frames, ignore_index=True)
    # Where archive and forecast overlap (today), keep the forecast row
    weather = weather.drop_duplicates(subset=["site", "time"], keep="last").reset_index(drop=True)
    return weather, logs


def soil_params(lat: float, lon: float, depths=SOIL_DEPTHS, values=SOIL_VALUES, properties=SOIL_PROPERTIES) -> list:
    """SoilGrids wants repeated keys (property=clay&property=sand...), so use a list of pairs."""
    params = [("lat", lat), ("lon", lon)]
    params += [("depth", d) for d in depths]
    params += [("value", v) for v in values]
    params += [("property", p) for p in properties]
    return params


def fetch_soil(
    sites: pd.DataFrame,
    pause_s: float | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> tuple[pd.DataFrame, list[dict]]:
    """Multi-depth soil properties with uncertainty, one request per site."""
    pause_s = settings.soilgrids_pause_s if pause_s is None else pause_s
    frames, logs = [], []
    for i, row in sites.iterrows():
        res = http.send(SOIL_URL, soil_params(row["lat"], row["lon"]))
        logs.append(_log("SoilGrids", row["site"], res))
        frames.append(parse_soil(res.data, row["site"]))
        # Respect SoilGrids fair use, but only between real network calls
        if not res.from_cache and i < len(sites) - 1:
            sleep(pause_s)
    return pd.concat(frames, ignore_index=True), logs


def soil_wide(soil_long: pd.DataFrame, sites: pd.DataFrame, depth: str = "0-5cm") -> pd.DataFrame:
    """One row per site with the mean of each property at one depth, plus coordinates."""
    top = soil_long[soil_long["depth"] == depth]
    wide = (
        top.pivot(index="site", columns="property", values="mean")
        .reindex(columns=SOIL_PROPERTIES)
        .reset_index()
    )
    wide.columns.name = None
    return sites.merge(wide, on="site", how="left")


def integrate(
    weather: pd.DataFrame, soil_long: pd.DataFrame, sites: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Join daily weather with topsoil properties, derive water balance, summarise per site.

    The summary covers historical rows only; forecast rows (if any) stay in daily.
    """
    daily = weather.copy()
    daily["time"] = pd.to_datetime(daily["time"])
    daily["month"] = daily["time"].dt.month
    daily["water_balance_mm"] = daily["precipitation_sum"] - daily["et0_fao_evapotranspiration"]

    soil = soil_wide(soil_long, sites)
    daily = daily.merge(soil, on="site", how="left")

    historical = daily[~daily["is_forecast"]] if "is_forecast" in daily else daily
    summary = (
        historical.groupby("site", sort=False)
        .agg(
            rain_mm=("precipitation_sum", "sum"),
            et0_mm=("et0_fao_evapotranspiration", "sum"),
            water_balance_mm=("water_balance_mm", "sum"),
            temp_mean_c=("temperature_2m_mean", "mean"),
        )
        .reset_index()
        .merge(soil, on="site")
    )
    return daily, summary

"""HTTP routes: thin wrappers around core.pipeline."""

import pandas as pd
from fastapi import APIRouter, HTTPException

from backend.app.schemas import Health, IntegrationRequest, IntegrationResponse, Site
from core import pipeline
from core.config import ROOT_DIR
from core.sources import SITES, select_sites

router = APIRouter(prefix="/api")

VERSION = (ROOT_DIR / "VERSION").read_text(encoding="utf-8").strip()


def records(df: pd.DataFrame) -> list[dict]:
    """DataFrame → JSON-ready dicts, with NaN as None so it serialises to null."""
    return df.astype(object).where(df.notna(), None).to_dict(orient="records")


@router.get("/health", response_model=Health)
def health():
    return {"status": "ok", "version": VERSION}


@router.get("/sites", response_model=list[Site])
def sites():
    return records(SITES)


@router.post("/integrate", response_model=IntegrationResponse, response_model_by_alias=True)
def integrate(req: IntegrationRequest):
    """Fetch weather (archive + forecast) and soil for the chosen sites, then join and summarise."""
    try:
        active = select_sites(req.sites)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    weather, weather_logs = pipeline.fetch_weather(active, req.start_date, req.end_date)
    soil_long, soil_logs = pipeline.fetch_soil(active)
    daily, summary = pipeline.integrate(weather, soil_long, active)
    daily["time"] = daily["time"].dt.strftime("%Y-%m-%d")

    return {
        "daily": records(daily),
        "summary": records(summary),
        "soil_long": records(soil_long),
        "active_sites": records(active),
        "api_logs": weather_logs + soil_logs,
    }

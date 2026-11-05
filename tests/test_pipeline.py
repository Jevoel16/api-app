from datetime import date

import pandas as pd
import pytest

from core import http, pipeline
from core.sources import SOIL_URL, WEATHER_ARCHIVE_URL, WEATHER_FORECAST_URL, select_sites


@pytest.fixture
def fake_send(monkeypatch, archive_json, forecast_json, soil_json):
    """Serve fixtures instead of calling the APIs; records each call."""
    calls = []

    def send(url, params, **kwargs):
        calls.append(url)
        data = {
            WEATHER_ARCHIVE_URL: archive_json,
            WEATHER_FORECAST_URL: forecast_json,
            SOIL_URL: soil_json,
        }[url]
        return http.Fetched(data, from_cache=False, status=200, elapsed_s=0.01)

    monkeypatch.setattr(http, "send", send)
    return calls


def test_select_sites_rejects_unknown():
    with pytest.raises(ValueError, match="Atlantis"):
        select_sites(["Iligan City", "Atlantis"])


def test_fetch_weather_marks_forecast_rows(fake_send):
    sites = select_sites(["Iligan City"])
    weather, logs = pipeline.fetch_weather(sites, date(2025, 1, 1), date(2025, 1, 5))
    assert weather["is_forecast"].sum() == 3
    assert (~weather["is_forecast"]).sum() == 5
    assert [l["provider"] for l in logs] == ["Open-Meteo (Archive)", "Open-Meteo (Forecast)"]
    assert logs[0]["status"] == 200 and logs[0]["cache"] == "Live"


def test_fetch_weather_overlap_keeps_forecast(monkeypatch, archive_json):
    overlap = {"daily": {k: v[-1:] for k, v in archive_json["daily"].items()}}
    overlap["daily"]["temperature_2m_mean"] = [99.0]

    def send(url, params, **kwargs):
        data = overlap if url == WEATHER_FORECAST_URL else archive_json
        return http.Fetched(data, False, 200, 0)

    monkeypatch.setattr(http, "send", send)
    weather, _ = pipeline.fetch_weather(select_sites(["Valencia"]), date(2025, 1, 1), date(2025, 1, 5))
    assert len(weather) == 5
    last = weather[weather["time"] == archive_json["daily"]["time"][-1]].iloc[0]
    assert last["is_forecast"] and last["temperature_2m_mean"] == 99.0


def test_fetch_soil_pauses_only_between_live_calls(fake_send):
    pauses = []
    sites = select_sites(["Iligan City", "Malaybalay", "Valencia"])
    soil, logs = pipeline.fetch_soil(sites, pause_s=5, sleep=pauses.append)
    assert pauses == [5, 5]
    assert len(logs) == 3
    assert set(soil["site"]) == set(sites["site"])


def test_soil_params_repeat_keys():
    params = pipeline.soil_params(8.2, 124.3, depths=["0-5cm"], values=["mean"], properties=["clay", "soc"])
    assert params == [("lat", 8.2), ("lon", 124.3), ("depth", "0-5cm"), ("value", "mean"), ("property", "clay"), ("property", "soc")]


def test_integrate_summary_excludes_forecast(fake_send):
    sites = select_sites(["Iligan City"])
    weather, _ = pipeline.fetch_weather(sites, date(2025, 1, 1), date(2025, 1, 5))
    soil, _ = pipeline.fetch_soil(sites, sleep=lambda s: None)
    daily, summary = pipeline.integrate(weather, soil, sites)

    hist = weather[~weather["is_forecast"]]
    row = summary.iloc[0]
    assert len(daily) == 8
    assert row["rain_mm"] == pytest.approx(hist["precipitation_sum"].sum())
    assert row["water_balance_mm"] == pytest.approx(
        hist["precipitation_sum"].sum() - hist["et0_fao_evapotranspiration"].sum()
    )
    # Topsoil (0-5cm) mean, scaled to %
    assert row["clay"] == 43.5
    assert {"lat", "lon"} <= set(summary.columns)
    assert (daily["water_balance_mm"] == daily["precipitation_sum"] - daily["et0_fao_evapotranspiration"]).all()


def test_integrate_without_forecast_column(archive_json, soil_json):
    from core.parsing import parse_soil, parse_weather

    sites = select_sites(["Iligan City"])
    weather = parse_weather(archive_json, ["Iligan City"])
    daily, summary = pipeline.integrate(weather, parse_soil(soil_json, "Iligan City"), sites)
    assert len(daily) == 5
    assert pd.api.types.is_datetime64_any_dtype(daily["time"])
    assert summary.iloc[0]["temp_mean_c"] == pytest.approx(weather["temperature_2m_mean"].mean())


def test_integrate_site_without_soil_keeps_nan(archive_json, soil_null_json):
    from core.parsing import parse_soil, parse_weather

    sites = select_sites(["Valencia"])
    daily, summary = pipeline.integrate(
        parse_weather(archive_json, ["Valencia"]), parse_soil(soil_null_json, "Valencia"), sites
    )
    assert summary["clay"].isna().all()

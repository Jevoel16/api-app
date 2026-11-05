from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from core import http
from core.sources import SITES, SOIL_URL, WEATHER_ARCHIVE_URL, WEATHER_FORECAST_URL

client = TestClient(app)
VALID = {"sites": ["Iligan City", "Valencia"], "start_date": "2025-01-01", "end_date": "2025-01-05"}


@pytest.fixture
def fake_send(monkeypatch, archive_json, forecast_json, soil_json, soil_null_json):
    def send(url, params, **kwargs):
        if url == SOIL_URL:
            # Valencia's point has no SoilGrids data, like the real API
            data = soil_null_json if ("lat", 7.9) in params else soil_json
            return http.Fetched(data, from_cache=True, status=None, elapsed_s=0.0)
        data = archive_json if url == WEATHER_ARCHIVE_URL else forecast_json
        return http.Fetched(data, from_cache=False, status=200, elapsed_s=0.02)

    monkeypatch.setattr(http, "send", send)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_sites_lists_all_sites():
    r = client.get("/api/sites")
    assert r.status_code == 200
    assert [s["site"] for s in r.json()] == SITES["site"].tolist()


def test_integrate_shape(fake_send):
    r = client.post("/api/integrate", json=VALID)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"daily", "summary", "soil_long", "active_sites", "api_logs"}
    assert len(body["daily"]) == 2 * 8  # 5 archive + 3 forecast days per site
    assert body["daily"][0]["time"] == "2025-01-01"

    iligan, valencia = body["summary"]
    assert iligan["clay"] == 43.5
    assert valencia["clay"] is None  # NaN serialised as null

    soil = body["soil_long"][0]
    assert {"Q0.05", "Q0.95", "mean", "d_factor"} <= set(soil)

    logs = body["api_logs"]
    assert len(logs) == 6
    assert {l["status"] for l in logs if l["cache"] == "Live"} == {200}
    assert {l["status"] for l in logs if l["cache"] == "Cached"} == {None}


@pytest.mark.parametrize(
    "payload, message",
    [
        ({**VALID, "sites": ["Atlantis"]}, "Unknown site"),
        ({**VALID, "sites": []}, "at least 1"),
        ({**VALID, "start_date": "2025-02-01"}, "start_date must be on or before end_date"),
        ({**VALID, "end_date": (date.today() + timedelta(days=2)).isoformat()}, "future"),
        ({**VALID, "start_date": "01/01/2025"}, "date"),
    ],
)
def test_integrate_rejects_bad_input(payload, message):
    r = client.post("/api/integrate", json=payload)
    assert r.status_code == 422
    assert message in r.text


def test_upstream_failure_is_502(monkeypatch):
    def send(url, params, **kwargs):
        raise http.UpstreamError(url, "HTTP 503: maintenance", 503)

    monkeypatch.setattr(http, "send", send)
    r = client.post("/api/integrate", json=VALID)
    assert r.status_code == 502
    assert "maintenance" in r.json()["detail"]


def test_cors_allows_frontend_origin():
    r = client.options(
        "/api/integrate",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"

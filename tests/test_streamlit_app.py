from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from core import http
from core.sources import SOIL_URL

APP = str(Path(__file__).resolve().parent.parent / "streamlit_app.py")


@pytest.fixture
def fake_send(monkeypatch, archive_json, soil_json):
    def send(url, params, **kwargs):
        if url == SOIL_URL:
            return http.Fetched(soil_json, True, None, 0)
        # The baseline batches every site into one Open-Meteo call
        n = len(params["latitude"].split(","))
        return http.Fetched([archive_json] * n if n > 1 else archive_json, False, 200, 0)

    monkeypatch.setattr(http, "send", send)


def test_landing_page_renders():
    at = AppTest.from_file(APP, default_timeout=30).run()
    assert not at.exception
    assert "Run the integration" in at.info[0].value


def test_run_integration_renders_tables(fake_send):
    at = AppTest.from_file(APP, default_timeout=30).run()
    at.sidebar.button[0].click().run()
    assert not at.exception
    assert at.session_state.data_fetched
    summary = at.session_state.summary
    assert len(summary) == 3
    # Same scaled topsoil value as the backend
    assert summary["clay"].iloc[0] == 43.5
    assert [m.value for m in at.metric][:1] == ["3"]

import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def archive_json():
    return load("weather_archive.json")


@pytest.fixture
def forecast_json():
    return load("weather_forecast.json")


@pytest.fixture
def soil_json():
    return load("soil_iligan.json")


@pytest.fixture
def soil_null_json():
    return load("soil_null.json")

import math

from core.parsing import parse_soil, parse_weather
from core.sources import SOIL_DEPTHS, SOIL_PROPERTIES


def test_parse_soil_scales_by_d_factor(soil_json):
    # Regression: values used to be left unscaled (clay 435 instead of 43.5 %)
    df = parse_soil(soil_json, "Iligan City")
    clay = df[(df["property"] == "clay") & (df["depth"] == "0-5cm")].iloc[0]
    assert clay["raw_mean"] == 435
    assert clay["mean"] == 43.5
    assert clay["Q0.05"] == 3.5
    assert clay["Q0.95"] == 96.4
    assert clay["target_units"] == "%"


def test_parse_soil_has_every_property_and_depth(soil_json):
    df = parse_soil(soil_json, "Iligan City")
    assert len(df) == len(SOIL_PROPERTIES) * len(SOIL_DEPTHS)
    assert set(df["property"]) == set(SOIL_PROPERTIES)
    assert set(df["depth"]) == set(SOIL_DEPTHS)


def test_parse_soil_nulls_become_nan(soil_null_json):
    df = parse_soil(soil_null_json, "Valencia")
    assert df["mean"].map(math.isnan).all()
    assert df["Q0.95"].map(math.isnan).all()


def test_parse_soil_only_requested_values(soil_json):
    df = parse_soil(soil_json, "Iligan City", values=["mean"])
    assert "mean" in df and "Q0.05" not in df


def test_parse_weather_single_location(archive_json):
    df = parse_weather(archive_json, ["Iligan City"], is_forecast=False)
    assert len(df) == 5
    assert list(df.columns[:2]) == ["site", "time"]
    assert (df["site"] == "Iligan City").all()
    assert (~df["is_forecast"]).all()


def test_parse_weather_batch_response(archive_json, forecast_json):
    df = parse_weather([archive_json, forecast_json], ["A", "B"])
    assert df.groupby("site").size().to_dict() == {"A": 5, "B": 3}
    assert "is_forecast" not in df


def test_parse_weather_skips_empty_location(archive_json):
    df = parse_weather([{"daily": {}}, archive_json], ["A", "B"])
    assert set(df["site"]) == {"B"}

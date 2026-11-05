"""Turn raw Open-Meteo and SoilGrids JSON into tidy DataFrames."""

from typing import Any, Sequence

import numpy as np
import pandas as pd

from core.sources import SOIL_VALUES


def parse_weather(raw: Any, site_names: Sequence[str], is_forecast: bool | None = None) -> pd.DataFrame:
    """One row per site per day. Open-Meteo returns a dict for one site, a list for several.

    is_forecast: when given, adds an is_forecast column with that value.
    """
    locations = raw if isinstance(raw, list) else [raw]
    frames = []
    for site, loc in zip(site_names, locations):
        daily = loc.get("daily") or {}
        if not daily:
            continue
        df = pd.DataFrame(daily)
        df.insert(0, "site", site)
        if is_forecast is not None:
            df["is_forecast"] = is_forecast
        frames.append(df)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def parse_soil(raw: dict, site: str, values: Sequence[str] = SOIL_VALUES) -> pd.DataFrame:
    """One row per property per depth, in standard units.

    SoilGrids stores scaled integers (e.g. clay in g/kg); dividing by
    unit_measure.d_factor gives the target units (clay in %).
    """
    rows = []
    for layer in raw.get("properties", {}).get("layers", []):
        unit = layer.get("unit_measure", {})
        d_factor = unit.get("d_factor") or 1
        for depth in layer.get("depths", []):
            vals = depth.get("values", {})
            row = {
                "site": site,
                "property": layer.get("name"),
                "depth": depth.get("label"),
                "mapped_units": unit.get("mapped_units"),
                "d_factor": d_factor,
                "target_units": unit.get("target_units"),
                "raw_mean": vals.get("mean"),
            }
            for v in values:
                raw_v = vals.get(v)
                row[v] = np.nan if raw_v is None else raw_v / d_factor
            rows.append(row)
    return pd.DataFrame(rows)

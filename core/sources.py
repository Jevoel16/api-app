"""Study sites and the API endpoints/variables we request."""

import pandas as pd

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

SOIL_PROPERTIES = ["clay", "sand", "silt", "phh2o", "soc"]
SOIL_DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]
# Mean plus the 5% / 95% quantiles, which give an uncertainty band
SOIL_VALUES = ["mean", "Q0.05", "Q0.95"]
DAILY_VARS = ["temperature_2m_mean", "precipitation_sum", "et0_fao_evapotranspiration"]
TIMEZONE = "Asia/Manila"
FORECAST_DAYS = 16


def select_sites(names: list[str]) -> pd.DataFrame:
    """Rows of SITES for the given names, in SITES order. Raises ValueError on unknown names."""
    unknown = sorted(set(names) - set(SITES["site"]))
    if unknown:
        raise ValueError(
            f"Unknown site(s): {', '.join(unknown)}. Valid sites: {', '.join(SITES['site'])}"
        )
    return SITES[SITES["site"].isin(names)].reset_index(drop=True)

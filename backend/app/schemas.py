"""Request and response models for the API (also drive the /docs page)."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class IntegrationRequest(BaseModel):
    sites: list[str] = Field(min_length=1, examples=[["Iligan City", "Malaybalay"]])
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def check_date_range(self):
        # The archive API rejects reversed or future ranges; fail early with a clear 422
        if self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        if self.end_date > date.today():
            raise ValueError("end_date cannot be in the future (forecasts are added automatically)")
        return self


class Site(BaseModel):
    site: str
    lat: float
    lon: float


class _Soil(BaseModel):
    clay: float | None = None
    sand: float | None = None
    silt: float | None = None
    phh2o: float | None = None
    soc: float | None = None


class DailyRecord(Site, _Soil):
    time: str
    month: int
    is_forecast: bool
    temperature_2m_mean: float | None
    precipitation_sum: float | None
    et0_fao_evapotranspiration: float | None
    water_balance_mm: float | None


class SummaryRow(Site, _Soil):
    rain_mm: float | None
    et0_mm: float | None
    water_balance_mm: float | None
    temp_mean_c: float | None


class SoilRow(BaseModel):
    # Allows the "Q0.05" / "Q0.95" keys, which are not valid Python names
    model_config = ConfigDict(populate_by_name=True)

    site: str
    property: str
    depth: str
    mapped_units: str | None
    d_factor: float
    target_units: str | None
    raw_mean: float | None
    mean: float | None
    q05: float | None = Field(alias="Q0.05", serialization_alias="Q0.05")
    q95: float | None = Field(alias="Q0.95", serialization_alias="Q0.95")


class ApiLog(BaseModel):
    provider: str
    target: str
    status: int | None = Field(description="HTTP status of a live call; null when served from cache")
    cache: str
    time_s: float


class IntegrationResponse(BaseModel):
    daily: list[DailyRecord]
    summary: list[SummaryRow]
    soil_long: list[SoilRow]
    active_sites: list[Site]
    api_logs: list[ApiLog]


class Health(BaseModel):
    status: str
    version: str

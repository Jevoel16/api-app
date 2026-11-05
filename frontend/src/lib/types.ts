// Shapes returned by the FastAPI backend (NaN values arrive as null).
// Type aliases (not interfaces) so rows stay assignable to Record<string, unknown> for CSV export.

export type Site = { site: string; lat: number; lon: number };

type Topsoil = {
  clay: number | null;
  sand: number | null;
  silt: number | null;
  phh2o: number | null;
  soc: number | null;
};

export type DailyRecord = Site &
  Topsoil & {
    time: string;
    month: number;
    is_forecast: boolean;
    temperature_2m_mean: number | null;
    precipitation_sum: number | null;
    et0_fao_evapotranspiration: number | null;
    water_balance_mm: number | null;
  };

export type SummaryRow = Site &
  Topsoil & {
    rain_mm: number | null;
    et0_mm: number | null;
    water_balance_mm: number | null;
    temp_mean_c: number | null;
  };

export type SoilRow = {
  site: string;
  property: string;
  depth: string;
  mapped_units: string | null;
  d_factor: number;
  target_units: string | null;
  raw_mean: number | null;
  mean: number | null;
  "Q0.05": number | null;
  "Q0.95": number | null;
};

export type ApiLog = {
  provider: string;
  target: string;
  /** HTTP status of a live call; null when served from cache */
  status: number | null;
  cache: "Cached" | "Live";
  time_s: number;
};

export type IntegrationRequest = {
  sites: string[];
  start_date: string;
  end_date: string;
};

export type IntegrationResponse = {
  daily: DailyRecord[];
  summary: SummaryRow[];
  soil_long: SoilRow[];
  active_sites: Site[];
  api_logs: ApiLog[];
};

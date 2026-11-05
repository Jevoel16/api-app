"""Runtime settings, read from environment variables (and an optional root .env file)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader so we don't need python-dotenv. Real env vars win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    cache_dir: Path = ROOT_DIR / "cache"
    # Archive and soil data never change, but forecasts do: refetch them after this age
    forecast_ttl_s: int = 3 * 60 * 60
    # SoilGrids fair use is ~5 calls/min
    soilgrids_pause_s: float = 12
    http_timeout_s: float = 300
    cors_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    @classmethod
    def from_env(cls) -> "Settings":
        _load_dotenv(ROOT_DIR / ".env")
        defaults = cls()
        env = os.environ
        return cls(
            cache_dir=Path(env["CACHE_DIR"]).resolve() if env.get("CACHE_DIR") else defaults.cache_dir,
            forecast_ttl_s=int(env.get("FORECAST_TTL_S", defaults.forecast_ttl_s)),
            soilgrids_pause_s=float(env.get("SOILGRIDS_PAUSE_S", defaults.soilgrids_pause_s)),
            http_timeout_s=float(env.get("HTTP_TIMEOUT_S", defaults.http_timeout_s)),
            cors_origins=_split_csv(env["CORS_ORIGINS"]) if env.get("CORS_ORIGINS") else defaults.cors_origins,
        )


settings = Settings.from_env()

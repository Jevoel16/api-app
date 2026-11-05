"""HTTP client with retries and a persistent JSON disk cache."""

import hashlib
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from core.config import settings


class UpstreamError(Exception):
    """An external API failed or answered with a non-200 status."""

    def __init__(self, url: str, message: str, status: int | None = None):
        super().__init__(message)
        self.url = url
        self.status = status
        self.message = message


@dataclass
class Fetched:
    data: Any
    from_cache: bool
    status: int | None  # None when served from cache
    elapsed_s: float


_session: requests.Session | None = None


def http_session() -> requests.Session:
    """One shared session, so connections are reused across calls."""
    global _session
    if _session is None:
        retry = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
        )
        s = requests.Session()
        s.mount("https://", HTTPAdapter(max_retries=retry))
        s.headers["User-Agent"] = "itd112-lab1/1.0"
        _session = s
    return _session


def cache_key(url: str, params: Any) -> str:
    raw = json.dumps([url, params], sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def send(
    url: str,
    params: Any,
    *,
    max_age_s: float | None = None,
    cache_dir: Path | None = None,
) -> Fetched:
    """GET url with params, returning cached JSON when it is fresh enough.

    max_age_s: if set, a cached response older than this is refetched.
    params may be a dict or a list of (key, value) pairs (for repeated keys).
    """
    t0 = time.perf_counter()
    cache_dir = cache_dir or settings.cache_dir
    path = cache_dir / f"{cache_key(url, params)}.json"

    if path.exists() and (max_age_s is None or time.time() - path.stat().st_mtime < max_age_s):
        data = json.loads(path.read_text(encoding="utf-8"))
        return Fetched(data, True, None, time.perf_counter() - t0)

    try:
        r = http_session().get(url, params=params, timeout=settings.http_timeout_s)
    except requests.RequestException as exc:
        raise UpstreamError(url, f"Request failed: {exc}") from exc
    if r.status_code != 200:
        raise UpstreamError(url, f"HTTP {r.status_code}: {r.text[:300]}", r.status_code)

    data = r.json()
    cache_dir.mkdir(parents=True, exist_ok=True)
    # Write then rename so a crash never leaves a half-written cache file
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    tmp.replace(path)
    return Fetched(data, False, r.status_code, time.perf_counter() - t0)

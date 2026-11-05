import os
import time

import pytest
import requests

from core import http


class StubResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        return self._payload


class StubSession:
    def __init__(self, response=None, exc=None):
        self.response = response
        self.exc = exc
        self.calls = 0

    def get(self, url, params=None, timeout=None):
        self.calls += 1
        if self.exc:
            raise self.exc
        return self.response


@pytest.fixture
def stub(monkeypatch):
    def install(**kwargs):
        s = StubSession(**kwargs)
        monkeypatch.setattr(http, "http_session", lambda: s)
        return s

    return install


def test_miss_then_hit(tmp_path, stub):
    s = stub(response=StubResponse(payload={"ok": 1}))
    first = http.send("https://x", {"a": 1}, cache_dir=tmp_path)
    second = http.send("https://x", {"a": 1}, cache_dir=tmp_path)
    assert (first.from_cache, first.status, first.data) == (False, 200, {"ok": 1})
    assert (second.from_cache, second.status, second.data) == (True, None, {"ok": 1})
    assert s.calls == 1


def test_different_params_are_different_keys(tmp_path, stub):
    s = stub(response=StubResponse(payload={}))
    http.send("https://x", [("p", "a"), ("p", "b")], cache_dir=tmp_path)
    http.send("https://x", [("p", "a")], cache_dir=tmp_path)
    assert s.calls == 2


def test_stale_entry_is_refetched(tmp_path, stub):
    s = stub(response=StubResponse(payload={"v": 1}))
    http.send("https://x", {}, cache_dir=tmp_path)
    cached = next(tmp_path.glob("*.json"))
    old = time.time() - 3600
    os.utime(cached, (old, old))

    assert http.send("https://x", {}, max_age_s=60, cache_dir=tmp_path).from_cache is False
    assert http.send("https://x", {}, max_age_s=7200, cache_dir=tmp_path).from_cache is True
    assert s.calls == 2


def test_non_200_raises_and_is_not_cached(tmp_path, stub):
    stub(response=StubResponse(status_code=400, text="bad request"))
    with pytest.raises(http.UpstreamError) as err:
        http.send("https://x", {}, cache_dir=tmp_path)
    assert err.value.status == 400
    assert "bad request" in err.value.message
    assert not list(tmp_path.glob("*.json"))


def test_network_error_raises_upstream_error(tmp_path, stub):
    stub(exc=requests.ConnectionError("down"))
    with pytest.raises(http.UpstreamError) as err:
        http.send("https://x", {}, cache_dir=tmp_path)
    assert err.value.status is None

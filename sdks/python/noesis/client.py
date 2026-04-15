"""Noesis HTTP client."""
from __future__ import annotations

from typing import Any, Iterator, Optional

import httpx


class NoesisError(Exception):
    def __init__(self, status: int, message: str, details: Any = None):
        super().__init__(f"[{status}] {message}")
        self.status = status
        self.message = message
        self.details = details


class Noesis:
    """Noesis API client.

    Example:
        >>> from noesis import Noesis
        >>> client = Noesis(api_key="se_...")
        >>> preview = client.token.preview("<MINT>")
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://noesisapi.dev",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise ValueError("api_key is required")
        self._http = httpx.Client(
            base_url=f"{base_url.rstrip('/')}/api/v1",
            headers={"X-API-Key": api_key, "accept": "application/json"},
            timeout=timeout,
        )
        self.token = _TokenClient(self._http)
        self.wallet = _WalletClient(self._http)
        self.chain = _ChainClient(self._http)
        self.streams = _StreamsClient(api_key, base_url)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "Noesis":
        return self

    def __exit__(self, *_) -> None:
        self.close()


def _handle(res: httpx.Response) -> Any:
    if res.is_error:
        details: Any = None
        try:
            details = res.json()
        except Exception:
            pass
        raise NoesisError(res.status_code, f"Noesis API error {res.status_code}", details)
    return res.json()


class _TokenClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def preview(self, mint: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/token/{mint}/preview", params={"chain": chain}))

    def scan(self, mint: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/token/{mint}/scan", params={"chain": chain}))

    def top_holders(self, mint: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/token/{mint}/top-holders", params={"chain": chain}))

    def bundles(self, mint: str) -> Any:
        return _handle(self._http.get(f"/token/{mint}/bundles"))

    def fresh_wallets(self, mint: str) -> Any:
        return _handle(self._http.get(f"/token/{mint}/fresh-wallets"))

    def dev_profile(self, mint: str) -> Any:
        return _handle(self._http.get(f"/token/{mint}/dev-profile"))

    def best_traders(self, mint: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/token/{mint}/best-traders", params={"chain": chain}))

    def early_buyers(self, mint: str, hours: int = 1) -> Any:
        return _handle(self._http.get(f"/token/{mint}/early-buyers", params={"hours": hours}))


class _WalletClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def profile(self, addr: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/wallet/{addr}", params={"chain": chain}))

    def history(self, addr: str, chain: str = "sol") -> Any:
        return _handle(self._http.get(f"/wallet/{addr}/history", params={"chain": chain}))

    def connections(self, addr: str) -> Any:
        return _handle(self._http.get(f"/wallet/{addr}/connections"))

    def batch_identity(self, addresses: list[str]) -> Any:
        return _handle(self._http.post("/wallets/batch-identity", json={"addresses": addresses}))

    def cross_holders(self, tokens: list[str]) -> Any:
        return _handle(self._http.post("/tokens/cross-holders", json={"tokens": tokens}))

    def cross_traders(self, tokens: list[str]) -> Any:
        return _handle(self._http.post("/tokens/cross-traders", json={"tokens": tokens}))


class _ChainClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def status(self) -> Any:
        return _handle(self._http.get("/chain/status"))

    def fees(self) -> Any:
        return _handle(self._http.get("/chain/fees"))

    def account(self, addr: str) -> Any:
        return _handle(self._http.get(f"/account/{addr}"))

    def accounts_batch(self, addresses: list[str]) -> Any:
        return _handle(self._http.post("/accounts/batch", json={"addresses": addresses}))


class _StreamsClient:
    def __init__(self, api_key: str, base_url: str):
        self._headers = {"X-API-Key": api_key, "accept": "text/event-stream"}
        self._base = f"{base_url.rstrip('/')}/api/v1"

    def _stream(self, path: str) -> Iterator[dict]:
        import json
        with httpx.stream("GET", f"{self._base}{path}", headers=self._headers, timeout=None) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line.startswith("data:"):
                    payload = line[5:].strip()
                    if payload:
                        try:
                            yield json.loads(payload)
                        except json.JSONDecodeError:
                            yield {"raw": payload}

    def pumpfun_new_tokens(self) -> Iterator[dict]:
        return self._stream("/stream/pumpfun/new-tokens")

    def pumpfun_migrations(self) -> Iterator[dict]:
        return self._stream("/stream/pumpfun/migrations")

    def raydium_new_pools(self) -> Iterator[dict]:
        return self._stream("/stream/raydium/new-pools")

    def meteora_new_pools(self) -> Iterator[dict]:
        return self._stream("/stream/meteora/new-pools")

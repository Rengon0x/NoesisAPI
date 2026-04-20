"""Noesis HTTP client."""
from __future__ import annotations

from typing import Any, Iterator, Literal, Optional

import httpx


Chain = Literal["sol", "base"]
TxType = Literal[
    "SWAP", "TRANSFER", "NFT_SALE", "NFT_LISTING",
    "COMPRESSED_NFT_MINT", "TOKEN_MINT", "UNKNOWN",
]
TxSource = Literal[
    "JUPITER", "RAYDIUM", "ORCA", "METEORA",
    "PUMP_FUN", "SYSTEM_PROGRAM", "TOKEN_PROGRAM",
]


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


def _drop_none(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


class _TokenClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def preview(self, mint: str, chain: Chain = "sol") -> Any:
        """Flat token metadata + price + pools. Light rate limit."""
        return _handle(self._http.get(f"/token/{mint}/preview", params={"chain": chain}))

    def scan(self, mint: str, chain: Chain = "sol") -> Any:
        """Full scan: holders, bundles, fresh wallets, dev profile. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/scan", params={"chain": chain}))

    def info(self, mint: str, chain: Chain = "sol") -> Any:
        """Detailed on-chain token metadata — authorities, supply, raw DAS asset. Light rate limit."""
        return _handle(self._http.get(f"/token/{mint}/info", params={"chain": chain}))

    def top_holders(self, mint: str, chain: Chain = "sol") -> Any:
        """Top 20 holders with labels/tags. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/top-holders", params={"chain": chain}))

    def holders(
        self,
        mint: str,
        chain: Chain = "sol",
        limit: Optional[int] = None,
        cursor: Optional[str] = None,
    ) -> Any:
        """Paginated full holders list (up to 1000 per page). Light rate limit."""
        params = _drop_none({"chain": chain, "limit": limit, "cursor": cursor})
        return _handle(self._http.get(f"/token/{mint}/holders", params=params))

    def bundles(self, mint: str) -> Any:
        """Bundle (sybil buy) detection. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/bundles"))

    def fresh_wallets(self, mint: str) -> Any:
        """Fresh wallet detection — wallets with no prior on-chain activity. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/fresh-wallets"))

    def team_supply(self, mint: str, chain: Chain = "sol") -> Any:
        """Team/insider supply detection via funding pattern clustering. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/team-supply", params={"chain": chain}))

    def entry_price(self, mint: str, chain: Chain = "sol") -> Any:
        """Holder entry prices, realized & unrealized PnL. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/entry-price", params={"chain": chain}))

    def dev_profile(self, mint: str, chain: Chain = "sol") -> Any:
        """Token creator profile — wallet data, prior coins, funding source. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/dev-profile", params={"chain": chain}))

    def best_traders(self, mint: str, chain: Chain = "sol") -> Any:
        """Most profitable traders, enriched with labels. Heavy rate limit."""
        return _handle(self._http.get(f"/token/{mint}/best-traders", params={"chain": chain}))

    def early_buyers(self, mint: str, hours: float = 1, chain: Chain = "sol") -> Any:
        """Buyers within N hours after token creation. Heavy rate limit."""
        return _handle(
            self._http.get(
                f"/token/{mint}/early-buyers",
                params={"chain": chain, "hours": hours},
            )
        )


class _WalletClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def profile(self, addr: str, chain: Chain = "sol") -> Any:
        """Full wallet profile — PnL, holdings, labels, funding. Heavy rate limit."""
        return _handle(self._http.get(f"/wallet/{addr}", params={"chain": chain}))

    def history(
        self,
        addr: str,
        chain: Chain = "sol",
        limit: Optional[int] = None,
        type: Optional[TxType] = None,
        source: Optional[TxSource] = None,
        before: Optional[str] = None,
    ) -> Any:
        """Parsed transaction history with optional filtering & pagination. Light rate limit."""
        params = _drop_none({
            "chain": chain,
            "limit": limit,
            "type": type,
            "source": source,
            "before": before,
        })
        return _handle(self._http.get(f"/wallet/{addr}/history", params=params))

    def connections(
        self,
        addr: str,
        min_sol: Optional[float] = None,
        max_pages: Optional[int] = None,
    ) -> Any:
        """SOL transfer connections (counterparties with net flow). Heavy rate limit."""
        params = _drop_none({"min_sol": min_sol, "max_pages": max_pages})
        return _handle(self._http.get(f"/wallet/{addr}/connections", params=params))

    def batch_identity(self, addresses: list[str]) -> Any:
        """Batch identity lookup — labels/tags/KOL info for up to 100 wallets. Light rate limit."""
        return _handle(self._http.post("/wallets/batch-identity", json={"addresses": addresses}))

    def cross_holders(self, tokens: list[str]) -> Any:
        """Wallets holding all specified tokens. Heavy rate limit."""
        return _handle(self._http.post("/tokens/cross-holders", json={"tokens": tokens}))

    def cross_traders(self, tokens: list[str]) -> Any:
        """Wallets that traded all specified tokens. Heavy rate limit."""
        return _handle(self._http.post("/tokens/cross-traders", json={"tokens": tokens}))


class _ChainClient:
    def __init__(self, http: httpx.Client):
        self._http = http

    def status(self) -> Any:
        """Current slot, block height, epoch info. Light rate limit."""
        return _handle(self._http.get("/chain/status"))

    def account(self, addr: str) -> Any:
        """Account data (owner, lamports, data) for a single address. Light rate limit."""
        return _handle(self._http.get(f"/account/{addr}"))

    def accounts_batch(self, addresses: list[str]) -> Any:
        """Batch account data for up to 100 addresses. Light rate limit."""
        return _handle(self._http.post("/accounts/batch", json={"addresses": addresses}))

    def parse_transactions(self, signatures: list[str]) -> Any:
        """Parse up to 100 transaction signatures into human-readable events. Light rate limit."""
        return _handle(self._http.post("/transactions/parse", json={"transactions": signatures}))


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

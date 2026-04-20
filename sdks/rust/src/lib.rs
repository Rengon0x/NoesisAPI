//! Official Rust SDK for the [Noesis](https://noesisapi.dev) on-chain
//! intelligence API — Solana token & wallet analytics.
//!
//! All endpoints return [`serde_json::Value`]. Deserialize into your own
//! domain types as needed — the SDK is deliberately schema-agnostic so new
//! response fields don't break compilation.
//!
//! Get an API key at [noesisapi.dev/keys](https://noesisapi.dev/keys).
//!
//! # Example
//!
//! ```no_run
//! use noesis_api::Noesis;
//!
//! # async fn demo() -> Result<(), noesis_api::Error> {
//! let client = Noesis::new("se_...");
//!
//! let preview = client.token_preview("So11111111111111111111111111111111111111112").await?;
//! println!("{preview:#}");
//!
//! let bundles = client.token_bundles("<MINT>").await?;
//! println!("{bundles:#}");
//! # Ok(()) }
//! ```
//!
//! # Rate limits
//!
//! Endpoints are tagged **Light** (1 req/sec) or **Heavy** (1 req / 5 sec).
//! The API returns HTTP 429 when you exceed the limit; this surfaces as
//! [`Error::Api`] with `status == 429`.

#![deny(missing_docs)]

use serde_json::Value;
use thiserror::Error;

const DEFAULT_BASE_URL: &str = "https://noesisapi.dev";

/// Errors returned by the Noesis SDK.
#[derive(Debug, Error)]
pub enum Error {
    /// Transport-level HTTP error (DNS, TLS, connection reset, etc.).
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    /// The API returned a non-2xx status. `details` contains the parsed
    /// JSON error body if the server provided one.
    #[error("Noesis API error {status}: {message}")]
    Api {
        /// HTTP status code (e.g. 401, 404, 429).
        status: u16,
        /// Short message summarising the error.
        message: String,
        /// Parsed JSON body from the server, if any.
        details: Option<Value>,
    },
    /// JSON serialisation/deserialisation error.
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Convenience `Result` alias with the crate error type.
pub type Result<T> = std::result::Result<T, Error>;

/// Chain identifier. Noesis supports Solana and Base.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Chain {
    /// Solana.
    Sol,
    /// Base (Coinbase L2).
    Base,
}

impl Chain {
    fn as_str(self) -> &'static str {
        match self {
            Chain::Sol => "sol",
            Chain::Base => "base",
        }
    }
}

impl Default for Chain {
    fn default() -> Self { Chain::Sol }
}

/// Transaction type filter for [`Noesis::wallet_history`].
#[allow(missing_docs)]
#[derive(Debug, Clone, Copy)]
pub enum TxType {
    Swap, Transfer, NftSale, NftListing, CompressedNftMint, TokenMint, Unknown,
}

impl TxType {
    fn as_str(self) -> &'static str {
        match self {
            TxType::Swap => "SWAP",
            TxType::Transfer => "TRANSFER",
            TxType::NftSale => "NFT_SALE",
            TxType::NftListing => "NFT_LISTING",
            TxType::CompressedNftMint => "COMPRESSED_NFT_MINT",
            TxType::TokenMint => "TOKEN_MINT",
            TxType::Unknown => "UNKNOWN",
        }
    }
}

/// Source-protocol filter for [`Noesis::wallet_history`].
#[allow(missing_docs)]
#[derive(Debug, Clone, Copy)]
pub enum TxSource {
    Jupiter, Raydium, Orca, Meteora, PumpFun, SystemProgram, TokenProgram,
}

impl TxSource {
    fn as_str(self) -> &'static str {
        match self {
            TxSource::Jupiter => "JUPITER",
            TxSource::Raydium => "RAYDIUM",
            TxSource::Orca => "ORCA",
            TxSource::Meteora => "METEORA",
            TxSource::PumpFun => "PUMP_FUN",
            TxSource::SystemProgram => "SYSTEM_PROGRAM",
            TxSource::TokenProgram => "TOKEN_PROGRAM",
        }
    }
}

/// Optional filters for [`Noesis::wallet_history`].
#[derive(Debug, Default, Clone)]
pub struct HistoryOptions {
    /// Chain override. Defaults to Solana.
    pub chain: Option<Chain>,
    /// Number of transactions to return (1..=100, default 20).
    pub limit: Option<u32>,
    /// Filter by transaction type.
    pub ty: Option<TxType>,
    /// Filter by source protocol.
    pub source: Option<TxSource>,
    /// Paginate: only transactions before this signature.
    pub before: Option<String>,
}

/// Optional filters for [`Noesis::token_holders`].
#[derive(Debug, Default, Clone)]
pub struct HoldersOptions {
    /// Chain override. Defaults to Solana.
    pub chain: Option<Chain>,
    /// Number of holders to return (1..=1000, default 100).
    pub limit: Option<u32>,
    /// Pagination cursor from a previous response.
    pub cursor: Option<String>,
}

/// Optional filters for [`Noesis::wallet_connections`].
#[derive(Debug, Default, Clone)]
pub struct ConnectionsOptions {
    /// Minimum SOL threshold for a counterparty to be returned (default 0.1).
    pub min_sol: Option<f64>,
    /// Maximum pages of transaction history to scan (1..=20, default 20).
    pub max_pages: Option<u32>,
}

/// Noesis API client.
///
/// Cheap to clone — shares the underlying [`reqwest::Client`] connection pool.
#[derive(Clone)]
pub struct Noesis {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl Noesis {
    /// Create a client with the default base URL (`https://noesisapi.dev`).
    pub fn new(api_key: impl Into<String>) -> Self {
        Self::with_base_url(api_key, DEFAULT_BASE_URL)
    }

    /// Create a client with a custom base URL — useful for staging or
    /// a self-hosted deployment.
    pub fn with_base_url(api_key: impl Into<String>, base_url: impl Into<String>) -> Self {
        Self {
            http: reqwest::Client::new(),
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_key: api_key.into(),
        }
    }

    async fn get(&self, path: &str, query: &[(&str, String)]) -> Result<Value> {
        let url = format!("{}/api/v1{}", self.base_url, path);
        let res = self.http.get(&url)
            .header("X-API-Key", &self.api_key)
            .query(query)
            .send()
            .await?;
        Self::handle(res).await
    }

    async fn post(&self, path: &str, body: &Value) -> Result<Value> {
        let url = format!("{}/api/v1{}", self.base_url, path);
        let res = self.http.post(&url)
            .header("X-API-Key", &self.api_key)
            .json(body)
            .send()
            .await?;
        Self::handle(res).await
    }

    async fn handle(res: reqwest::Response) -> Result<Value> {
        let status = res.status();
        if status.is_success() {
            Ok(res.json().await?)
        } else {
            let details = res.json::<Value>().await.ok();
            Err(Error::Api {
                status: status.as_u16(),
                message: format!("Noesis API error {}", status.as_u16()),
                details,
            })
        }
    }

    // ─── Token ──────────────────────────────────────────────────────

    /// Flat token metadata + price + pools. **Light** rate limit.
    pub async fn token_preview(&self, mint: &str) -> Result<Value> {
        self.token_preview_on(mint, Chain::Sol).await
    }

    /// Like [`token_preview`](Self::token_preview), explicit chain.
    pub async fn token_preview_on(&self, mint: &str, chain: Chain) -> Result<Value> {
        self.get(&format!("/token/{mint}/preview"), &[("chain", chain.as_str().into())]).await
    }

    /// Full scan: top holders, bundles, fresh wallets, dev profile. **Heavy** rate limit.
    pub async fn token_scan(&self, mint: &str) -> Result<Value> {
        self.token_scan_on(mint, Chain::Sol).await
    }

    /// Like [`token_scan`](Self::token_scan), explicit chain.
    pub async fn token_scan_on(&self, mint: &str, chain: Chain) -> Result<Value> {
        self.get(&format!("/token/{mint}/scan"), &[("chain", chain.as_str().into())]).await
    }

    /// Detailed on-chain token metadata — authorities, supply, raw DAS asset. **Light** rate limit.
    pub async fn token_info(&self, mint: &str, chain: Chain) -> Result<Value> {
        self.get(&format!("/token/{mint}/info"), &[("chain", chain.as_str().into())]).await
    }

    /// Top 20 holders with labels and tags. **Heavy** rate limit.
    pub async fn token_top_holders(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/top-holders"), &[]).await
    }

    /// Paginated full holders list (up to 1000 per page). **Light** rate limit.
    pub async fn token_holders(&self, mint: &str, opts: HoldersOptions) -> Result<Value> {
        let mut q: Vec<(&str, String)> = vec![
            ("chain", opts.chain.unwrap_or_default().as_str().into()),
        ];
        if let Some(limit) = opts.limit { q.push(("limit", limit.to_string())); }
        if let Some(cursor) = opts.cursor { q.push(("cursor", cursor)); }
        self.get(&format!("/token/{mint}/holders"), &q).await
    }

    /// Bundle (sybil buy) detection. **Heavy** rate limit.
    pub async fn token_bundles(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/bundles"), &[]).await
    }

    /// Fresh wallet detection — wallets with no prior on-chain activity. **Heavy** rate limit.
    pub async fn token_fresh_wallets(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/fresh-wallets"), &[]).await
    }

    /// Team/insider supply detection via funding-pattern clustering. **Heavy** rate limit.
    pub async fn token_team_supply(&self, mint: &str, chain: Chain) -> Result<Value> {
        self.get(&format!("/token/{mint}/team-supply"), &[("chain", chain.as_str().into())]).await
    }

    /// Holder entry prices, realized & unrealized PnL. **Heavy** rate limit.
    pub async fn token_entry_price(&self, mint: &str, chain: Chain) -> Result<Value> {
        self.get(&format!("/token/{mint}/entry-price"), &[("chain", chain.as_str().into())]).await
    }

    /// Token creator profile — wallet data, prior coins, funding source. **Heavy** rate limit.
    pub async fn token_dev_profile(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/dev-profile"), &[]).await
    }

    /// Most profitable traders, enriched with labels. **Heavy** rate limit.
    pub async fn token_best_traders(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/best-traders"), &[]).await
    }

    /// Buyers within `hours` after token creation. **Heavy** rate limit.
    pub async fn token_early_buyers(&self, mint: &str, hours: f32) -> Result<Value> {
        self.get(&format!("/token/{mint}/early-buyers"), &[("hours", hours.to_string())]).await
    }

    // ─── Wallet ─────────────────────────────────────────────────────

    /// Full wallet profile — PnL, holdings, labels, funding. **Heavy** rate limit.
    pub async fn wallet_profile(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/wallet/{addr}"), &[]).await
    }

    /// Parsed transaction history with optional filtering & pagination. **Light** rate limit.
    pub async fn wallet_history(&self, addr: &str, opts: HistoryOptions) -> Result<Value> {
        let mut q: Vec<(&str, String)> = vec![
            ("chain", opts.chain.unwrap_or_default().as_str().into()),
        ];
        if let Some(limit) = opts.limit { q.push(("limit", limit.to_string())); }
        if let Some(ty) = opts.ty { q.push(("type", ty.as_str().into())); }
        if let Some(source) = opts.source { q.push(("source", source.as_str().into())); }
        if let Some(before) = opts.before { q.push(("before", before)); }
        self.get(&format!("/wallet/{addr}/history"), &q).await
    }

    /// SOL transfer connections (counterparties with net flow). **Heavy** rate limit.
    pub async fn wallet_connections(&self, addr: &str, opts: ConnectionsOptions) -> Result<Value> {
        let mut q: Vec<(&str, String)> = vec![];
        if let Some(min_sol) = opts.min_sol { q.push(("min_sol", min_sol.to_string())); }
        if let Some(max_pages) = opts.max_pages { q.push(("max_pages", max_pages.to_string())); }
        self.get(&format!("/wallet/{addr}/connections"), &q).await
    }

    /// Batch identity lookup — labels/tags/KOL info for up to 100 wallets. **Light** rate limit.
    pub async fn wallets_batch_identity(&self, addresses: &[String]) -> Result<Value> {
        self.post("/wallets/batch-identity", &serde_json::json!({ "addresses": addresses })).await
    }

    /// Wallets holding all specified tokens. **Heavy** rate limit.
    pub async fn cross_holders(&self, tokens: &[String]) -> Result<Value> {
        self.post("/tokens/cross-holders", &serde_json::json!({ "tokens": tokens })).await
    }

    /// Wallets that traded all specified tokens. **Heavy** rate limit.
    pub async fn cross_traders(&self, tokens: &[String]) -> Result<Value> {
        self.post("/tokens/cross-traders", &serde_json::json!({ "tokens": tokens })).await
    }

    // ─── Chain / On-Chain Data ──────────────────────────────────────

    /// Current slot, block height, epoch info. **Light** rate limit.
    pub async fn chain_status(&self) -> Result<Value> {
        self.get("/chain/status", &[]).await
    }

    /// Account data (owner, lamports, data) for a single address. **Light** rate limit.
    pub async fn account(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/account/{addr}"), &[]).await
    }

    /// Batch account data for up to 100 addresses. **Light** rate limit.
    pub async fn accounts_batch(&self, addresses: &[String]) -> Result<Value> {
        self.post("/accounts/batch", &serde_json::json!({ "addresses": addresses })).await
    }

    /// Parse up to 100 transaction signatures into human-readable events. **Light** rate limit.
    pub async fn parse_transactions(&self, signatures: &[String]) -> Result<Value> {
        self.post("/transactions/parse", &serde_json::json!({ "transactions": signatures })).await
    }
}

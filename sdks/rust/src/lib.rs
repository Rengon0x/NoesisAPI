//! Official Rust SDK for the [Noesis](https://noesisapi.dev) on-chain intelligence API.
//!
//! # Example
//!
//! ```no_run
//! use noesis_api::Noesis;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), noesis::Error> {
//!     let client = Noesis::new("se_...");
//!     let preview = client.token_preview("<MINT>").await?;
//!     println!("{:?}", preview);
//!     Ok(())
//! }
//! ```

use serde_json::Value;
use thiserror::Error;

const DEFAULT_BASE_URL: &str = "https://noesisapi.dev";

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Noesis API error {status}: {message}")]
    Api { status: u16, message: String, details: Option<Value> },
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Clone)]
pub struct Noesis {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl Noesis {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self::with_base_url(api_key, DEFAULT_BASE_URL)
    }

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

    // --- Token ---

    pub async fn token_preview(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/preview"), &[("chain", "sol".into())]).await
    }

    pub async fn token_scan(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/scan"), &[("chain", "sol".into())]).await
    }

    pub async fn token_top_holders(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/top-holders"), &[]).await
    }

    pub async fn token_bundles(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/bundles"), &[]).await
    }

    pub async fn token_fresh_wallets(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/fresh-wallets"), &[]).await
    }

    pub async fn token_dev_profile(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/dev-profile"), &[]).await
    }

    pub async fn token_best_traders(&self, mint: &str) -> Result<Value> {
        self.get(&format!("/token/{mint}/best-traders"), &[]).await
    }

    pub async fn token_early_buyers(&self, mint: &str, hours: u32) -> Result<Value> {
        self.get(&format!("/token/{mint}/early-buyers"), &[("hours", hours.to_string())]).await
    }

    // --- Wallet ---

    pub async fn wallet_profile(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/wallet/{addr}"), &[]).await
    }

    pub async fn wallet_history(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/wallet/{addr}/history"), &[]).await
    }

    pub async fn wallet_connections(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/wallet/{addr}/connections"), &[]).await
    }

    pub async fn wallets_batch_identity(&self, addresses: &[String]) -> Result<Value> {
        self.post("/wallets/batch-identity", &serde_json::json!({ "addresses": addresses })).await
    }

    pub async fn cross_holders(&self, tokens: &[String]) -> Result<Value> {
        self.post("/tokens/cross-holders", &serde_json::json!({ "tokens": tokens })).await
    }

    pub async fn cross_traders(&self, tokens: &[String]) -> Result<Value> {
        self.post("/tokens/cross-traders", &serde_json::json!({ "tokens": tokens })).await
    }

    // --- Chain ---

    pub async fn chain_status(&self) -> Result<Value> {
        self.get("/chain/status", &[]).await
    }

    pub async fn chain_fees(&self) -> Result<Value> {
        self.get("/chain/fees", &[]).await
    }

    pub async fn account(&self, addr: &str) -> Result<Value> {
        self.get(&format!("/account/{addr}"), &[]).await
    }
}

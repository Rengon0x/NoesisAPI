<div align="center">

# noesis-rust

**Official Rust SDK for the [Noesis](https://noesisapi.dev) on-chain intelligence API.**

[![Crates.io](https://img.shields.io/crates/v/noesis-api)](https://crates.io/crates/noesis-api)
[![Docs.rs](https://img.shields.io/docsrs/noesis-api)](https://docs.rs/noesis-api)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Website](https://img.shields.io/badge/website-noesisapi.dev-orange)](https://noesisapi.dev)

</div>

---

## Install

```bash
cargo add noesis-api
```

Or add to `Cargo.toml`:

```toml
[dependencies]
noesis-api = "0.1"
tokio = { version = "1", features = ["full"] }
```

## Quick start

```rust
use noesis_api::Noesis;

#[tokio::main]
async fn main() -> Result<(), noesis::Error> {
    let client = Noesis::new(std::env::var("NOESIS_API_KEY").unwrap());

    let preview = client.token_preview("<MINT>").await?;
    println!("{:#?}", preview);

    let wallet = client.wallet_profile("<ADDRESS>").await?;
    println!("{:#?}", wallet);

    Ok(())
}
```

Get an API key at [noesisapi.dev/keys](https://noesisapi.dev/keys).

## Methods

### Tokens

```rust
client.token_preview(mint).await?;
client.token_scan(mint).await?;
client.token_top_holders(mint).await?;
client.token_bundles(mint).await?;
client.token_fresh_wallets(mint).await?;
client.token_dev_profile(mint).await?;
client.token_best_traders(mint).await?;
client.token_early_buyers(mint, hours).await?;
```

### Wallets

```rust
client.wallet_profile(addr).await?;
client.wallet_history(addr).await?;
client.wallet_connections(addr).await?;
client.wallets_batch_identity(&addresses).await?;
client.cross_holders(&tokens).await?;
client.cross_traders(&tokens).await?;
```

### Chain

```rust
client.chain_status().await?;
client.chain_fees().await?;
client.account(addr).await?;
```

## Custom base URL

```rust
let client = Noesis::with_base_url("se_...", "https://custom.example.com");
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [Website](https://noesisapi.dev)
- [API docs](https://noesisapi.dev/docs)
- [OpenAPI spec](https://github.com/Rengon0x/NoesisAPI/blob/main/openapi.yaml)
- [Examples](https://github.com/Rengon0x/NoesisAPI/tree/main/examples)

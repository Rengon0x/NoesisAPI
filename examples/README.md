<div align="center">

# Noesis Examples

**Runnable examples for the [Noesis](https://noesisapi.dev) on-chain intelligence API.**

[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Website](https://img.shields.io/badge/website-noesisapi.dev-orange)](https://noesisapi.dev)

</div>

---

## Getting started

1. [Get an API key](https://noesisapi.dev/keys)
2. Set it in your environment:
   ```bash
   export NOESIS_API_KEY=se_...
   ```
3. Run any example below.

## Examples

| Language | Example | What it does |
|---|---|---|
| Bash | [`curl/token-preview.sh`](./curl/token-preview.sh) | Token preview via cURL |
| Bash | [`curl/wallet-profile.sh`](./curl/wallet-profile.sh) | Wallet PnL + stats |
| Bash | [`curl/bundle-detection.sh`](./curl/bundle-detection.sh) | Detect bundles on a token |
| Node.js | [`node/token-scan.mjs`](./node/token-scan.mjs) | Full token scan |
| Node.js | [`node/sse-pumpfun.mjs`](./node/sse-pumpfun.mjs) | Live PumpFun token stream |
| Python | [`python/dev_profile.py`](./python/dev_profile.py) | Dev profiling |
| Python | [`python/cross_traders.py`](./python/cross_traders.py) | Cross-token trader analysis |
| Python | [`python/sse_migrations.py`](./python/sse_migrations.py) | Live PumpFun migrations stream |
| Rust | [`rust/src/main.rs`](./rust/src/main.rs) | Token preview in Rust |

## Use with AI agents (MCP)

Add Noesis to Claude Desktop, Cursor, Cline, or Windsurf:

```json
{
  "mcpServers": {
    "noesis": {
      "url": "https://noesisapi.dev/mcp"
    }
  }
}
```

Then ask: *"profile this wallet"*, *"detect bundles on this token"*, *"find wallets that traded both of these tokens profitably."*

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [Website](https://noesisapi.dev)
- [API docs](https://noesisapi.dev/docs)
- [SDKs](https://github.com/Rengon0x/NoesisAPI/tree/main/sdks/typescript)

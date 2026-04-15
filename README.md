<div align="center">

# Noesis

**On-chain intelligence that levels the playing field.**

Solana token & wallet analytics · bundle detection · fresh-wallet clustering · dev profiling · live event streams

[![Website](https://img.shields.io/badge/website-noesisapi.dev-orange)](https://noesisapi.dev)
[![API Docs](https://img.shields.io/badge/docs-API%20reference-blue)](https://noesisapi.dev/docs)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-green)](https://github.com/Rengon0x/NoesisAPI/blob/main/openapi.yaml)
[![MCP](https://img.shields.io/badge/MCP-server-purple)](https://noesisapi.dev/mcp)
[![Telegram](https://img.shields.io/badge/Telegram-%40noesisagent__bot-26A5E4?logo=telegram)](https://t.me/noesisagent_bot)

[**Website**](https://noesisapi.dev) · [**Docs**](https://noesisapi.dev/docs) · [**Get an API key**](https://noesisapi.dev/keys) · [**Telegram bot**](https://t.me/noesisagent_bot)

</div>

---

## What is Noesis?

Every rug, every insider pump, every bundled launch leaves a trail. Most traders never see it — the tools are fragmented, expensive, or locked behind UIs that don't integrate with how people actually work.

Noesis collapses that into a single agent-native surface: one API, one MCP server, one chat. Built for traders, researchers, and AI agents that would rather see than guess.

## Features

- 🔍 **Token analysis** — market metrics, security flags, top traders, holder quality
- 🧨 **Bundle & sniper detection** — bundler %, sniper count, fresh-wallet rate, dev holdings
- 👛 **Wallet profiling** — PnL, winrate, 7d/30d stats, funding source, SOL transfer graph
- 🆕 **Fresh wallets** — newly-created wallets holding a token, classified by age
- 🧬 **Dev profiling** — creator PnL, every token they've made, funding trail
- 🔗 **Cross-token analysis** — wallets holding or trading multiple tokens
- 📡 **Live event streams** — real-time SSE for PumpFun, Raydium, Meteora
- 💬 **Natural-language chat** — ask in plain English, answers grounded in on-chain data
- 🤖 **MCP server** — native integration with Claude, Cursor, Cline, Windsurf
- 📱 **Telegram bot** — full analysis surface in DMs or groups

## Quick start

### 1. Get an API key

[noesisapi.dev/keys](https://noesisapi.dev/keys) — sign in with Solana, create a key.

### 2. Make a request

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/<MINT>/preview"
```

### 3. Or use an SDK

```bash
# TypeScript / Node
npm install @noesis/sdk

# Python
pip install noesis

# Rust
cargo add noesis
```

```typescript
import { Noesis } from "@noesis/sdk";

const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY });
const preview = await noesis.token.preview("<MINT>");
console.log(preview);
```

## MCP server

Add Noesis to any MCP-compatible client (Claude Desktop, Cursor, Cline, Windsurf):

```json
{
  "mcpServers": {
    "noesis": {
      "url": "https://noesisapi.dev/mcp"
    }
  }
}
```

13 tools available — `token_scan`, `token_bundles`, `token_fresh_wallets`, `token_dev_profile`, `wallet_profile`, `wallet_connections`, `cross_holders`, `cross_traders`, and more. See [full list](https://noesisapi.dev/docs).

## Repository layout

| Path | Description |
|---|---|
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1 specification |
| [`sdks/typescript`](./sdks/typescript) | TypeScript / Node.js SDK — `@noesis/sdk` on npm |
| [`sdks/python`](./sdks/python) | Python SDK — `noesis` on PyPI |
| [`sdks/rust`](./sdks/rust) | Rust SDK — `noesis` on crates.io |
| [`examples/`](./examples) | Runnable examples in Bash, Node, Python, and Rust |
| [`docs/`](./docs) | Guides and documentation |

## API surface

| Category | Endpoints |
|---|---|
| **Tokens** | preview · scan · top-holders · bundles · fresh-wallets · team-supply · dev-profile · best-traders · early-buyers · entry-price |
| **Wallets** | profile · history · connections · scan · batch-identity |
| **Cross-analysis** | cross-holders · cross-traders |
| **On-chain** | account · accounts/batch · transactions/parse · chain/status · chain/fees |
| **Live streams (SSE)** | pumpfun/new-tokens · pumpfun/migrations · raydium/new-pools · meteora/new-pools |
| **Chat** | chat · chat/stats |

Full reference: [noesisapi.dev/docs](https://noesisapi.dev/docs) · [OpenAPI spec](https://noesisapi.dev/api/v1/openapi.yaml)

## Rate limits

- **Light** endpoints: 1 request/second
- **Heavy** endpoints: 1 request / 5 seconds

Exceeding limits returns `429` with retry metadata.

## Status

✅ Live and actively developed · ⭐ star this repo for updates

## License

Noesis is a hosted service. This repository contains landing-page content and public documentation.

The Noesis engine is closed-source. Client SDKs, examples, and the OpenAPI spec are published under the MIT License in sibling repositories.

## Contact

- 🌐 [noesisapi.dev](https://noesisapi.dev)
- 🤖 [@noesisagent_bot](https://t.me/noesisagent_bot)
- 📬 [noesisapi.dev/feedback](https://noesisapi.dev/feedback)

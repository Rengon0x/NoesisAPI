---
title: How to get a full PnL profile for any Solana wallet
description: Get SOL balance, total PnL, win rate, trade counts, and risk flags for any Solana wallet — with the Noesis /walletchecker analysis.
command: /walletchecker
endpoint: GET /api/v1/wallet/{addr}
mcp_tool: wallet_profile
slug: wallet-pnl-profile
---

# How to get a full PnL profile for any Solana wallet

**TL;DR.** Noesis's `/walletchecker` analysis returns a full trading profile for any Solana wallet: SOL balance, total PnL, 1/7/30-day PnL, win rate, trade counts by type, risk flags (scam touches, MEV exposure), and Solscan label. One call to `GET /api/v1/wallet/{addr}` replaces cycling through GMGN + Solscan + Birdeye manually.

## Why wallet PnL profiling matters

Every on-chain investigation eventually asks the same question: is this wallet actually profitable, or is it a bagholder cosplaying as smart money? `/walletchecker` answers that in one call:

- Profitable smart money → high 30d PnL, high win rate, broad trade count, clean risk flags
- Insider / team wallet → suspiciously high PnL on a narrow set of tokens, low trade count, fresh-wallet profile
- Bagholder retail → negative PnL, low win rate, high trade count
- Professional bot → extreme trade count, narrow win rate band, specific token patterns

Single lookup, answers all four.

## What does /walletchecker return?

The response has four sections:

1. **Position** — SOL balance, combined portfolio USD value
2. **PnL timeline** — total, 30-day, 7-day, 1-day realized + unrealized profit
3. **Activity** — trade count broken down by type (buy, sell, swap), average hold time, last trade timestamp
4. **Risk flags** — scam token touches, MEV exposure, freezable-token interactions, and Solscan identity label

Supports configurable timeframe — default `30d`, can also request `1d`, `7d`, or custom.

## How does Noesis build the profile?

The analysis fans out four upstream calls:

- **GMGN wallet-data** — name, Twitter, tags, social context
- **GMGN profit-stat** (1d/7d/30d windows) — PnL, win rate, trade counts
- **Solana RPC `getBalance`** — live SOL balance
- **Solscan label lookup** — identity, risk flags

Results are cached briefly in the Noesis DB so repeat lookups are instant. The first call is typically 1-3 seconds.

## How to run the analysis

### Telegram bot

```
/walletchecker 9aB7...Kzm2
```

Aliases: `/wc`, `/wallet`, `/w`. Optional timeframe:

```
/wc 9aB7...Kzm2 7d
```

Typical output:

```
💰 Wallet Profile · 9aB7...Kzm2
Label: "@alpha_caller"
Balance: 312.4 SOL · Portfolio: $680k

PnL (30d)
  Total: +$180,400 (+26.5%)
  Win rate: 71%
  Trades: 214 (buy 108 · sell 106)

Risk flags: ✓ clean
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/wallet/9aB7...Kzm2?period=30d"
```

### MCP

```
wallet_profile(address="9aB7...Kzm2", period="30d")
```

or prompt:

> Give me a full 30-day profile of Solana wallet 9aB7...Kzm2: SOL balance, PnL, win rate, trade counts, and any risk flags.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const w = await noesis.wallet.profile("9aB7...", { period: "30d" });
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
w = noesis.wallet.profile("9aB7...", period="30d")
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let w = client.wallet().profile("9aB7...", "30d").await?;
```

## Understanding the output

- `address`, `label`, `name`, `twitter`, `followers`
- `sol_balance` — live SOL
- `portfolio_usd` — combined USD across all holdings
- `pnl_total_usd`, `pnl_total_percent`
- `pnl_30d_usd`, `pnl_30d_percent`
- `pnl_7d_usd`, `pnl_7d_percent`
- `pnl_1d_usd`, `pnl_1d_percent`
- `win_rate_30d` — percentage of profitable trades
- `trades_30d` — `{ buys, sells, total }`
- `last_trade_at`, `avg_hold_time`
- `risk_flags` — `{ scam_touches, mev_exposed, freezable_interacted }`

## How to combine /walletchecker with other commands

`/walletchecker` is the classifier at the end of almost every Noesis chain.

**Chain 1 — Classify a suspicious holder**
```
/topholders <mint>                    suspicious large holder
  → /walletchecker <holder>           profile
  → high WR + high portfolio → smart money
  → fresh + no history → insider
```

**Chain 2 — Validate top trader quality**
```
/besttraders <mint>                   top trader list
  → /walletchecker <top_trader>       confirm 30d PnL and win rate
  → filter out wash-traders (high trade count, near-zero PnL)
```

**Chain 3 — Team wallet reality check**
```
/team <mint>                          get top team wallet
  → /walletchecker <team_wallet>      in profit? in loss?
  → in profit → likely seller; in loss → trapped holder
```

**Chain 4 — Funder identity check**
```
/links <wallet>                       find top inflow source
  → /walletchecker <funder>           profile the funder
  → funder is whale / KOL / protocol = legitimate; fresh wallet = insider chain
```

## When /walletchecker can mislead

- **GMGN profile gaps** — very fresh wallets (few days old, few trades) may return null PnL/win-rate because GMGN hasn't indexed them yet. Not a sign of bad activity; just missing data.
- **PnL window confusion** — the 30-day window excludes older trades. A wallet with brilliant PnL over 6 months but a flat 30d will show flat. Use total PnL for long-term view, window PnL for recency.
- **Contract addresses** — looking up an SPL token program or DEX program returns minimal data. `/walletchecker` is for personal wallets, not programs.
- **Portfolio USD volatility** — tokens held by the wallet are revalued at current price per call. A heavy position in a low-liquidity token can swing portfolio USD wildly.

## Caveats

- **Solana only.**
- **No auth required** — free-tier endpoint.
- **Snapshot-based** — every call is live; no staleness beyond the 1-3s fetch window.
- **Win rate is full-history** by default, not just the requested window — it's more stable that way.

## FAQ

**What's a "good" win rate on Solana?**
Over a month of active trading, 55-65% is solid smart-money territory. 70%+ is exceptional or suspicious (bots, wash traders, or team wallets with front-running). Under 40% on high trade count is bagholder retail.

**What's the difference between win rate and PnL?**
Win rate is how often trades are profitable. PnL is how much. A wallet with 90% win rate making $100/trade is worse than a wallet with 55% win rate making $10k/trade. Use both.

**Can /walletchecker detect bots?**
Bot patterns are implicit: very high trade count, narrow win rate (40-55%), extreme consistency. Combine with `/links` for coordinated multi-wallet bot farms.

**Does /walletchecker work on non-Solana wallets?**
No. Solana-only today.

**Why does portfolio USD sometimes differ from what I see on a block explorer?**
Three reasons: (1) different pricing sources (Noesis uses GMGN/DexScreener best-pair; explorers may use Jupiter price), (2) live recalculation per call (prices change), (3) some illiquid micro-caps may be priced differently depending on source.

**Is /walletchecker rate-limited?**
It's on the light-endpoint tier (1 req / sec per API key), not the heavy tier. Much higher throughput than `/links` or `/team`.

## Related guides

- [Map a Solana wallet's SOL transfer graph](./wallet-connections.md) — network companion to the PnL profile
- [Rank the most profitable traders on a Solana token](./best-traders-ranking.md) — feeds wallets into /walletchecker
- [Analyze top holders of a Solana token](./top-holders-analysis.md) — same for holder drill-down
- [Find wallets holding multiple Solana tokens](./cross-token-holders.md) — drill common holders into /walletchecker

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/wallet-pnl-profile#article",
      "headline": "How to get a full PnL profile for any Solana wallet",
      "description": "Get SOL balance, total PnL, win rate, trade counts, and risk flags for any Solana wallet with the Noesis /walletchecker analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana wallet profile, wallet PnL analysis, solana win rate, wallet checker"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/wallet-pnl-profile#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What's a good win rate on Solana?",
          "acceptedAnswer": { "@type": "Answer", "text": "55-65% over a month of active trading is solid smart-money. 70%+ is exceptional or suspicious (bots/wash traders). Under 40% on high trade count is bagholder retail." }
        },
        {
          "@type": "Question",
          "name": "What's the difference between win rate and PnL?",
          "acceptedAnswer": { "@type": "Answer", "text": "Win rate is how often trades are profitable. PnL is how much. A wallet with 55% WR making $10k/trade is better than 90% WR making $100/trade." }
        },
        {
          "@type": "Question",
          "name": "Can /walletchecker detect bots?",
          "acceptedAnswer": { "@type": "Answer", "text": "Bot patterns are implicit — very high trade count, narrow win rate (40-55%), extreme consistency. Combine with /links for coordinated multi-wallet farms." }
        }
      ]
    }
  ]
}
</script>

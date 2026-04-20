---
title: How to scan any Solana token for security and insider signals
description: Get a full Solana token audit — metadata, security checks, top holders, volume, liquidity, DEX status — in one call with the Noesis /scan analysis.
command: /scan
endpoint: GET /api/v1/token/{mint}/scan
mcp_tool: token_scan
slug: scan-solana-token
---

# How to scan any Solana token for security and insider signals

**TL;DR.** Noesis's `/scan` analysis returns a full security + market snapshot for any Solana token in a single call. It combines metadata, holder stats, security flags (honeypot, freezeable, burnable), top-holder distribution, liquidity, volume, and DEX-paid status. Use it as the entry point before drilling into specific analyses like `/team`, `/bundle`, or `/fresh`.

## Why a full token scan matters

Before any deep investigation, you need a baseline: what is this token, is it functional as a market, and does it have any obvious red flags? A full scan answers:

- Can this token even be sold? (honeypot / freeze authority)
- Is there liquidity, or is the chart lying?
- What's the holder concentration?
- Has the creator paid for DEXScreener ads?
- Is there a best trading pair to actually route through?

`/scan` collapses all of that into one response. Deeper investigations branch from its output via buttons (bot) or via follow-up calls (API/MCP).

## What does /scan return?

The response has six sections:

1. **Token metadata** — name, symbol, supply, decimals, mint address, update/freeze authority state
2. **Security checks** — honeypot status, freeze authority, mint authority, burnability
3. **Market data** — current price, market cap, 24h volume, liquidity, best-pair routing
4. **Top holders** — the top 10 (configurable 1-100) with amounts and percentages
5. **Holder quality stats** — sniper %, bot %, bundler %, fresh-wallet %
6. **DEX-paid status** — whether the token's creator has paid DEXScreener for marketing

It's the "home screen" of token analysis on Noesis.

## How does Noesis build the scan?

`/scan` fans out five upstream calls in parallel and aggregates the result:

- **Unified metadata** — name/symbol/supply from DAS with GMGN fallback
- **GMGN security info** — freeze/mint authority, transfer-tax, honeypot-pattern detection
- **GMGN token stats** — liquidity, volume, holder count, price
- **GMGN holder stats** — sniper/bot/bundler/fresh-wallet breakdown
- **DexScreener best-pair** — best trading venue, current chart, paid marketing status

Because everything runs in parallel, `/scan` is fast despite the surface area — typical response under 2 seconds.

## How to run the analysis

### Telegram bot

```
/scan EPjFWdd5...
```

or alias `/s`, with optional holder count:

```
/s EPjFWdd5... 20
```

Typical output (abbreviated):

```
🔍 USDC · USD Coin
Supply: 4.2B · Decimals: 6
Mint authority: revoked ✓  Freeze authority: revoked ✓
Market cap: $4.2B · Liquidity: $42M · 24h vol: $890M

Top 10 holders (86.4%)
  1. 2wvk...4abc · CEX: Binance · 8.2%
  2. 4c7N...8def · CEX: Kucoin · 6.5%
  ...

Holder quality: 2% snipers · 1% bots · 0% bundlers · 4% fresh
DEX paid: ✗
```

The bot attaches inline buttons for one-click drill-down into Top Holders, Best Traders, Early Buyers, Bundle, Fresh Wallets, Team Supply, and Full Analysis.

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../scan"
```

### MCP

```
token_scan(mint="EPjF...1v")
```

or prompt:

> Run a full scan on Solana token EPjF...1v. Include security, holder distribution, and market data.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const scan = await noesis.token.scan("EPjFWdd5...");
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
scan = noesis.token.scan("EPjFWdd5...")
```

**Rust**
```rust
let client = noesis_api::Noesis::new(api_key);
let scan = client.token_scan("EPjFWdd5...").await?;
```

## Understanding the output

- `metadata` — `{ name, symbol, decimals, supply, mint, mint_authority, freeze_authority, update_authority }`
- `security` — `{ honeypot, freezeable, burnable, transfer_fee_bps }`
- `market` — `{ price_usd, market_cap_usd, liquidity_usd, volume_24h_usd, best_pair }`
- `top_traders[]` — each with `address`, `label`, and GMGN trader data (PnL, winrate, portfolio)
- `holder_stats` — `{ sniper_pct, bot_pct, bundler_pct, fresh_pct, holder_count }`
- `dex_paid` — `{ paid, services[] }`

## How to combine /scan with other commands

`/scan` is the entry point to almost every Noesis workflow. The main drill-downs:

**Chain 1 — Security-first triage**
```
/scan <mint>                          mint/freeze authority revoked? yes → continue
  → /bundle <mint>                    risk rating on holder behavior
  → /team <mint>                      team-controlled supply
  → /fresh <mint>                     fresh-wallet insider clusters
```

**Chain 2 — Holder-quality drill**
```
/scan <mint>                          note sniper/bundler %
  → /topholders <mint>                who specifically holds
  → /besttraders <mint>               who profits
  → /kol <mint>                       who's named
```

**Chain 3 — Creator context**
```
/scan <mint>
  → /dev <mint>                       profile the creator
  → /cross <mint> <prior_mint>        intersect with dev's past launches
```

**Chain 4 — Is a pump sustainable?**
```
/scan <mint>                          check liquidity + volume
  → /entrymap <mint>                  where did holders enter?
  → /besttraders <mint>               are smart money still holding?
  → /team <mint>                      is team dumping?
```

## When /scan can mislead

- **Freshly-launched pump.fun tokens** — still-on-curve tokens report bonding-curve liquidity, which is very different from post-migration Raydium liquidity. Market data reflects the curve, not a pool.
- **DEX-paid doesn't mean legitimate** — paying for DEXScreener ads is cheap. It signals intent to market the token, not quality. Treat as context, not endorsement.
- **Honeypot detection is heuristic** — no on-chain flag proves a token is fully non-saleable until you actually try to sell. Noesis reports known patterns (blacklist-enabled programs, tax-on-sell contracts) but a sophisticated honeypot can pass.

## Caveats

- **Solana only.**
- **Requires auth** — 1 req / 5 sec (Heavy tier).
- **Not a replacement for deeper analysis** — use `/scan` as the first pass, then drill via `/team`, `/bundle`, `/fresh`, `/dev`.

## FAQ

**What should I check first in a /scan result?**
Mint authority and freeze authority revocation (first line). If either is still active, the team can mint infinite supply or freeze your wallet. After that, look at liquidity — a token with $5k liquidity has the chart of a casino roulette, not a market.

**What does "DEX paid" mean exactly?**
The token's creator has paid DEXScreener for a paid profile badge, boost, or advertisement. It shows the team is willing to spend on visibility. It's neither bullish nor bearish on its own — just a data point.

**How is /scan different from /full?**
`/scan` returns fast-path metadata + holder distribution. `/full` orchestrates 5 deeper analyses (top holders, bundle, fresh, dev, KOL) into a single report — slower and heavier but more complete.

**Can /scan detect rugs?**
It surfaces the classic rug signals (mint authority active, low liquidity, high bundler %, insider team cluster) but it doesn't predict rugs deterministically. Always pair the output with `/team` and `/bundle` for confirmation.

**What's the sniper % in holder_stats?**
Wallets that bought in the first 1-2 slots with bot-pattern timing and are still holding. Sourced from GMGN's holder classification, not re-computed by Noesis.

**Does /scan work on Base or EVM?**
No. Solana only today.

## Related guides

- [Find team-controlled supply on a Solana token](./find-team-supply.md)
- [Detect bundled buys on pump.fun launches](./detect-bundles-pumpfun.md)
- [Spot fresh-wallet insider activity](./fresh-wallet-detection.md)
- [Profile the dev of a Solana meme coin](./profile-solana-dev.md)
- [Analyze top holders of a Solana token](./top-holders-analysis.md)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/scan-solana-token#article",
      "headline": "How to scan any Solana token for security and insider signals",
      "description": "Get a full Solana token audit — metadata, security checks, top holders, volume, liquidity, DEX status — in one call with the Noesis /scan analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana token scan, solana token security, honeypot detection, pump.fun audit"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/scan-solana-token#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What should I check first in a /scan result?",
          "acceptedAnswer": { "@type": "Answer", "text": "Mint and freeze authority revocation — if either is active, the team can mint infinite supply or freeze wallets. Then check liquidity depth." }
        },
        {
          "@type": "Question",
          "name": "How is /scan different from /full?",
          "acceptedAnswer": { "@type": "Answer", "text": "/scan is a fast-path metadata + holder distribution call. /full runs 5 deeper analyses (top holders, bundle, fresh, dev, KOL) — slower but more complete." }
        },
        {
          "@type": "Question",
          "name": "Can /scan detect rugs?",
          "acceptedAnswer": { "@type": "Answer", "text": "It surfaces classic rug signals (active mint authority, low liquidity, high bundler %, team cluster) but doesn't predict rugs deterministically. Pair with /team and /bundle." }
        }
      ]
    }
  ]
}
</script>

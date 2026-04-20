---
title: How to map holder entry prices and cost basis on a Solana token
description: See what price each top holder paid to enter a Solana token, their current PnL, and the distribution of entries — with the Noesis /entrymap analysis.
command: /entrymap
endpoint: GET /api/v1/token/{mint}/entry-price
mcp_tool: token_entry_price
slug: holder-entry-prices
---

# How to map holder entry prices and cost basis on a Solana token

**TL;DR.** Noesis's `/entrymap` analysis returns the entry price, cost basis, and current PnL for each of the top N holders of any Solana token. One call to `GET /api/v1/token/{mint}/entry-price` tells you who's sitting on profit (dump risk) versus who's underwater (panic-sell risk) — with an average across all holders for context.

## Why entry price analysis matters

Two tokens can have identical current holder distributions but completely different forward price action. What matters is where each holder entered:

- **Top holders deeply in profit** → dump risk. Any pump can trigger waves of selling.
- **Top holders underwater** → panic-sell risk. Any dip can cascade.
- **Top holders near current price** → stable holders, minimal near-term pressure.

A flat holder chart doesn't show any of this. `/entrymap` surfaces the entry price for every top holder so you can read the market's real positioning.

## What does /entrymap return?

Per-holder entry data:

1. **Entry price** — average USD price the holder paid per token
2. **Cost basis** — total USD spent to accumulate the current position
3. **Current PnL** — realized + unrealized profit/loss in USD and percent
4. **Entry time** — when the holder first bought the token
5. **Position** — current amount, percentage of supply

Plus aggregates:

- Average entry price across all tracked holders
- Average PnL percentage
- Distribution buckets (how many holders are in profit vs underwater)

## How does Noesis compute entry prices?

`/entrymap` combines GMGN's per-wallet entry data with on-chain price history:

- For each top holder, pull GMGN's recorded average entry price when available
- Fall back to on-chain reconstruction: find the holder's first-buy transaction, resolve the swap route, compute the execution price
- Use DexScreener's best-pair as the current price reference
- Compute PnL deltas and aggregate distribution

The analysis covers the top 20 holders by default (configurable up to 50).

## How to run the analysis

### Telegram bot

```
/entrymap EPjFWdd5...
```

or alias `/em`, with optional holder count:

```
/em EPjFWdd5... 30
```

Typical output:

```
💵 Entry Price Map · top 20 holders
Avg entry: $0.0031 · Current: $0.0098 · Avg PnL: +216%

 1. 9aB7...Kzm2 · 4.2% · entry $0.0012 · +720%
 2. 4rEp...Nn01 · 3.8% · entry $0.0045 · +118%
 3. Gx9w...Qr71 · 3.1% · entry $0.021 · -53%
 ...

Distribution: 14 in profit · 4 near entry · 2 underwater
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../entry-price"
```

### MCP

```
token_entry_price(mint="EPjF...1v")
```

or prompt:

> Show the entry prices of the top 20 holders of token EPjF...1v along with their current PnL.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const em = await noesis.token.entryPrice("EPjFWdd5...");
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
em = noesis.token.entry_price("EPjFWdd5...")
```

**Rust**
```rust
use noesis_api::{Noesis, Chain};
let client = Noesis::new(api_key);
let em = client.token_entry_price("EPjFWdd5...", Chain::Sol).await?;
```

## Understanding the output

- `token` — basic token info (price, market cap, etc.)
- `holders[]` — top holders with cost-basis data (GMGN holder struct):
  - `address`, `amount_percentage`, `usd_value`, `balance`
  - `cost` — total USD spent on buys
  - `avg_cost` — weighted average entry price
  - `realized_profit`, `unrealized_profit` — current PnL
  - `buy_tx_count_cur`, `sell_tx_count_cur` — trade counts
  - `name`, `tags` — GMGN enrichment
  - `is_suspicious`, `is_new` — risk flags

## How to combine /entrymap with other commands

**Chain 1 — Predict dump risk**
```
/entrymap <mint>                      avg PnL +200%
  → /topholders <mint>                identify top holders in deepest profit
  → /walletchecker <top_wallet>       historical dump pattern?
```

**Chain 2 — Team exit readiness**
```
/team <mint>                          identify team wallets
  → /entrymap <mint>                  team wallets in profit?
  → high PnL on team wallets = team ready to dump
```

**Chain 3 — Bagholder detection**
```
/entrymap <mint>                      distribution shows many underwater
  → /besttraders <mint>               smart money exited already?
  → underwater holders + smart money gone = stuck retail
```

**Chain 4 — Entry-time clustering**
```
/entrymap <mint>                      check entry_time distribution
  → tight time cluster among top holders = coordinated buy
  → combine with /bundle for confirmation
```

## When /entrymap can mislead

- **Wash-traded entries** — wallets that repeatedly buy/sell to paint a low entry. The reported average entry reflects their net cost basis, but the wallet may not actually be net-long.
- **Multi-buy averaging** — a wallet that bought half at $0.001 and half at $0.10 shows "entry $0.05" but isn't really in the middle — tail distribution matters.
- **Fall-back reconstruction gaps** — if GMGN lacks entry data, Noesis reconstructs from on-chain swaps. Unusual routing (Jupiter aggregator multi-hop, MEV sandwich) can produce slightly off prices.

## Caveats

- **Solana only.**
- **Requires auth** — 1 req / 5 sec (Heavy tier).
- **Returns top holders** with cost-basis data from GMGN's holder endpoint.
- **Uses best-pair price** — micro-liquidity tokens may report misleading "current price" if the best pair is thin.

## FAQ

**How do I use /entrymap for dump-risk scoring?**
Three signals combine: (1) average PnL percentage across top holders, (2) concentration of top holders in deep profit, (3) whether any of those top holders is a team/fresh/bundler wallet. All three elevated = high near-term dump risk.

**Why is the average entry sometimes close to the current price?**
Usually one of: (1) the token just launched and holders haven't diverged yet, (2) the price is range-bound with holders buying/selling near the same level, or (3) only a few recent buyers pushed the average up/down.

**Can /entrymap show unrealized vs realized PnL separately?**
The summary combines both. The full API response breaks them out — unrealized (current holding at current price vs cost basis) and realized (closed-position profit).

**How accurate are reconstructed entry prices?**
For single-buy wallets on standard DEX routes, very accurate. For wallets with dozens of buys through Jupiter aggregator routing, it's a weighted average that can be off by a few percent due to MEV/slippage.

**What does "near entry" mean?**
Current price is within ±5% of the holder's average entry price. It's a neutral bucket — neither dump risk nor panic risk.

**Is there a /entrymap for early buyers specifically?**
No separate endpoint, but `/earlybuyers` includes `entry_price` and `pnl_usd` per wallet — use that when you specifically care about the first-hour cohort.

## Related guides

- [Analyze top holders of a Solana token](./top-holders-analysis.md) — pair with entry prices for full positioning
- [Find team-controlled supply on a Solana token](./find-team-supply.md) — see if team wallets are in profit
- [Find the first buyers of a Solana token](./first-buyers-solana.md) — early-cohort-specific entry data
- [Rank the most profitable traders on a token](./best-traders-ranking.md) — historical profit view

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/holder-entry-prices#article",
      "headline": "How to map holder entry prices and cost basis on a Solana token",
      "description": "See what price each top holder paid to enter a Solana token, their current PnL, and the distribution of entries with the Noesis /entrymap analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana holder entry price, cost basis analysis, token PnL distribution, dump risk analysis"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/holder-entry-prices#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I use /entrymap for dump-risk scoring?",
          "acceptedAnswer": { "@type": "Answer", "text": "Combine average PnL across top holders, concentration of profit among them, and whether any are team/fresh/bundler wallets. All three elevated means high near-term dump risk." }
        },
        {
          "@type": "Question",
          "name": "How accurate are reconstructed entry prices?",
          "acceptedAnswer": { "@type": "Answer", "text": "Single-buy wallets on standard DEX routes are very accurate. Complex multi-buy wallets through aggregator routing can be off by a few percent due to MEV and slippage." }
        },
        {
          "@type": "Question",
          "name": "What does 'near entry' mean in the distribution?",
          "acceptedAnswer": { "@type": "Answer", "text": "Current price within ±5% of the holder's average entry. Neutral bucket — neither dump risk nor panic risk." }
        }
      ]
    }
  ]
}
</script>

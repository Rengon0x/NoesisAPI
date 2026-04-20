---
title: How to analyze top holders of a Solana token
description: Get the top N holders of any Solana token with PnL, win rate, Twitter identity, and Solscan labels — with the Noesis /topholders analysis.
command: /topholders
endpoint: GET /api/v1/token/{mint}/top-holders
mcp_tool: token_top_holders
slug: top-holders-analysis
---

# How to analyze top holders of a Solana token

**TL;DR.** Noesis's `/topholders` analysis returns the top 1-50 current holders of any Solana token, each enriched with their historical PnL, win rate, Twitter handle, follower count, and Solscan label. One call to `GET /api/v1/token/{mint}/top-holders?limit=20` replaces a Solscan holder list + dozens of per-wallet lookups with a single ranked table.

## Why enriched holder analysis matters

A bare holder list on Solscan tells you percentages. It doesn't tell you who's holding. The same 2% position looks very different depending on the wallet:

- A KOL with 50k Twitter followers and a 3-year trading history → strong signal
- A smart-money wallet with 78% 30-day win rate and $2M portfolio → strong signal
- A fresh wallet with 3 lifetime transactions → insider / bundler flag
- A labeled CEX hot wallet → neutral (not an individual trader)

`/topholders` collapses all of this into a single sorted table so you can evaluate the holder quality, not just the distribution.

## What does /topholders return?

Per holder you get:

1. **Position** — current amount held, percentage of supply, rank
2. **Identity** — Solscan label, KOL name, Twitter handle, follower count
3. **Performance** — historical PnL, 30-day win rate, trade count
4. **Portfolio context** — combined USD portfolio value across all tokens

The default limit is 20 holders; you can request 1-50 per call and paginate through the full list via the bot's Prev/Next buttons.

## How does Noesis enrich each holder?

The enrichment pipeline layers four data sources on top of GMGN's raw holder list:

- **GMGN wallet data** — Twitter handle, follower count, behavioral tags
- **GMGN profit stats** — realized PnL, win rate, trade counts (30-day window by default)
- **Solscan labels** — any named identity (CEX, DEX, KOL, protocol)
- **KOL cache** — Kolscan.io dataset of 493 labeled Solana KOLs with verified Twitter handles

Unknown wallets pass through with just position data and generic "TOPn" labels. Known wallets get the full identity stack.

## How to run the analysis

### Telegram bot

```
/topholders EPjFWdd5...
```

or alias `/th`, with optional count:

```
/th EPjFWdd5... 30
```

Typical output (page 1 of 2):

```
👛 Top Holders — page 1/2

 1. 9aB7...Kzm2 · "@alpha_caller" (52k followers) · 4.2% · +$180k PnL, 71% WR
 2. 4rEp...Nn01 · "Binance Smart Money" · 3.8% · —
 3. Gx9w...Qr71 · unknown · 3.1% · +$4k PnL, 43% WR
 ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../top-holders"
```

### MCP

```
token_top_holders(mint="EPjF...1v")
```

or prompt:

> Show the top 20 holders of token EPjF...1v. Include their Twitter handles, PnL, and win rates.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const th = await noesis.token.topHolders("EPjFWdd5...");
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
th = noesis.token.top_holders("EPjFWdd5...")
```

**Rust**
```rust
let client = noesis_api::Noesis::new(api_key);
let th = client.token_top_holders("EPjFWdd5...").await?;
```

## Understanding the output

- `token` — basic token info
- `holders[]` — top 20 holders, each with:
  - `address`, `amount_percentage`, `usd_value`
  - `wallet_data` — GMGN PnL/winrate/trade counts
  - `profit_stat` — period-scoped trading stats
  - `funder`, `funder_name` — funding source
  - `label`, `tags` — Solscan/KOL enrichment

## How to combine /topholders with other commands

**Chain 1 — Top holders → classification**
```
/topholders <mint>                    top 20
  → for each enriched wallet: check win rate + label
  → KOL or smart money → bullish holder
  → fresh/unknown wallet with big position → insider flag
```

**Chain 2 — Top holders → cost basis**
```
/topholders <mint>                    top 20
  → /entrymap <mint>                  where did they enter?
  → top holders in profit → dump risk
  → top holders underwater → panic-sell risk
```

**Chain 3 — Top holders → wallet drill-down**
```
/topholders <mint>                    pick suspicious holder
  → /walletchecker <wallet>           full profile
  → /links <wallet>                   map funding graph
```

**Chain 4 — Top holders ↔ best traders**
```
/topholders <mint>                    current-position ranking
/besttraders <mint>                   historical-profit ranking
  → holders in both = long-term accumulators / believers
  → holders in only /top = late buyers
  → only in /best = already exited
```

## When /topholders can mislead

- **CEX hot wallets** — the #1 holder is often a CEX hot wallet (Binance, Kucoin, MEXC), which represents aggregated retail, not a single trader. `/topholders` labels these correctly but you should mentally exclude them from insider analysis.
- **Token vaults / bonding curves** — for pump.fun tokens still on the curve, the bonding curve vault owns a large share. Again, Noesis labels it but the % isn't retail.
- **Wash-traded tokens** — high win rate on an enriched holder can be wash-trading artifact. Sanity-check with `/bundle` and `/team`.

## Caveats

- **Solana only.**
- **Requires auth** — 1 req / 5 sec (Heavy tier).
- **Returns top 20** fully enriched holders (GMGN wallet-data calls are the slow leg). The bot paginates through a longer list via inline buttons; the REST endpoint returns the enriched top 20.

## FAQ

**How many top holders should I look at?**
For a meme coin quick read, top 20 is enough — the sniffer-tests (bundlers, team, CEX) all show up by rank 15-20. For deeper analysis of a larger launch, go to 50 and paginate for the full 100.

**Why do some holders show "—" for PnL?**
Three reasons: (1) the wallet has no GMGN profile yet (very fresh), (2) the wallet is a contract / vault / CEX (no personal trading history), or (3) the 30-day window has no trades from that wallet.

**How is /topholders different from /besttraders?**
`/topholders` ranks by **current position size** — includes any wallet currently holding, regardless of whether they've traded. `/besttraders` ranks by **realized profit** — includes wallets that already sold, doesn't rank by holding.

**Can /topholders identify insiders?**
Partially. It labels known CEXes, KOLs, protocols. Unlabeled large holders with short wallet history + low trade count are flagged only implicitly (position + no context = suspicious). For explicit insider detection, use `/team` or `/fresh`.

**What's the KOL cache and how reliable is it?**
493 Solana KOLs scraped from Kolscan.io with verified Twitter handles. Reliable for well-known traders; won't include niche / private KOLs. Solscan labels fill part of the gap.

**Are percentages computed against circulating or total supply?**
Total supply on-chain, not circulating. For pump.fun tokens pre-graduation, the bonding-curve-locked share is included in the total.

## Related guides

- [Rank the most profitable traders on a Solana token](./best-traders-ranking.md) — historical-profit view
- [Map holder entry prices and cost basis](./holder-entry-prices.md) — entry price per holder
- [Find team-controlled supply on a Solana token](./find-team-supply.md) — explicit insider detection
- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — drill-down on any top holder

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/top-holders-analysis#article",
      "headline": "How to analyze top holders of a Solana token",
      "description": "Get the top N holders of any Solana token with PnL, win rate, Twitter identity, and Solscan labels with the Noesis /topholders analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana top holders, token holder analysis, wallet PnL ranking, solana holder identity"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/top-holders-analysis#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is /topholders different from /besttraders?",
          "acceptedAnswer": { "@type": "Answer", "text": "/topholders ranks by current position size. /besttraders ranks by realized profit and includes wallets that already sold." }
        },
        {
          "@type": "Question",
          "name": "Can /topholders identify insiders?",
          "acceptedAnswer": { "@type": "Answer", "text": "Partially. It labels known CEXes, KOLs, and protocols. For explicit insider detection use /team or /fresh." }
        },
        {
          "@type": "Question",
          "name": "Why do some holders show no PnL?",
          "acceptedAnswer": { "@type": "Answer", "text": "Either the wallet is too fresh for GMGN to profile, it's a contract/vault/CEX, or it has no trades in the 30-day window." }
        }
      ]
    }
  ]
}
</script>

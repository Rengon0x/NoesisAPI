---
title: How to find the first buyers of a Solana token
description: Identify early buyers of any Solana token within a time window and filter by supply share — with the Noesis /earlybuyers analysis.
command: /earlybuyers
endpoint: GET /api/v1/token/{mint}/early-buyers
mcp_tool: token_early_buyers
slug: first-buyers-solana
---

# How to find the first buyers of a Solana token

**TL;DR.** Noesis's `/earlybuyers` analysis returns every wallet that bought a Solana token within a configurable time window (default 1 hour from launch) and still holds at least X% of supply (default 1%). One call to `GET /api/v1/token/{mint}/early-buyers?hours=1&min_percent=1` returns a ranked list with entry prices, current PnL, and Solscan labels — DEX program addresses are filtered out automatically.

## Why early-buyer analysis matters

Early buyers fall into three populations that matter very differently:

- **Coordinated insiders** — bundlers, team, and fresh wallets that bought in the first block
- **Smart money** — experienced traders watching the mempool who front-ran the early pump
- **Lucky retail** — genuinely early discoverers who bought because they saw the token trending

Separating these three requires context: who else did they buy with, what's their historical PnL, are they funded from a CEX? `/earlybuyers` gives you the list; combining it with `/walletchecker` and `/links` gives you the classification.

## What does /earlybuyers return?

The analysis returns every wallet that:

1. **Bought within the time window** — default first hour, adjustable from 0.1h to 24h
2. **Still holds a meaningful position** — default ≥1% of supply, adjustable from 0.01% to 100%
3. **Is not a DEX / AMM / bonding curve program** — those are automatically filtered out

For each matching wallet, Noesis returns entry time, entry amount, current position, current PnL in USD, and any Solscan identity label.

## How does Noesis detect early buyers?

The analysis does a time-windowed scan of the token's transaction history:

- Queries Helius for all buy transactions involving the token's mint address
- Filters transactions to the specified time window from the mint timestamp
- Aggregates per wallet — total bought, average entry price, still-held position
- Filters wallets below the supply threshold
- Filters DEX program labels (amm, vault, bonding curve, pool program)
- Enriches remaining wallets with Solscan labels
- Computes current PnL using the token's live price

Results are sorted by entry time ascending so you see first-in at the top.

## How to run the analysis

### Telegram bot

```
/earlybuyers EPjFWdd5... 1h 1%
```

or the alias `/eb`. The two trailing args are optional — defaults are `1h` and `1%`.

Typical output:

```
⏱️ Early Buyers · first 1h
Scanned 8,432 transactions · 47 buyers

  1. 7xKX...9zF2 — Bought: 12.4 SOL | 3.2%
  2. 4bBa...pLm1 — Bought: 10.8 SOL | 2.8% · "KOL: @alpha"
  3. Gx9w...Qr71 — Bought:  7.5 SOL | 1.9%
  ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../early-buyers?hours=1"
```

### MCP

```
token_early_buyers(mint="EPjF...1v", hours=1)
```

or prompt:

> List early buyers of token EPjF...1v in the first hour. Include the transaction signatures, SOL spent, and token amounts.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const eb = await noesis.token.earlyBuyers("EPjFWdd5...", { hours: 1 });
eb.buyers.forEach(b => console.log(b.address, b.sol_spent, b.timestamp));
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
eb = noesis.token.early_buyers("EPjFWdd5...", hours=1)
for b in eb["buyers"]:
    print(b["address"], b["sol_spent"], b["timestamp"])
```

**Rust**
```rust
let client = noesis_api::Noesis::new(api_key);
let eb = client.token_early_buyers("EPjFWdd5...", 1.0).await?;
```

## Understanding the output

- `token` — basic token info
- `hours` — echo of the requested time window
- `total_transactions_scanned` — number of txs processed
- `buyers[]` — each early buyer with:
  - `address` — buyer wallet
  - `signature` — on-chain tx signature
  - `sol_spent` — SOL amount spent in the buy
  - `token_amount` — tokens received
  - `timestamp` — Unix timestamp of the buy
  - `label`, `tags`, `domains` — Solscan enrichment (DEX addresses filtered)

Supply-percent filtering can be applied client-side using `token_amount / token.total_supply`.

## How to combine /earlybuyers with other commands

**Chain 1 — Are the early buyers smart money?**
```
/earlybuyers <mint> 1h 1%
  → /walletchecker <early_buyer>        check 30d PnL, win rate
  → profitable historical traders → smart money
  → fresh wallets with no history → bundlers / team
```

**Chain 2 — Are the same early buyers across multiple tokens?**
```
/earlybuyers <mint_a> 1h 0.5%
/earlybuyers <mint_b> 1h 0.5%
  → /cross <mint_a> <mint_b>            confirms recurring early wallets
```

**Chain 3 — Early buyers vs fresh wallets**
```
/earlybuyers <mint> 10m 0.1%           who bought in first 10 min
/fresh <mint>                          who's on a fresh wallet
  → intersection = insider snipers
  → early-but-not-fresh = smart money
  → fresh-but-not-early = late bundlers
```

**Chain 4 — Early buyers + bundle detection**
```
/earlybuyers <mint> 10m 0.1%
/bundle <mint>
  → /bundle percentages should roughly match the first-block early buyer cluster
```

## When /earlybuyers can mislead

- **Very short windows on slow launches** — if a token mints but sits idle for 20 minutes before first trading, a 10-minute window will return zero buyers. Widen the window if the token had a delayed start.
- **Very broad windows on pump.fun** — the first hour of a popular pump.fun launch can have thousands of buyers. The `min_percent` filter protects against this but you may need to raise it for highly-traded tokens.
- **DEX-aggregator routing** — some aggregators route early buys through intermediate programs that may show up as early holders briefly. The label filter catches the common ones but check unlabeled high-ranked wallets with `/walletchecker`.

## Caveats

- **Solana only.**
- **Requires auth** — heavy Helius history scan. Rate-limited at 1 req / 5 sec.
- **Parameters are clamped**: `hours` to `[0.1, 24]`, `min_percent` to `[0.01, 100]`.
- **Uses holder state, not trade flow** — wallets that bought early and sold before the analysis don't appear. For flippers, combine with `/bundle` (which tracks rat traders).

## FAQ

**What window should I use for pump.fun launches?**
Start with `1h` and `1%`. If the list is too long, lower the window to 10-30 minutes and/or raise `min_percent`. If the list is empty, widen to 4-6h — some tokens mint quietly and only start trading later.

**Are early buyers always insiders?**
No. On Solana, bot-driven smart money regularly buys in the first block of viral launches. Cross-reference with `/walletchecker` to classify — high historical PnL and win rate = smart money; fresh wallet with no history = likely insider.

**Why are some wallets missing from the list despite being early?**
Either they sold below the `min_percent` threshold, or they were a DEX/AMM program and got filtered. Lower the threshold or check the raw holder list with `/topholders`.

**How does /earlybuyers differ from /topholders?**
`/topholders` sorts by current position size. `/earlybuyers` filters by buy time first, then by position. A large current holder that bought late won't appear in `/earlybuyers`.

**Can I see early sellers?**
Not via `/earlybuyers` directly — it only lists wallets still holding. For realized-profit flippers ("rat traders"), use `/bundle` which tracks that category explicitly.

**Does the window start from mint time or first trade?**
From the token's on-chain mint timestamp. This matches pump.fun launch time for pump.fun tokens.

## Related guides

- [Spot fresh-wallet insider activity](./fresh-wallet-detection.md) — complementary, intersect to find insider snipers
- [Detect bundled buys on pump.fun launches](./detect-bundles-pumpfun.md) — same time window, different classification
- [Rank the most profitable traders on a token](./best-traders-ranking.md) — classifies early buyers by historical PnL
- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — used to classify early buyers as smart money vs insiders

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/first-buyers-solana#article",
      "headline": "How to find the first buyers of a Solana token",
      "description": "Identify early buyers of any Solana token within a time window and filter by supply share with the Noesis /earlybuyers analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana early buyers, first buyers token, pump.fun sniper detection, time-windowed holder analysis"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/first-buyers-solana#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What time window should I use for pump.fun launches?",
          "acceptedAnswer": { "@type": "Answer", "text": "Start with 1h and 1% supply floor. Lower the window or raise the threshold if the list is too long. Widen if empty." }
        },
        {
          "@type": "Question",
          "name": "Are early buyers always insiders?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Bot-driven smart money regularly front-runs viral launches. Cross-reference with /walletchecker to classify historical PnL." }
        },
        {
          "@type": "Question",
          "name": "How does /earlybuyers differ from /topholders?",
          "acceptedAnswer": { "@type": "Answer", "text": "/topholders sorts by current position size. /earlybuyers filters by buy time first, then position. A large current holder that bought late won't appear in /earlybuyers." }
        }
      ]
    }
  ]
}
</script>

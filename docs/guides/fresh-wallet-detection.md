---
title: How to spot fresh-wallet insider activity on a Solana token
description: Identify freshly-created wallets holding meaningful supply on any Solana token — with the Noesis /fresh analysis.
command: /fresh
endpoint: GET /api/v1/token/{mint}/fresh-wallets
mcp_tool: token_fresh_wallets
slug: fresh-wallet-detection
---

# How to spot fresh-wallet insider activity on a Solana token

**TL;DR.** Noesis's `/fresh` analysis lists every holder that was created shortly before the token launched, has almost no prior transaction history, and holds at least 0.05% of supply. One call to `GET /api/v1/token/{mint}/fresh-wallets` returns a ranked list with amounts, percentages, transaction counts, and Solscan labels. High fresh-wallet counts are the clearest single insider signal on pump.fun.

## Why fresh-wallet detection matters

A fresh wallet holding 2% of a newly launched token is doing something no regular trader does. Real traders have history — prior swaps, token positions, SOL transfers going back months. Fresh wallets have none of that; they appear days or hours before a launch and buy immediately.

Teams and bundlers script fresh wallets because they look anonymous in the holder list. Each one is small; the cluster is large. `/fresh` surfaces them as a set so you can reason about the combined position, not the individual wallets.

## What counts as a "fresh" wallet?

`/fresh` flags a holder if it matches all three criteria:

1. **Low transaction history** — fewer than a few dozen total transactions across its entire lifetime
2. **Recent creation** — first activity timestamp close to the token's launch window
3. **Meaningful position** — holds at least 0.05% of the token's total supply

The 0.05% threshold filters out tiny dust holders while keeping anything with real exit-liquidity potential. A single 0.05% wallet doesn't matter; 40 of them adds up to 2% of supply moving as a block.

## How does Noesis detect fresh wallets?

The analysis does a windowed scan against the full holder list:

- Pulls every holder with ≥0.05% of supply from GMGN/on-chain data
- For each wallet, queries Helius for its lifetime transaction count and first-tx timestamp
- Computes the delta between wallet birth and token mint
- Enriches flagged wallets with Solscan labels (detects named entities like CEX hot wallets, which are excluded)
- Streams progress updates while running (typical completion: 10-30 seconds)

The output is a sorted list — highest-supply fresh wallets first — so you see where the concentration is.

## How to run the analysis

### Telegram bot

```
/fresh EPjFWdd5...
```

or the alias `/fw`. Typical output:

```
🆕 Fresh Wallets Analysis
Found 38 fresh wallets (of 412 holders)
Combined supply: 7.8%

  1. 7xKX...9zF2 — 0.42% · 3 txs
  2. 4bBa...pLm1 — 0.38% · 1 tx
  3. Gx9w...Qr71 — 0.31% · 7 txs
  ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../fresh-wallets"
```

### MCP

```
token_fresh_wallets(mint="EPjF...1v")
```

or prompt:

> List fresh wallets holding token EPjF...1v with at least 0.05% of supply. Include transaction counts and any Solscan labels.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const fresh = await noesis.token.freshWallets("EPjFWdd5...");
console.log(`${fresh.wallets.length} fresh wallets, ${fresh.totalPercent}% supply`);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
fresh = noesis.token.fresh_wallets("EPjFWdd5...")
print(f"{len(fresh.wallets)} fresh, {fresh.total_percent}% supply")
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let fresh = client.token().fresh_wallets("EPjFWdd5...").await?;
println!("{} fresh, {}% supply", fresh.wallets.len(), fresh.total_percent);
```

## Understanding the output

- `total_holders` — full holder count for context
- `fresh_count` — number of wallets flagged as fresh
- `total_percent` — combined supply share across all flagged wallets
- `wallets[]` — each flagged wallet with:
  - `address`
  - `percent_supply`
  - `amount`
  - `tx_count` — lifetime transactions (usually 1-20 for true fresh wallets)
  - `first_tx_age` — time since wallet's first-ever transaction
  - `label` — Solscan label if present

## How to combine /fresh with other commands

**Chain 1 — Fresh wallets → set up a tracker**
On the Telegram bot, click "Track" on the `/fresh` output to get pinged when flagged wallets net-buy or net-sell a threshold. Max 5 active trackers per user, 48h TTL.

**Chain 2 — Fresh + bundle + team triangulation**
```
/fresh <mint>      → fresh-wallet supply share
/bundle <mint>     → time-based buy clustering
/team <mint>       → funder graph clustering
```
All three elevated on the same mint is the highest-confidence coordinated-launch signal Noesis produces.

**Chain 3 — Fresh wallet → funder drill**
```
/fresh <mint>                        note top fresh wallet
  → /links <fresh_wallet>            map SOL transfer graph
  → /walletchecker <funder>          profile the funding wallet
```

**Chain 4 — Compare against /earlybuyers**
```
/earlybuyers <mint> 1h               early buyers regardless of freshness
/fresh <mint>                        fresh wallets regardless of buy time
```
The intersection (fresh AND early) is the tightest insider cluster.

## When /fresh false-positives

- **New retail cohorts** during viral launches — if a token trends on X and pulls in 500 new crypto users on fresh wallets, `/fresh` will flag them. Pair with `/team` (funder graph) or `/bundle` (timing) to distinguish coordinated from organic.
- **Recent Kucoin/MEXC withdrawals** — retail that just cashed out to a fresh wallet from their CEX. These pass the fresh-wallet heuristic but aren't team. The `/team` analysis handles the CEX-funder exception more carefully.
- **Tokens with very few holders** — fresh % is noisy when the holder count is under 50.

## Caveats

- **Solana only.**
- **Requires auth** — heavy Helius history scan; rate-limited at 1 req / 5 sec.
- **Typical latency: 10-30s** depending on holder count. The bot streams progress during the scan.
- **Not a standalone signal** — always cross-check with `/bundle` and `/team` to distinguish real insider clusters from viral retail.

## FAQ

**How many fresh wallets should I worry about?**
Raw count matters less than combined supply share. 5 fresh wallets holding 20% combined is much worse than 50 fresh wallets holding 2% combined. Target: look at `total_percent`, not `fresh_count`.

**Does /fresh detect wallets that laundered through multiple hops?**
No — `/fresh` is a single-hop heuristic (wallet age + tx count + supply share). A team that funds wallet A, then wallet A funds wallet B, then B buys the token, will look "organic" to `/fresh` because B has graph history. Use `/links` on suspicious fresh wallets to trace funding multiple hops deep.

**Why is there a 0.05% floor?**
Below that, every pump.fun launch has hundreds of micro-holders with fresh wallets (dust drops, failed snipes). Filtering at 0.05% keeps the output focused on wallets whose combined behavior actually moves the chart.

**Can /fresh be used on non-pump.fun tokens?**
Yes. The logic is token-agnostic; it only needs the token's mint timestamp and a holder list. Works on Raydium/Meteora launches too.

**How fresh is "fresh"?**
No fixed number — the analysis compares each wallet's first-tx age to the token's mint age and weighs it against total tx count. A 5-day-old wallet with 2 transactions is fresh. A 30-day-old wallet with 200 transactions is not.

**Does /fresh update when I rerun it?**
Yes, every call is computed live. If fresh wallets dump their position below the 0.05% threshold, they drop out of the next response.

## Related guides

- [Detect bundled buys on pump.fun launches](./detect-bundles-pumpfun.md) — time-based detection (complementary)
- [Find team-controlled supply on a Solana token](./find-team-supply.md) — superset analysis that includes the fresh category
- [Map a Solana wallet's SOL transfer graph](./wallet-connections.md) — use on top fresh wallets to trace the funding chain
- [Find the first buyers of a Solana token](./first-buyers-solana.md) — time-windowed alternative

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/fresh-wallet-detection#article",
      "headline": "How to spot fresh-wallet insider activity on a Solana token",
      "description": "Identify freshly-created wallets holding meaningful supply on any Solana token with the Noesis /fresh analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "fresh wallet detection, solana insider wallets, pump.fun wallet analysis, new wallet holders"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/fresh-wallet-detection#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How many fresh wallets should I worry about?",
          "acceptedAnswer": { "@type": "Answer", "text": "Combined supply share matters more than raw count. 5 fresh wallets holding 20% is worse than 50 fresh wallets holding 2%." }
        },
        {
          "@type": "Question",
          "name": "Why does Noesis use a 0.05% supply floor for fresh wallets?",
          "acceptedAnswer": { "@type": "Answer", "text": "Below 0.05% every launch has hundreds of micro-holders on fresh wallets (failed snipes, dust). The floor keeps output focused on wallets whose combined behavior actually moves the market." }
        },
        {
          "@type": "Question",
          "name": "Does /fresh work on non-pump.fun tokens?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The logic is token-agnostic; it needs only the mint timestamp and holder list. Works on Raydium and Meteora launches." }
        }
      ]
    }
  ]
}
</script>

---
title: How to detect bundled buys on pump.fun and Solana launches
description: Identify bundler wallets, sniper activity, and rat-trader patterns on any Solana token — with the Noesis /bundle analysis.
command: /bundle
endpoint: GET /api/v1/token/{mint}/bundles
mcp_tool: token_bundles
slug: detect-bundles-pumpfun
---

# How to detect bundled buys on pump.fun and Solana launches

**TL;DR.** Noesis's `/bundle` analysis classifies every holder by buy-time behavior and returns the share of supply held by bundlers (fresh wallets that bought in the first 10 minutes), snipers (first-block bots with profit), and rat traders (quick in-and-out flippers). A single call to `GET /api/v1/token/{mint}/bundles` gives a risk rating: under 10% bundler supply is green, 10-25% yellow, above 25% red.

## Why bundle detection matters on pump.fun

Bundled launches are the dominant rug and dump pattern on pump.fun. A bundler scripts 20-50 fresh wallets to buy the same token within the first block or two, capturing a large portion of the initial supply before any organic discovery. The bundled wallets then either dump on the first pump, or sit as "exit liquidity" for later retail.

Classic SEO-style holder lists hide this because each bundled wallet looks small in isolation. What matters is the cluster: how much of the supply was bought by wallets that share the same first-buy slot, the same behavior profile, and often the same funder. `/bundle` surfaces that cluster as a single number.

## What counts as a bundled buy?

Noesis classifies every holder into one of four behavior categories based on its buy timing and subsequent activity:

1. **Bundlers** — Fresh wallets (little to no prior activity) that bought within the first 10 minutes of the token's life and still hold a position. The core bundle signal.
2. **Snipers** — Bot-pattern wallets that bought in the first slot(s) and made profit. Often the tightest-timed buys of all — millisecond-level.
3. **Rat traders** — Wallets that bought early but dumped within a short window, realizing profit and exiting. These are the flipper bots, not long-term bundlers.
4. **Whales, traders, organic** — Everyone else, broken down by position size and activity pattern.

The "bundler %" reported in the output is specifically category 1 supply share — the wallets still sitting on the position.

## How does Noesis detect bundled activity?

`/bundle` combines three signals:

- **First-tx timing** — every holder's first token-buy transaction timestamped relative to the token mint time
- **Wallet freshness** — total prior transaction count for each holder, pulled from Helius history
- **Profit tracking** — per-wallet realized PnL on this token, used to separate rat traders (in-and-out) from long-term bundlers (still holding)

Output is a risk rating + a composition breakdown. The risk tiers are tuned against pump.fun-scale launches — a launch with 5% bundler supply is noise, a launch with 40% is a rug waiting to happen.

## How to run the analysis

### Telegram bot

```
/bundle EPjFWdd5...
```

or the short form `/b`. Typical output:

```
📦 Bundle Analysis
Risk: 🔴 HIGH (32%)

Composition:
  Bundlers:  32% · 28 wallets
  Snipers:   11% · 14 wallets · $4.2k combined profit
  Rats:       5% · 9 wallets (already exited)
  Whales:    22% · 4 wallets
  Organic:   30% · 210 wallets
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../bundles"
```

### MCP (for AI agents)

```
token_bundles(mint="EPjF...1v")
```

or prompt:

> Run a bundle analysis on token EPjF...1v and return the bundler percentage, sniper count, and rat trader share.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const b = await noesis.token.bundles("EPjFWdd5...");
console.log(`Bundler %: ${b.bundlerPercent}, risk: ${b.risk}`);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
b = noesis.token.bundles("EPjFWdd5...")
print(b.bundler_percent, b.risk)
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let b = client.token().bundles("EPjFWdd5...").await?;
println!("{}% bundlers ({})", b.bundler_percent, b.risk);
```

## Understanding the output

- `bundler_percent` — supply share held by bundler-tagged wallets (still holding)
- `risk` — `low` / `medium` / `high` based on bundler_percent thresholds (10%, 25%)
- `composition` — per-category breakdown: bundlers, snipers, rats, whales, traders, organic
- `sniper_count` — number of bot-pattern first-block buyers
- `sniper_profit` — combined realized $ profit across all snipers (useful for "how much did snipers already extract?")
- `rat_count` — wallets that bought early and already exited
- Per-category wallet lists are available in the full response for drill-down

## How to combine /bundle with other commands

**Chain 1 — Is the bundler cluster also a team cluster?**
```
/bundle <mint>                        high bundler %
  → /team <mint>                      if team also flags, same coordinated actor
  → /fresh <mint>                     confirms fresh-wallet funding
```

**Chain 2 — Will snipers dump?**
```
/bundle <mint>                        sniper count + combined profit
  → /topholders <mint>                find the sniper wallets in the holder list
  → /walletchecker <sniper_wallet>    check historical dump pattern across other tokens
```

**Chain 3 — Is this a clean launch?**
A token with low `/bundle` + low `/team` + low `/fresh` is the highest-confidence organic launch signal Noesis can produce. All three being green is rarer than it sounds.

**Chain 4 — Serial bundler detection**
```
/bundle <mint_a>                       flag bundler wallets
  → /cross <mint_a> <mint_b>          check if same wallets bundled other recent launches
```

## When /bundle false-positives

- **Genuinely viral launches** can see dozens of fresh retail wallets buy in the first few minutes. Without a tight coordination pattern these will still show up as "bundlers" by the freshness heuristic. Cross-check with the `exchange_clusters` section of `/team` — true bundlers usually share a single funder.
- **Token migrations** from one launcher to another can reset the "first tx" clock; the analysis uses the token's on-chain mint timestamp, which is correct for fresh launches but can mislead on wrapped or bridged tokens.
- **Very low holder counts** (< 50 holders) produce noisy percentages because each wallet weighs heavily.

## Caveats

- **Solana only** — no EVM support.
- **Pump.fun-tuned** but works for any Solana SPL token with an identifiable mint timestamp.
- **No auth required** for `/bundle` — it's a free-tier endpoint. The heavy analyses live on `/team` and `/fresh`.

## FAQ

**What bundler percentage is considered safe on pump.fun?**
Under 10% bundler supply is green and typical for organic launches. 10–25% is a yellow flag — pair with `/team` and `/fresh` before judging. Above 25% is a red flag and usually indicates a coordinated launch where bundled wallets are still holding exit liquidity.

**What's the difference between a bundler and a sniper?**
Snipers are bot-pattern buyers in the first one or two slots — tight-timed, high-volume first buys, often still profitable. Bundlers are fresh wallets scripted to buy within the first 10 minutes but not necessarily in the first slot. Snipers are mostly independent actors; bundlers are usually one actor running many wallets.

**Does /bundle work on non-pump.fun tokens?**
Yes. The heuristic uses the token's mint timestamp, not a launcher-specific signal. Any Solana SPL token works.

**How is /bundle different from /team?**
`/bundle` is a time-based detector — it only cares about when a wallet bought and whether it's still holding. `/team` is a graph-based detector — it cares about funding sources and wallet relationships regardless of buy time. A launch where both fire is the strongest coordinated-launch signal.

**Why do rat traders count separately from bundlers?**
Rat traders already exited — they're not sitting on supply you'll eat when they dump. They matter for understanding historical extraction (how much early value left the book) but not for forward-looking dump risk.

**Can I see the individual bundler wallets?**
Yes. The full API response includes per-wallet breakdown of every category. The Telegram bot output is a summary; the REST response has the full list.

## Related guides

- [Find team-controlled supply on a Solana token](./find-team-supply.md) — complementary funding-source-based detector
- [Spot fresh-wallet insider activity](./fresh-wallet-detection.md) — isolates the fresh-wallet component of the bundler cluster
- [Scan any Solana token for security and insider signals](./scan-solana-token.md) — runs /bundle as part of a broader audit
- [Find wallets holding multiple Solana tokens](./cross-token-holders.md) — spot serial bundlers across launches

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/detect-bundles-pumpfun#article",
      "headline": "How to detect bundled buys on pump.fun and Solana launches",
      "description": "Identify bundler wallets, sniper activity, and rat-trader patterns on any Solana token with the Noesis /bundle analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "pump.fun bundle detection, solana bundled buys, sniper bot detection, solana token risk analysis"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/detect-bundles-pumpfun#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What bundler percentage is considered safe on pump.fun?",
          "acceptedAnswer": { "@type": "Answer", "text": "Under 10% bundler supply is green. 10–25% is a yellow flag. Above 25% is a red flag indicating coordinated launch." }
        },
        {
          "@type": "Question",
          "name": "What's the difference between a bundler and a sniper?",
          "acceptedAnswer": { "@type": "Answer", "text": "Snipers are bot-pattern buyers in the first slot(s). Bundlers are fresh wallets scripted to buy within the first 10 minutes. Snipers are usually independent; bundlers are usually one actor running many wallets." }
        },
        {
          "@type": "Question",
          "name": "Does /bundle work on non-pump.fun tokens?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The heuristic uses the token's mint timestamp. Any Solana SPL token works." }
        },
        {
          "@type": "Question",
          "name": "How is /bundle different from /team?",
          "acceptedAnswer": { "@type": "Answer", "text": "/bundle is time-based (when did wallets buy). /team is graph-based (funding sources and relationships). A launch where both fire is the strongest coordinated-launch signal." }
        }
      ]
    }
  ]
}
</script>

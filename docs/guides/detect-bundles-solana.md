---
title: How to detect bundled buys on Solana tokens (pump.fun and beyond)
description: Identify bundler wallets, sniper activity, and rat-trader patterns on any Solana token — pump.fun, Moonshot, Raydium, Meteora — with the Noesis /bundle analysis.
command: /bundle
endpoint: GET /api/v1/token/{mint}/bundles
mcp_tool: token_bundles
slug: detect-bundles-solana
---

# How to detect bundled buys on Solana tokens

**TL;DR.** Noesis's `/bundle` analysis classifies every holder of any Solana SPL token by buy-time behavior and returns the share of supply held by bundlers (fresh wallets classified by GMGN's bundle detector), snipers (first-block bots with profit), and rat traders (quick in-and-out flippers). Works on pump.fun, Moonshot, Raydium, Meteora, or any other launcher. A single call to `GET /api/v1/token/{mint}/bundles` gives a risk rating: under 10% bundler supply is green, 10-25% yellow, above 25% red.

## Why bundle detection matters

Bundled launches are the dominant rug-and-dump pattern across Solana — most visible on pump.fun but just as common on other launchpads and direct Raydium/Meteora launches. A bundler scripts 20-50 fresh wallets to buy the same token within the first block or two, capturing a large portion of the initial supply before any organic discovery. The bundled wallets then either dump on the first pump, or sit as "exit liquidity" for later retail.

Classic SEO-style holder lists hide this because each bundled wallet looks small in isolation. What matters is the cluster: how much of the supply was bought by wallets that share the same first-buy slot, the same behavior profile, and often the same funder. `/bundle` surfaces that cluster as a single number.

## What counts as a bundled buy?

Noesis classifies every holder into one of four behavior categories based on its buy timing and subsequent activity:

1. **Bundlers** — Fresh-wallet buyers identified by GMGN's bundle-detection algorithm. These are wallets with little prior activity that the detector classifies as bundled; exact detection window is GMGN's heuristic and not directly controllable by us. The core bundle signal.
2. **Snipers** — Bot-pattern wallets that bought in the first slot(s) and made profit. Often the tightest-timed buys of all — millisecond-level.
3. **Rat traders** — Wallets that bought early but dumped within a short window, realizing profit and exiting. These are the flipper bots, not long-term bundlers.
4. **Whales, traders, organic** — Everyone else, broken down by position size and activity pattern.

The "bundler %" reported in the output is specifically category 1 supply share — the wallets still sitting on the position.

## How does Noesis detect bundled activity?

`/bundle` is a pass-through to GMGN's bundle detector. We combine:

- **GMGN bundle classification** — wallets flagged by GMGN's analysis as bundled
- **Wallet freshness** — total prior transaction count for each holder, pulled from Helius history
- **Profit tracking** — per-wallet realized PnL on this token, used to separate rat traders (in-and-out) from long-term bundlers (still holding)

Output is a risk rating + a composition breakdown. The risk tiers are tuned against meme-coin-scale launches (pump.fun, Moonshot, direct Raydium) — a launch with 5% bundler supply is noise, a launch with 40% is a rug waiting to happen.

## How to run the analysis

### Telegram bot

```
/bundle EPjFWdd5...
```

or the short form `/b`. Typical output:

```
📦 Bundle & Bot Analysis

EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v · $2.3k

📦 Bundler Traders: 🔴 32.5%
  └ 28 bundler wallets in holders
🆕 Fresh Wallets: 🔴 28.1%
  └ 35 fresh wallets in holders
🤖 Bot/Degen: 🔴 11.2%
  └ 14 snipers in holders
🐀 Rat Traders: 🟡 5.3%
🪤 Entrapment: 🟡 8.9%
  └ 12 insider wallets

👥 Holder Composition:
  Top 10 holders: 45.2%
  Dev/Team hold: 22.1%
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
console.log(`Bundler %: ${b.token_stat.top_bundler_trader_percentage}`);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
b = noesis.token.bundles("EPjFWdd5...")
print(b["token_stat"]["top_bundler_trader_percentage"])
```

**Rust**
```rust
let client = noesis_api::Client::new(api_key);
let b = client.token_bundles("EPjFWdd5...").await?;
println!("Bundler analysis: {:?}", b);
```

## Understanding the output

The bundle response contains two main sections:

**token_stat** fields describe bundle and bot classifications:
- `top_bundler_trader_percentage` — supply share held by bundler-classified wallets
- `fresh_wallet_rate` — supply share held by fresh wallets (no prior tx history)
- `top_bot_degen_percentage` — supply share held by snipers (bot-pattern first-block buyers)
- `top_rat_trader_percentage` — supply share held by rat traders (bought early, exited)
- `top_entrapment_trader_percentage` — supply share held by entrapment-pattern wallets
- `top_10_holder_rate`, `dev_team_hold_rate` — concentration metrics

**holder_stat** fields count wallets in each category:
- `bundler_count` — number of bundler-tagged wallets
- `sniper_count` — number of first-block snipers detected
- `fresh_wallet_count` — number of fresh wallets holding supply
- `insider_count` — number of insider/entrapment wallets

Per-wallet details are available in the full response for drill-down analysis.

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

- **Genuinely viral launches** can see dozens of fresh retail wallets buy in the first few minutes. Without a tight coordination pattern these will still show up as "bundlers" by GMGN's heuristic. Cross-check with the `/team` analysis — true bundlers usually share a single funder.
- **Token migrations** from one launcher to another can reset the "first tx" clock; the analysis uses the token's on-chain mint timestamp, which is correct for fresh launches but can mislead on wrapped or bridged tokens.
- **Very low holder counts** (< 50 holders) produce noisy percentages because each wallet weighs heavily.

## Caveats

- **Solana only** — no EVM support.
- **Works for any Solana SPL token** with an identifiable mint timestamp — pump.fun, Moonshot, direct Raydium/Meteora launches, etc. Thresholds are tuned for meme-coin launch scale.
- **No auth required** for `/bundle` — it's a free-tier endpoint. The heavy analyses live on `/team` and `/fresh`.
- **GMGN-dependent** — bundler classification relies on GMGN's detection algorithm. The exact detection window and methodology are GMGN's and not exposed here.

## FAQ

**What bundler percentage is considered safe?**
Under 10% bundler supply is green and typical for organic launches. 10–25% is a yellow flag — pair with `/team` and `/fresh` before judging. Above 25% is a red flag and usually indicates a coordinated launch where bundled wallets are still holding exit liquidity. Same thresholds apply across pump.fun, Moonshot, Raydium, and Meteora launches.

**What's the difference between a bundler and a sniper?**
Snipers are bot-pattern buyers in the first one or two slots — tight-timed, high-volume first buys, often still profitable. Bundlers are fresh wallets classified by GMGN's bundle detector. Snipers are mostly independent actors; bundlers are usually one actor running many wallets.

**Does /bundle work on non-pump.fun tokens?**
Yes. The heuristic uses the token's mint timestamp, not a launcher-specific signal. Any Solana SPL token works — Moonshot, direct Raydium launches, Meteora pools, LetsBonk, migrated pump.fun tokens, etc.

**How is /bundle different from /team?**
`/bundle` is GMGN's classification-based detector — it identifies wallets flagged by a bundle-detection algorithm. `/team` is a graph-based detector — it cares about funding sources and wallet relationships regardless of how they bought. A launch where both fire is the strongest coordinated-launch signal.

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
      "@id": "https://noesisapi.dev/guides/detect-bundles-solana#article",
      "headline": "How to detect bundled buys on Solana tokens",
      "description": "Identify bundler wallets, sniper activity, and rat-trader patterns on any Solana token — pump.fun, Moonshot, Raydium, Meteora — with the Noesis /bundle analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-20",
      "keywords": "solana bundle detection, pump.fun bundled buys, moonshot bundle detection, sniper bot detection, solana token risk analysis"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/detect-bundles-solana#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What bundler percentage is considered safe on a Solana token?",
          "acceptedAnswer": { "@type": "Answer", "text": "Under 10% bundler supply is green. 10–25% is a yellow flag. Above 25% is a red flag indicating coordinated launch." }
        },
        {
          "@type": "Question",
          "name": "What's the difference between a bundler and a sniper?",
          "acceptedAnswer": { "@type": "Answer", "text": "Snipers are bot-pattern buyers in the first slot(s). Bundlers are fresh wallets classified by GMGN's bundle detector. Snipers are usually independent; bundlers are usually one actor running many wallets." }
        },
        {
          "@type": "Question",
          "name": "Does /bundle work on non-pump.fun tokens?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The heuristic uses the token's mint timestamp. Any Solana SPL token works." }
        },
        {
          "@type": "Question",
          "name": "How is /bundle different from /team?",
          "acceptedAnswer": { "@type": "Answer", "text": "/bundle is GMGN classification-based. /team is graph-based (funding sources and relationships). A launch where both fire is the strongest coordinated-launch signal." }
        }
      ]
    }
  ]
}
</script>

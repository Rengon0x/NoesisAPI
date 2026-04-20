---
title: How to find traders active across multiple Solana tokens
description: Intersect the top traders of 2-5 Solana tokens to find smart money and coordinators that profit across every one of them — with the Noesis /crossbt analysis.
command: /crossbt
endpoint: POST /api/v1/tokens/cross-traders
mcp_tool: cross_traders
slug: cross-token-traders
---

# How to find traders active across multiple Solana tokens

**TL;DR.** Noesis's `/crossbt` analysis intersects the top trader lists of 2-5 Solana tokens and returns wallets that rank in every one of them — regardless of whether they still hold. One call to `POST /api/v1/tokens/cross-traders` exposes smart money rotating through a sector and insider coordinators profiting across related launches.

## Why cross-trader analysis matters

Top-trader rankings are backward-looking: they tell you who has already made money on a token. Intersecting them across multiple tokens finds wallets that consistently extract value from a sector or ecosystem.

Two kinds of wallets surface reliably:

- **Smart money** — traders who watch a category (launcher, meme theme, sector) and repeatedly time entries and exits. High win rate, significant PnL, broad portfolio.
- **Insider coordinators** — team members or early-access wallets that profit across their own or adjacent launches. High PnL, suspicious timing, often cluster-labeled.

Both matter. `/crossbt` returns them in the same ranked list; classification happens downstream via `/walletchecker`.

## What does /crossbt return?

Given 2-5 token mints, `/crossbt` returns:

1. **Wallets that rank in the top traders of every provided token** (using GMGN's top-100 list per token)
2. **Per-token rank** for each recurring wallet
3. **Per-token realized PnL**
4. **Per-wallet win rate and trade count** (full history, not token-scoped)
5. **Solscan label** for the top 15 enriched wallets

Ranked by combined PnL across all provided tokens.

## How does Noesis compute the intersection?

For each provided mint, Noesis pulls the top-100 trader list from GMGN. These lists are pre-ranked by realized profit per token. The intersection is computed by wallet address:

- If a wallet appears in top-100 of every provided mint, it's included
- Per-token rank and PnL are preserved
- Top 15 results get Solscan label enrichment
- Full wallet history (win rate, trade count) is pulled for context

Smaller intersections (tighter, more meaningful) come from more tokens or more long-tail tokens.

## How to run the analysis

### Telegram bot

```
/crossbt mint_a mint_b mint_c
```

Typical output:

```
🔀 Cross Best Traders · 3 tokens
Found 7 wallets in top traders of all 3

  1. 9aB7...Kzm2 · "@alpha_caller" · +$180k combined
     · #3 in mint_a (+$90k) · #8 in mint_b (+$45k) · #12 in mint_c (+$45k)
     · 71% WR · 214 trades
  2. 4rEp...Nn01 · +$112k combined
     ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{"tokens": ["mint_a", "mint_b", "mint_c"]}' \
  "https://noesisapi.dev/api/v1/tokens/cross-traders"
```

### MCP

```
cross_traders(tokens=["mint_a", "mint_b", "mint_c"])
```

or prompt:

> Find the traders that are in the top 100 of all three tokens mint_a, mint_b, mint_c. Rank them by combined PnL.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const cbt = await noesis.wallet.crossTraders(["mint_a", "mint_b", "mint_c"]);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
cbt = noesis.wallet.cross_traders(["mint_a", "mint_b", "mint_c"])
```

**Rust**
```rust
let client = noesis_api::Noesis::new(api_key);
let cbt = client.cross_traders(&["mint_a".into(), "mint_b".into(), "mint_c".into()]).await?;
```

## Understanding the output

- `traders[]` — each recurring top-trader with:
  - `address`, `label`
  - `per_token[]` — `{ mint, rank, pnl_usd }`
  - `combined_pnl_usd`
  - `overall_win_rate`, `total_trades`
  - `portfolio_usd`
- `tokens[]` — echo of inputs with metadata
- `total_common` — intersection size

## How to combine /crossbt with other commands

**Chain 1 — Smart money rotation**
```
/crossbt <trending_a> <trending_b>    traders profitable on both
  → /walletchecker <top_trader>       confirm high-WR smart money
  → monitor their next trades for sector rotation signal
```

**Chain 2 — Serial insider detection**
```
/dev <mint>                           get dev's prior launches
  → /crossbt <mint> <prior_mint_a>    recurring top traders
  → wallets in both = likely team members accumulating
```

**Chain 3 — Sector alpha mapping**
```
/crossbt <launcher_a> <launcher_b> <launcher_c>    top launcher-sector traders
  → /walletchecker each                            rank by win rate
  → follow the top 3 into future launches
```

**Chain 4 — Cross-validation against /cross**
```
/cross <mint_a> <mint_b>              common current holders
/crossbt <mint_a> <mint_b>            common top traders (profitable)
  → intersection of both = active profitable holders
  → in /cross but not /crossbt = bagholders who haven't realized profit
  → in /crossbt but not /cross = smart money who already exited
```

## When /crossbt can mislead

- **Token overlap in top-100** can include wash-traders — bots that cycle the same two tokens to inflate rankings. Wash-trader bots typically have very high trade count and moderate PnL; cross-check with `/walletchecker` win rate.
- **Two-token intersections are broad** — many active Solana traders touch dozens of trending tokens. Three-token intersections are usually where real signal emerges.
- **Rank inflation on low-volume tokens** — being "#5" in the top 100 of a $100k-market-cap token is not the same as being #5 on a $10M-market-cap token. Always pair rank with combined PnL for weight.

## Caveats

- **Solana only.**
- **Requires auth** — 1 req / 5 sec.
- **2-5 tokens per call.** More tokens produce tighter intersections.
- **Uses GMGN top-100 cutoff** — a wallet that's ranked #150 on one token and #5 on another won't surface.

## FAQ

**How is /crossbt different from /cross?**
`/cross` intersects **current holders**. `/crossbt` intersects **top traders** (by historical profit), regardless of current holding. Use `/cross` to find coordination in positions, `/crossbt` to find skill or insider profit extraction.

**Why limit to 3 tokens?**
Three-token intersection of top-100 lists is the sweet spot for signal density. Four-token intersection is usually empty or down to 1-2 ultra-whales — at that point you're better off profiling the known names individually.

**What's a meaningful intersection size?**
For three long-tail meme coins, 3-15 wallets in the intersection is typical and actionable. 50+ wallets suggests the tokens are too popular or too correlated to learn anything specific from.

**Can /crossbt find the dev's secondary wallets?**
Often yes. If a dev launches several tokens and trades their own launches, they show up with very high rank + high PnL consistency across them. Pair with `/dev` on each mint and confirm with `/links` for graph-based overlap.

**Do wallets need to still hold to appear?**
No. `/crossbt` uses realized-profit rankings from GMGN, so wallets that bought early and sold are included. This is the key behavioral difference from `/cross`.

**How recent is the top-trader data?**
GMGN top-trader lists update every few minutes. `/crossbt` fetches live per call, no caching.

## Related guides

- [Find wallets holding multiple Solana tokens](./cross-token-holders.md) — the current-holdings version
- [Rank the most profitable traders on a Solana token](./best-traders-ranking.md) — single-token top-trader ranking
- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — drill into recurring top traders
- [Profile the dev of a Solana meme coin](./profile-solana-dev.md) — identify dev's prior launches to intersect

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/cross-token-traders#article",
      "headline": "How to find traders active across multiple Solana tokens",
      "description": "Intersect the top traders of 2-5 Solana tokens to find smart money and coordinators that profit across every one of them with the Noesis /crossbt analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana cross traders, multi-token smart money, solana insider traders, ecosystem alpha tracking"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/cross-token-traders#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is /crossbt different from /cross?",
          "acceptedAnswer": { "@type": "Answer", "text": "/cross intersects current holders. /crossbt intersects top traders by historical profit regardless of current holding." }
        },
        {
          "@type": "Question",
          "name": "Why is /crossbt limited to 3 tokens?",
          "acceptedAnswer": { "@type": "Answer", "text": "Three-token intersection of top-100 lists is the sweet spot. Four-token intersection is usually empty or only 1-2 ultra-whales." }
        },
        {
          "@type": "Question",
          "name": "Do wallets need to still hold to appear in /crossbt?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. /crossbt uses realized-profit rankings, so wallets that bought early and sold are included." }
        }
      ]
    }
  ]
}
</script>

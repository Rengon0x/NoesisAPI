---
title: How to rank the most profitable traders on a Solana token
description: Identify the top 100 traders of a Solana token by profit, win rate, and portfolio value — with the Noesis /besttraders analysis.
command: /besttraders
endpoint: GET /api/v1/token/{mint}/best-traders
mcp_tool: token_best_traders
slug: best-traders-ranking
---

# How to rank the most profitable traders on a Solana token

**TL;DR.** Noesis's `/besttraders` analysis returns the top 100 traders of any Solana token ranked by realized profit, win rate, portfolio value, or SOL balance — with configurable filters. A single call to `GET /api/v1/token/{mint}/best-traders` returns names, PnL, win rates, trade counts, and Solscan labels for the first 15 enriched traders. Use it to find the smart money and the whales on any token.

## Why ranking traders by profit matters

Not every wallet holding a token is equal. A top-10 holder that's a KOL with a 30-day win rate of 78% and $2M portfolio is a very different signal from a fresh wallet holding the same position. `/besttraders` separates holders and short-term flippers from the traders who have actually extracted value from the token.

This is useful for:

- **Trend confirmation** — when smart money is in the top traders list, the token has real liquidity and attention
- **Team identification** — devs and insiders often accumulate across their own launches; they show up as top traders with suspicious overlap
- **Copy-trading research** — the top-ranked traders across multiple adjacent tokens are the source of most on-chain alpha
- **Whale watching** — large-portfolio holders are the biggest sell-pressure risk

## What does /besttraders return?

The output is a ranked list of up to 100 wallets that have actively traded the token, with per-wallet:

1. **Realized PnL in USD** — total profit/loss from closed positions
2. **Win rate** — percentage of profitable trades across the wallet's full history
3. **Trade counts** — buys, sells, and total trades
4. **Portfolio value** — combined USD value across all tokens the wallet holds
5. **SOL balance** — current native SOL holding
6. **Name / Twitter / Label** — for the first 15 enriched wallets (Solscan + KOL cache)

You can sort by any of those and filter by minimums — for example, "top traders with ≥50% win rate and ≥$10k portfolio."

## How does Noesis detect the best traders?

`/besttraders` pulls GMGN's top-trader list for the mint — a pre-ranked dataset of wallets that have realized profit on the token — then enriches the top 15 with Solscan labels for identity. GMGN's ranking internally weighs:

- Realized $ profit
- Win rate
- Total trade volume on the token
- Recency of activity

Noesis applies client-side filters (win rate threshold, portfolio min, sort key) on top of GMGN's raw list.

## How to run the analysis

### Telegram bot

```
/besttraders EPjFWdd5...
```

or the alias `/bt`. With filters:

```
/bt EPjFWdd5... 60 20000 port
```
Meaning: min 60% win rate, min $20k portfolio, sorted by portfolio. Sort keys: `pnl`, `port`, `winrate`, `sol`.

Typical output:

```
📈 Best Traders — top 100 · sorted: portfolio
  1. 9aB7...Kzm2 · "@alpha_caller" · +$42k · 71% WR · port $380k
  2. 4rEp...Nn01 · "Binance Smart Money" · +$28k · 63% WR · port $215k
  3. ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../best-traders?min_winrate=50&min_portfolio=10000&sort=port"
```

### MCP

```
token_best_traders(mint="EPjF...1v", min_winrate=50, min_portfolio=10000, sort="port")
```

or prompt:

> Show the top 20 most profitable traders on token EPjF...1v with at least 50% win rate and $10k portfolio. Include their Twitter handles if known.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const bt = await noesis.token.bestTraders("EPjFWdd5...", { minWinrate: 50, minPortfolio: 10000, sort: "port" });
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
bt = noesis.token.best_traders("EPjFWdd5...", min_winrate=50, min_portfolio=10000, sort="port")
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let bt = client.token().best_traders("EPjFWdd5...").await?;
```

## Understanding the output

- `traders[]` — each trader with:
  - `address`, `rank`
  - `pnl_usd` — realized profit/loss on this token
  - `win_rate` — percentage across full wallet history
  - `buys`, `sells`, `total_trades`
  - `portfolio_usd` — all-token portfolio value
  - `sol_balance`
  - `label`, `twitter`, `followers` — enriched for top 15
- `filters_applied` — echo of requested thresholds and sort key

## How to combine /besttraders with other commands

**Chain 1 — Find the ecosystem**
```
/besttraders <mint_a> 60 20000 pnl      → top profitable traders
  → /crossbt <mint_a> <mint_b> <mint_c> → intersect across sibling tokens
  → recurring wallets = the cluster trading this sector
```

**Chain 2 — Profile a specific top trader**
```
/besttraders <mint>                   pick a top wallet
  → /walletchecker <wallet>           full PnL, win rate, activity history
  → /links <wallet>                   wallet connections, funding source
```

**Chain 3 — Distinguish smart money from insiders**
```
/besttraders <mint>                   top traders list
/earlybuyers <mint> 1h 0.5%           early-buyer list
  → intersect to find smart money that bought in early AND profits consistently
```

**Chain 4 — Whale dump risk**
```
/besttraders <mint> sort=port         sort by portfolio size
  → top 5 = biggest whales
  → /walletchecker each → historical dump pattern
```

## When /besttraders can mislead

- **New tokens with little history** — GMGN's top trader dataset needs some volume to populate. Very new tokens may return 0-10 entries even if early buyers exist.
- **Wash-traded tokens** — tokens with artificial volume can produce ranked "top traders" that are just the wash-trading bots themselves. Combine with `/bundle` and `/team` to sanity-check.
- **Labels on only the top 15** — the remaining 85 wallets are ranked but not enriched. Pull them individually via `/walletchecker` for identity.

## Caveats

- **Solana only.**
- **No auth required** — free-tier endpoint.
- **Dataset is GMGN-sourced** — Noesis caches and enriches but doesn't re-compute the ranking itself.
- **Max 100 traders returned** per call; pagination not needed at this depth.

## FAQ

**What sort key should I use?**
`port` (portfolio) is the most useful for "who are the big players". `pnl` surfaces who has actually extracted from this specific token. `winrate` biases toward high-consistency traders regardless of size. `sol` flags SOL-rich wallets that have dry powder to redeploy.

**Why are some traders only partially enriched?**
Only the top 15 get Solscan + KOL cache enrichment per call — this keeps the endpoint fast. The remaining 85 are ranked with raw PnL/winrate data. Pull identity on individual wallets with `/walletchecker`.

**Does /besttraders include wallets that sold?**
Yes. The list ranks traders by realized profit — wallets that bought and sold (and possibly don't currently hold) are included. This is the key difference from `/topholders`, which only shows current holders.

**Can /besttraders find the dev's main wallet?**
Often yes — if the dev actively traded the token, they appear in the top traders with very high PnL and usually anomalous win rate or trade count. Cross-check with `/dev` on the same mint.

**How fresh is the data?**
GMGN top-trader rankings update roughly every few minutes. Noesis does not cache beyond that — each call fetches the latest snapshot.

**What's the minimum portfolio filter actually filtering?**
Combined USD value of all tokens the wallet holds across all chains GMGN indexes, not just this token. A wallet with $50k in bags elsewhere and 0 in this token still has portfolio ≥ $50k.

## Related guides

- [Analyze top holders of a Solana token](./top-holders-analysis.md) — complementary, current-position view
- [Find traders active across multiple tokens](./cross-token-traders.md) — intersect /besttraders across tokens
- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — drill into individual top traders
- [Scan any Solana token for security and insider signals](./scan-solana-token.md) — full audit including best traders

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/best-traders-ranking#article",
      "headline": "How to rank the most profitable traders on a Solana token",
      "description": "Identify the top 100 traders of a Solana token by profit, win rate, and portfolio value with the Noesis /besttraders analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana best traders, top trader ranking, smart money solana, profitable traders token"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/best-traders-ranking#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does /besttraders include wallets that already sold?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The ranking is by realized profit, not current holding. This is the key difference from /topholders." }
        },
        {
          "@type": "Question",
          "name": "What sort key should I use?",
          "acceptedAnswer": { "@type": "Answer", "text": "port (portfolio) for biggest players, pnl for biggest extractors on this token, winrate for most consistent, sol for wallets with redeployment dry powder." }
        },
        {
          "@type": "Question",
          "name": "Can /besttraders find the dev's main wallet?",
          "acceptedAnswer": { "@type": "Answer", "text": "Often yes. If the dev traded the token they usually appear with very high PnL and anomalous win rate. Cross-check with /dev." }
        }
      ]
    }
  ]
}
</script>

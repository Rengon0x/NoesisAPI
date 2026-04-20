---
title: How to find wallets holding multiple Solana tokens
description: Intersect the holder lists of 2-5 Solana tokens to find wallets holding all of them, ranked by combined portfolio value — with the Noesis /cross analysis.
command: /cross
endpoint: POST /api/v1/tokens/cross-holders
mcp_tool: cross_holders
slug: cross-token-holders
---

# How to find wallets holding multiple Solana tokens

**TL;DR.** Noesis's `/cross` analysis intersects the holder lists of 2-5 Solana tokens and returns wallets holding all of them, ranked by combined portfolio value. One call to `POST /api/v1/tokens/cross-holders` exposes coordinated teams, serial insiders, and ecosystem whales that common single-token lookups miss.

## Why cross-token holder analysis matters

A single-token holder list tells you who is in this token. A cross-token intersection tells you who is in *this sector*. The latter is where coordination patterns become visible:

- A team that launches three tokens in a month accumulates across all three from the same wallets
- Sector whales (e.g. AI meme, dog coin, launcher-specific plays) hold the same 10-30 wallets across the category
- Copy-trader clusters follow the same handful of KOLs into every trending token

`/cross` is the lookup that collapses these overlaps into a single answer: "which wallets are in every one of these tokens and how big are they?"

## What does /cross return?

Given 2-5 token mints, `/cross` returns:

1. **Wallets that hold all of them** — the strict intersection
2. **Per-wallet position per token** — amount and USD value of each holding
3. **Combined portfolio value** — sum across all provided tokens (and optionally the wallet's broader portfolio)
4. **Solscan label** — identity if known

Ranked by combined USD value descending so the biggest ecosystem whales surface first.

## How does Noesis compute the intersection?

`/cross` fetches the holder list for each provided token in parallel, converts them to sets, computes the intersection, and enriches the resulting wallets:

- Per-token holder lists pulled from GMGN / on-chain
- Set intersection across all provided mints
- Per-wallet position amounts computed from on-chain balance
- Price per token pulled from DexScreener best-pair for USD math
- Solscan labels fetched for the top results

## How to run the analysis

### Telegram bot

```
/cross EPjFWdd5... mint_b... mint_c...
```

Typical output:

```
🔗 Cross Holders · 3 tokens
Found 12 wallets holding all 3

  1. 9aB7...Kzm2 · holds: 140k A / 120k B / 120k C
  2. 4rEp...Nn01 · "KOL: @cryptoalpha" · holds: 80k A / 75k B / 60k C
  3. ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{"tokens": ["mint_a", "mint_b", "mint_c"]}' \
  "https://noesisapi.dev/api/v1/tokens/cross-holders"
```

### MCP

```
cross_holders(tokens=["mint_a", "mint_b", "mint_c"])
```

or prompt:

> Find wallets holding all three tokens: mint_a, mint_b, mint_c.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const cx = await noesis.wallet.crossHolders(["mint_a", "mint_b", "mint_c"]);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
cx = noesis.wallet.cross_holders(["mint_a", "mint_b", "mint_c"])
```

**Rust**
```rust
let client = noesis_api::Noesis::new(api_key);
let cx = client.cross_holders(&["mint_a".into(), "mint_b".into(), "mint_c".into()]).await?;
```

## Understanding the output

- `tokens[]` — input token list with basic metadata (name, price, decimals)
- `cross_holders[]` — each wallet holding all supplied tokens:
  - `wallet` — address
  - `balances` — map of `{ mint → raw_balance (u64) }` per input token
  - `label`, `tags`, `domains` — Solscan/KOL enrichment

Combined USD value is computed client-side from `balances` × `tokens[].price`.

## How to combine /cross with other commands

**Chain 1 — Detect serial teams**
```
/dev <mint_a>                         identify dev's prior launches
  → /cross <mint_a> <prior_mint_a>    find wallets holding both
  → recurring wallets = team accumulators
  → /walletchecker each               confirm funding + activity
```

**Chain 2 — Sector whale tracking**
```
/cross <trending_a> <trending_b> <trending_c>
  → top wallets = sector whales
  → watch their activity for the next rotation
```

**Chain 3 — Ecosystem mapping**
```
/cross <launcher_token_a> <launcher_token_b>
  → find the launcher-loyal wallets
  → follow them into new launches from the same ecosystem
```

**Chain 4 — Team cluster validation**
```
/team <mint>                          get top team wallets
  → /cross <mint> <sister_mint>       check if team wallets also hold sister
  → confirmation = same actor, different launch
```

## When /cross can mislead

- **CEX hot wallets** — the largest "common holder" across many tokens is often a CEX hot wallet holding retail deposits. Noesis labels these but you should mentally exclude them for team/ecosystem analysis.
- **Very popular tokens** — intersecting SOL, USDC, and BONK produces thousands of wallets because those are near-universal holdings. The analysis is most useful on long-tail tokens.
- **Token decimals mismatch** — positions with different decimals are normalized to USD value; raw amounts should not be compared directly across tokens.

## Caveats

- **Solana only.**
- **Requires auth** — 1 req / 5 sec.
- **2-5 tokens per call.** More tokens produce tighter intersections; fewer produce broader lists.
- **Snapshot-based** — the result is a point-in-time intersection. Wallets moving between tokens change the set.

## FAQ

**How many tokens should I intersect?**
Two is the minimum and usually the most useful (pairs rarely share many wallets outside real coordination). Three or four tightens the intersection sharply — by 5 tokens you're typically left with a handful of sector whales only.

**What does "combined portfolio value" include?**
By default, the sum of the wallet's USD value across the tokens you provided. Some SDK overloads can extend this to the wallet's total portfolio across all holdings, but the default is scoped to the inputs.

**How is /cross different from /crossbt?**
`/cross` intersects **current holders** — who currently holds all these tokens. `/crossbt` intersects **top traders** — who has profited across all these tokens (regardless of whether they still hold). Use `/cross` for coordination detection, `/crossbt` for smart money.

**Can /cross detect wash-traded holdings?**
Not directly. A wash-trading farm that holds 100+ tokens will surface as a "power holder" but that's noise, not signal. Filter by minimum combined USD and cross-check with `/walletchecker` to identify bot patterns.

**What's the max intersection size I should expect?**
For 3 long-tail meme coins, usually 5-50 wallets. For 3 very popular tokens, hundreds to thousands. Filter client-side by combined USD value (balances × token prices) to keep results actionable.

**Does /cross work across chains?**
No — Solana only. Same-token-same-holder cross-chain analysis is not supported.

## Related guides

- [Find traders active across multiple tokens](./cross-token-traders.md) — the historical-profit version
- [Find team-controlled supply on a Solana token](./find-team-supply.md) — start here to get the team wallets to intersect
- [Profile the dev of a Solana meme coin](./profile-solana-dev.md) — get prior launches to intersect against
- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — drill down on discovered common holders

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/cross-token-holders#article",
      "headline": "How to find wallets holding multiple Solana tokens",
      "description": "Intersect the holder lists of 2-5 Solana tokens to find wallets holding all of them, ranked by combined portfolio value with the Noesis /cross analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana cross holders, common wallet analysis, multi-token intersection, solana ecosystem mapping"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/cross-token-holders#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is /cross different from /crossbt?",
          "acceptedAnswer": { "@type": "Answer", "text": "/cross intersects current holders. /crossbt intersects top traders (historical profit) regardless of current holding." }
        },
        {
          "@type": "Question",
          "name": "How many tokens should I intersect?",
          "acceptedAnswer": { "@type": "Answer", "text": "Two is usually the most useful. Three or four tightens the intersection sharply. By five tokens you're usually down to sector whales only." }
        },
        {
          "@type": "Question",
          "name": "Can /cross detect wash-traded holdings?",
          "acceptedAnswer": { "@type": "Answer", "text": "Not directly. Wash-trading farms surface as power holders but that's noise. Filter client-side by combined USD value and verify with /walletchecker." }
        }
      ]
    }
  ]
}
</script>

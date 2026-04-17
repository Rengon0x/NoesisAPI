---
title: How to profile the dev of a Solana meme coin
description: Identify the dev wallet behind a Solana token, check their past launches, success rate, and funding source — with the Noesis /dev analysis.
command: /dev
endpoint: GET /api/v1/token/{mint}/dev-profile
mcp_tool: token_dev_profile
slug: profile-solana-dev
---

# How to profile the dev of a Solana meme coin

**TL;DR.** Noesis's `/dev` analysis identifies the creator wallet of any Solana token, then returns their past token launches, success rate (tokens still live), average bonding curve progress, funding source, and Solscan identity. A single call to `GET /api/v1/token/{mint}/dev-profile` tells you if the dev is a one-token hobbyist, a serial launcher with a history of dead projects, or a known KOL funded from a specific CEX.

## Why dev profiling matters on Solana

Every pump.fun launch has a creator wallet, and most of them are not public. Knowing who launched a token is the single most useful piece of context for judging whether to trust it:

- A dev with 3 prior launches that all died at 10% bonding curve is signal
- A dev funded from the same Kucoin address two minutes before deploy is signal
- A dev that's a labeled KOL with public accountability is different signal

`/dev` surfaces all of this from the token mint alone. You don't need to know the dev's address upfront — the analysis extracts it.

## What does /dev return?

The analysis pulls five layers of dev context:

1. **Dev wallet identity** — address, any Solscan label, any KOL-cache match (known dev / builder / trader)
2. **Past launches** — every token the dev has previously created on pump.fun / Solana launchers, with their current state
3. **Success rate** — percentage of prior launches that are still trading above a bonding-curve threshold
4. **Funding source** — where the dev wallet's SOL came from originally (CEX, another wallet, protocol)
5. **Wallet age / activity** — how long the wallet has existed and its general trading profile

This is strictly on-chain — no Twitter scraping, no speculation, no off-chain identity.

## How does Noesis detect the dev wallet?

`/dev` resolves the creator address by walking three paths in order:

- **Pump.fun creator field** — when the mint was launched on pump.fun, the creator is recorded in the bonding curve state
- **Token metadata** — the update authority and mint authority from the SPL token metadata
- **First-tx heuristic** — oldest transactions involving the mint, walking back to the deployer

Once the dev wallet is resolved, Noesis fans out:

- Queries pump.fun for every other token the same wallet created
- For each prior launch, checks current market state (alive, dead, migrated, graduated)
- Runs a funder-graph walk on the dev wallet to find its original funding source
- Matches the funder against the known-address database (Kucoin, Gate, Binance, named protocols)
- Pulls GMGN wallet data for overall PnL and behavior context

## How to run the analysis

### Telegram bot

```
/dev EPjFWdd5...
```

Typical output:

```
🧑‍💻 Dev Profile
Wallet: 8hJk...2mQp · "TokenFactory"

Prior launches: 14
  Alive: 2 (14%)
  Dead: 11 (< 10% BC)
  Migrated: 1

Funded by: Kucoin (2 min before deploy)
First activity: 6 days ago
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5.../dev-profile"
```

### MCP

```
token_dev_profile(mint="EPjF...1v")
```

or prompt:

> Profile the dev of token EPjF...1v. List their past launches, success rate, and how their wallet was funded.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const dev = await noesis.token.devProfile("EPjFWdd5...");
console.log(`${dev.priorLaunches} launches, ${dev.successRate}% alive`);
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
dev = noesis.token.dev_profile("EPjFWdd5...")
print(dev.prior_launches, dev.success_rate)
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let dev = client.token().dev_profile("EPjFWdd5...").await?;
println!("{} launches, {}%", dev.prior_launches, dev.success_rate);
```

## Understanding the output

- `dev_wallet` — address of the creator
- `dev_label` — Solscan label or KOL-cache name if known
- `prior_launches` — total count of previous tokens launched by the same wallet
- `prior_tokens[]` — each prior launch with mint, name, state (`alive` / `dead` / `migrated` / `graduated`), current market cap
- `success_rate` — percentage of prior launches still above the threshold
- `funder` — CEX/protocol name if known, else address
- `funder_age` — time between dev wallet funding and first token deploy (short = CEX-funded-right-before-launch)
- `wallet_age_days` — how long the dev wallet has existed

## How to combine /dev with other commands

**Chain 1 — Serial launcher detection**
```
/dev <mint>                          see prior launches
  → /dev <prior_mint_a>              compare profile across past tokens
  → /dev <prior_mint_b>              establish baseline behavior
```

**Chain 2 — Dev + team overlap**
```
/dev <mint>                          get dev wallet
  → /team <mint>                     run team analysis
  → check if dev_wallet appears in the linked cluster
```

**Chain 3 — Dev funding graph**
```
/dev <mint>                          funder = "Kucoin"
  → /links <dev_wallet>              trace all SOL transfer connections
  → identify wallets funded by the dev (co-conspirators)
```

**Chain 4 — Dev → cross-holder ecosystem**
```
/dev <mint>                          get prior launches
  → /cross <mint> <prior_mint>       find wallets holding both — likely team / close friends
```

## When /dev false-positives or misses

- **Dev wallet handed off** — some devs deploy from a throwaway wallet, then the real team operates from different wallets. `/dev` resolves the deployer, which is technically correct but may not match the social identity of the "team."
- **Anonymous dev with no prior launches** — the output will show 0 prior tokens, which is not evidence of anything; most tokens have anonymous first-time devs.
- **Recycled deployer wallets** — some services (bot-farms, vanity launchers) deploy many tokens from one shared wallet on behalf of different customers. `/dev` will report all of them as "prior launches" but they're not the same social actor.

## Caveats

- **Solana only** and **pump.fun-optimized** — works best on pump.fun-style launches. For Raydium-native tokens with no bonding curve, the success-rate concept is less meaningful (market cap thresholds used instead).
- **Public data only** — no Twitter / GitHub / social correlation.
- **No auth required** — `/dev` is a free-tier endpoint.

## FAQ

**What does a good dev profile look like?**
Either: (1) an anonymous first-time dev on a fresh wallet (no prior track record but no bad one either), or (2) a labeled KOL with public accountability. The worst profile is a serial launcher with 10+ prior dead launches all funded from the same CEX.

**How is /dev different from /team?**
`/dev` focuses on one wallet — the creator — and its history. `/team` scans the full holder list for insider-pattern wallets (including but not limited to the dev). Use both together: `/dev` for context on the creator, `/team` for the full insider cluster.

**Does /dev work on Raydium-native tokens?**
Yes, but the "success rate" metric is less sharp — there's no bonding curve threshold, so Noesis falls back to market-cap thresholds.

**What counts as a "dead" prior launch?**
A token is considered dead when its bonding curve progress is below 10% and the price is flat or declining. It's a heuristic, not a hard rule; serial-dev patterns show up clearly at this threshold.

**Can /dev tell me the dev's Twitter handle?**
Only if the dev wallet has a Solscan label that references a public identity. Noesis does not scrape or correlate off-chain data.

**If the dev has only one prior launch, is that a red flag?**
No — single-launch devs are the majority of pump.fun. Absence of history is different from bad history.

## Related guides

- [Find team-controlled supply on a Solana token](./find-team-supply.md) — complementary, confirms whether the dev's wallet overlaps with a team cluster
- [Map a Solana wallet's SOL transfer graph](./wallet-connections.md) — run on the dev wallet to find co-deployer and funded-by relationships
- [Find wallets holding multiple Solana tokens](./cross-token-holders.md) — intersect current token with prior launches to find the dev's loyalist holders
- [Scan any Solana token for security and insider signals](./scan-solana-token.md) — full audit that includes dev profile

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/profile-solana-dev#article",
      "headline": "How to profile the dev of a Solana meme coin",
      "description": "Identify the dev wallet behind a Solana token, check their past launches, success rate, and funding source with the Noesis /dev analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana dev profile, pump.fun dev analysis, token creator wallet, solana launcher history"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/profile-solana-dev#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What does a good dev profile look like?",
          "acceptedAnswer": { "@type": "Answer", "text": "Either an anonymous first-time dev on a fresh wallet with no track record, or a labeled KOL with public accountability. The worst is a serial launcher with 10+ prior dead launches all funded from the same CEX." }
        },
        {
          "@type": "Question",
          "name": "How is /dev different from /team?",
          "acceptedAnswer": { "@type": "Answer", "text": "/dev profiles the creator wallet's history. /team scans the full holder list for insider-pattern wallets. Use both together for full context." }
        },
        {
          "@type": "Question",
          "name": "Does /dev work on Raydium-native tokens?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, but the success-rate metric is less sharp because there's no bonding curve threshold; Noesis falls back to market-cap thresholds." }
        }
      ]
    }
  ]
}
</script>

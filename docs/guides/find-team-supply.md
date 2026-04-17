---
title: How to find team-controlled supply on a Solana token
description: Detect insider wallets, fresh-funded clusters, and CEX-deposit-correlated team clusters on any Solana token with the Noesis /team analysis.
command: /team
endpoint: GET /api/v1/token/{mint}/team-supply
mcp_tool: token_team_supply
slug: find-team-supply
---

# How to find team-controlled supply on a Solana token

**TL;DR.** Noesis's `/team` analysis detects team-controlled supply on any Solana token by clustering wallets that share three insider patterns: fresh funding in the launch window, dormant wallets with sudden large positions, and SOL-transfer-linked graphs. A single call to `GET /api/v1/token/{mint}/team-supply` returns the combined team percentage, a per-wallet breakdown, and time-correlated CEX funding clusters. Launches below 10% team supply are usually clean; above 25% is a red flag.

## Why team supply matters on Solana

Solana launches — especially on pump.fun, Moonshot, and vanity launchers — rarely disclose team or insider allocations. The top-100 holder list looks diverse, but a large fraction of those wallets is often a single team behind throwaway addresses.

The pattern is consistent: team deposits SOL from a centralized exchange (Kucoin, Gate, MEXC) into fresh wallets minutes before launch, those wallets buy in the first blocks alongside organic early buyers, and the team then distributes supply out of those wallets during pumps. Retail reads the holder list as "no single whale" and mistakes it for organic demand.

Good team detection clusters these wallets back into a single economic actor and reports the true insider share.

## What counts as a team wallet?

`/team` flags a holder wallet if it matches any of three patterns:

1. **Fresh** — The wallet was created within a short window before the token launched, has almost no prior transactions, and is holding a meaningful share (≥0.05% of supply). Fresh-funded wallets are the clearest insider signal on pump.fun.
2. **Inactive / sleeper** — An older wallet with little or no trading history that suddenly holds a large position. Teams reuse dormant addresses to avoid the "fresh wallet" heuristic.
3. **Linked** — A wallet connected by SOL transfers to a common hub (dev wallet, deployer, another flagged wallet). Traced via the same engine that powers `/links`.

Each flagged wallet is assigned one of those three categories and its supply share is summed into the final team percentage.

## How does Noesis detect team-controlled supply?

The `/team` analysis combines on-chain data with several enrichment sources:

- **Fresh-wallet windowed scan** — first-transaction timestamps for every top holder, compared to the token's mint timestamp
- **Funder graph walk** — oldest transactions per wallet traced back to their original SOL source (CEX, wallet, protocol)
- **Known-address resolution** — funder addresses matched against a curated database of CEX hot wallets, DEX vaults, and named protocols
- **GMGN enrichment** — funder names, wallet tags, and PnL context for each flagged wallet
- **Solscan labels** — pulls any existing identity labels (e.g. "MEXC 3", "Binance 12", KOL names)

One detail worth calling out: **a wallet funded from a known CEX is not automatically flagged as Linked.** A Binance hot wallet seeding fifty retail traders is not a team signal. The exception is the time-correlation rule: **if 3 or more wallets are funded from the same named CEX within a 60-minute window**, they're flagged as Linked regardless. That pattern catches the most common team pre-launch CEX drip without false-positiving organic retail.

## How to run the analysis

### Telegram bot

```
/team EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

Typical output:

```
📊 🆕 Fresh: 8% · 💤 Inactive: 3% · 🔗 Linked: 22%
Supply controlled by team/insiders: 33%

🔗 Linked wallets (12)
  1. 7xKX...9zF2 — 5.2% · funded via Kucoin (3d ago)
  2. 4bBa...pLm1 — 4.8% · funded via Kucoin (3d ago)
  ...

🏦 Exchange Funding Clusters
  • Kucoin → 9 wallets · 18% supply · all funded within 47 min
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/team-supply"
```

### MCP (for AI agents)

Point any MCP client at `https://noesisapi.dev/mcp` and call:

```
token_team_supply(mint="EPjF...1v")
```

Or prompt in natural language:

> Show me the team-controlled supply for token EPjF…1v. Break down fresh, inactive, and linked holders, and highlight any CEX funding clusters.

### SDKs

**TypeScript** — `npm install noesis-api`
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const team = await noesis.token.teamSupply("EPjFWdd5...");
console.log(`${team.totalPercent}% team-controlled`);
```

**Python** — `pip install noesis-api`
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
team = noesis.token.team_supply("EPjFWdd5...")
print(f"{team.total_percent}% team-controlled")
```

**Rust** — `cargo add noesis-api`
```rust
let client = noesis_api::Client::from_env()?;
let team = client.token().team_supply("EPjFWdd5...").await?;
println!("{}% team-controlled", team.total_percent);
```

## Understanding the output

Every response contains:

- `total_percent` — combined team supply share across all three categories
- `category_breakdown` — `{ fresh, inactive, linked }` as individual percentages
- `wallets[]` — every flagged wallet with:
  - `address`
  - `category` — `fresh`, `inactive`, or `linked`
  - `percent_supply`
  - `amount`
  - `funder` — CEX/protocol name if known, else the funder address
  - `funded_ago` — human-readable delta (`3d`, `5h`, `12m`)
  - `label` — Solscan label if one exists
- `exchange_clusters[]` — only populated when a funder has ≥5% supply downstream or fires the time-correlation rule; each entry lists the CEX, wallet count, combined supply share, and time spread

## How to combine /team with other commands

`/team` is most useful as the first call in a multi-step investigation.

**Chain 1 — Is this team profitable or underwater?**
```
/team <mint>
  → /walletchecker <top_team_wallet>   check 30d PnL, win rate, SOL balance
  → /links <top_team_wallet>           map SOL transfer graph, surface sibling wallets
```

**Chain 2 — Is this a serial team?**
```
/team <mint>
  → /cross <mint_a> <mint_b> <mint_c>  see if the same team wallets hold other launches
  → /dev <mint>                         confirm dev wallet overlaps with the team cluster
```

**Chain 3 — Is the team dumping or holding?**
Pair `/team` with the supply tracker (the "Track" button on the bot result) to get pinged when insider wallets net-sell a threshold. Combine with `/entrymap` to see whether they're in profit (likely sellers) or underwater (trapped).

**Chain 4 — Is the signal real or a coincidence?**
Run `/team` alongside `/bundle` and `/fresh` on the same mint. If all three fire, you're looking at a coordinated launch. If only one fires, weigh the caveat carefully.

## When /team false-positives

- **Organic CEX retail** — if by coincidence many unrelated retail wallets buy from the same CEX in the same hour, the 3-wallets-per-hour rule can fire. Cross-check with `/fresh` and `/bundle` before concluding.
- **Legitimate team announced up front** — a project that publicly pre-announces its team allocation will still show up as "team supply". The analysis is behavior-based, not reputation-based.
- **Dev wallet double-counting** — the dev wallet itself is excluded from Linked by default so it doesn't get counted twice alongside `/dev`. If you want dev-inclusive supply, add the dev wallet's holding manually.

## Caveats

- **Solana only.** Base and EVM support is not wired for this analysis.
- **Requires auth.** Heavy endpoint — rate-limited at 1 req / 5 sec per API key.
- **No cached snapshots.** Every call is fresh; expect 3–15s latency depending on token holder count.

## FAQ

**What percentage of team supply is a red flag on a Solana token?**
Under 10% is typical for a clean organic launch. 10–25% is a yellow flag — pair with `/bundle` and `/fresh` before judging. Above 25%, the token is heavily team-controlled and any pump is likely exit liquidity for the team.

**Does /team work on Base or other EVM chains?**
No. `/team` is Solana-only today. The funder-graph walk and fresh-wallet scan rely on Solana-specific RPC patterns (Helius DAS, on-curve filters).

**How is /team different from /bundle?**
`/bundle` detects wallets that all bought in the first few minutes of launch — it's a same-slot coordination signal. `/team` detects wallets linked by funding source and graph relationships regardless of when they bought. Launches where both fire are the highest-confidence team-coordinated launches.

**Can a wallet funded from Binance be a real team wallet?**
Yes, which is why the default rule is "known CEX funder alone is NOT a team signal" — but the time-correlation exception catches the common case where a team drips pre-launch SOL from one CEX to 3+ wallets within the same hour.

**Why does /team sometimes miss obvious team members?**
The analysis uses on-chain signals only. A wallet with a long organic history that gets handed to a team member won't match the Fresh or Inactive heuristics. Combine with `/links` on the dev wallet to catch graph-linked wallets the funder heuristic misses.

**How often does /team data change?**
Every call is computed live against current chain state — there's no cache. If the team moves supply between wallets, the next `/team` call reflects it immediately.

## Related guides

- [Detect bundled buys on pump.fun launches](./detect-bundles-pumpfun.md) — complementary timing-based detector
- [Spot fresh-wallet insider activity](./fresh-wallet-detection.md) — zooms in on the Fresh category alone
- [Profile the dev of a Solana meme coin](./profile-solana-dev.md) — confirms whether the dev wallet overlaps with the team cluster
- [Find wallets holding multiple Solana tokens](./cross-token-holders.md) — use after `/team` to confirm serial-team behavior

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/find-team-supply#article",
      "headline": "How to find team-controlled supply on a Solana token",
      "description": "Detect insider wallets, fresh-funded clusters, and CEX-deposit-correlated team clusters on any Solana token with the Noesis /team analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana team supply, insider wallet detection, pump.fun team analysis, solana token security"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/find-team-supply#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What percentage of team supply is a red flag on a Solana token?",
          "acceptedAnswer": { "@type": "Answer", "text": "Under 10% is typical for a clean organic launch. 10–25% is a yellow flag. Above 25% the token is heavily team-controlled and any pump is likely exit liquidity for the team." }
        },
        {
          "@type": "Question",
          "name": "Does /team work on Base or other EVM chains?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. /team is Solana-only. It relies on Solana-specific RPC patterns for the funder-graph walk and fresh-wallet scan." }
        },
        {
          "@type": "Question",
          "name": "How is /team different from /bundle?",
          "acceptedAnswer": { "@type": "Answer", "text": "/bundle detects wallets that all bought in the first few minutes of launch. /team detects wallets linked by funding source and graph relationships regardless of buy time. Launches where both fire are the highest-confidence team-coordinated launches." }
        },
        {
          "@type": "Question",
          "name": "Can a wallet funded from Binance be a real team wallet?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. A known CEX funder alone is not a team signal, but Noesis flags 3+ wallets funded from the same CEX within a 60-minute window as a time-correlated team pattern." }
        }
      ]
    }
  ]
}
</script>

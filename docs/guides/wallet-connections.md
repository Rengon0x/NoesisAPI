---
title: How to map a Solana wallet's SOL transfer graph
description: Discover every wallet connected to a given Solana wallet by SOL transfers, sorted by flow volume and direction — with the Noesis /links analysis.
command: /links
endpoint: GET /api/v1/wallet/{addr}/connections
mcp_tool: wallet_connections
slug: wallet-connections
---

# How to map a Solana wallet's SOL transfer graph

**TL;DR.** Noesis's `/links` analysis builds the SOL transfer graph for any Solana wallet and returns every connected wallet sorted by flow volume — with direction (inflow/outflow/balanced), net SOL, transaction count, Solscan label, and PnL enrichment for significant connections. One call to `GET /api/v1/wallet/{addr}/connections` reveals the funding source, withdrawal destinations, and coordinated sibling wallets behind any address.

## Why wallet connection mapping matters

A single wallet is just an address. A wallet plus its transfer graph is a network — funding source, paired wallets, withdrawal destinations, co-conspirators. Connection mapping is how you turn a suspicious top-holder into a cluster of linked wallets.

Three patterns emerge reliably:

- **Funding drill** — trace any wallet back to its SOL origin (CEX, another wallet, protocol). Critical for insider detection.
- **Sibling discovery** — wallets funded by the same hub are usually one actor. Exposes team clusters.
- **Withdrawal tracing** — find where profit exits. Useful for dump detection and anti-money-laundering-style analysis.

`/links` is the engine behind the "Linked" category of `/team`, but exposed directly for arbitrary wallet analysis.

## What does /links return?

Per connected wallet:

1. **Direction** — inflow (SOL received), outflow (SOL sent), or balanced
2. **Net SOL** — signed net transfer amount
3. **Sent / Received** — gross flows in each direction
4. **Transaction count** — how many transfers between the two wallets
5. **Solscan label** — identity if known
6. **GMGN enrichment** — for connections with significant net flow (|net| > 1 SOL), pulls PnL, win rate, Twitter handle

Sorted by gross transfer volume descending.

## How does Noesis build the graph?

The analysis pulls the target wallet's SOL transfer history via Solscan/Helius (up to 10,000 transactions) and aggregates per counterparty:

- Filter to on-curve wallets only (excludes PDAs, token programs, associated token accounts)
- Group transfers by counterparty address
- Compute net flow, transaction count, direction
- Solscan label batch lookup for counterparties
- GMGN enrichment for high-flow connections

PDA filtering matters — without it the graph would be dominated by SPL token accounts that are not wallets.

## How to run the analysis

### Telegram bot

```
/links 9aB7...Kzm2
```

Aliases: `/l`, `/conn`, `/connections`. Optional minimum SOL threshold:

```
/links 9aB7...Kzm2 0.5
```

Typical output:

```
🔀 Connections · 9aB7...Kzm2
148 connected wallets · min 0.5 SOL

  1. Kucoin Hot Wallet · ↓ received 42 SOL · 3 txs (funded)
  2. 4rEp...Nn01 · "@smartmoney" · ↑ sent 18 SOL · 12 txs
  3. Gx9w...Qr71 · ↕ balanced · 14 txs · net -0.3 SOL
  ...
```

### REST API

```bash
curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/wallet/9aB7...Kzm2/connections?min_sol=0.5"
```

### MCP

```
wallet_connections(address="9aB7...Kzm2", min_sol=0.5)
```

or prompt:

> Map the SOL transfer graph for wallet 9aB7...Kzm2. Show the top connections with at least 0.5 SOL transferred, include direction and known labels.

### SDKs

**TypeScript**
```ts
import { Noesis } from "noesis-api";
const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });
const links = await noesis.wallet.connections("9aB7...", { minSol: 0.5 });
```

**Python**
```python
from noesis import Noesis
noesis = Noesis(api_key=os.environ["NOESIS_API_KEY"])
links = noesis.wallet.connections("9aB7...", min_sol=0.5)
```

**Rust**
```rust
let client = noesis_api::Client::from_env()?;
let links = client.wallet().connections("9aB7...", 0.5).await?;
```

## Understanding the output

- `target` — echo of the wallet address analyzed
- `target_label` — Solscan label if present
- `connections[]` — each linked wallet with:
  - `address`, `label`
  - `direction` — `inflow`, `outflow`, `balanced`
  - `sent_sol`, `received_sol`, `net_sol`
  - `tx_count`
  - `pnl_usd_30d`, `win_rate_30d`, `twitter` — for high-flow connections
- `total_connections` — count before min_sol filter
- `filtered_connections` — count after filter

## How to combine /links with other commands

**Chain 1 — Team cluster expansion**
```
/team <mint>                          identify top team wallet
  → /links <top_team_wallet>          map its transfer graph
  → sibling wallets funded from same hub = additional team members
  → re-run /team with awareness of the full cluster
```

**Chain 2 — Insider funding trace**
```
/fresh <mint>                         pick a fresh-wallet suspect
  → /links <suspect>                  find funder
  → funder = CEX? → /team's 1-hour rule applies
  → funder = another wallet? → /walletchecker the funder
```

**Chain 3 — Dump destination tracking**
```
/walletchecker <wallet>               wallet just dumped
  → /links <wallet>                   outflow direction
  → find withdrawal destinations (CEX or cold wallet)
```

**Chain 4 — Dev wallet expansion**
```
/dev <mint>                           get dev wallet
  → /links <dev_wallet>               map graph
  → funded-by + funded-to wallets = dev's co-deployers
```

## When /links can mislead

- **Active CEX hot wallets** appear as the largest connection for any CEX-funded wallet — this is accurate but often not actionable (you already know it's a CEX).
- **Aggregator routing** — Jupiter/other aggregators can route SOL through intermediate accounts that appear as "connections" briefly. PDA filtering catches most of these; unusual ones may slip through.
- **Very active wallets** (10k+ transactions) may hit the 10k-tx pagination cap, truncating the oldest connections. The most-recent / highest-flow connections always surface first.

## Caveats

- **Solana only.**
- **Requires auth** — heavy; rate-limited at 1 req / 5 sec per API key.
- **Tracks SOL transfers only.** Token-only flows (SPL transfers, swaps, LP) are not part of the graph. For trading history, use `/walletchecker`.
- **On-curve wallets only** — PDAs, token accounts, and programs are filtered.

## FAQ

**What's a meaningful minimum SOL threshold?**
0.1 SOL is the default and surfaces most real connections on pump.fun-era wallets. Raise to 1-5 SOL for whale-scale analysis or to cut dust from the graph. Lower to 0.01 if you're tracing a micro-funded insider cluster.

**Why does /links miss some obvious connections?**
Two reasons: (1) the connection is via SPL tokens or swaps, not native SOL transfers — `/links` is SOL-only by design. (2) the wallet has more than 10k transactions and the connection is very old, beyond the pagination cap.

**How do I find a wallet's funding source?**
Look at the top inflow connection with the oldest first-tx. For fresh wallets, the original funder is usually the only inflow connection of any size. For older wallets, trace the oldest inflows.

**Can /links trace multiple hops (A → B → C)?**
Not in a single call. Run `/links` on each hop iteratively. For automated multi-hop tracing, use the wallet scanner (bubble-map view at noesisapi.dev/scanner).

**Does /links show failed transactions?**
No. Only successful, confirmed SOL transfers are counted.

**What's the difference between /links and /walletchecker?**
`/walletchecker` gives you the wallet's trading profile (PnL, win rate, balance). `/links` gives you its network (who it sent SOL to and received from). They answer different questions — use both for a complete picture.

## Related guides

- [Get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md) — trading-behavior companion to /links
- [Find team-controlled supply on a Solana token](./find-team-supply.md) — /links powers the "Linked" category
- [Spot fresh-wallet insider activity](./fresh-wallet-detection.md) — /links traces fresh-wallet funders
- [Profile the dev of a Solana meme coin](./profile-solana-dev.md) — run /links on the dev wallet to find co-deployers

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://noesisapi.dev/guides/wallet-connections#article",
      "headline": "How to map a Solana wallet's SOL transfer graph",
      "description": "Discover every wallet connected to a given Solana wallet by SOL transfers, sorted by flow volume and direction with the Noesis /links analysis.",
      "author": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "publisher": { "@type": "Organization", "name": "Noesis", "url": "https://noesisapi.dev" },
      "datePublished": "2026-04-17",
      "dateModified": "2026-04-17",
      "keywords": "solana wallet connections, SOL transfer graph, wallet funding source, solana network analysis"
    },
    {
      "@type": "FAQPage",
      "@id": "https://noesisapi.dev/guides/wallet-connections#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What's a meaningful minimum SOL threshold for /links?",
          "acceptedAnswer": { "@type": "Answer", "text": "0.1 SOL is default. Raise to 1-5 SOL for whale analysis. Lower to 0.01 for micro-funded insider tracing." }
        },
        {
          "@type": "Question",
          "name": "Can /links trace multiple hops?",
          "acceptedAnswer": { "@type": "Answer", "text": "Not in a single call. Run iteratively for each hop, or use the wallet scanner bubble-map at noesisapi.dev/scanner for automated multi-hop." }
        },
        {
          "@type": "Question",
          "name": "How do I find a wallet's funding source with /links?",
          "acceptedAnswer": { "@type": "Answer", "text": "Look at the top inflow connection with the oldest first-tx. For fresh wallets, the original funder is usually the only inflow." }
        }
      ]
    }
  ]
}
</script>

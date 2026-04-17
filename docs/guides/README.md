# Noesis Guides

Practical guides for using Noesis to analyze Solana tokens, wallets, and on-chain activity. Each guide covers one core analysis — what it does, how to run it, how to read the output, and how to chain it with other Noesis tools.

Every guide works four ways: **Telegram bot**, **REST API**, **MCP (for AI agents)**, and **SDKs** (TypeScript, Python, Rust).

## Token analysis

- **[How to scan any Solana token for security and insider signals](./scan-solana-token.md)** — `/scan`, `token_scan` — full audit entry point
- **[How to find team-controlled supply on a Solana token](./find-team-supply.md)** — `/team`, `token_team_supply` — insider cluster detection
- **[How to detect bundled buys on pump.fun launches](./detect-bundles-pumpfun.md)** — `/bundle`, `token_bundles` — same-slot coordination
- **[How to spot fresh-wallet insider activity](./fresh-wallet-detection.md)** — `/fresh`, `token_fresh_wallets` — new-wallet scan
- **[How to profile the dev of a Solana meme coin](./profile-solana-dev.md)** — `/dev`, `token_dev_profile` — creator history
- **[How to find the first buyers of a Solana token](./first-buyers-solana.md)** — `/earlybuyers`, `token_early_buyers` — time-windowed buyer list

## Holder analysis

- **[How to analyze top holders of a Solana token](./top-holders-analysis.md)** — `/topholders`, `token_top_holders` — enriched holder list
- **[How to map holder entry prices and cost basis](./holder-entry-prices.md)** — `/entrymap`, `token_entry_price` — cost basis and PnL per holder
- **[How to rank the most profitable traders on a Solana token](./best-traders-ranking.md)** — `/besttraders`, `token_best_traders` — smart money ranking

## Cross-token analysis

- **[How to find wallets holding multiple Solana tokens](./cross-token-holders.md)** — `/cross`, `cross_holders` — intersection of holder lists
- **[How to find traders active across multiple Solana tokens](./cross-token-traders.md)** — `/crossbt`, `cross_traders` — intersection of top traders

## Wallet analysis

- **[How to get a full PnL profile for any Solana wallet](./wallet-pnl-profile.md)** — `/walletchecker`, `wallet_profile` — trading history + balance
- **[How to map a Solana wallet's SOL transfer graph](./wallet-connections.md)** — `/links`, `wallet_connections` — funding and withdrawal network

## Common workflows

**Full token due diligence**
`/scan` → `/team` → `/bundle` → `/fresh` → `/dev`

**Top-holder classification**
`/topholders` → `/walletchecker` (per wallet) → `/links` (for suspicious ones)

**Serial team detection**
`/dev` → `/cross` (current token + prior launches) → `/crossbt`

**Smart money tracking**
`/besttraders` → `/crossbt` (across sector tokens) → `/walletchecker`

## Other resources

- [Quick start](./quick-start.md)
- [Authentication](./authentication.md)
- [Rate limits](./rate-limits.md)
- [MCP with Claude Desktop](./mcp-claude-desktop.md)

---

Full API reference: **[noesisapi.dev/docs](https://noesisapi.dev/docs)** · OpenAPI 3.1 spec: [openapi.yaml](../../openapi.yaml) · MCP endpoint: **`https://noesisapi.dev/mcp`**

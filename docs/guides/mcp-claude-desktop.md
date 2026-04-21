# Using Noesis with Claude Desktop

Noesis ships a Model Context Protocol (MCP) server at `https://noesisapi.dev/mcp`. Once connected, Claude can call 19 on-chain analysis tools directly.

## Setup

### 1. Find your Claude Desktop config

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add Noesis

```json
{
  "mcpServers": {
    "noesis": {
      "url": "https://noesisapi.dev/mcp"
    }
  }
}
```

### 3. Restart Claude Desktop

You should see 19 tools appear under the tools menu, prefixed `noesis_`.

## Try it

Ask Claude:

- *"Profile wallet `<ADDRESS>`"*
- *"Detect bundles on token `<MINT>`"*
- *"Find wallets that traded both `<MINT1>` and `<MINT2>` profitably"*
- *"What's the dev profile of the creator of `<MINT>`?"*
- *"Show me fresh wallets holding `<MINT>`"*

## Available tools

| Tool | Purpose |
|---|---|
| `token_preview` | Quick token overview (price, pools, holder count) |
| `token_scan` | Full token analysis — top traders, security, holder stats |
| `token_info` | On-chain metadata — authorities, supply, raw DAS asset |
| `token_top_holders` | Top 20 holders with labels, tags, PnL |
| `token_holders` | Paginated full holders list (up to 1000/page) |
| `token_bundles` | Bundle (sybil buy) detection |
| `token_fresh_wallets` | Wallets with no prior on-chain activity |
| `token_team_supply` | Team/insider supply via funding clustering |
| `token_entry_price` | Holder entry prices, realized & unrealized PnL |
| `token_dev_profile` | Creator profile, prior coins, funding source |
| `token_best_traders` | Most profitable traders, enriched with labels |
| `token_early_buyers` | Buyers within N hours of token creation |
| `wallet_profile` | Full wallet profile — PnL, holdings, labels, funding |
| `wallet_connections` | SOL transfer graph with counterparties |
| `wallet_history` | Parsed transaction history with filters |
| `cross_holders` | Wallets holding all specified tokens |
| `cross_traders` | Wallets that traded all specified tokens |
| `chain_status` | Current slot, block height, epoch info |
| `transactions_parse` | Parse up to 100 signatures into human-readable events |

## See also

- [Quick start](./quick-start.md)
- [Rate limits](./rate-limits.md)

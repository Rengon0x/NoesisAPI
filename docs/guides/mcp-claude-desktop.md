# Using Noesis with Claude Desktop

Noesis ships a Model Context Protocol (MCP) server at `https://noesisapi.dev/mcp`. Once connected, Claude can call 13 on-chain analysis tools directly.

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

You should see 13 tools appear under the tools menu, prefixed `noesis_`.

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
| `token_preview` | Quick token overview |
| `token_scan` | Full token analysis |
| `token_top_holders` | Top holders with PnL |
| `token_bundles` | Bundle & bot detection |
| `token_fresh_wallets` | Newly-created holders |
| `token_dev_profile` | Creator profile & history |
| `token_best_traders` | Most profitable traders |
| `token_early_buyers` | Buyers within N hours of launch |
| `wallet_profile` | Full wallet profile |
| `wallet_connections` | SOL transfer graph |
| `cross_holders` | Wallets holding multiple tokens |
| `cross_traders` | Traders across multiple tokens |
| `chain_status` | Current Solana chain state |

## See also

- [Using Noesis with Cursor](./mcp-cursor.md)
- [Quick start](./quick-start.md)

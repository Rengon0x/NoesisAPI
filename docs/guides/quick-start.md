# Quick start

Get from zero to your first Noesis API call in 60 seconds.

## 1. Get an API key

Go to [noesisapi.dev/keys](https://noesisapi.dev/keys), sign in with your Solana wallet (SIWS), and create a key. Keys look like `se_...`.

## 2. Make your first call

```bash
export NOESIS_API_KEY=se_...

curl -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/So11111111111111111111111111111111111111112/preview"
```

You should get back a JSON response with price, market cap, liquidity, and holder stats.

## 3. Use an SDK

Instead of raw HTTP, use one of the official SDKs:

- **TypeScript**: `npm install noesis-api` — [docs](https://github.com/Rengon0x/NoesisAPI/tree/main/sdks/typescript)
- **Python**: `pip install noesis-api` — [docs](https://github.com/Rengon0x/NoesisAPI/tree/main/sdks/python)
- **Rust**: `cargo add noesis-api` — [docs](https://github.com/Rengon0x/NoesisAPI/tree/main/sdks/rust)

## 4. Or connect an AI agent

Add Noesis to Claude Desktop, Cursor, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "noesis": {
      "url": "https://noesisapi.dev/mcp"
    }
  }
}
```

Then ask your assistant things like *"profile this wallet"* or *"detect bundles on this token."*

## Next steps

- [Authentication & API keys](./authentication.md)
- [Rate limits](./rate-limits.md)
- [How bundle detection works](./bundle-detection.md)

<div align="center">

# @noesis/sdk

**Official TypeScript SDK for the [Noesis](https://noesisapi.dev) on-chain intelligence API.**

[![npm](https://img.shields.io/npm/v/@noesis/sdk)](https://www.npmjs.com/package/@noesis/sdk)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Website](https://img.shields.io/badge/website-noesisapi.dev-orange)](https://noesisapi.dev)

</div>

---

## Install

```bash
npm install @noesis/sdk
# or
pnpm add @noesis/sdk
# or
yarn add @noesis/sdk
```

## Quick start

```typescript
import { Noesis } from "@noesis/sdk";

const noesis = new Noesis({ apiKey: process.env.NOESIS_API_KEY! });

// Token preview
const preview = await noesis.token.preview("<MINT>");
console.log(preview);

// Wallet profile
const wallet = await noesis.wallet.profile("<ADDRESS>");
console.log(wallet);

// Bundle detection
const bundles = await noesis.token.bundles("<MINT>");
console.log(bundles);
```

Get an API key at [noesisapi.dev/keys](https://noesisapi.dev/keys).

## API

### `new Noesis(config)`

```typescript
const noesis = new Noesis({
  apiKey: "se_...",           // required
  baseUrl: "https://...",     // optional — defaults to https://noesisapi.dev
  fetch: customFetch,         // optional — inject your own fetch
});
```

### Token methods

```typescript
noesis.token.preview(mint, chain?)
noesis.token.scan(mint, chain?)
noesis.token.info(mint, chain?)
noesis.token.topHolders(mint, chain?)
noesis.token.holders(mint, { chain?, limit?, cursor? })
noesis.token.bundles(mint)
noesis.token.freshWallets(mint)
noesis.token.teamSupply(mint, chain?)
noesis.token.entryPrice(mint, chain?)
noesis.token.devProfile(mint, chain?)
noesis.token.bestTraders(mint, chain?)
noesis.token.earlyBuyers(mint, { chain?, hours? })
```

### Wallet methods

```typescript
noesis.wallet.profile(address, chain?)
noesis.wallet.history(address, { chain?, limit?, type?, source?, before? })
noesis.wallet.connections(address, { min_sol?, max_pages? })
noesis.wallet.batchIdentity(addresses)
noesis.wallet.crossHolders(tokens)
noesis.wallet.crossTraders(tokens)
```

### Chain / on-chain methods

```typescript
noesis.chain.status()
noesis.chain.account(address)
noesis.chain.accountsBatch(addresses)
noesis.chain.parseTransactions(signatures)
```

### Live streams (SSE)

```typescript
const stream = noesis.streams.pumpfunNewTokens();
stream.onmessage = (event) => {
  const token = JSON.parse(event.data);
  console.log("New token:", token);
};
```

Available streams: `pumpfunNewTokens`, `pumpfunMigrations`, `raydiumNewPools`, `meteoraNewPools`.

## Error handling

```typescript
try {
  const data = await noesis.token.preview("<MINT>");
} catch (err) {
  // err: { status: number, message: string, details?: unknown }
  console.error(err.status, err.message);
}
```

## Environment support

- Node.js ≥ 18 (native `fetch`)
- Deno, Bun
- Modern browsers (pass an API key via a proxy — don't expose it client-side)

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [Website](https://noesisapi.dev)
- [API docs](https://noesisapi.dev/docs)
- [OpenAPI spec](https://github.com/Rengon0x/NoesisAPI/blob/main/openapi.yaml)
- [Examples](https://github.com/Rengon0x/NoesisAPI/tree/main/examples)

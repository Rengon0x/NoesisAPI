<div align="center">

# noesis-python

**Official Python SDK for the [Noesis](https://noesisapi.dev) on-chain intelligence API.**

[![PyPI](https://img.shields.io/pypi/v/noesis-api)](https://pypi.org/project/noesis-api/)
[![Python](https://img.shields.io/badge/python-3.9+-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Website](https://img.shields.io/badge/website-noesisapi.dev-orange)](https://noesisapi.dev)

</div>

---

## Install

```bash
pip install noesis-api
```

## Quick start

```python
from noesis import Noesis

client = Noesis(api_key="se_...")

# Token preview
preview = client.token.preview("<MINT>")
print(preview)

# Wallet profile
wallet = client.wallet.profile("<ADDRESS>")
print(wallet)

# Bundle detection
bundles = client.token.bundles("<MINT>")
print(bundles)
```

Get an API key at [noesisapi.dev/keys](https://noesisapi.dev/keys).

## Live streams

```python
from noesis import Noesis

client = Noesis(api_key="se_...")

for token in client.streams.pumpfun_new_tokens():
    print("New token:", token)
```

Available streams: `pumpfun_new_tokens`, `pumpfun_migrations`, `raydium_new_pools`, `meteora_new_pools`.

## API

### Token

```python
client.token.preview(mint, chain="sol")
client.token.scan(mint, chain="sol")
client.token.top_holders(mint, chain="sol")
client.token.bundles(mint)
client.token.fresh_wallets(mint)
client.token.dev_profile(mint)
client.token.best_traders(mint, chain="sol")
client.token.early_buyers(mint, hours=1)
```

### Wallet

```python
client.wallet.profile(address, chain="sol")
client.wallet.history(address, chain="sol")
client.wallet.connections(address)
client.wallet.batch_identity(addresses)
client.wallet.cross_holders(tokens)
client.wallet.cross_traders(tokens)
```

### Chain

```python
client.chain.status()
client.chain.fees()
client.chain.account(address)
client.chain.accounts_batch(addresses)
```

## Error handling

```python
from noesis import Noesis, NoesisError

client = Noesis(api_key="se_...")

try:
    client.token.preview("<MINT>")
except NoesisError as e:
    print(e.status, e.message, e.details)
```

## Context manager

```python
with Noesis(api_key="se_...") as client:
    data = client.token.preview("<MINT>")
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [Website](https://noesisapi.dev)
- [API docs](https://noesisapi.dev/docs)
- [OpenAPI spec](https://github.com/Rengon0x/NoesisAPI/blob/main/openapi.yaml)
- [Examples](https://github.com/Rengon0x/NoesisAPI/tree/main/examples)

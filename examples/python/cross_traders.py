"""Cross-token trader analysis — find traders active across multiple tokens.

Run: NOESIS_API_KEY=se_... python cross_traders.py <MINT1> <MINT2> [...]
"""
import os
import sys
import json
import httpx

api_key = os.environ.get("NOESIS_API_KEY")
if not api_key:
    sys.exit("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys")

tokens = sys.argv[1:]
if len(tokens) < 2:
    sys.exit("Usage: python cross_traders.py <MINT1> <MINT2> [...]")

res = httpx.post(
    "https://noesisapi.dev/api/v1/tokens/cross-traders",
    headers={"X-API-Key": api_key},
    json={"tokens": tokens},
    timeout=60.0,
)
res.raise_for_status()
print(json.dumps(res.json(), indent=2))

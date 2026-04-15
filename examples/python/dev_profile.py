"""Dev profile — creator PnL, every token they've made, funding source.

Run: NOESIS_API_KEY=se_... python dev_profile.py <MINT>
"""
import os
import sys
import json
import httpx

api_key = os.environ.get("NOESIS_API_KEY")
if not api_key:
    sys.exit("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys")

if len(sys.argv) < 2:
    sys.exit("Usage: python dev_profile.py <MINT>")

mint = sys.argv[1]
res = httpx.get(
    f"https://noesisapi.dev/api/v1/token/{mint}/dev-profile",
    headers={"X-API-Key": api_key},
    timeout=30.0,
)
res.raise_for_status()
print(json.dumps(res.json(), indent=2))

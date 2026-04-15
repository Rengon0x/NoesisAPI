#!/usr/bin/env bash
# Token preview — price, market cap, liquidity, holders, socials
set -euo pipefail

: "${NOESIS_API_KEY:?Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys}"
MINT="${1:-So11111111111111111111111111111111111111112}"

curl -sS -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/$MINT/preview" | jq .

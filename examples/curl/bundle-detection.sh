#!/usr/bin/env bash
# Bundle detection — bundler %, sniper count, fresh-wallet rate, dev holdings
set -euo pipefail

: "${NOESIS_API_KEY:?Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys}"
MINT="${1:?Usage: $0 <token-mint>}"

curl -sS -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/token/$MINT/bundles" | jq .

#!/usr/bin/env bash
# Wallet profile — SOL balance, PnL, winrate, funding source, labels
set -euo pipefail

: "${NOESIS_API_KEY:?Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys}"
ADDR="${1:?Usage: $0 <wallet-address>}"

curl -sS -H "X-API-Key: $NOESIS_API_KEY" \
  "https://noesisapi.dev/api/v1/wallet/$ADDR" | jq .

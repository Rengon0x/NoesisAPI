"""Live PumpFun → Raydium migrations stream.

Run: NOESIS_API_KEY=se_... python sse_migrations.py
"""
import os
import sys
import json
import httpx

api_key = os.environ.get("NOESIS_API_KEY")
if not api_key:
    sys.exit("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys")

url = "https://noesisapi.dev/api/v1/stream/pumpfun/migrations"
headers = {"X-API-Key": api_key, "accept": "text/event-stream"}

print("Listening for PumpFun migrations... (Ctrl+C to stop)\n")

with httpx.stream("GET", url, headers=headers, timeout=None) as r:
    r.raise_for_status()
    for line in r.iter_lines():
        if line.startswith("data:"):
            payload = line[5:].strip()
            if payload:
                try:
                    print(json.dumps(json.loads(payload), indent=2))
                except json.JSONDecodeError:
                    print(payload)

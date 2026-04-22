# Rate limits

Noesis endpoints are classified as **Light** or **Heavy**.

## Limits

| Tier | Limit | Applies to |
|---|---|---|
| **Light** | 1 request / second | Simple lookups (previews, chain status, account info) |
| **Heavy** | 1 request / 5 seconds | Deep analysis (scan, bundles, dev profile, cross-analysis) |

## Behavior on exceed

Exceeding a limit returns HTTP `429 Too Many Requests` with a `Retry-After` header and a JSON body:

```json
{
  "error": "Rate limit exceeded",
  "limit": "1 request/5 seconds",
  "type": "Heavy",
  "retry_after_seconds": 4,
  "signed_in": false
}
```

Field reference:

- `error` — human-readable message
- `limit` — human-readable limit string
- `type` — tier that was exceeded: `Light` or `Heavy`
- `retry_after_seconds` — back off this long before retrying (also sent as the `Retry-After` response header)
- `signed_in` — whether the request used a signed-in web session (different rate-limit bucket)

Honor `retry_after_seconds` — back off and retry.

## Handling retries

Example in TypeScript:

```typescript
async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err.status === 429 && i < max - 1) {
        const wait = err.details?.retry_after_seconds ?? 5;
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}
```

## Need higher limits?

Reach out via [noesisapi.dev/feedback](https://noesisapi.dev/feedback).

# Rate limits

Noesis endpoints are classified as **Light** or **Heavy**.

## Limits

| Class | Limit | Applies to |
|---|---|---|
| **Light** | 1 request / second | Simple lookups (previews, chain status, account info) |
| **Heavy** | 1 request / 5 seconds | Deep analysis (scan, bundles, dev profile, cross-analysis) |

## Behavior on exceed

Exceeding a limit returns HTTP `429 Too Many Requests` with a JSON body:

```json
{
  "error": "rate_limit_exceeded",
  "class": "heavy",
  "retry_after_seconds": 4
}
```

Honor the `retry_after_seconds` field — back off and retry.

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

# Authentication & API keys

Noesis uses two authentication mechanisms.

## API Key (for data endpoints)

Used for all `/api/v1/token/*`, `/api/v1/wallet/*`, `/api/v1/chain/*`, and SSE stream endpoints.

### Creating a key

1. Go to [noesisapi.dev/keys](https://noesisapi.dev/keys)
2. Sign in with your Solana wallet (SIWS — Sign In With Solana)
3. Click **Create API Key**
4. Copy the key (it starts with `se_`). You'll only see it once.

### Using a key

Pass it as either:

```http
X-API-Key: se_...
```

or

```http
Authorization: Bearer se_...
```

## JWT Session (for key management)

Used for endpoints under `/api/v1/keys/*`. Obtained via the SIWS flow — typically handled by the web UI. Pass as `Authorization: Bearer <jwt>`.

You don't need to worry about JWTs unless you're building a custom UI for key management.

## Security tips

- **Never commit API keys.** Use environment variables.
- **Rotate keys** regularly via the [keys page](https://noesisapi.dev/keys).
- **Don't expose keys client-side.** Use a backend proxy if calling from a browser.

## See also

- [Rate limits](./rate-limits.md)
- [Quick start](./quick-start.md)

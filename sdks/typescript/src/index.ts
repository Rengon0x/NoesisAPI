export interface NoesisConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

/**
 * Error thrown by the Noesis SDK for any non-2xx HTTP response.
 *
 * A real `Error` subclass so `instanceof` and stack traces work. For rate
 * limits, check `err.retryAfterSeconds`; for auth failures, check
 * `err.status === 401`.
 */
export class NoesisError extends Error {
  /** HTTP status code returned by the Noesis API. */
  readonly status: number;
  /** Parsed JSON error body if the server returned one. */
  readonly details?: unknown;
  /** Seconds to wait before retrying (429 only). Read from the body's
   *  `retry_after_seconds` field or the `Retry-After` response header. */
  readonly retryAfterSeconds?: number;
  /** Human-readable limit string on 429, e.g. `"1 request/5 seconds"`. */
  readonly limit?: string;
  /** Weight class of the throttled endpoint on 429: `Light`, `Heavy`,
   *  or `VeryHeavy`. */
  readonly limitType?: string;
  /** Whether the request was authenticated as a signed-in web user
   *  (429 only; affects which rate-limit bucket applied). */
  readonly signedIn?: boolean;

  constructor(opts: {
    status: number;
    message: string;
    details?: unknown;
    retryAfterSeconds?: number;
    limit?: string;
    limitType?: string;
    signedIn?: boolean;
  }) {
    super(opts.message);
    this.name = "NoesisError";
    this.status = opts.status;
    this.details = opts.details;
    this.retryAfterSeconds = opts.retryAfterSeconds;
    this.limit = opts.limit;
    this.limitType = opts.limitType;
    this.signedIn = opts.signedIn;
  }

  /** Convenience check: true when this is a 429 rate-limit error. */
  get isRateLimit(): boolean {
    return this.status === 429;
  }
}

export interface SSEMessage {
  /** SSE `event:` field. Defaults to `"message"` when unspecified. */
  type: string;
  /** SSE `data:` payload as a string. Parse with `JSON.parse` for typed streams. */
  data: string;
  /** SSE `id:` field if present. */
  id?: string;
}

/**
 * A fetch-backed SSE stream. Unlike the browser's native `EventSource`,
 * this sets the `X-API-Key` header so authenticated Noesis streams work
 * in Node (≥18), Deno, Bun, and modern browsers.
 *
 * Usage:
 *
 * ```ts
 * const stream = noesis.streams.pumpfunNewTokens();
 * stream.onmessage = (ev) => console.log(JSON.parse(ev.data));
 * // when done:
 * stream.close();
 * ```
 *
 * Or, idiomatically, with `for await`:
 *
 * ```ts
 * for await (const ev of stream) {
 *   console.log(JSON.parse(ev.data));
 * }
 * ```
 */
export interface SSEStream extends AsyncIterable<SSEMessage> {
  onmessage?: (ev: SSEMessage) => void;
  onerror?: (err: unknown) => void;
  /** Abort the underlying fetch and stop emitting events. */
  close(): void;
}

export type Chain = "sol" | "base";

export class Noesis {
  readonly token: TokenClient;
  readonly wallet: WalletClient;
  readonly chain: ChainClient;
  readonly streams: StreamsClient;

  constructor(config: NoesisConfig) {
    const http = new HttpClient(config);
    this.token = new TokenClient(http);
    this.wallet = new WalletClient(http);
    this.chain = new ChainClient(http);
    this.streams = new StreamsClient(http);
  }
}

/**
 * Parse a non-2xx `fetch` response into a typed `NoesisError`.
 * Reads both the JSON body envelope (`{error, limit, type, retry_after_seconds, signed_in}`)
 * and the `Retry-After` header as a fallback for `retryAfterSeconds`.
 */
async function buildError(res: Response): Promise<NoesisError> {
  let details: unknown;
  try { details = await res.json(); } catch { /* non-JSON body — leave undefined */ }

  const body = (details ?? {}) as Record<string, unknown>;
  const serverMsg = typeof body.error === "string" ? (body.error as string) : undefined;
  const retryFromBody = typeof body.retry_after_seconds === "number"
    ? (body.retry_after_seconds as number)
    : undefined;
  const retryFromHeader = (() => {
    const h = res.headers.get("retry-after");
    if (!h) return undefined;
    const n = Number(h);
    return Number.isFinite(n) ? n : undefined;
  })();

  return new NoesisError({
    status: res.status,
    message: serverMsg ?? `Noesis API error ${res.status}`,
    details,
    retryAfterSeconds: retryFromBody ?? retryFromHeader,
    limit: typeof body.limit === "string" ? (body.limit as string) : undefined,
    limitType: typeof body.type === "string" ? (body.type as string) : undefined,
    signedIn: typeof body.signed_in === "boolean" ? (body.signed_in as boolean) : undefined,
  });
}

class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: NoesisConfig) {
    if (!config.apiKey) throw new Error("Noesis: apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://noesisapi.dev").replace(/\/$/, "");
    this.fetchImpl = config.fetch ?? fetch;
  }

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.fetchImpl(url.toString(), {
      headers: { "X-API-Key": this.apiKey, accept: "application/json" },
    });
    return this.parse<T>(res);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/v1${path}`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return this.parse<T>(res);
  }

  stream(path: string): SSEStream {
    const url = `${this.baseUrl}/api/v1${path}`;
    const apiKey = this.apiKey;
    const fetchImpl = this.fetchImpl;
    const controller = new AbortController();

    const state: { onmessage?: (ev: SSEMessage) => void; onerror?: (err: unknown) => void } = {};
    const queue: SSEMessage[] = [];
    const waiters: Array<(v: IteratorResult<SSEMessage>) => void> = [];
    let done = false;

    const emit = (ev: SSEMessage) => {
      state.onmessage?.(ev);
      const w = waiters.shift();
      if (w) w({ value: ev, done: false });
      else queue.push(ev);
    };
    const finish = () => {
      if (done) return;
      done = true;
      while (waiters.length) waiters.shift()!({ value: undefined as unknown as SSEMessage, done: true });
    };

    (async () => {
      try {
        const res = await fetchImpl(url, {
          headers: { "X-API-Key": apiKey, accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw await buildError(res);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let evType = "message";
        let evData: string[] = [];
        let evId: string | undefined;
        const flush = () => {
          if (evData.length) {
            emit({ type: evType, data: evData.join("\n"), id: evId });
          }
          evType = "message";
          evData = [];
          evId = undefined;
        };
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);
            if (line === "") { flush(); continue; }
            if (line.startsWith(":")) continue;
            const colon = line.indexOf(":");
            const field = colon === -1 ? line : line.slice(0, colon);
            const val = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
            if (field === "event") evType = val;
            else if (field === "data") evData.push(val);
            else if (field === "id") evId = val;
          }
        }
        flush();
        finish();
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          finish();
          return;
        }
        state.onerror?.(err);
        const w = waiters.shift();
        if (w) w({ value: undefined as unknown as SSEMessage, done: true });
        finish();
      }
    })();

    const stream: SSEStream = {
      get onmessage() { return state.onmessage; },
      set onmessage(fn) { state.onmessage = fn; },
      get onerror() { return state.onerror; },
      set onerror(fn) { state.onerror = fn; },
      close() { controller.abort(); finish(); },
      [Symbol.asyncIterator](): AsyncIterator<SSEMessage> {
        return {
          next(): Promise<IteratorResult<SSEMessage>> {
            if (queue.length) return Promise.resolve({ value: queue.shift()!, done: false });
            if (done) return Promise.resolve({ value: undefined as unknown as SSEMessage, done: true });
            return new Promise(resolve => waiters.push(resolve));
          },
          return(): Promise<IteratorResult<SSEMessage>> {
            controller.abort();
            finish();
            return Promise.resolve({ value: undefined as unknown as SSEMessage, done: true });
          },
        };
      },
    };
    return stream;
  }

  private async parse<T>(res: Response): Promise<T> {
    if (!res.ok) throw await buildError(res);
    return (await res.json()) as T;
  }
}

class TokenClient {
  constructor(private http: HttpClient) {}

  /** Flat token metadata + price + pools. Light rate limit. */
  preview(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/preview`, { chain });
  }

  /** Full scan: holders, bundles, fresh wallets, dev profile. Heavy rate limit. */
  scan(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/scan`, { chain });
  }

  /** Detailed on-chain token metadata — authorities, supply, raw DAS asset. Light rate limit. */
  info(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/info`, { chain });
  }

  /** Top 20 holders with labels/tags. Heavy rate limit. */
  topHolders(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/top-holders`, { chain });
  }

  /** Paginated full holders list (up to 1000 per page). Light rate limit. */
  holders(mint: string, opts: { chain?: Chain; limit?: number; cursor?: string } = {}) {
    return this.http.get<unknown>(`/token/${mint}/holders`, {
      chain: opts.chain ?? "sol",
      limit: opts.limit,
      cursor: opts.cursor,
    });
  }

  /** Bundle (sybil buy) detection. Heavy rate limit. */
  bundles(mint: string) {
    return this.http.get<unknown>(`/token/${mint}/bundles`);
  }

  /** Fresh wallet detection — wallets with no prior on-chain activity. Heavy rate limit. */
  freshWallets(mint: string) {
    return this.http.get<unknown>(`/token/${mint}/fresh-wallets`);
  }

  /** Team/insider supply detection via funding pattern clustering. Heavy rate limit. */
  teamSupply(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/team-supply`, { chain });
  }

  /** Holder entry prices, realized & unrealized PnL. Heavy rate limit. */
  entryPrice(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/entry-price`, { chain });
  }

  /** Token creator profile — wallet data, prior coins, funding source. Heavy rate limit. */
  devProfile(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/dev-profile`, { chain });
  }

  /** Most profitable traders, enriched with labels. Heavy rate limit. */
  bestTraders(mint: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/token/${mint}/best-traders`, { chain });
  }

  /** Buyers within N hours after token creation. Heavy rate limit. */
  earlyBuyers(mint: string, opts: { chain?: Chain; hours?: number } = {}) {
    return this.http.get<unknown>(`/token/${mint}/early-buyers`, {
      chain: opts.chain ?? "sol",
      hours: opts.hours ?? 1,
    });
  }
}

export type TxType =
  | "SWAP" | "TRANSFER" | "NFT_SALE" | "NFT_LISTING"
  | "COMPRESSED_NFT_MINT" | "TOKEN_MINT" | "UNKNOWN";

export type TxSource =
  | "JUPITER" | "RAYDIUM" | "ORCA" | "METEORA"
  | "PUMP_FUN" | "SYSTEM_PROGRAM" | "TOKEN_PROGRAM";

class WalletClient {
  constructor(private http: HttpClient) {}

  /** Full wallet profile — PnL, holdings, labels, funding. Heavy rate limit. */
  profile(addr: string, chain: Chain = "sol") {
    return this.http.get<unknown>(`/wallet/${addr}`, { chain });
  }

  /** Parsed transaction history with optional filtering & pagination. Light rate limit. */
  history(addr: string, opts: {
    chain?: Chain;
    limit?: number;
    type?: TxType;
    source?: TxSource;
    before?: string;
  } = {}) {
    return this.http.get<unknown>(`/wallet/${addr}/history`, {
      chain: opts.chain ?? "sol",
      limit: opts.limit,
      type: opts.type,
      source: opts.source,
      before: opts.before,
    });
  }

  /** SOL transfer connections (counterparties with net flow). Heavy rate limit. */
  connections(addr: string, opts: { min_sol?: number; max_pages?: number } = {}) {
    return this.http.get<unknown>(`/wallet/${addr}/connections`, {
      min_sol: opts.min_sol,
      max_pages: opts.max_pages,
    });
  }

  /** Batch identity lookup — labels/tags/KOL info for up to 100 wallets. Light rate limit. */
  batchIdentity(addresses: string[]) {
    return this.http.post<unknown>(`/wallets/batch-identity`, { addresses });
  }

  /** Wallets holding all specified tokens. Heavy rate limit. */
  crossHolders(tokens: string[]) {
    return this.http.post<unknown>(`/tokens/cross-holders`, { tokens });
  }

  /** Wallets that traded all specified tokens. Heavy rate limit. */
  crossTraders(tokens: string[]) {
    return this.http.post<unknown>(`/tokens/cross-traders`, { tokens });
  }
}

class ChainClient {
  constructor(private http: HttpClient) {}

  /** Current slot, block height, epoch info. Light rate limit. */
  status() {
    return this.http.get<unknown>(`/chain/status`);
  }

  /** Account data (owner, lamports, data) for a single address. Light rate limit. */
  account(addr: string) {
    return this.http.get<unknown>(`/account/${addr}`);
  }

  /** Batch account data for up to 100 addresses. Light rate limit. */
  accountsBatch(addresses: string[]) {
    return this.http.post<unknown>(`/accounts/batch`, { addresses });
  }

  /** Parse up to 100 transaction signatures into human-readable events. Light rate limit. */
  parseTransactions(signatures: string[]) {
    return this.http.post<unknown>(`/transactions/parse`, { transactions: signatures });
  }
}

class StreamsClient {
  constructor(private http: HttpClient) {}

  /** SSE stream of newly created pump.fun tokens. */
  pumpfunNewTokens() {
    return this.http.stream(`/stream/pumpfun/new-tokens`);
  }

  /** SSE stream of pump.fun bonding-curve graduations. */
  pumpfunMigrations() {
    return this.http.stream(`/stream/pumpfun/migrations`);
  }

  /** SSE stream of new Raydium pools. */
  raydiumNewPools() {
    return this.http.stream(`/stream/raydium/new-pools`);
  }

  /** SSE stream of new Meteora pools. */
  meteoraNewPools() {
    return this.http.stream(`/stream/meteora/new-pools`);
  }
}

export default Noesis;

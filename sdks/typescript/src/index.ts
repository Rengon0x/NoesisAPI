export interface NoesisConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface NoesisError {
  status: number;
  message: string;
  details?: unknown;
}

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

  stream(path: string): EventSource {
    const url = `${this.baseUrl}/api/v1${path}`;
    return new EventSource(url);
  }

  private async parse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let details: unknown;
      try { details = await res.json(); } catch { /* ignore */ }
      const err: NoesisError = {
        status: res.status,
        message: `Noesis API error ${res.status}`,
        details,
      };
      throw err;
    }
    return (await res.json()) as T;
  }
}

class TokenClient {
  constructor(private http: HttpClient) {}
  preview(mint: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/token/${mint}/preview`, { chain });
  }
  scan(mint: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/token/${mint}/scan`, { chain });
  }
  topHolders(mint: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/token/${mint}/top-holders`, { chain });
  }
  bundles(mint: string) {
    return this.http.get<unknown>(`/token/${mint}/bundles`);
  }
  freshWallets(mint: string) {
    return this.http.get<unknown>(`/token/${mint}/fresh-wallets`);
  }
  devProfile(mint: string) {
    return this.http.get<unknown>(`/token/${mint}/dev-profile`);
  }
  bestTraders(mint: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/token/${mint}/best-traders`, { chain });
  }
  earlyBuyers(mint: string, hours = 1) {
    return this.http.get<unknown>(`/token/${mint}/early-buyers`, { hours });
  }
}

class WalletClient {
  constructor(private http: HttpClient) {}
  profile(addr: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/wallet/${addr}`, { chain });
  }
  history(addr: string, chain: "sol" | "base" = "sol") {
    return this.http.get<unknown>(`/wallet/${addr}/history`, { chain });
  }
  connections(addr: string) {
    return this.http.get<unknown>(`/wallet/${addr}/connections`);
  }
  batchIdentity(addresses: string[]) {
    return this.http.post<unknown>(`/wallets/batch-identity`, { addresses });
  }
  crossHolders(tokens: string[]) {
    return this.http.post<unknown>(`/tokens/cross-holders`, { tokens });
  }
  crossTraders(tokens: string[]) {
    return this.http.post<unknown>(`/tokens/cross-traders`, { tokens });
  }
}

class ChainClient {
  constructor(private http: HttpClient) {}
  status() {
    return this.http.get<unknown>(`/chain/status`);
  }
  fees() {
    return this.http.get<unknown>(`/chain/fees`);
  }
  account(addr: string) {
    return this.http.get<unknown>(`/account/${addr}`);
  }
  accountsBatch(addresses: string[]) {
    return this.http.post<unknown>(`/accounts/batch`, { addresses });
  }
}

class StreamsClient {
  constructor(private http: HttpClient) {}
  pumpfunNewTokens() {
    return this.http.stream(`/stream/pumpfun/new-tokens`);
  }
  pumpfunMigrations() {
    return this.http.stream(`/stream/pumpfun/migrations`);
  }
  raydiumNewPools() {
    return this.http.stream(`/stream/raydium/new-pools`);
  }
  meteoraNewPools() {
    return this.http.stream(`/stream/meteora/new-pools`);
  }
}

export default Noesis;

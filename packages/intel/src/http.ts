import type { IntelLogger } from "./types";

export const USER_AGENT = "RasaPromptBot/1.0 (+https://rasa-prompt.ir/bot)";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`HTTP ${status} for ${redactUrl(url)}: ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

/** Never let API keys reach logs or error messages. */
export function redactUrl(url: string): string {
  return url.replace(/([?&](?:key|api_key|token|access_token)=)[^&]+/gi, "$1***");
}

export interface RequestOptions {
  /** Rate-limit bucket, usually the source kind. */
  bucket: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  /** Retries on 429/5xx/network errors (default 1). */
  retries?: number;
}

export interface HttpClient {
  json<T = unknown>(url: string, opts: RequestOptions): Promise<T>;
  text(url: string, opts: RequestOptions): Promise<{ text: string; headers: Headers }>;
}

/**
 * Per-source minimum interval between requests, chosen well under each API's published limit:
 * reddit OAuth 100 QPM, HN Algolia 10k/h, GitHub search 30/min (10 unauthenticated),
 * HF ~ generous, arXiv asks for 1 request / 3 s, SerpApi plan-bound, YouTube quota-bound.
 */
export const DEFAULT_MIN_INTERVAL_MS: Record<string, number> = {
  reddit: 700,
  hackernews: 400,
  github: 2500,
  huggingface: 500,
  producthunt: 1000,
  youtube: 500,
  google_trends: 1000,
  arxiv: 3100,
  official_docs: 2000,
  rss: 1000,
  robots: 200,
  default: 500,
};

export function createHttpClient(deps: {
  fetch: typeof fetch;
  logger: IntelLogger;
  sleep: (ms: number) => Promise<void>;
  defaultTimeoutMs?: number;
  minIntervalMs?: Record<string, number>;
}): HttpClient {
  const intervals = { ...DEFAULT_MIN_INTERVAL_MS, ...deps.minIntervalMs };
  const nextSlot = new Map<string, number>();

  async function waitTurn(bucket: string): Promise<void> {
    const gap = intervals[bucket] ?? intervals.default ?? 500;
    const now = Date.now();
    const slot = Math.max(now, nextSlot.get(bucket) ?? 0);
    nextSlot.set(bucket, slot + gap);
    if (slot > now) await deps.sleep(slot - now);
  }

  async function request(url: string, opts: RequestOptions): Promise<Response> {
    const retries = opts.retries ?? 1;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      await waitTurn(opts.bucket);
      try {
        const res = await deps.fetch(url, {
          method: opts.method ?? "GET",
          headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...opts.headers },
          body: opts.body,
          signal: AbortSignal.timeout(opts.timeoutMs ?? deps.defaultTimeoutMs ?? 15_000),
        });
        if (res.ok) return res;
        const body = await res.text().catch(() => "");
        const err = new HttpError(res.status, url, body);
        if (res.status !== 429 && res.status < 500) throw err;
        lastErr = err;
        const retryAfter = Number(res.headers.get("retry-after"));
        if (attempt < retries) {
          await deps.sleep(
            Math.min(30_000, retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt),
          );
        }
      } catch (err) {
        if (err instanceof HttpError && err.status !== 429 && err.status < 500) throw err;
        lastErr = err;
        if (attempt < retries) await deps.sleep(1000 * 2 ** attempt);
      }
    }
    deps.logger.debug({ url: redactUrl(url), bucket: opts.bucket }, "http request failed");
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  return {
    async json<T>(url: string, opts: RequestOptions): Promise<T> {
      const res = await request(url, opts);
      return (await res.json()) as T;
    },
    async text(url: string, opts: RequestOptions) {
      const res = await request(url, {
        ...opts,
        headers: { Accept: "text/html,application/xml,text/xml,*/*", ...opts.headers },
      });
      return { text: await res.text(), headers: res.headers };
    },
  };
}

/** Minimal robots.txt support for non-API fetches (RSS feeds, official guides). */
export function createRobotsChecker(http: HttpClient) {
  const cache = new Map<string, Promise<{ allow: string[]; disallow: string[] }>>();

  async function rulesFor(origin: string) {
    let p = cache.get(origin);
    if (!p) {
      p = http
        .text(`${origin}/robots.txt`, { bucket: "robots", retries: 0, timeoutMs: 8000 })
        .then(({ text }) => parseRobots(text, "rasapromptbot"))
        .catch(() => ({ allow: [], disallow: [] }));
      cache.set(origin, p);
    }
    return p;
  }

  return {
    async allowed(url: string): Promise<boolean> {
      let u: URL;
      try {
        u = new URL(url);
      } catch {
        return false;
      }
      const rules = await rulesFor(u.origin);
      return isPathAllowed(u.pathname + u.search, rules);
    },
  };
}

export function parseRobots(text: string, agent: string): { allow: string[]; disallow: string[] } {
  type Group = { agents: string[]; allow: string[]; disallow: string[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m?.[1]) continue;
    const field = m[1].toLowerCase();
    const value = (m[2] ?? "").trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.allow.push(value);
    if (field === "disallow" && value) current.disallow.push(value);
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
  };
}

function ruleMatches(rule: string, path: string): boolean {
  const anchored = rule.endsWith("$");
  const pattern = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

export function isPathAllowed(
  path: string,
  rules: { allow: string[]; disallow: string[] },
): boolean {
  // Longest matching rule wins; Allow wins ties (Google/RFC 9309 semantics).
  let best: { len: number; allow: boolean } | null = null;
  for (const r of rules.disallow)
    if (ruleMatches(r, path) && (!best || r.length > best.len))
      best = { len: r.length, allow: false };
  for (const r of rules.allow)
    if (ruleMatches(r, path) && (!best || r.length >= best.len))
      best = { len: r.length, allow: true };
  return best ? best.allow : true;
}

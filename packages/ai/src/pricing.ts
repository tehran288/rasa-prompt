/**
 * USD prices per million tokens. Source: Anthropic model catalog (Oct 2026).
 * Cache writes (5-minute TTL) bill at 1.25x input; cache reads at `cacheRead`.
 */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  /** Optional higher tier when the prompt exceeds `longContextThreshold` input tokens. */
  long?: { threshold: number; input: number; output: number; cacheRead: number };
}

export const PRICES: Record<string, ModelPrice> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    long: { threshold: 100_000, input: 0.5, output: 2.5, cacheRead: 0.05 },
  },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
};

/** Web search server tool: $10 per 1,000 searches. Web fetch has no per-call fee. */
export const WEB_SEARCH_USD_PER_REQUEST = 0.01;

/**
 * Unknown Anthropic models are priced like Opus 5.5 so the budget guard errs on the safe side.
 * Unknown OpenAI-compatible models (self-hosted) are priced at 0 unless listed in PRICES.
 */
const UNKNOWN_ANTHROPIC: ModelPrice = PRICES["claude-opus-5-5"] as ModelPrice;

export interface UsageForCost {
  inputTokens: number; // uncached input
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  webSearches?: number;
}

export function priceFor(provider: string, model: string): ModelPrice | null {
  const p = PRICES[model];
  if (p) return p;
  return provider === "anthropic" ? UNKNOWN_ANTHROPIC : null;
}

export function computeCostUsd(provider: string, model: string, u: UsageForCost): number {
  const base = priceFor(provider, model);
  const searches = (u.webSearches ?? 0) * WEB_SEARCH_USD_PER_REQUEST;
  if (!base) return searches;
  const promptTokens = u.inputTokens + (u.cacheWriteTokens ?? 0) + (u.cacheReadTokens ?? 0);
  const tier = base.long && promptTokens > base.long.threshold ? base.long : base;
  const usd =
    (u.inputTokens * tier.input +
      (u.cacheWriteTokens ?? 0) * tier.input * 1.25 +
      (u.cacheReadTokens ?? 0) * tier.cacheRead +
      u.outputTokens * tier.output) /
    1_000_000;
  return round6(usd + searches);
}

export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

import type { OutputType, PromptDraft, PromptTier } from "@rasa/shared";
import { clamp, tokenize } from "./text";

/** Price bands per tier (doc 05). Stars for Telegram digital goods. */
export const PRICE_BANDS = {
  pro: { toman: [49_000, 99_000], stars: [60, 120] },
  premium: { toman: [149_000, 290_000], stars: [180, 350] },
} as const;

const OUTPUT_WEIGHT: Record<OutputType, number> = {
  automation: 1,
  code: 0.8,
  video: 0.8,
  image: 0.6,
  audio: 0.6,
  text: 0.5,
};

/** 0..1 — more variables, a longer structured body and richer output types cost more to build. */
export function complexityOf(
  draft: Pick<PromptDraft, "variables" | "body" | "sourceLocale" | "outputType">,
): number {
  const body = draft.body[draft.sourceLocale] ?? draft.body.fa;
  const words = tokenize(body).length;
  const varScore = Math.min(1, draft.variables.length / 8);
  const lengthScore = Math.min(1, words / 900);
  return 0.4 * varScore + 0.4 * lengthScore + 0.2 * OUTPUT_WEIGHT[draft.outputType];
}

/** Nearest "…9,000" toman (149,000 / 79,000), kept inside [min, max]. */
export function roundToman(x: number, min: number, max: number): number {
  const r = Math.round((x + 1000) / 10_000) * 10_000 - 1000;
  return Math.min(max, Math.max(min, r));
}

export function roundStars(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(x / 10) * 10));
}

export interface PriceSuggestion {
  tier: Exclude<PromptTier, "free">;
  priceToman: number;
  priceStars: number;
  complexity: number;
}

export function suggestPrice(
  draft: Pick<PromptDraft, "variables" | "body" | "sourceLocale" | "outputType" | "tier">,
  trendScore: number,
): PriceSuggestion {
  const complexity = complexityOf(draft);
  const ow = OUTPUT_WEIGHT[draft.outputType];
  const tier: PriceSuggestion["tier"] =
    complexity >= 0.6 || (draft.tier === "premium" && complexity >= 0.45) ? "premium" : "pro";
  const p = clamp(0.5 * complexity + 0.3 * (clamp(trendScore) / 100) + 0.2 * ow, 0, 1);
  const band = PRICE_BANDS[tier];
  const [tMin, tMax] = band.toman;
  const [sMin, sMax] = band.stars;
  return {
    tier,
    priceToman: roundToman(tMin + p * (tMax - tMin), tMin, tMax),
    priceStars: roundStars(sMin + p * (sMax - sMin), sMin, sMax),
    complexity: Math.round(complexity * 1000) / 1000,
  };
}

export function applyPrice(draft: PromptDraft, trendScore: number): PromptDraft {
  const s = suggestPrice(draft, trendScore);
  return {
    ...draft,
    tier: s.tier,
    suggestedPriceToman: s.priceToman,
    suggestedPriceStars: s.priceStars,
  };
}

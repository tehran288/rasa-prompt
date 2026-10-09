import type { LocalizedText, OutputType, PromptTier } from "@rasa/shared";
import type { StoredVariable } from "../schema";

/** Seed prompts carry all three locales (fa is the source). */
export type L3 = { fa: string; ar: string; en: string };

export interface SeedPrompt {
  slug: string;
  categories: string[];
  tier: PromptTier;
  outputType: OutputType;
  models: string[];
  quality: number;
  trending: number;
  /** Required for pro/premium (sold individually); omitted for free. */
  priceToman?: number;
  priceStars?: number;
  title: L3;
  summary: L3;
  description: L3;
  body: L3;
  example?: L3;
  variables?: StoredVariable[];
}

export interface SeedCategory {
  slug: string;
  emoji: string;
  name: L3;
}

export type { LocalizedText };

/** Variable helper: label in all three locales. */
export function v(
  name: string,
  label: L3,
  extra: Partial<Omit<StoredVariable, "name" | "label">> = {},
): StoredVariable {
  return { name, label, type: "text", required: true, ...extra };
}

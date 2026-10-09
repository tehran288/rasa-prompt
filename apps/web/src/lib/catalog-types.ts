import type { OutputType, PromptTier } from "@rasa/shared";

export type Loc = "fa" | "ar" | "en";
export type L3 = { fa: string; ar: string; en: string };
export type L3List = { fa: string[]; ar: string[]; en: string[] };

export interface QualityBreakdown {
  clarity: number;
  accuracy: number;
  consistency: number;
  localization: number;
  safety: number;
}

/** Raw multilingual fixture record. Paid prompts NEVER carry `body`. */
export interface FixturePrompt {
  id: string;
  slug: string;
  type: OutputType;
  tier: PromptTier;
  category: string;
  models: string[];
  score: number;
  breakdown: QualityBreakdown;
  version: string;
  testedAt: string; // YYYY-MM-DD
  createdAt: string;
  priceToman: number | null;
  priceStars: number | null;
  popularity: number;
  title: L3;
  summary: L3;
  description: L3;
  example: L3;
  preview: L3;
  body?: L3;
  variables: {
    name: string;
    label: L3;
    type: "text" | "select" | "number";
    options?: L3List;
    default?: L3;
    required: boolean;
  }[];
  tags: string[];
}

export interface FixtureCategory {
  slug: string;
  name: L3;
  blurb: L3;
  icon: CategoryIcon;
}

export type CategoryIcon =
  | "megaphone"
  | "pen"
  | "palette"
  | "clapper"
  | "code"
  | "workflow"
  | "briefcase"
  | "graduation";

export interface FixtureTrend {
  key: string;
  title: L3;
  summary: L3;
  growth: number;
  score: number;
  sources: string[];
  regions: string[];
  series: number[];
  type: OutputType;
  promptSlugs: string[];
}

// ───────────── Locale-resolved view models (what pages consume) ─────────────

export interface PromptCardView {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tier: PromptTier;
  type: OutputType;
  models: string[];
  score: number;
  testedAt: string | null; // ISO
  createdAt: string | null;
  priceToman: number | null;
  priceStars: number | null;
  category: string | null;
  popularity: number;
}

export interface PromptVariableView {
  name: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
  default?: string;
}

export interface PromptView extends PromptCardView {
  description: string;
  version: string;
  variables: PromptVariableView[];
  preview: string;
  example: string | null;
  /** Full body — only ever populated for FREE prompts. */
  body: string | null;
  breakdown: QualityBreakdown | null;
}

export interface CategoryView {
  slug: string;
  name: string;
  blurb: string;
  icon: CategoryIcon;
  count: number;
}

export interface TrendView {
  key: string;
  title: string;
  summary: string;
  growth: number;
  score: number;
  sources: string[];
  regions: string[];
  series: number[];
  type: OutputType;
  promptSlugs: string[];
}

export interface ModelView {
  slug: string;
  name: string;
  count: number;
}

/**
 * Trend-intelligence contract: how external signals become original premium prompts.
 *
 * Legal rule baked into the types: we collect *signals* (topics, keywords, techniques,
 * public metrics, links) — never the text of other people's paid prompts. Only sources
 * with `license` in ALLOWED_CONTENT_LICENSES may contribute prompt text verbatim.
 */
import type { Locale, LocalizedText, OutputType, PromptTier } from "./types";

export const SOURCE_KINDS = [
  "google_trends", // search interest per region (IR, SA, AE, EG, US, GB…)
  "reddit", // r/ChatGPT, r/PromptEngineering, r/midjourney, r/ClaudeAI, r/StableDiffusion… (official API)
  "hackernews", // Algolia HN API
  "github", // trending repos + awesome-* prompt lists (license-checked)
  "huggingface", // datasets/spaces with permissive licenses
  "producthunt", // new AI products → new use-cases
  "youtube", // trending AI tutorial topics (Data API)
  "official_docs", // Anthropic/OpenAI/Google prompting guides — techniques only
  "arxiv", // prompting research papers — techniques only
  "web_search", // LLM web-search research (Claude web_search/web_fetch server tools)
  "internal_search", // zero-result searches from our own bots/site
  "rss", // curated AI newsletters/blogs
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

/** Licenses whose prompt *text* may be imported (with attribution where required). */
export const ALLOWED_CONTENT_LICENSES = [
  "CC0-1.0",
  "MIT",
  "Apache-2.0",
  "CC-BY-4.0",
  "Unlicense",
] as const;
export type ContentLicense = (typeof ALLOWED_CONTENT_LICENSES)[number] | "proprietary" | "unknown";

export const TARGET_REGIONS = ["IR", "SA", "AE", "EG", "IQ", "US", "GB", "GLOBAL"] as const;
export type Region = (typeof TARGET_REGIONS)[number];

/** One raw observation from a scout. */
export interface TrendSignal {
  source: SourceKind;
  externalId: string; // stable id for de-duplication (url, post id, repo name…)
  url: string;
  title: string;
  snippet: string; // short excerpt for analysis — not stored as product content
  locale: Locale | "other";
  region: Region;
  metric: number; // upvotes, stars, interest index… (source-native)
  metricName: string;
  observedAt: Date;
  license: ContentLicense; // "unknown" unless the source states one
  tags: string[];
}

/** A cluster of signals the analyst believes is a sellable trend. */
export interface TrendTopic {
  id: string;
  key: string; // normalized slug, e.g. "ai-product-photography-flux"
  title: LocalizedText;
  summary: string;
  outputType: OutputType;
  models: string[];
  regions: Region[];
  /** 0..100 each */
  scores: {
    velocity: number; // growth speed
    volume: number; // absolute interest
    commercialIntent: number; // will people pay?
    gap: number; // how poorly we/competitors cover it (100 = nobody covers it)
    fit: number; // fit with our audience/brand
  };
  trendScore: number; // weighted total 0..100
  signalIds: string[];
  status: "new" | "researching" | "drafted" | "published" | "rejected";
  firstSeenAt: Date;
  updatedAt: Date;
}

export interface ResearchNote {
  claim: string;
  sourceUrl: string;
  sourceTitle: string;
}

/** Output of the research → engineering → critique → test → compliance pipeline. */
export interface PromptDraft {
  topicId: string;
  sourceLocale: Locale;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  body: LocalizedText; // with {{variables}}
  variables: {
    name: string;
    label: LocalizedText;
    type: "text" | "select" | "number";
    options?: string[];
    required: boolean;
  }[];
  outputType: OutputType;
  models: string[];
  categorySlugs: string[];
  tier: PromptTier;
  suggestedPriceToman: number | null;
  suggestedPriceStars: number | null;
  research: ResearchNote[]; // citations used — shown in admin, not to buyers
  exampleOutput: string | null;
  judge: { score: number; passed: boolean; notes: string } | null;
  compliance: { originality: number; licenseOk: boolean; policyOk: boolean; notes: string } | null;
}

/** Weights for TrendTopic.trendScore (tunable via settings). */
export const DEFAULT_TREND_WEIGHTS = {
  velocity: 0.3,
  volume: 0.15,
  commercialIntent: 0.25,
  gap: 0.2,
  fit: 0.1,
} as const;

/** Auto-publish only if all gates pass; otherwise goes to the admin review queue. */
export const PUBLISH_GATES = {
  minJudgeScore: 80,
  minOriginality: 85, // 100 = nothing resembles a source text
  minTrendScore: 55,
} as const;

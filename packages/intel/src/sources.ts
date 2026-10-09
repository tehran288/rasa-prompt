/**
 * Curated defaults for every scout. All of them can be overridden via IntelOptions.
 * Review this list quarterly: feeds move, guides get renamed.
 */
import type { Locale, Region } from "@rasa/shared";
import type { FeedSource, OfficialGuide, TrendSeed, YoutubeQuery } from "./types";

export const DEFAULT_SUBREDDITS = [
  "ChatGPT",
  "PromptEngineering",
  "ClaudeAI",
  "midjourney",
  "StableDiffusion",
  "LocalLLaMA",
  "n8n",
  "ArtificialInteligence",
];

export const DEFAULT_HN_QUERIES = ["prompt", "LLM", "AI agent", "ChatGPT", "Claude", "Midjourney"];

export const DEFAULT_GITHUB_TOPICS = ["prompt-engineering", "prompts", "awesome-prompts"];

export const DEFAULT_RSS_FEEDS: FeedSource[] = [
  { url: "https://openai.com/news/rss.xml", title: "OpenAI News", locale: "en" },
  { url: "https://blog.google/technology/ai/rss/", title: "Google AI Blog", locale: "en" },
  { url: "https://huggingface.co/blog/feed.xml", title: "Hugging Face Blog", locale: "en" },
  { url: "https://simonwillison.net/atom/everything/", title: "Simon Willison", locale: "en" },
  { url: "https://www.latent.space/feed", title: "Latent Space", locale: "en" },
  { url: "https://www.oneusefulthing.org/feed", title: "One Useful Thing", locale: "en" },
  { url: "https://importai.substack.com/feed", title: "Import AI", locale: "en" },
  { url: "https://tldr.tech/api/rss/ai", title: "TLDR AI", locale: "en" },
];

/** Official prompting guides: techniques only, never copied (license "proprietary"). */
export const DEFAULT_OFFICIAL_GUIDES: OfficialGuide[] = [
  {
    vendor: "Anthropic",
    title: "Prompt engineering overview",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
  },
  {
    vendor: "OpenAI",
    title: "Prompt engineering guide",
    url: "https://platform.openai.com/docs/guides/prompt-engineering",
  },
  {
    vendor: "Google",
    title: "Gemini prompting strategies",
    url: "https://ai.google.dev/gemini-api/docs/prompting-strategies",
  },
  {
    vendor: "Microsoft",
    title: "Azure OpenAI prompt engineering techniques",
    url: "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/prompt-engineering",
  },
  {
    vendor: "Mistral",
    title: "Prompting capabilities",
    url: "https://docs.mistral.ai/guides/prompting_capabilities/",
  },
  {
    vendor: "Meta",
    title: "Llama prompting guide",
    url: "https://www.llama.com/docs/how-to-guides/prompting/",
  },
  { vendor: "Midjourney", title: "Prompt basics", url: "https://docs.midjourney.com/" },
];

export const DEFAULT_ARXIV_QUERY =
  '(ti:"prompt" OR abs:"prompt engineering" OR abs:"in-context learning" OR abs:"chain-of-thought") AND (cat:cs.CL OR cat:cs.AI OR cat:cs.LG)';

export const DEFAULT_TREND_SEEDS: TrendSeed[] = [
  { query: "هوش مصنوعی", geos: ["IR"] },
  { query: "پرامپت", geos: ["IR"] },
  { query: "الذكاء الاصطناعي", geos: ["SA", "AE", "EG"] },
  { query: "ai prompt", geos: ["US"] },
  { query: "chatgpt", geos: ["IR", "SA", "US"] },
  { query: "midjourney", geos: ["US"] },
];

/** ~100 quota units per search.list call → 6 searches + 6 videos.list ≈ 606 units/run. */
export const DEFAULT_YOUTUBE_QUERIES: YoutubeQuery[] = [
  { q: "آموزش هوش مصنوعی", regionCode: "IR", relevanceLanguage: "fa" },
  { q: "پرامپت نویسی", regionCode: "IR", relevanceLanguage: "fa" },
  { q: "شرح الذكاء الاصطناعي", regionCode: "SA", relevanceLanguage: "ar" },
  { q: "برومبت ChatGPT", regionCode: "AE", relevanceLanguage: "ar" },
  { q: "AI tutorial prompts", regionCode: "US", relevanceLanguage: "en" },
  { q: "ChatGPT Claude workflow tutorial", regionCode: "US", relevanceLanguage: "en" },
];

export const DEFAULT_WEB_RESEARCH_TARGETS: { locale: Locale; regions: Region[]; label: string }[] =
  [
    { locale: "fa", regions: ["IR"], label: "Iran (Persian speakers)" },
    { locale: "ar", regions: ["SA", "AE", "EG"], label: "Arab world (Gulf + Egypt)" },
    { locale: "en", regions: ["US", "GLOBAL"], label: "Global English market" },
  ];

/**
 * Paid-prompt marketplaces and sellers. They may never be a *source of text*; web research
 * blocks them and any note/signal pointing at them is dropped.
 */
export const BLOCKED_TEXT_DOMAINS = [
  "promptbase.com",
  "laprompt.com",
  "godofprompt.ai",
  "aiprm.com",
  "flowgpt.com",
  "prompthero.com",
  "promptrr.io",
  "snackprompt.com",
  "chatx.ai",
  "etsy.com",
  "gumroad.com",
  "creativefabrica.com",
];

/** Preferred sources for the researcher (a preference expressed in the prompt, not a filter). */
export const AUTHORITATIVE_DOMAINS = [
  "docs.claude.com",
  "anthropic.com",
  "platform.openai.com",
  "openai.com",
  "ai.google.dev",
  "blog.google",
  "learn.microsoft.com",
  "docs.mistral.ai",
  "llama.com",
  "huggingface.co",
  "arxiv.org",
  "github.com",
  "docs.midjourney.com",
  "help.openai.com",
  "simonwillison.net",
  "stackoverflow.blog",
];

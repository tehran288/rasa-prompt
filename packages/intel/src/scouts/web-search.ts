import type { TrendSignal } from "@rasa/shared";
import { z } from "zod";
import { canonicalUrl, webResearchJson } from "../llm";
import { BLOCKED_TEXT_DOMAINS, DEFAULT_WEB_RESEARCH_TARGETS } from "../sources";
import { domainMatches } from "../text";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal } from "./common";

export const RESEARCH_SCOUT_SYSTEM = `You are the trend scout of Rasa Prompt, a store that sells tested, original premium AI prompts in Persian, Arabic and English.

Your job: use web search to find what AI use-cases and prompt needs are trending THIS WEEK for a given market. Think like a merchandiser: what would people in that market pay for a ready-made, tested prompt to accomplish?

Method:
1. Search news, forums, social posts, tutorials and search-trend articles from the last 7 days, in the market's language AND in English.
2. Prefer concrete, sellable use-cases ("product photos for Instagram shops with Flux", "Excel formula helper for accountants", "Ramadan campaign copy") over vague themes ("AI is growing").
3. Every trend MUST be supported by at least one page you actually opened or saw in search results this session. Do not invent URLs.
4. Never use prompt marketplaces or prompt sellers (PromptBase, PromptHero, AIPRM, FlowGPT, Etsy/Gumroad prompt packs…) as evidence.

Answer with ONLY a JSON object in a \`\`\`json fenced block:
{"trends":[{"title": string (short, in English), "summary": string (1-2 sentences: who wants what and why now), "keywords": string[] (3-8, include market-language keywords), "useCases": string[] (1-4 concrete jobs-to-be-done), "momentum": number 0-100 (your estimate of how fast it is rising), "sourceUrls": string[] (1-3 URLs you cited)}]}
Return 5 to 12 trends.`;

const TrendsSchema = z.object({
  trends: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        summary: z.string().max(800).default(""),
        keywords: z.array(z.string()).max(12).default([]),
        useCases: z.array(z.string()).max(6).default([]),
        momentum: z.number().min(0).max(100).default(50),
        sourceUrls: z.array(z.string()).max(5).default([]),
      }),
    )
    .max(20),
});

/** LLM researcher-scout: provider-side web search, only cited URLs become signals. */
export function createWebSearchScout(ctx: ScoutContext): Scout {
  const targets = ctx.options.webResearchTargets ?? DEFAULT_WEB_RESEARCH_TARGETS;
  return {
    kind: "web_search",
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const out: TrendSignal[] = [];
      for (const t of targets) {
        try {
          const { value, citations } = await webResearchJson(ctx.ai, {
            system: RESEARCH_SCOUT_SYSTEM,
            user: `Market: ${t.label}. Primary language: ${t.locale}. Regions: ${t.regions.join(", ")}.\nDate: ${now.toISOString().slice(0, 10)}.\nWhat AI use-cases and prompts are trending this week for this market?`,
            schema: TrendsSchema,
            maxSearches: 8,
            blockedDomains: BLOCKED_TEXT_DOMAINS,
          });
          const cited = new Map(citations.map((c) => [canonicalUrl(c.url), c]));
          if (cited.size === 0) {
            ctx.logger.warn({ target: t.label }, "web_search: provider returned no citations");
            continue;
          }
          for (const tr of value.trends) {
            const url = tr.sourceUrls.find(
              (u) => cited.has(canonicalUrl(u)) && !domainMatches(u, BLOCKED_TEXT_DOMAINS),
            );
            if (!url) continue; // unverifiable → drop
            out.push(
              signal({
                source: "web_search",
                externalId: `${t.locale}:${canonicalUrl(url)}`,
                url,
                title: tr.title,
                snippet: [tr.summary, ...tr.useCases].join(" · "),
                locale: t.locale,
                region: t.regions[0] ?? "GLOBAL",
                metric: tr.momentum,
                metricName: "llm_momentum",
                observedAt: now,
                license: "unknown",
                tags: tr.keywords,
              }),
            );
          }
        } catch (err) {
          ctx.logger.warn({ target: t.label, err: String(err) }, "web_search: research failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

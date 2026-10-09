import type { AiRouter, ResearchNote, TrendTopic } from "@rasa/shared";
import { z } from "zod";
import { canonicalUrl, webResearchJson } from "./llm";
import { AUTHORITATIVE_DOMAINS, BLOCKED_TEXT_DOMAINS } from "./sources";
import { domainMatches, truncate } from "./text";
import type { IntelLogger } from "./types";

export const RESEARCH_KINDS = ["best_practice", "pain_point", "use_case", "model_tip"] as const;

export const RESEARCHER_SYSTEM = `You are the research lead of Rasa Prompt. Before our prompt engineer writes a premium prompt for a trending topic, you gather the facts that make the prompt genuinely better than what a user could write alone.

Use web search. Collect short, factual notes of four kinds:
- best_practice: techniques that measurably improve results for this job (structure, examples, constraints, evaluation).
- pain_point: what users complain about when they try this job with AI today (failure modes, bad outputs, missing context).
- use_case: concrete scenarios and audiences (prefer ones relevant to Iran and the Arab world when they exist).
- model_tip: model/tool-specific advice (parameters, syntax, context limits, aspect ratios, node names…) for the target tools.

Source rules (strict):
- Prefer authoritative sources: official vendor documentation and prompting guides, peer-reviewed or arXiv papers, reputable engineering blogs, well-maintained GitHub repos, then high-signal community threads.
- NEVER use prompt marketplaces or prompt sellers (PromptBase, PromptHero, AIPRM, FlowGPT, God of Prompt, Etsy/Gumroad prompt packs) as sources, and never quote or reproduce any prompt text from anywhere.
- Paraphrase every claim in your own words (max ~40 words). No verbatim copying.
- Every note must cite a URL you actually used this session.

Answer with ONLY a JSON object in a \`\`\`json fenced block:
{"notes":[{"kind":"best_practice|pain_point|use_case|model_tip","claim":string,"sourceUrl":string,"sourceTitle":string}]}
Return 6 to 14 notes covering all four kinds when possible.`;

const NotesSchema = z.object({
  notes: z
    .array(
      z.object({
        kind: z.enum(RESEARCH_KINDS),
        claim: z.string().min(5).max(600),
        sourceUrl: z.string(),
        sourceTitle: z.string().default(""),
      }),
    )
    .max(30),
});

export function createResearcher(deps: {
  ai: AiRouter;
  logger: IntelLogger;
  maxSearches?: number;
}) {
  return {
    /** Returns paraphrased notes whose URL the provider actually cited; marketplaces are dropped. */
    async research(topic: TrendTopic): Promise<ResearchNote[]> {
      const { value, citations } = await webResearchJson(deps.ai, {
        system: RESEARCHER_SYSTEM,
        user: [
          `Topic: ${topic.title.en ?? topic.title.fa} (${topic.key})`,
          `Summary: ${topic.summary}`,
          `Output type: ${topic.outputType}; target tools: ${topic.models.join(", ") || "any"}; regions: ${topic.regions.join(", ")}`,
          `Preferred domains (not exclusive): ${AUTHORITATIVE_DOMAINS.join(", ")}`,
        ].join("\n"),
        schema: NotesSchema,
        maxSearches: deps.maxSearches ?? 6,
        blockedDomains: BLOCKED_TEXT_DOMAINS,
      });
      const cited = new Map(citations.map((c) => [canonicalUrl(c.url), c]));
      const notes: ResearchNote[] = [];
      for (const n of value.notes) {
        if (domainMatches(n.sourceUrl, BLOCKED_TEXT_DOMAINS)) continue;
        const c = cited.get(canonicalUrl(n.sourceUrl));
        if (!c) continue; // unverifiable claim → dropped
        notes.push({
          claim: `[${n.kind}] ${truncate(n.claim, 400)}`,
          sourceUrl: n.sourceUrl,
          sourceTitle: n.sourceTitle || c?.title || n.sourceUrl,
        });
      }
      if (cited.size === 0)
        deps.logger.warn(
          { topic: topic.key },
          "researcher: provider returned no citations; notes dropped",
        );
      return notes;
    },
  };
}

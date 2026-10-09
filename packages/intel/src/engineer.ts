import type { AiRouter, Locale, PromptDraft, ResearchNote, TrendTopic } from "@rasa/shared";
import { z } from "zod";
import { primaryLocaleFor } from "./analyst";
import { askJson } from "./llm";
import { extractVariables, sameSet } from "./text";

const LOCALE_NAME: Record<Locale, string> = {
  fa: "Persian (Farsi, natural modern Iranian usage, ZWNJ where appropriate)",
  ar: "Modern Standard Arabic (natural, Gulf-friendly)",
  en: "English (natural, concise)",
};

export const ENGINEER_SYSTEM = `You are the principal prompt engineer of Rasa Prompt, a store of tested premium AI prompts. You write ORIGINAL prompts that a professional would pay for: they reliably produce excellent, ready-to-use output on the first try.

Hard rules:
- Original work only. Use research notes as knowledge, never as text: do not copy sentences from them or from anywhere else, and never reproduce anyone's published or paid prompt.
- Safe and honest: no jailbreaks, no instructions to bypass model policies, no deception, impersonation of real people, adult content, political propaganda, medical/legal/financial advice presented as professional judgment.
- Write the whole prompt in the requested language. Variable NAMES stay ASCII snake_case.

The prompt BODY must follow this structure, with a short heading for each section in the prompt's language:
1. Role — who the model acts as (expertise, standards).
2. Context — background, audience, why the task matters; reference variables.
3. Task — the precise job, step by step when it helps.
4. Variables — every user input as {{snake_case_name}}; each must be used in the body.
5. Constraints — length, tone, must/must-not rules, cultural and market fit, factuality rules.
6. Output format — exact structure (sections, tables, JSON, lists, image-prompt syntax, node list…).
7. Example — a short illustrative example of the expected output shape (not a full answer).
8. Stop criteria — when the answer is complete and what to do when inputs are missing (ask, don't invent).

Metadata you also return:
- title: specific and benefit-led (max ~70 chars). summary: one sentence (max ~160 chars). description: 2-4 sentences for the product page (who it's for, what you get, which tools).
- variables: name (snake_case), label (short, in the prompt's language), type text|select|number, options for select, required.
- models: the tools it is tested for. categorySlugs: 1-3 slugs from the allowed list only.
- tier: "premium" for multi-step, high-value or professional workflows; otherwise "pro".
- exampleOutput: null (filled after testing).
- sampleInputs: 3 realistic, diverse sets of values for ALL variables (in the prompt's language, culturally local), used to test the prompt.`;

const VAR_NAME = /^[a-z][a-z0-9_]{0,39}$/;

export const EngineeredPromptSchema = z.object({
  title: z.string().min(4).max(120),
  summary: z.string().min(10).max(300),
  description: z.string().min(20).max(1500),
  body: z.string().min(200).max(12000),
  variables: z
    .array(
      z.object({
        name: z.string(),
        label: z.string().min(1).max(80),
        type: z.enum(["text", "select", "number"]),
        options: z.array(z.string()).max(20).optional(),
        required: z.boolean(),
      }),
    )
    .min(1)
    .max(12),
  outputType: z.enum(["text", "image", "video", "audio", "code", "automation"]),
  models: z.array(z.string()).min(1).max(8),
  categorySlugs: z.array(z.string()).min(1).max(3),
  tier: z.enum(["pro", "premium"]),
  exampleOutput: z.string().nullable(),
  sampleInputs: z
    .array(z.object({ values: z.array(z.object({ name: z.string(), value: z.string() })) }))
    .min(2)
    .max(3),
});
export type EngineeredPrompt = z.infer<typeof EngineeredPromptSchema>;

/** Structural validation shared by write() and revise(). Returns a problem or null. */
export function validateEngineered(
  p: EngineeredPrompt,
  allowedCategories: string[],
): string | null {
  const declared = p.variables.map((v) => v.name);
  const bad = declared.filter((n) => !VAR_NAME.test(n));
  if (bad.length) return `variable names must be ASCII snake_case: ${bad.join(", ")}`;
  if (new Set(declared).size !== declared.length) return "duplicate variable names";
  const used = extractVariables(p.body);
  if (!sameSet(used, declared))
    return `variables declared [${declared.join(", ")}] must equal {{placeholders}} used in body [${used.join(", ")}]`;
  const noOpts = p.variables.filter(
    (v) => v.type === "select" && !(v.options && v.options.length >= 2),
  );
  if (noOpts.length)
    return `select variables need >= 2 options: ${noOpts.map((v) => v.name).join(", ")}`;
  if (allowedCategories.length) {
    const unknown = p.categorySlugs.filter((c) => !allowedCategories.includes(c));
    if (unknown.length)
      return `unknown categorySlugs ${unknown.join(", ")}; allowed: ${allowedCategories.join(", ")}`;
  }
  const required = p.variables.filter((v) => v.required).map((v) => v.name);
  for (const [i, s] of p.sampleInputs.entries()) {
    const names = new Set(s.values.map((x) => x.name));
    const missing = required.filter((n) => !names.has(n));
    if (missing.length)
      return `sampleInputs[${i}] misses required variables: ${missing.join(", ")}`;
  }
  return null;
}

/** Topic → source locale: Arabic-only demand is written in Arabic, everything else in Persian. */
export function sourceLocaleFor(topic: TrendTopic): Locale {
  return primaryLocaleFor(topic.regions);
}

export interface CritiqueIssue {
  severity: "blocker" | "major" | "minor";
  category: string;
  problem: string;
  fix: string;
}

export function createEngineer(deps: { ai: AiRouter }) {
  return {
    async write(input: {
      topic: TrendTopic;
      locale: Locale;
      notes: ResearchNote[];
      signalTitles: string[];
      categories: string[];
    }): Promise<EngineeredPrompt> {
      const { topic, locale } = input;
      return askJson(deps.ai, {
        task: "intel_engineer",
        system: ENGINEER_SYSTEM,
        user: [
          `Write the prompt in: ${LOCALE_NAME[locale]}.`,
          `Topic: ${topic.title.en ?? topic.title.fa} / ${topic.title.fa} (key ${topic.key})`,
          `Why it is trending: ${topic.summary}`,
          `Output type: ${topic.outputType}. Target tools: ${topic.models.join(", ") || "choose the best fit"}. Markets: ${topic.regions.join(", ")}.`,
          `Demand signals (titles only, for context — do not copy): ${input.signalTitles.slice(0, 12).join(" | ")}`,
          `Research notes (knowledge only — paraphrase, never copy):\n${input.notes.map((n) => `- ${n.claim}`).join("\n") || "- (none)"}`,
          `Allowed categorySlugs: ${input.categories.join(", ") || "(any short kebab-case slug)"}`,
        ].join("\n\n"),
        schema: EngineeredPromptSchema,
        maxTokens: 8000,
        retries: 2,
        validate: (p) => validateEngineered(p, input.categories),
      });
    },

    async revise(input: {
      prompt: EngineeredPrompt;
      locale: Locale;
      issues: CritiqueIssue[];
      categories: string[];
    }): Promise<EngineeredPrompt> {
      return askJson(deps.ai, {
        task: "intel_engineer",
        system: ENGINEER_SYSTEM,
        user: [
          `Revise this prompt (language: ${LOCALE_NAME[input.locale]}). Fix every blocker and major issue; fix minor ones when cheap. Keep what works. Return the full prompt JSON.`,
          `Current prompt JSON:\n${JSON.stringify(input.prompt)}`,
          `Critique:\n${input.issues.map((i) => `- [${i.severity}/${i.category}] ${i.problem} → ${i.fix}`).join("\n")}`,
          `Allowed categorySlugs: ${input.categories.join(", ") || "(any short kebab-case slug)"}`,
        ].join("\n\n"),
        schema: EngineeredPromptSchema,
        maxTokens: 8000,
        retries: 2,
        validate: (p) => validateEngineered(p, input.categories),
      });
    },
  };
}

/** Source-locale engineered prompt → contract PromptDraft (other locales filled by the localizer). */
export function toDraft(
  topic: TrendTopic,
  locale: Locale,
  p: EngineeredPrompt,
  research: ResearchNote[],
): PromptDraft {
  const lt = (text: string) => (locale === "fa" ? { fa: text } : { fa: "", [locale]: text });
  return {
    topicId: topic.id,
    sourceLocale: locale,
    title: lt(p.title),
    summary: lt(p.summary),
    description: lt(p.description),
    body: lt(p.body),
    variables: p.variables.map((v) => ({
      name: v.name,
      label: lt(v.label),
      type: v.type,
      ...(v.options ? { options: v.options } : {}),
      required: v.required,
    })),
    outputType: p.outputType,
    models: p.models,
    categorySlugs: p.categorySlugs,
    tier: p.tier,
    suggestedPriceToman: null,
    suggestedPriceStars: null,
    research,
    exampleOutput: p.exampleOutput,
    judge: null,
    compliance: null,
  };
}

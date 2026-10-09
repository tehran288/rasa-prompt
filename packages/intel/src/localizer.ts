import { type AiRouter, LOCALES, type Locale, type PromptDraft } from "@rasa/shared";
import { z } from "zod";
import { askJson } from "./llm";
import { errorMessage, extractVariables, sameSet } from "./text";
import type { IntelLogger } from "./types";

const MARKET: Record<Locale, string> = {
  fa: "Iranian Persian speakers. Currency: Toman (تومان). Occasions: Nowruz, Yalda, Mehregan, back-to-school (Mehr), Ramadan/Eid where relevant. Platforms people actually use in Iran: Instagram, Telegram, Bale, Divar, Digikala, Torob, Eitaa. Use Persian names and Iranian cities in examples. Formal-friendly register (شما).",
  ar: "Arabic speakers in the Gulf (Saudi Arabia, UAE) and Egypt. Write Modern Standard Arabic that reads natural to Gulf readers. Currency: SAR/AED (or EGP when Egypt-specific). Occasions: Ramadan, Eid al-Fitr, Eid al-Adha, Saudi National Day, White Friday. Platforms: Instagram, Snapchat, TikTok, X, WhatsApp, Noon, Salla, Zid. Arabic names and Gulf cities in examples.",
  en: "Global English speakers (US/UK). Currency: USD. Occasions: Black Friday, Cyber Monday, Christmas, back-to-school, New Year. Platforms: Instagram, TikTok, LinkedIn, Amazon, Shopify, Etsy. Neutral international names in examples.",
};

export const LOCALIZER_SYSTEM = `You are a senior localization specialist for Rasa Prompt's premium AI prompts. You LOCALIZE, you do not translate literally: the result must read as if a native expert wrote it for the target market.

Rules:
- Keep the prompt's structure, sections, constraints and intent exactly; adapt examples, names, currencies, prices, units, holidays/occasions, platforms and cultural references to the target market.
- Preserve every {{placeholder}} EXACTLY as written (same ASCII names, same braces), the same number of distinct placeholders, none added, none removed, none translated.
- Keep technical tokens (model names, parameters like --ar 4:5, code, JSON keys) unchanged.
- The prompt body must instruct the model to answer in the target language.
- Also localize: title (benefit-led, max ~70 chars), summary (one sentence), description (2-4 sentences), each variable's label, and the example output if given.
Return JSON only.`;

export const LocalizedSchema = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().min(5).max(400),
  description: z.string().min(10).max(2000),
  body: z.string().min(50).max(14000),
  variableLabels: z.array(z.object({ name: z.string(), label: z.string().min(1).max(100) })),
  exampleOutput: z.string().nullable(),
});
export type Localized = z.infer<typeof LocalizedSchema>;

export function validateLocalized(
  loc: Localized,
  sourceBody: string,
  varNames: string[],
): string | null {
  const want = extractVariables(sourceBody);
  const got = extractVariables(loc.body);
  if (!sameSet(want, got)) {
    const missing = want.filter((v) => !got.includes(v));
    const extra = got.filter((v) => !want.includes(v));
    return `placeholders must be exactly {{${want.join("}}, {{")}}}. Missing: [${missing.join(", ")}], unexpected: [${extra.join(", ")}]`;
  }
  const labelled = new Set(loc.variableLabels.map((l) => l.name));
  const unlabelled = varNames.filter((n) => !labelled.has(n));
  if (unlabelled.length) return `variableLabels missing for: ${unlabelled.join(", ")}`;
  return null;
}

export function createLocalizer(deps: { ai: AiRouter; logger: IntelLogger }) {
  async function localizeOne(draft: PromptDraft, target: Locale): Promise<Localized> {
    const src = draft.sourceLocale;
    const body = draft.body[src] ?? "";
    const varNames = draft.variables.map((v) => v.name);
    return askJson(deps.ai, {
      task: "intel_localize",
      system: LOCALIZER_SYSTEM,
      user: [
        `Source language: ${src}. Target language: ${target}.`,
        `Target market: ${MARKET[target]}`,
        `Source JSON:\n${JSON.stringify({
          title: draft.title[src],
          summary: draft.summary[src],
          description: draft.description[src],
          body,
          variableLabels: draft.variables.map((v) => ({ name: v.name, label: v.label[src] })),
          exampleOutput: draft.exampleOutput,
        })}`,
      ].join("\n\n"),
      schema: LocalizedSchema,
      maxTokens: 8000,
      retries: 2,
      validate: (loc) => validateLocalized(loc, body, varNames),
    });
  }

  return {
    localizeOne,
    /**
     * Fills the two missing locales. Persian must succeed (it is the catalog's required
     * locale); a failed ar/en localization is logged and left empty for the review queue.
     */
    async localizeDraft(draft: PromptDraft): Promise<{ draft: PromptDraft; failed: Locale[] }> {
      let out = draft;
      const failed: Locale[] = [];
      for (const target of LOCALES) {
        if (target === draft.sourceLocale) continue;
        try {
          const loc = await localizeOne(draft, target);
          const labels = new Map(loc.variableLabels.map((l) => [l.name, l.label]));
          out = {
            ...out,
            title: { ...out.title, [target]: loc.title },
            summary: { ...out.summary, [target]: loc.summary },
            description: { ...out.description, [target]: loc.description },
            body: { ...out.body, [target]: loc.body },
            variables: out.variables.map((v) => ({
              ...v,
              label: {
                ...v.label,
                [target]: labels.get(v.name) ?? v.label[draft.sourceLocale] ?? v.name,
              },
            })),
          };
        } catch (err) {
          if (target === "fa") throw err;
          failed.push(target);
          deps.logger.warn(
            { topicId: draft.topicId, target, err: errorMessage(err) },
            "localizer: failed",
          );
        }
      }
      return { draft: out, failed };
    },
  };
}

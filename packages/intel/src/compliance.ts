import { type AiRouter, type ContentLicense, LOCALES, type PromptDraft } from "@rasa/shared";
import { z } from "zod";
import { isAllowedLicense } from "./licenses";
import { askJson } from "./llm";
import { jaccard, overlapCoefficient, shingles, truncate } from "./text";

export const NGRAM = 5;
/** Overlap with a non-allowed-license source above this means its text was used. */
export const LICENSE_TEXT_OVERLAP = 0.1;
/** Sources shorter than this many shingles only count via Jaccard (too short to judge containment). */
const MIN_SHINGLES_FOR_CONTAINMENT = 3;

export interface SourceText {
  text: string;
  license: ContentLicense;
  url: string;
}

/**
 * Word-5-gram overlap between one body and one source, 0..1. Jaccard as specified, plus
 * containment (|A∩B| / min(|A|,|B|)) so a short snippet pasted into a long body cannot hide
 * behind a large union. The stricter of the two wins.
 */
export function overlap(body: string, source: string): number {
  const a = shingles(body, NGRAM);
  const b = shingles(source, NGRAM);
  if (a.size === 0 || b.size === 0) return 0;
  const j = jaccard(a, b);
  const c = Math.min(a.size, b.size) >= MIN_SHINGLES_FOR_CONTAINMENT ? overlapCoefficient(a, b) : 0;
  return Math.max(j, c);
}

/** originality = 100 − max overlap (%) over every (body locale × source) pair. */
export function originalityScore(
  bodies: string[],
  sources: SourceText[],
): {
  originality: number;
  worst: { url: string; overlap: number; license: ContentLicense } | null;
} {
  let worst: { url: string; overlap: number; license: ContentLicense } | null = null;
  for (const body of bodies) {
    for (const s of sources) {
      const o = overlap(body, s.text);
      if (!worst || o > worst.overlap) worst = { url: s.url, overlap: o, license: s.license };
    }
  }
  const max = worst?.overlap ?? 0;
  return {
    originality: Math.round((100 - max * 100) * 10) / 10,
    worst: worst && worst.overlap > 0 ? worst : null,
  };
}

/** licenseOk is false when any non-allowed-license source contributed text to the body. */
export function licenseCheck(
  bodies: string[],
  sources: SourceText[],
): { ok: boolean; offenders: string[] } {
  const offenders = new Set<string>();
  for (const s of sources) {
    if (isAllowedLicense(s.license)) continue;
    if (bodies.some((b) => overlap(b, s.text) >= LICENSE_TEXT_OVERLAP)) offenders.add(s.url);
  }
  return { ok: offenders.size === 0, offenders: [...offenders] };
}

/** Cheap deterministic red flags; any hit fails policy without needing the LLM. */
const RED_FLAGS: { re: RegExp; label: string }[] = [
  { re: /ignore (all )?(previous|prior|above) (instructions|rules)/i, label: "jailbreak" },
  { re: /\b(DAN|do anything now|developer mode|jailbreak)\b/i, label: "jailbreak" },
  {
    re: /(bypass|evade|circumvent) (the )?(safety|content|moderation|filter|polic)/i,
    label: "jailbreak",
  },
  { re: /دستورالعمل(‌|\s)?های قبلی را نادیده بگیر|بدون هیچ محدودیت(ی)? اخلاقی/, label: "jailbreak" },
  { re: /تجاهل (جميع )?التعليمات السابقة/, label: "jailbreak" },
  { re: /\b(nsfw|explicit sex|nude|porn)/i, label: "adult" },
  { re: /(fake|fabricated) (reviews|testimonials)/i, label: "deception" },
  { re: /pretend to be (a real|the real)|impersonat/i, label: "impersonation" },
];

export function redFlags(text: string): string[] {
  return [...new Set(RED_FLAGS.filter((f) => f.re.test(text)).map((f) => f.label))];
}

export const COMPLIANCE_SYSTEM = `You are the policy officer of Rasa Prompt, a store selling AI prompts to customers in Iran, the Arab world and globally. Decide if a prompt may be sold.

REJECT (policyOk=false) if the prompt, or its obvious intended use:
- jailbreak: tries to bypass AI safety rules, asks the model to ignore its policies, role-plays an "unrestricted" AI.
- deception: produces fake reviews/testimonials, phishing, scams, academic dishonesty presented as own work, misleading health/finance claims, fake news.
- adult: sexual or erotic content, nudity.
- political_propaganda: political persuasion, election content, propaganda or content attacking groups, governments or religions.
- impersonation: writing as a real, identifiable person or brand without authorization, or cloning a real person's voice/likeness.
- hate_or_harassment, self_harm, illegal (weapons, drugs, hacking others, piracy), privacy (doxxing, scraping personal data).
Allowed: normal marketing, education, creative writing, business, coding, design, productivity, religious/cultural occasions handled respectfully.
Be precise: legitimate prompts that merely MENTION a sensitive word are fine. Quote short evidence for each violation.`;

export const PolicySchema = z.object({
  policyOk: z.boolean(),
  violations: z
    .array(
      z.object({
        category: z.enum([
          "jailbreak",
          "deception",
          "adult",
          "political_propaganda",
          "impersonation",
          "hate_or_harassment",
          "self_harm",
          "illegal",
          "privacy",
          "other",
        ]),
        evidence: z.string().max(300),
      }),
    )
    .max(10),
  notes: z.string().max(600),
});

export function draftBodies(draft: PromptDraft): string[] {
  return LOCALES.map((l) => draft.body[l]).filter((b): b is string => Boolean(b?.trim()));
}

export function createCompliance(deps: { ai: AiRouter }) {
  return {
    async check(
      draft: PromptDraft,
      sources: SourceText[],
    ): Promise<NonNullable<PromptDraft["compliance"]>> {
      const bodies = draftBodies(draft);
      const { originality, worst } = originalityScore(bodies, sources);
      const lic = licenseCheck(bodies, sources);
      const flags = redFlags(bodies.join("\n"));
      const policy = await askJson(deps.ai, {
        task: "intel_compliance",
        system: COMPLIANCE_SYSTEM,
        user: `Title: ${draft.title.en ?? draft.title.fa}\nDescription: ${draft.description[draft.sourceLocale] ?? draft.description.fa}\nPrompt body:\n<<<\n${truncate(draft.body[draft.sourceLocale] ?? draft.body.fa, 10000)}\n>>>`,
        schema: PolicySchema,
        maxTokens: 800,
      });
      const policyOk = policy.policyOk && policy.violations.length === 0 && flags.length === 0;
      const notes = [
        `originality ${originality}${worst ? ` (closest: ${worst.url}, ${Math.round(worst.overlap * 100)}%)` : ""}`,
        lic.ok ? "license ok" : `text from non-allowed license: ${lic.offenders.join(", ")}`,
        flags.length ? `red flags: ${flags.join(", ")}` : "",
        policy.violations.length
          ? `policy: ${policy.violations.map((v) => `${v.category} — ${v.evidence}`).join("; ")}`
          : "",
        policy.notes,
      ].filter(Boolean);
      return { originality, licenseOk: lic.ok, policyOk, notes: truncate(notes.join(" | "), 1500) };
    },
  };
}

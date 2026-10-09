import { randomInt } from "node:crypto";
import type {
  Locale,
  LocalizedText,
  PromptDetail,
  PromptSummary,
  PromptVariable,
} from "@rasa/shared";
import { normalizeForSearch } from "./normalize";
import type { prompts, StoredVariable } from "./schema";

export type PromptRow = typeof prompts.$inferSelect;

/** Resolve a LocalizedText for a locale, falling back to fa. */
export function loc(t: LocalizedText | null | undefined, locale: Locale): string {
  if (!t) return "";
  const v = t[locale];
  return v && v.trim().length > 0 ? v : t.fa;
}

/** Messenger language_code → our locale (fa/ar/en; default fa). */
export function guessLocale(languageCode: string | null | undefined): Locale {
  const lc = (languageCode ?? "").toLowerCase();
  if (lc.startsWith("ar")) return "ar";
  if (lc.startsWith("en")) return "en";
  return "fa";
}

/** Crockford-like alphabet without 0/O/1/I/L/U — unambiguous when read aloud or typed. */
export const REFERRAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export function generateReferralCode(length = 8): string {
  let s = "";
  for (let i = 0; i < length; i++) s += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  return s;
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "prompt";
}

/** Normalized search text for each locale, plus a combined column. */
export function buildSearchColumns(
  p: {
    title: LocalizedText;
    summary: LocalizedText;
    description: LocalizedText;
    models?: string[];
  },
  extra: LocalizedText[] = [],
): { searchText: string; searchFa: string; searchAr: string; searchEn: string } {
  const per = (l: Locale) =>
    normalizeForSearch(
      [p.title[l], p.summary[l], p.description[l], ...extra.map((e) => e[l])]
        .filter((x): x is string => Boolean(x))
        .join(" "),
    );
  const searchFa = per("fa");
  const searchAr = per("ar");
  const searchEn = per("en");
  const models = normalizeForSearch((p.models ?? []).join(" "));
  return {
    searchFa,
    searchAr,
    searchEn,
    searchText: [searchFa, searchAr, searchEn, models].filter(Boolean).join(" "),
  };
}

export function toSummary(r: PromptRow, locale: Locale): PromptSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: loc(r.title, locale),
    summary: loc(r.summary, locale),
    tier: r.tier,
    outputType: r.outputType,
    models: r.models,
    qualityScore: r.qualityScore,
    lastTestedAt: r.lastTestedAt,
    priceToman: r.priceToman,
    priceStars: r.priceStars,
  };
}

export function resolveVariables(vars: StoredVariable[], locale: Locale): PromptVariable[] {
  return vars.map((v) => {
    const out: PromptVariable = {
      name: v.name,
      label: loc(v.label, locale),
      type: v.type,
      required: v.required,
    };
    if (v.options) out.options = v.options;
    if (v.default !== undefined) out.default = v.default;
    return out;
  });
}

/** First ~25% of the body, cut on a word boundary. Free prompts still only show a preview here. */
export function makePreview(body: string): string {
  const target = Math.max(80, Math.floor(body.length * 0.25));
  if (body.length <= target) return body;
  let cut = body.lastIndexOf(" ", target);
  if (cut < target * 0.6) cut = target;
  return `${body.slice(0, cut).trimEnd()} …`;
}

export function toDetail(
  r: PromptRow,
  locale: Locale,
  categoryIds: string[],
): PromptDetail {
  return {
    ...toSummary(r, locale),
    description: loc(r.description, locale),
    categoryIds,
    version: r.version,
    variables: resolveVariables(r.variables, locale),
    preview: makePreview(loc(r.body, locale)),
    exampleOutput: r.exampleOutput ? loc(r.exampleOutput, locale) : null,
  };
}

export function clampPage(page?: number, pageSize?: number): { page: number; pageSize: number } {
  const p = Math.max(1, Math.floor(page ?? 1));
  const s = Math.min(50, Math.max(1, Math.floor(pageSize ?? 10)));
  return { page: p, pageSize: s };
}

export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Stable 32-bit FNV-1a hash (deterministic rotation, no crypto needed). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** True for a Postgres unique_violation (23505), optionally on a specific constraint. */
export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur && typeof cur === "object"; i++) {
    const pg = cur as { code?: string; constraint_name?: string; cause?: unknown };
    if (pg.code === "23505") return !constraint || pg.constraint_name === constraint;
    cur = pg.cause;
  }
  return false;
}

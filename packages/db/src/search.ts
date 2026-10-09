import type { Locale } from "@rasa/shared";
import { type SQL, sql } from "drizzle-orm";
import { normalizeForSearch, searchTokens } from "./normalize";
import { prompts } from "./schema";

/** word_similarity threshold for fuzzy (typo-tolerant) matches. */
export const FUZZY_THRESHOLD = 0.5;

export interface PreparedQuery {
  normalized: string;
  tokens: string[];
}

export function prepareQuery(query: string): PreparedQuery {
  return { normalized: normalizeForSearch(query), tokens: searchTokens(query) };
}

function termMatch(term: string): SQL {
  return sql`(${prompts.searchText} ilike ${`%${term}%`} or word_similarity(${term}, ${prompts.searchText}) >= ${FUZZY_THRESHOLD})`;
}

/**
 * Matching predicate shared by search() and coverageGap(): the whole normalized phrase matches
 * (substring or trigram word-similarity), or every token matches individually.
 * Inputs are already normalized (letters/digits/spaces only), so no LIKE escaping is needed.
 */
export function matchSql(q: PreparedQuery): SQL {
  const phrase = termMatch(q.normalized);
  if (q.tokens.length <= 1) return phrase;
  const all = sql.join(
    q.tokens.map((t) => termMatch(t)),
    sql` and `,
  );
  return sql`(${phrase} or (${all}))`;
}

export function localeSearchColumn(locale: Locale) {
  return locale === "ar" ? prompts.searchAr : locale === "en" ? prompts.searchEn : prompts.searchFa;
}

/** Relevance: similarity on all text + exact phrase bonus + locale match + quality. */
export function rankSql(q: PreparedQuery, locale: Locale): SQL<number> {
  const col = localeSearchColumn(locale);
  return sql<number>`(
    word_similarity(${q.normalized}, ${prompts.searchText}) * 2
    + (case when ${prompts.searchText} ilike ${`%${q.normalized}%`} then 1 else 0 end)
    + word_similarity(${q.normalized}, ${col})
    + (case when ${col} ilike ${`%${q.normalized}%`} then 0.5 else 0 end)
    + ${prompts.qualityScore} / 200.0
  )`;
}

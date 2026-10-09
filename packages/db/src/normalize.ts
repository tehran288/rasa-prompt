/**
 * Text normalization for search/matching across Persian, Arabic and English.
 *
 * The same function is applied to stored prompt text (search_* columns) and to
 * user queries, so "كپشن" (Arabic kaf) matches "کپشن" (Persian keheh), "۱۲۳" matches "123",
 * and "می‌خواهم" matches "می خواهم".
 */

const CHAR_MAP: Record<string, string> = {
  // Arabic → Persian letters
  ي: "ی", // ي → ی
  ى: "ی", // ى → ی
  ئ: "ی", // ئ → ی
  ك: "ک", // ك → ک
  // Alef variants → ا
  أ: "ا", // أ
  إ: "ا", // إ
  آ: "ا", // آ
  ٱ: "ا", // ٱ
  // Teh marbuta / heh variants → ه
  ة: "ه", // ة
  ۀ: "ه", // ۀ
  ہ: "ه", // ہ
  ە: "ه", // ە
  // Waw with hamza → و
  ؤ: "و", // ؤ
};

// Persian (U+06F0–U+06F9) and Arabic-Indic (U+0660–U+0669) digits → Latin
for (let i = 0; i < 10; i++) {
  CHAR_MAP[String.fromCharCode(0x06f0 + i)] = String(i);
  CHAR_MAP[String.fromCharCode(0x0660 + i)] = String(i);
}

const MAPPED_CHARS = new RegExp(`[${Object.keys(CHAR_MAP).join("")}]`, "g");
/** Harakat, tanwin, shadda, sukun, superscript alef, Quranic marks + tatweel. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** ZWNJ, ZWJ, LRM/RLM, BOM, NBSP and other exotic spaces. */
const INVISIBLE_SPACES = /[​-‏‪-‮⁦-⁩﻿  - ]/g;

/**
 * Normalizes text for comparison: Arabic→Persian letters, digits→Latin, removes tatweel and
 * harakat, unifies ZWNJ/whitespace to a single space, folds alef/teh-marbuta/yeh variants,
 * lowercases Latin. Punctuation is kept.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(MAPPED_CHARS, (c) => CHAR_MAP[c] ?? c)
    .replace(INVISIBLE_SPACES, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** normalizeText + punctuation stripped to spaces. Used for the search index and queries. */
export function normalizeForSearch(input: string): string {
  return normalizeText(input)
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Search tokens (≥2 chars), de-duplicated, in order. */
export function searchTokens(input: string): string[] {
  const out: string[] = [];
  for (const t of normalizeForSearch(input).split(" ")) {
    if (t.length >= 2 && !out.includes(t)) out.push(t);
  }
  return out;
}

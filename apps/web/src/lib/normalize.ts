/**
 * Search normalization shared by the client-side library filter.
 * Mirrors @rasa/db normalizeForSearch: Arabic/Persian letter forms, digits, diacritics, ZWNJ.
 */
const MAP: Record<string, string> = {
  "ي": "ی",
  "ى": "ی",
  "ئ": "ی",
  "ك": "ک",
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ة": "ه",
  "ۀ": "ه",
  "ؤ": "و",
};

export function normalizeSearch(input: string): string {
  let s = input.toLowerCase();
  s = s.replace(/[يىئكأإآٱةۀؤ]/g, (c) => MAP[c] ?? c);
  s = s.replace(/[ً-ٰٟـ]/g, ""); // harakat + tatweel
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[‌‍‎‏]/g, " ");
  s = s.replace(/[^\p{L}\p{N}\s+#.-]/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const h = normalizeSearch(haystack);
  return q.split(" ").every((token) => h.includes(token));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

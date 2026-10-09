import { createHash } from "node:crypto";
import type { Locale } from "@rasa/shared";

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const ZW = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Unifies Persian/Arabic letter variants, digits, case and punctuation for matching. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ZW, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ۀ/g, "ه")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\{\{\s*[^{}]*?\s*\}\}/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(/\s+/).filter((t) => t.length > 0) : [];
}

const STOPWORDS = new Set(
  [
    // en
    "the a an and or of to in on for with by is are was were be been it its this that these those how what why when who your you we our my i me at as from into about via vs not no can will just new best top using use get more than all any some do does did have has had show ask hn",
    // fa
    "و در به از که این آن با برای را تا یا هم اما اگر چه چی چطور چگونه یک های ها می است هست بود شد شود کرد کن کنید کردن ای ما من تو شما او آنها بر",
    // ar
    "في من على إلى الى عن مع هذا هذه ذلك التي الذي و أو او ما كيف لماذا هل كل بعض لا ان أن إن كان يكون قد",
  ]
    .join(" ")
    .split(/\s+/)
    .map((w) => normalizeText(w)),
);

/** Normalized content keywords (stopwords and 1-char tokens removed, light plural stemming). */
export function keywords(input: string): string[] {
  const out: string[] = [];
  for (const t of tokenize(input)) {
    if (t.length < 2 || STOPWORDS.has(t) || /^\d+$/.test(t)) continue;
    out.push(/^[a-z]+s$/.test(t) && t.length > 4 && !t.endsWith("ss") ? t.slice(0, -1) : t);
  }
  return out;
}

/** Word n-gram shingles over normalized tokens. */
export function shingles(input: string, n = 5): Set<string> {
  const toks = tokenize(input);
  const out = new Set<string>();
  for (let i = 0; i + n <= toks.length; i++) out.add(toks.slice(i, i + n).join(" "));
  return out;
}

export function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let n = 0;
  for (const x of small) if (big.has(x)) n++;
  return n;
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const inter = intersectionSize(a, b);
  return inter / (a.size + b.size - inter);
}

/** |A∩B| / min(|A|,|B|) — catches a short source copied into a long body. */
export function overlapCoefficient<T>(a: Set<T>, b: Set<T>): number {
  const m = Math.min(a.size, b.size);
  return m === 0 ? 0 : intersectionSize(a, b) / m;
}

const VAR_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Every `{{name}}` placeholder in a body (trimmed names, deduplicated). */
export function extractVariables(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(VAR_RE)) if (m[1]) out.add(m[1].trim());
  return [...out].sort();
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export function fillVariables(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (whole, name: string) => values[name.trim()] ?? whole);
}

export function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

export function slugify(input: string, maxLen = 64): string {
  const s = input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  return s.length >= 3 ? s : `t-${sha1(input).slice(0, 10)}`;
}

/** Script-based locale guess: Persian-only letters → fa, other Arabic script → ar, Latin → en. */
export function detectLocale(text: string): Locale | "other" {
  const arabicScript = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (arabicScript === 0 && latin === 0) return "other";
  if (arabicScript > latin) {
    return /[\u067E\u0686\u0698\u06AF\u06A9\u06CC]/.test(text) ? "fa" : "ar";
  }
  return "en";
}

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function domainMatches(url: string, domains: readonly string[]): boolean {
  const h = hostOf(url);
  if (!h) return false;
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

export function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

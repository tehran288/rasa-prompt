import { DEFAULT_LOCALE, LOCALES, type Locale } from "@rasa/shared";
import { ar } from "./ar";
import { en } from "./en";
import { fa, type MessageKey, type Messages } from "./fa";

export type { MessageKey, Messages };

export const catalogs: Record<Locale, Messages> = { fa, ar, en };

/** A pre-rendered HTML fragment that t() must not escape. */
export class Raw {
  constructor(readonly html: string) {}
}
export const raw = (html: string): Raw => new Raw(html);

export type Param = string | number | Raw | null | undefined;
export type Params = Record<string, Param>;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DIGITS: Record<Locale, string | null> = {
  fa: "۰۱۲۳۴۵۶۷۸۹",
  ar: "٠١٢٣٤٥٦٧٨٩",
  en: null,
};
const GROUP_SEP: Record<Locale, string> = { fa: "٬", ar: "٬", en: "," };
const DECIMAL_SEP: Record<Locale, string> = { fa: "٫", ar: "٫", en: "." };

/** Converts ASCII digits in a string to the locale's digits (fa: ۰-۹, ar: ٠-٩). */
export function localizeDigits(locale: Locale, s: string): string {
  const digits = DIGITS[locale];
  if (!digits) return s;
  return s.replace(/[0-9]/g, (d) => digits[Number(d)] ?? d);
}

/** 1234567 → "۱٬۲۳۴٬۵۶۷" (fa) / "١٬٢٣٤٬٥٦٧" (ar) / "1,234,567" (en). */
export function formatNumber(locale: Locale, n: number, opts: { group?: boolean } = {}): string {
  const negative = n < 0;
  const abs = Math.abs(n);
  const [intPart = "0", frac] = (
    Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  ).split(".");
  const grouped =
    opts.group === false ? intPart : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEP[locale]);
  const body = frac ? `${grouped}${DECIMAL_SEP[locale]}${frac}` : grouped;
  return localizeDigits(locale, `${negative ? "-" : ""}${body}`);
}

const TOMAN: Record<Locale, string> = { fa: "تومان", ar: "تومان", en: "Toman" };

/** 49000 → "۴۹٬۰۰۰ تومان" */
export function formatToman(locale: Locale, amount: number): string {
  return `${formatNumber(locale, amount)} ${TOMAN[locale]}`;
}

/** 250 → "⭐ ۲۵۰" (fa) / "⭐ 250" (en) */
export function formatStars(locale: Locale, amount: number): string {
  return `⭐ ${formatNumber(locale, amount)}`;
}

const DATE_LOCALE: Record<Locale, string> = {
  fa: "fa-IR-u-ca-persian-nu-arabext",
  ar: "ar-u-ca-gregory-nu-arab",
  en: "en-GB",
};

/** Calendar-aware date: Solar Hijri for fa, Gregorian (Arabic-Indic digits) for ar. */
export function formatDate(locale: Locale, d: Date): string {
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(d);
  } catch {
    return localizeDigits(locale, d.toISOString().slice(0, 10));
  }
}

/**
 * Translate `key` for `locale`, interpolating `{param}` placeholders.
 * String params are HTML-escaped (wrap pre-rendered HTML in raw()); numbers get locale digits.
 * Missing translations fall back to Persian (source of truth), then to the key itself.
 */
export function t(locale: Locale, key: MessageKey, params?: Params): string {
  return interpolate(locale, key, params, true);
}

/**
 * Plain-text variant for places that are NOT parsed as HTML: button labels, inline-query
 * titles/descriptions, invoice titles, setMyCommands. Params are not escaped.
 */
export function tPlain(locale: Locale, key: MessageKey, params?: Params): string {
  return interpolate(locale, key, params, false);
}

function interpolate(locale: Locale, key: MessageKey, params: Params | undefined, html: boolean) {
  const template = catalogs[locale]?.[key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    const v = params[name];
    if (v === null || v === undefined) return "";
    if (v instanceof Raw) return v.html;
    if (typeof v === "number") return formatNumber(locale, v);
    return html ? escapeHtml(v) : v;
  });
}

/** Placeholder names used in a template — for completeness tests. */
export function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
}

/** Guess a locale from the messenger client's language_code. */
export function guessLocale(languageCode: string | null | undefined): Locale {
  const code = (languageCode ?? "").toLowerCase().slice(0, 2);
  if (code === "ar") return "ar";
  if (code === "en") return "en";
  return DEFAULT_LOCALE;
}

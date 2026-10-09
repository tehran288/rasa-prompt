/**
 * Locale-aware formatting. fa → Persian digits + Jalali calendar, ar → Arabic-Indic digits,
 * en → Latin digits. All functions are pure and safe on server and client.
 */
export type Loc = "fa" | "ar" | "en";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

export function digits(value: string | number, locale: Loc): string {
  const s = String(value);
  if (locale === "en") return s;
  const set = locale === "fa" ? FA : AR;
  return s.replace(/\d/g, (d) => set[Number(d)] ?? d);
}

const NUMBER_LOCALE: Record<Loc, string> = {
  fa: "fa-IR",
  ar: "ar-EG",
  en: "en-US",
};

export function formatNumber(n: number, locale: Loc, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[locale], opts).format(n);
  } catch {
    return digits(n.toLocaleString("en-US"), locale);
  }
}

export function formatPercent(n: number, locale: Loc): string {
  // "+182٪" style, avoids locale-specific sign placement surprises.
  const sign = n > 0 ? "+" : "";
  if (locale === "en") return `${sign}${n}%`;
  return `${sign}${digits(n, locale)}٪`;
}

/** e.g. "199,000 Toman" — currency label comes from i18n messages. */
export function formatToman(n: number, locale: Loc): string {
  return formatNumber(n, locale);
}

const DATE_LOCALE: Record<Loc, string> = {
  fa: "fa-IR-u-ca-persian-nu-arabext",
  ar: "ar-EG-u-nu-arab",
  en: "en-GB",
};

export function formatDate(
  iso: string | Date | null | undefined,
  locale: Loc,
  style: "long" | "short" = "long",
): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { month: "short", day: "numeric", timeZone: "Asia/Tehran" }
      : { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" };
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE[locale], opts).format(d);
  } catch {
    return digits(d.toISOString().slice(0, 10), locale);
  }
}

/** Version strings like "1.4" → "۱٫۴" for fa/ar. */
export function formatVersion(v: string, locale: Loc): string {
  if (locale === "en") return v;
  return digits(v, locale).replace(/\./g, "٫");
}

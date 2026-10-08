/**
 * Pure price helpers. Toman is the display currency in Iran; Bale invoices are in IRR
 * (1 toman = 10 rial). Telegram digital goods are priced in Stars (XTR, whole numbers).
 */

export const RIAL_PER_TOMAN = 10;

/** Toman → rial (IRR). Result is always a whole number of rials. */
export function tomanToRial(toman: number): number {
  assertFiniteNonNegative(toman, "toman");
  return Math.round(toman * RIAL_PER_TOMAN);
}

/** Rial (IRR) → toman. Rounded to the nearest whole toman. */
export function rialToToman(rial: number): number {
  assertFiniteNonNegative(rial, "rial");
  return Math.round(rial / RIAL_PER_TOMAN);
}

/**
 * Psychological toman price (plan doc 05: "multiple of 10k minus 1k" → 149,000, 289,000).
 * Picks the nearest price ending in 9,000. Prices under 10,000 toman are rounded up to the
 * next whole 1,000 instead (too small for the x9,000 pattern).
 */
export function roundPsychToman(toman: number): number {
  assertFiniteNonNegative(toman, "toman");
  if (toman === 0) return 0;
  if (toman < 10_000) return Math.ceil(toman / 1_000) * 1_000;
  return Math.max(9_000, Math.round((toman + 1_000) / 10_000) * 10_000 - 1_000);
}

/** Psychological USD price: nearest x.99 (minimum 0.99). */
export function roundPsychUsd(usd: number): number {
  assertFiniteNonNegative(usd, "usd");
  if (usd === 0) return 0;
  const v = Math.round(usd + 0.01) - 0.01;
  return Math.max(0.99, Number(v.toFixed(2)));
}

/**
 * "Nice" Stars amount. Stars are whole numbers ≥ 1.
 *   < 25        → round up to a whole star
 *   25 … < 100  → nearest multiple of 5
 *   ≥ 100       → nearest multiple of 50, minus 1 (149, 199, 249 …)
 */
export function roundStars(stars: number): number {
  assertFiniteNonNegative(stars, "stars");
  if (stars < 25) return Math.max(1, Math.ceil(stars));
  if (stars < 100) return Math.max(25, Math.round(stars / 5) * 5);
  return Math.max(99, Math.round(stars / 50) * 50 - 1);
}

/** Converts a toman price to a rounded Stars price given a reference rate (toman per star). */
export function tomanToStars(toman: number, tomanPerStar: number): number {
  assertFiniteNonNegative(toman, "toman");
  if (!(tomanPerStar > 0)) throw new RangeError("tomanPerStar must be > 0");
  return roundStars(toman / tomanPerStar);
}

/** Formats a toman amount for display, with locale digits (e.g. "۱۴۹٬۰۰۰"). */
export function formatToman(toman: number, locale: "fa" | "ar" | "en" = "fa"): string {
  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(toman);
}

function assertFiniteNonNegative(n: number, name: string): void {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`${name} must be a finite number ≥ 0`);
}

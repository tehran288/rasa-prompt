import { defineRouting } from "next-intl/routing";

export const locales = ["fa", "ar", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fa";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: { name: "rp-locale", maxAge: 60 * 60 * 24 * 365 },
  // We emit hreflang alternates ourselves via generateMetadata (with x-default → en).
  alternateLinks: false,
});

export function isRtl(locale: string): boolean {
  return locale === "fa" || locale === "ar";
}

export function dirOf(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

import type { Metadata } from "next";
import { type AppLocale, locales } from "@/i18n/routing";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://rasa-prompt.ir").replace(
  /\/$/,
  "",
);
export const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "RasaPromptBot";
export const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}`;
export const BALE_URL = `https://ble.ir/${BOT_USERNAME}`;
export const TELEGRAM_CHANNEL_URL = "https://t.me/RasaPrompt";

export const telegramBuyUrl = (id: string) => `${TELEGRAM_URL}?start=p_${id}`;
export const baleBuyUrl = (id: string) => `${BALE_URL}?start=p_${id}`;

export const OG_LOCALE: Record<AppLocale, string> = { fa: "fa_IR", ar: "ar_AR", en: "en_US" };

/** Absolute URL for a locale-relative path ("/" → "/fa"). */
export function localeUrl(locale: string, path = "/"): string {
  const p = path === "/" ? "" : path;
  return `${SITE_URL}/${locale}${p}`;
}

/** canonical + hreflang alternates (fa, ar, en, x-default → en). */
export function alternatesFor(locale: string, path = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl("en", path);
  return { canonical: localeUrl(locale, path), languages };
}

export function pageMetadata(opts: {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
  siteName: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const url = localeUrl(opts.locale, opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: alternatesFor(opts.locale, opts.path),
    openGraph: {
      type: opts.type ?? "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: opts.siteName,
      locale: OG_LOCALE[opts.locale],
      alternateLocale: locales.filter((l) => l !== opts.locale).map((l) => OG_LOCALE[l]),
      ...(opts.image ? { images: [{ url: opts.image, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}

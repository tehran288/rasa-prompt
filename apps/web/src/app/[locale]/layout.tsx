import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Dock } from "@/components/site/dock";
import { Effects } from "@/components/site/effects";
import { Footer } from "@/components/site/footer";
import { Providers } from "@/components/site/providers";
import { SiteNav } from "@/components/site/site-nav";
import { dirOf, routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getPrompts } from "@/lib/data";
import { alternatesFor, OG_LOCALE, SITE_URL } from "@/lib/site";

// Fonts are loaded at runtime from Google Fonts (build runs offline). Each locale only
// requests the families it renders; fallback stacks live in globals.css.
const FONTS: Record<Loc, string> = {
  fa: "family=Vazirmatn:wght@400;500;600;700;800;900&family=Inter+Tight:wght@600&family=JetBrains+Mono:wght@400;500;600",
  ar: "family=Noto+Naskh+Arabic:wght@400;600;700&family=Reem+Kufi:wght@500;600;700&family=Vazirmatn:wght@400;700;800&family=Inter+Tight:wght@600&family=JetBrains+Mono:wght@400;500;600",
  en: "family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Vazirmatn:wght@700;800&family=JetBrains+Mono:wght@400;500;600",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060a17" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5f0" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("homeTitle"), template: `%s • ${t("siteName")}` },
    description: t("homeDescription"),
    applicationName: t("siteName"),
    alternates: alternatesFor(locale, "/"),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: OG_LOCALE[locale],
      title: t("homeTitle"),
      description: t("homeDescription"),
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
    other: { "telegram:channel": "@RasaPrompt" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Loc;
  const dir = dirOf(locale);
  const t = await getTranslations("nav");
  const prompts = await getPrompts(loc);
  const index = prompts.map((p) => ({
    slug: p.slug,
    title: p.title,
    tier: p.tier,
    keywords: `${p.summary} ${p.models.join(" ")} ${p.type}`,
  }));

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${FONTS[loc]}&display=swap`}
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers dir={dir} locale={locale} index={index}>
            <a className="skip" href="#main">
              {t("skip")}
            </a>
            <SiteNav />
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <Footer locale={loc} />
            <Dock />
            <Effects />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

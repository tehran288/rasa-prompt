import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import type { AppLocale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/about",
    title: t("aboutTitle"),
    description: t("aboutDescription"),
    siteName: t("siteName"),
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <LegalPage
      locale={locale}
      path="/about"
      titleKey="aboutTitle"
      descKey="aboutDescription"
      kickerKey="aboutKicker"
      sectionsKey="about"
    />
  );
}

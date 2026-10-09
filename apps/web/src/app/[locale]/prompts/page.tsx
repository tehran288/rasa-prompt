import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Crumbs } from "@/components/site/crumbs";
import { LibraryBrowser } from "@/components/site/library-browser";
import { PageHero } from "@/components/site/page-hero";
import { cardLabels, PromptCard } from "@/components/site/prompt-card";
import { Sky } from "@/components/site/sky";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getCategories, getModels, getPrompts } from "@/lib/data";
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
    path: "/prompts",
    title: t("libraryTitle"),
    description: t("libraryDescription"),
    siteName: t("siteName"),
  });
}

export default async function PromptsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tn, tc, tt] = await Promise.all([
    getTranslations("library"),
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("types"),
  ]);
  const [prompts, categories, models] = await Promise.all([
    getPrompts(loc),
    getCategories(loc),
    getModels(loc),
  ]);
  const labels = cardLabels(tc, tt);
  const first = [...prompts].sort((a, b) => b.popularity - a.popularity).slice(0, 12);

  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/prompts", label: tn("library") },
          ]}
        />
        <PageHero kicker={t("kicker")} title={t("title")} desc={t("desc")} />
        <div className="relative z-[1]">
          <Suspense
            fallback={
              <>
                <div className="count num">{tc("results", { count: prompts.length })}</div>
                <div className="cards">
                  {first.map((p) => (
                    <PromptCard key={p.slug} p={p} locale={loc} labels={labels} reveal={false} />
                  ))}
                </div>
              </>
            }
          >
            <LibraryBrowser prompts={prompts} categories={categories} models={models} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crumbs } from "@/components/site/crumbs";
import { PageHero } from "@/components/site/page-hero";
import { Sky } from "@/components/site/sky";
import { Sparkline } from "@/components/site/sparkline";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getPrompts, getTrends } from "@/lib/data";
import { digits, formatPercent } from "@/lib/format";
import { pageMetadata } from "@/lib/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/trends",
    title: t("trendsTitle"),
    description: t("trendsDescription"),
    siteName: t("siteName"),
  });
}

export default async function TrendsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tn, tt] = await Promise.all([
    getTranslations("trends"),
    getTranslations("nav"),
    getTranslations("types"),
  ]);
  const [trends, prompts] = await Promise.all([getTrends(loc), getPrompts(loc)]);
  const bySlug = new Map(prompts.map((p) => [p.slug, p]));
  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/trends", label: tn("trends") },
          ]}
        />
        <PageHero kicker={t("kicker")} title={t("title")} desc={t("desc")} />
        <div className="trends-grid relative z-[1]">
          {trends.map((tr, i) => (
            <article key={tr.key} className="trend spot" data-reveal="">
              <div className="meta">
                <span className="rank">#{digits(i + 1, loc)}</span>
                <span className="chip">{tt(tr.type)}</span>
                <span className="sp" />
                <span className="heat num">{formatPercent(tr.growth, loc)}</span>
              </div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "var(--f-b)" }}>
                {tr.title}
              </h2>
              <p className="muted m-0 text-sm">{tr.summary}</p>
              <Sparkline data={tr.series} id={`tp-${tr.key}`} delay={i * 0.1} />
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="dimmed">{t("growthWeek")}</dt>
                <dd className="m-0 num">{formatPercent(tr.growth, loc)}</dd>
                <dt className="dimmed">{t("score")}</dt>
                <dd className="m-0 num">{digits(tr.score, loc)}</dd>
                <dt className="dimmed">{t("regions")}</dt>
                <dd className="m-0" dir="ltr" style={{ textAlign: "start" }}>
                  {tr.regions.join(" • ")}
                </dd>
                <dt className="dimmed">{t("sources")}</dt>
                <dd className="m-0" dir="auto">
                  {tr.sources.join(" • ")}
                </dd>
              </dl>
              {tr.promptSlugs.length ? (
                <div>
                  <span className="kicker">{t("linked")}</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tr.promptSlugs.map((s) => (
                      <Link key={s} href={`/p/${s}`} className="chip lapis">
                        {bySlug.get(s)?.title ?? s}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <section className="box mt-8" data-reveal="">
          <h2 className="flex items-center gap-2">
            <ShieldCheck size={20} aria-hidden="true" style={{ color: "var(--ok)" }} />{" "}
            {t("method")}
          </h2>
          <p className="muted m-0">{t("methodText")}</p>
          <Link className="btn ghost sm self-start" href="/agents">
            {tn("agents")} ↗
          </Link>
        </section>
      </div>
    </>
  );
}

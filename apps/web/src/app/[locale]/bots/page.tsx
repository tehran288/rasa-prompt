import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BotPhones } from "@/components/site/bot-phones";
import { Crumbs } from "@/components/site/crumbs";
import { PageHero } from "@/components/site/page-hero";
import { SectionHead } from "@/components/site/section-head";
import { Sky } from "@/components/site/sky";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { digits } from "@/lib/format";
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
    path: "/bots",
    title: t("botsTitle"),
    description: t("botsDescription"),
    siteName: t("siteName"),
  });
}

export default async function BotsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tn, tm] = await Promise.all([
    getTranslations("bots"),
    getTranslations("nav"),
    getTranslations("meta"),
  ]);
  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/bots", label: tn("bots") },
          ]}
        />
        <PageHero center kicker={t("kicker")} title={t("title")} desc={t("desc")} />
        <div className="relative z-[1]">
          <BotPhones
            brand={tm("siteName")}
            tg={t.raw("chat.tg") as [string, string, string[]?][]}
            bale={t.raw("chat.bale") as [string, string, string[]?][]}
            labels={{
              tg: t("tg"),
              bale: t("bale"),
              compose: t("compose"),
              replay: t("replay"),
              openTg: t("openTg"),
              openBale: t("openBale"),
            }}
          />
        </div>
        <section className="s tight" aria-labelledby="bf-h">
          <SectionHead id="bf-h" kicker={t("kicker")} title={t("featuresTitle")} />
          <div className="feat-grid">
            {(t.raw("features") as [string, string][]).map(([h, p]) => (
              <div key={h} className="feat spot" data-reveal="">
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="s tight" aria-labelledby="bs-h">
          <SectionHead id="bs-h" kicker={t("kicker")} title={t("stepsTitle")} />
          <ol className="steps3 m-0 list-none p-0">
            {(t.raw("steps") as string[]).map((s, i) => (
              <li key={s} className="step spot" data-reveal="">
                <span className="n num">{digits(String(i + 1).padStart(2, "0"), loc)}</span>
                <p className="mt-2" style={{ color: "var(--fg)", fontSize: 16 }}>
                  {s}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

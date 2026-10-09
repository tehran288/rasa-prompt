import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crumbs } from "@/components/site/crumbs";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { type PlanCopy, PricingPlans } from "@/components/site/pricing-plans";
import { SectionHead } from "@/components/site/section-head";
import { Sky } from "@/components/site/sky";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { PLAN_PRICES } from "@/lib/plans";
import { localeUrl, pageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/pricing",
    title: t("pricingTitle"),
    description: t("pricingDescription"),
    siteName: t("siteName"),
  });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tc, tn, tm] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("common"),
    getTranslations("nav"),
    getTranslations("meta"),
  ]);
  const plans = t.raw("plans") as PlanCopy[];
  const rows = t.raw("compareRows") as string[][];
  return (
    <>
      <Sky short />
      <JsonLd
        data={plans.map((p) => ({
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${tm("siteName")} — ${p.name}`,
          description: p.features.join(" • "),
          brand: { "@type": "Brand", name: tm("siteName") },
          offers: {
            "@type": "Offer",
            price: String(PLAN_PRICES[p.code].toman * 10),
            priceCurrency: "IRR",
            url: localeUrl(locale, "/pricing"),
            availability: "https://schema.org/InStock",
          },
        }))}
      />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/pricing", label: tn("pricing") },
          ]}
        />
        <PageHero center kicker={t("kicker")} title={t("title")} desc={t("desc")} />
        <div className="relative z-[1]">
          <PricingPlans
            plans={plans}
            locale={loc}
            labels={{
              toman: tc("toman"),
              stars: tc("stars"),
              currency: t("currency"),
              featured: t("featured"),
            }}
          />
          <p className="note text-center">{t("payNote")}</p>
        </div>

        <section className="s tight" aria-labelledby="cmp-h">
          <SectionHead id="cmp-h" kicker={t("kicker")} title={t("compareTitle")} />
          <div className="tablebox" data-reveal="">
            <table className="ctable">
              <thead>
                <tr>
                  <th scope="col">{t("compareFeature")}</th>
                  <th scope="col">{t("compareFree")}</th>
                  {plans.map((p) => (
                    <th key={p.code} scope="col">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r[0]}>
                    <th scope="row" style={{ fontWeight: 500, textAlign: "start" }}>
                      {r[0]}
                    </th>
                    {r.slice(1).map((c, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                      <td
                        key={i}
                        className={i === 2 ? "hl" : undefined}
                        style={{
                          color: c === "✓" ? "var(--ok)" : c === "—" ? "var(--dim)" : undefined,
                        }}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="s tight">
          <div className="box glow-border spot" data-reveal="" style={{ padding: 28 }}>
            <h2 className="flex items-center gap-2 text-2xl">
              <ShieldCheck size={24} aria-hidden="true" style={{ color: "var(--ok)" }} />{" "}
              {t("guaranteeTitle")}
            </h2>
            <p className="muted m-0 max-w-[70ch]">{t("guaranteeText")}</p>
          </div>
        </section>

        <section className="s tight" aria-labelledby="pf-h">
          <SectionHead id="pf-h" center kicker={t("kicker")} title={t("faqTitle")} />
          <Faq items={t.raw("faqs") as [string, string][]} />
        </section>
      </div>
    </>
  );
}

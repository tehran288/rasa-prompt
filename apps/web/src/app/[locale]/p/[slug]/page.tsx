import { ArrowRight, Check, Clock, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crumbs } from "@/components/site/crumbs";
import { JsonLd } from "@/components/site/json-ld";
import { cardLabels, PromptCard } from "@/components/site/prompt-card";
import { PromptFill } from "@/components/site/prompt-fill";
import { Sky } from "@/components/site/sky";
import { TierBadge } from "@/components/site/tier-badge";
import { Link } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getCategories, getPrompt, getPrompts } from "@/lib/data";
import { digits, formatDate, formatNumber, formatVersion } from "@/lib/format";
import { slugify } from "@/lib/normalize";
import { baleBuyUrl, localeUrl, pageMetadata, telegramBuyUrl } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales)
    for (const p of await getPrompts(locale)) out.push({ locale, slug: p.slug });
  return out;
}

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getPrompt(decodeURIComponent(slug), locale as Loc);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/p/${p.slug}`,
    title: p.title,
    description: `${p.summary} • ${p.models.join(", ")}`,
    siteName: t("siteName"),
    type: "article",
  });
}

export default async function PromptPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const p = await getPrompt(decodeURIComponent(slug), loc);
  if (!p) notFound();
  const [t, tc, tt, tn, tm] = await Promise.all([
    getTranslations("prompt"),
    getTranslations("common"),
    getTranslations("types"),
    getTranslations("nav"),
    getTranslations("meta"),
  ]);
  const [all, categories] = await Promise.all([getPrompts(loc), getCategories(loc)]);
  const category = categories.find((c) => c.slug === p.category);
  const related = all
    .filter((x) => x.slug !== p.slug)
    .map((x) => ({
      x,
      w: (x.category === p.category ? 2 : 0) + (x.type === p.type ? 1 : 0) + x.popularity / 1000,
    }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map((r) => r.x);
  const labels = cardLabels(tc, tt);
  const paid = p.tier !== "free";
  const breakdown = p.breakdown
    ? (Object.entries(p.breakdown) as [keyof typeof p.breakdown, number][])
    : [];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description || p.summary,
    sku: p.id,
    category: category?.name ?? tt(p.type),
    brand: { "@type": "Brand", name: tm("siteName") },
    url: localeUrl(locale, `/p/${p.slug}`),
    inLanguage: locale,
    additionalProperty: [
      { "@type": "PropertyValue", name: "qualityScore", value: p.score },
      { "@type": "PropertyValue", name: "testedModels", value: p.models.join(", ") },
      { "@type": "PropertyValue", name: "version", value: p.version },
    ],
    offers: {
      "@type": "Offer",
      price: paid ? String((p.priceToman ?? 0) * 10) : "0",
      priceCurrency: "IRR",
      availability: "https://schema.org/InStock",
      url: localeUrl(locale, `/p/${p.slug}`),
    },
  };

  return (
    <>
      <Sky short />
      <JsonLd data={productLd} />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/prompts", label: tn("library") },
            ...(category ? [{ href: `/c/${category.slug}`, label: category.name }] : []),
            { href: `/p/${p.slug}`, label: p.title },
          ]}
        />
        <header className="phero" style={{ maxWidth: 900 }}>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={p.tier} label={tc(p.tier)} />
            <span className="chip">{tt(p.type)}</span>
            {p.testedAt ? (
              <span className="chip ok">
                <Check size={12} aria-hidden="true" />{" "}
                {tc("testedOn", { date: formatDate(p.testedAt, loc) })}
              </span>
            ) : null}
            <span className="chip">
              {tc("version")} {formatVersion(p.version, loc)}
            </span>
          </div>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {p.models.map((m) => (
              <Link key={m} href={`/m/${slugify(m)}`} className="chip lapis">
                {m}
              </Link>
            ))}
          </div>
        </header>

        <div className="pd relative z-[1]">
          <div className="flex min-w-0 flex-col gap-4">
            {p.description ? (
              <section className="box" aria-labelledby="d-h" data-reveal="">
                <h2 id="d-h">{t("description")}</h2>
                <p className="muted m-0">{p.description}</p>
              </section>
            ) : null}
            {p.example ? (
              <section className="box" aria-labelledby="e-h" data-reveal="">
                <h2 id="e-h">{t("example")}</h2>
                <div className="example">{p.example}</div>
              </section>
            ) : null}
            {!paid && p.body ? (
              <section aria-labelledby="f-h" data-reveal="">
                <h2 id="f-h" className="sr-only">
                  {t("fillTitle")}
                </h2>
                <PromptFill body={p.body} variables={p.variables} />
              </section>
            ) : (
              <section className="box" aria-labelledby="l-h" data-reveal="">
                <h2 id="l-h">{t("previewTitle")}</h2>
                <div className="locked">
                  <pre className="prompt" aria-hidden="true">
                    {`${p.preview}\n\n${p.preview}`}
                  </pre>
                  <div className="ov">
                    <div className="flex flex-col items-center gap-2">
                      <Lock size={22} aria-hidden="true" />
                      <b>{t("locked")}</b>
                      <span className="dimmed text-sm">{t("lockedHint")}</span>
                    </div>
                  </div>
                </div>
                <p className="sr-only">{p.preview}</p>
                {p.variables.length ? (
                  <div>
                    <span className="kicker">{t("variables")}</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.variables.map((v) => (
                        <span key={v.name} className="chip gold">
                          {v.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )}
            <section className="box" aria-labelledby="h-h" data-reveal="">
              <h2 id="h-h">{t("howToUse")}</h2>
              <ol className="m-0 flex flex-col gap-2 ps-5 muted">
                {(t.raw("howSteps") as string[]).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="pd-aside">
            {paid ? (
              <section className="box glow-border" aria-labelledby="b-h">
                <h2 id="b-h">{t("buyTitle")}</h2>
                <div className="num flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-black" style={{ fontFamily: "var(--f-d)" }}>
                    {formatNumber(p.priceToman ?? 0, loc)}
                  </span>
                  <span className="dimmed">{tc("toman")}</span>
                  <span className="chip gold">⭐ {t("stars", { count: p.priceStars ?? 0 })}</span>
                </div>
                <a className="btn tg" href={telegramBuyUrl(p.id)} target="_blank" rel="noopener">
                  {t("buyTg")}
                </a>
                <a className="btn bale" href={baleBuyUrl(p.id)} target="_blank" rel="noopener">
                  {t("buyBale")}
                </a>
                <span className="btn ghost" aria-disabled="true" role="link">
                  <Clock size={15} aria-hidden="true" /> {t("buyWeb")} • {t("soon")}
                </span>
                <p className="dimmed m-0 text-sm">
                  {t("orSubscribe")} —{" "}
                  <Link href="/pricing" className="underline underline-offset-4">
                    {t("seePlans")}
                  </Link>
                </p>
              </section>
            ) : null}
            <section className="box" aria-labelledby="q-h" data-io="">
              <div className="flex items-center gap-4">
                <div className="gauge" style={{ width: 92, height: 92, margin: 0 }}>
                  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="var(--line)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="var(--gold)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={2 * Math.PI * 50 * (1 - p.score / 100)}
                    />
                  </svg>
                  <div className="v">
                    <strong className="num" style={{ fontSize: 26 }}>
                      {digits(p.score, loc)}
                    </strong>
                  </div>
                </div>
                <div>
                  <h2 id="q-h">{t("quality")}</h2>
                  <p className="dimmed m-0 text-sm">{t("qualityHint")}</p>
                </div>
              </div>
              {breakdown.map(([k, v]) => (
                <div key={k} className="meter">
                  <span className="muted">{t(`breakdown.${k}`)}</span>
                  <span className="bar">
                    <i style={{ width: `${v}%` }} />
                  </span>
                  <b className="num">{digits(v, loc)}</b>
                </div>
              ))}
            </section>
            <section className="box" aria-label={t("testedOn")}>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="dimmed">{t("testedOn")}</dt>
                <dd className="m-0">{p.models.join(" • ")}</dd>
                <dt className="dimmed">{t("testedAt")}</dt>
                <dd className="m-0">{formatDate(p.testedAt, loc)}</dd>
                <dt className="dimmed">{tc("version")}</dt>
                <dd className="m-0 num">{formatVersion(p.version, loc)}</dd>
                {category ? (
                  <>
                    <dt className="dimmed">{t("category")}</dt>
                    <dd className="m-0">
                      <Link href={`/c/${category.slug}`} className="underline underline-offset-4">
                        {category.name}
                      </Link>
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="m-0 flex items-start gap-2 text-sm" style={{ color: "var(--ok)" }}>
                <ShieldCheck size={16} className="mt-1 flex-none" aria-hidden="true" />{" "}
                {t("license")}
              </p>
            </section>
          </aside>
        </div>

        {related.length ? (
          <section className="s tight" aria-labelledby="r-h">
            <div className="sh-row">
              <div className="sh">
                <h2 id="r-h">{t("related")}</h2>
              </div>
              <Link className="btn ghost sm" href="/prompts">
                {tc("viewAll")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="cards">
              {related.map((r) => (
                <PromptCard key={r.slug} p={r} locale={loc} labels={labels} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

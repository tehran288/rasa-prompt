import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgentRoom } from "@/components/site/agent-room";
import { BotPhones } from "@/components/site/bot-phones";
import { CategoryIcon } from "@/components/site/category-icon";
import { CountUp } from "@/components/site/count-up";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { MorphWord } from "@/components/site/morph-word";
import { Newsletter } from "@/components/site/newsletter";
import { type PlanCopy, PricingPlans } from "@/components/site/pricing-plans";
import { cardLabels, PromptCard } from "@/components/site/prompt-card";
import { PromptStudio, type StudioTab } from "@/components/site/prompt-studio";
import { SectionHead } from "@/components/site/section-head";
import { Sky } from "@/components/site/sky";
import { TrendCard } from "@/components/site/trend-card";
import { STUDIO } from "@/data/studio";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getCategories, getPrompt, getPrompts, getStats, getTrends } from "@/lib/data";
import { digits } from "@/lib/format";
import { localeUrl, pageMetadata } from "@/lib/site";

const MARQUEE = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Midjourney",
  "Flux",
  "DeepSeek",
  "Llama",
  "Sora",
  "Kling",
  "Veo",
  "GPT-Image",
  "n8n",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    ...pageMetadata({
      locale: locale as AppLocale,
      path: "/",
      title: t("homeTitle"),
      description: t("homeDescription"),
      siteName: t("siteName"),
    }),
    title: { absolute: t("homeTitle") },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tc, tt, tm] = await Promise.all([
    getTranslations(),
    getTranslations("common"),
    getTranslations("types"),
    getTranslations("meta"),
  ]);
  const [prompts, categories, trends, stats, hero] = await Promise.all([
    getPrompts(loc),
    getCategories(loc),
    getTrends(loc),
    getStats(loc),
    getPrompt(STUDIO[0]?.slug ?? "", loc),
  ]);

  const labels = cardLabels(tc, tt);
  const featured = [...prompts].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const titleOf = new Map(prompts.map((p) => [p.slug, p.title]));

  const tabNames = t.raw("studio.tabs") as string[];
  const tabs: StudioTab[] = STUDIO.map((s, i) => {
    const isCatalog = !s.tpl;
    return {
      slug: s.slug,
      label: tabNames[i] ?? s.slug,
      version: s.version,
      score: s.score,
      models: s.models,
      demo: s.demo,
      tpl: isCatalog ? (hero?.body ?? "") : (s.tpl?.[loc] ?? ""),
      vars: isCatalog
        ? (hero?.variables ?? []).map((v) => ({
            name: v.name,
            label: v.label,
            default: v.default,
            options: v.options,
          }))
        : s.vars.map((v) => ({
            name: v.name,
            label: v.label[loc],
            default: v.default?.[loc],
            options: v.options?.[loc],
          })),
    };
  }).filter((x) => x.tpl);

  const faqs = t.raw("faq.items") as [string, string][];
  const quotes = t.raw("testimonials.items") as [string, string, string][];
  const steps = t.raw("how.steps") as [string, string][];
  const stageNames = (t.raw("agents.stages") as { name: string }[]).map((s) => s.name);

  return (
    <>
      <Sky />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: tm("siteName"),
            url: localeUrl(locale),
            logo: `${localeUrl("en").replace(/\/en$/, "")}/icon.svg`,
            sameAs: ["https://t.me/RasaPromptBot", "https://ble.ir/RasaPromptBot"],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: tm("siteName"),
            url: localeUrl(locale),
            inLanguage: locale,
            potentialAction: {
              "@type": "SearchAction",
              target: `${localeUrl(locale, "/prompts")}?q={query}`,
              "query-input": "required name=query",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(([q, a]) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          },
        ]}
      />
      <div className="wrap">
        <div className="hero">
          <Link className="pillnote" href="/trends">
            <b>{t("hero.newBadge")}</b>
            <span>{t("hero.pill")}</span>
          </Link>
          <h1>
            {t("hero.titleA")} <span className="gtext">{t("hero.titleB")}</span>
          </h1>
          <p className="lead">{t("hero.lead")}</p>
          <div className="ctas">
            <Link className="btn primary" href="/prompts">
              <span>{t("hero.cta")}</span>
              <ArrowRight className="arrow" size={18} aria-hidden="true" />
            </Link>
            <Link className="btn ghost" href="/bots">
              {t("hero.cta2")}
            </Link>
          </div>
          <div className="stats">
            <div>
              <CountUp to={stats.prompts} locale={loc} />
              <span>{t("hero.statPrompts")}</span>
            </div>
            <div>
              <CountUp to={stats.models} locale={loc} />
              <span>{t("hero.statModels")}</span>
            </div>
            <div>
              <CountUp to={stats.avgScore} locale={loc} />
              <span>{t("hero.statScore")}</span>
            </div>
            <div>
              <CountUp to={stats.languages} locale={loc} />
              <span>{t("hero.statLangs")}</span>
            </div>
          </div>
        </div>
        <PromptStudio tabs={tabs} locale={loc} />
      </div>

      <div className="marq" aria-hidden="true">
        <div className="lbl">{t("marquee.label")}</div>
        <div className="track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: duplicated loop
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>

      <section className="s" id="why" aria-labelledby="why-h">
        <div className="wrap">
          <SectionHead
            id="why-h"
            center
            kicker={t("why.kicker")}
            title={t("why.title")}
            desc={t("why.desc")}
          />
          <div className="bento">
            <div className="tile w4 spot" data-reveal="">
              <h3>{t("why.b1t")}</h3>
              <p>{t("why.b1p")}</p>
              <div className="art bars" aria-hidden="true">
                {(
                  [
                    ["Claude", 94],
                    ["GPT", 91],
                    ["Gemini", 89],
                    ["Flux", 88],
                  ] as const
                ).map(([m, s]) => (
                  <div key={m}>
                    <b className="num" style={{ color: "var(--fg)", fontSize: 13 }}>
                      {digits(s, loc)}
                    </b>
                    <i style={{ height: (s - 70) * 4 }} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tile spot" data-reveal="">
              <h3>{t("why.b2t")}</h3>
              <p>{t("why.b2p")}</p>
              <div className="art timeline" aria-hidden="true" dir="ltr">
                {[
                  ["v1.0", "GPT-5"],
                  ["v1.2", "Claude 5"],
                  ["v1.4", "Gemini 3"],
                ].map(([v, m]) => (
                  <div key={v}>
                    <b>{v}</b>
                    <span className="d" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tile spot" data-reveal="">
              <h3>{t("why.b3t")}</h3>
              <p>{t("why.b3p")}</p>
              <MorphWord words={t.raw("why.morph") as string[]} />
            </div>
            <div className="tile spot" data-reveal="">
              <h3>{t("why.b4t")}</h3>
              <p>{t("why.b4p")}</p>
              <div className="art vform" aria-hidden="true">
                {(t.raw("why.vform") as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="tile spot" data-reveal="">
              <h3>{t("why.b5t")}</h3>
              <p>{t("why.b5p")}</p>
              <div className="art flex flex-wrap gap-2">
                <span className="chip ok">{t("why.b5c1")}</span>
                <span className="chip ok">{t("why.b5c2")}</span>
                <span className="chip ok">{t("why.b5c3")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="s" id="featured" aria-labelledby="feat-h">
        <div className="wrap">
          <div className="sh-row">
            <SectionHead
              id="feat-h"
              kicker={t("featured.kicker")}
              title={t("featured.title")}
              desc={t("featured.desc")}
            />
            <Link className="btn ghost sm" href="/prompts">
              {tc("viewAll")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="cards">
            {featured.map((p) => (
              <PromptCard key={p.slug} p={p} locale={loc} labels={labels} />
            ))}
          </div>
        </div>
      </section>

      <section className="s" id="categories" aria-labelledby="cat-h">
        <div className="wrap">
          <SectionHead
            id="cat-h"
            kicker={t("categories.kicker")}
            title={t("categories.title")}
            desc={t("categories.desc")}
          />
          <div className="cats">
            {categories.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="cat spot" data-reveal="">
                <span className="ic">
                  <CategoryIcon icon={c.icon} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <h3>{c.name}</h3>
                  <p>{c.blurb}</p>
                  <span className="n num">{tc("promptsCount", { count: c.count })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="s" id="how" aria-labelledby="how-h">
        <div className="wrap">
          <SectionHead id="how-h" center kicker={t("how.kicker")} title={t("how.title")} />
          <ol className="steps3 m-0 list-none p-0">
            {steps.map(([h, p], i) => (
              <li key={h} className="step spot" data-reveal="">
                <span className="n num">{digits(String(i + 1).padStart(2, "0"), loc)}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="s" id="trends" aria-labelledby="tr-h">
        <div className="wrap">
          <div className="sh-row">
            <SectionHead
              id="tr-h"
              kicker={t("trends.kicker")}
              title={t("trends.title")}
              desc={t("trends.desc")}
            />
            <Link className="btn ghost sm" href="/trends">
              {tc("viewAll")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="rail">
            {trends.map((tr, i) => (
              <TrendCard
                key={tr.key}
                trend={tr}
                rank={i + 1}
                locale={loc}
                growthLabel={t("trends.growthWeek")}
                linked={tr.promptSlugs
                  .slice(0, 1)
                  .map((s) => ({ slug: s, title: titleOf.get(s) ?? s }))}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="s" id="agents" aria-labelledby="ag-h">
        <div className="wrap">
          <div className="sh-row">
            <SectionHead
              id="ag-h"
              kicker={t("agents.kicker")}
              title={t("agents.title")}
              desc={t("agents.desc")}
            />
            <Link className="btn ghost sm" href="/agents">
              {tc("learnMore")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
            </Link>
          </div>
          <AgentRoom
            stages={stageNames}
            log={t.raw("agents.log") as [string, string, string][]}
            locale={loc}
            labels={{
              run: t("agents.run"),
              note: t("agents.note"),
              flow: t("agents.flow"),
              graph: t("agents.title"),
            }}
          />
        </div>
      </section>

      <section className="s" id="bots" aria-labelledby="bot-h">
        <div className="wrap">
          <SectionHead
            id="bot-h"
            center
            kicker={t("bots.kicker")}
            title={t("bots.title")}
            desc={t("bots.desc")}
          />
          <BotPhones
            brand={tm("siteName")}
            tg={t.raw("bots.chat.tg") as [string, string, string[]?][]}
            bale={t.raw("bots.chat.bale") as [string, string, string[]?][]}
            labels={{
              tg: t("bots.tg"),
              bale: t("bots.bale"),
              compose: t("bots.compose"),
              replay: t("bots.replay"),
              openTg: t("bots.openTg"),
              openBale: t("bots.openBale"),
            }}
          />
        </div>
      </section>

      <section className="s" id="pricing" aria-labelledby="pr-h">
        <div className="wrap">
          <SectionHead
            id="pr-h"
            center
            kicker={t("pricing.kicker")}
            title={t("pricing.title")}
            desc={t("pricing.desc")}
          />
          <PricingPlans
            plans={t.raw("pricing.plans") as PlanCopy[]}
            locale={loc}
            labels={{
              toman: tc("toman"),
              stars: tc("stars"),
              currency: t("pricing.currency"),
              featured: t("pricing.featured"),
            }}
          />
          <p className="note text-center">
            <Check size={13} className="inline" aria-hidden="true" /> {t("pricing.payNote")}{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              {tc("learnMore")}
            </Link>
          </p>
        </div>
      </section>

      <section className="s" id="voices" aria-labelledby="q-h">
        <div className="wrap">
          <SectionHead
            id="q-h"
            center
            kicker={t("testimonials.kicker")}
            title={t("testimonials.title")}
            desc={t("testimonials.note")}
          />
          <div className="quotes">
            {quotes.map(([q, name, role]) => (
              <figure key={name} className="quote spot" data-reveal="">
                <span className="chip gold self-start">{tc("sample")}</span>
                <blockquote>«{q}»</blockquote>
                <figcaption>
                  <span className="av" aria-hidden="true">
                    {name.slice(0, 1)}
                  </span>
                  <span>
                    <b style={{ color: "var(--fg)" }}>{name}</b>
                    <br />
                    {role}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="s" id="faq" aria-labelledby="faq-h">
        <div className="wrap">
          <SectionHead id="faq-h" center kicker={t("faq.kicker")} title={t("faq.title")} />
          <Faq items={faqs} />
        </div>
      </section>

      <section className="s" aria-label={t("newsletter.title")}>
        <div className="wrap">
          <Newsletter />
        </div>
      </section>

      <div className="wrap">
        <div className="final" data-reveal="">
          <span className="kicker">{t("final.kicker")}</span>
          <h2>
            {t("final.titleA")} <span className="gtext">{t("final.titleB")}</span>{" "}
            {t("final.titleC")}
          </h2>
          <div className="ctas">
            <Link className="btn primary" href="/prompts">
              <span>{t("hero.cta")}</span>
              <ArrowRight className="arrow" size={18} aria-hidden="true" />
            </Link>
            <Link className="btn ghost" href="/bots">
              {t("hero.cta2")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

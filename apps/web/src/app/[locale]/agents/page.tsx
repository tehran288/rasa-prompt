import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgentRoom } from "@/components/site/agent-room";
import { Crumbs } from "@/components/site/crumbs";
import { PageHero } from "@/components/site/page-hero";
import { SectionHead } from "@/components/site/section-head";
import { Sky } from "@/components/site/sky";
import type { AppLocale } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { digits } from "@/lib/format";
import { pageMetadata } from "@/lib/site";

interface Stage {
  name: string;
  role: string;
  in: string;
  out: string;
  gate: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/agents",
    title: t("agentsTitle"),
    description: t("agentsDescription"),
    siteName: t("siteName"),
  });
}

export default async function AgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const [t, tn] = await Promise.all([getTranslations("agents"), getTranslations("nav")]);
  const stages = t.raw("stages") as Stage[];
  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: "/agents", label: tn("agents") },
          ]}
        />
        <PageHero kicker={t("kicker")} title={t("title")} desc={t("desc")} />
        <div className="relative z-[1]">
          <AgentRoom
            stages={stages.map((s) => s.name)}
            log={t.raw("log") as [string, string, string][]}
            locale={loc}
            labels={{ run: t("run"), note: t("note"), flow: t("flow"), graph: t("title") }}
          />
        </div>
        <section className="s tight" aria-labelledby="pl-h">
          <SectionHead id="pl-h" kicker={t("kicker")} title={t("pipelineTitle")} />
          <ol className="stage-list m-0 list-none p-0">
            {stages.map((s, i) => (
              <li key={s.name} className="stage spot" data-reveal="">
                <span className="n num">{digits(String(i + 1).padStart(2, "0"), loc)}</span>
                <h3>{s.name}</h3>
                <p className="muted m-0 text-sm">{s.role}</p>
                <dl>
                  <dt>{t("inputs")}</dt>
                  <dd>{s.in}</dd>
                  <dt>{t("outputs")}</dt>
                  <dd>{s.out}</dd>
                  <dt>{t("gate")}</dt>
                  <dd className="gate">{s.gate}</dd>
                </dl>
              </li>
            ))}
          </ol>
        </section>
        <section className="s tight" aria-labelledby="src-h">
          <SectionHead
            id="src-h"
            kicker={t("sourcesTitle")}
            title={t("sourcesTitle")}
            desc={t("sourcesDesc")}
          />
          <div className="feat-grid">
            {(t.raw("sources") as [string, string][]).map(([h, p]) => (
              <div key={h} className="feat spot" data-reveal="">
                <h3 dir="auto">{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="s tight" aria-labelledby="lg-h">
          <SectionHead id="lg-h" kicker={t("legalTitle")} title={t("legalTitle")} />
          <div className="feat-grid">
            {(t.raw("legal") as [string, string][]).map(([h, p]) => (
              <div key={h} className="feat glow-border" data-reveal="">
                <h3 className="flex items-center gap-2">
                  <Scale size={16} aria-hidden="true" style={{ color: "var(--gold)" }} /> {h}
                </h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

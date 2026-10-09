import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { PromptCardView } from "@/lib/catalog-types";
import type { Loc } from "@/lib/format";
import { Crumbs } from "./crumbs";
import { PageHero } from "./page-hero";
import { cardLabels, PromptCard } from "./prompt-card";
import { Sky } from "./sky";

export async function Listing({
  locale,
  crumbs,
  kicker,
  title,
  desc,
  prompts,
  libraryHref,
  aside,
}: {
  locale: Loc;
  crumbs: { href: string; label: string }[];
  kicker: string;
  title: string;
  desc: string;
  prompts: PromptCardView[];
  libraryHref: string;
  aside?: ReactNode;
}) {
  const [tc, tt, tn] = await Promise.all([
    getTranslations("common"),
    getTranslations("types"),
    getTranslations("nav"),
  ]);
  const labels = cardLabels(tc, tt);
  const sorted = [...prompts].sort((a, b) => b.score - a.score);
  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs locale={locale} label={tn("main")} items={crumbs} />
        <PageHero kicker={kicker} title={title} desc={desc}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip gold num">{tc("promptsCount", { count: prompts.length })}</span>
            <Link className="chip" href={libraryHref}>
              {tn("library")} ↗
            </Link>
          </div>
        </PageHero>
        {aside}
        <div className="cards relative z-[1]">
          {sorted.map((p) => (
            <PromptCard key={p.slug} p={p} locale={locale} labels={labels} />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link className="btn ghost" href={libraryHref}>
            {tc("viewAll")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}

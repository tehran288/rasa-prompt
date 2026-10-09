import { getTranslations } from "next-intl/server";
import { Crumbs } from "./crumbs";
import { PageHero } from "./page-hero";
import { Sky } from "./sky";

export async function LegalPage({
  locale,
  path,
  titleKey,
  descKey,
  kickerKey,
  sectionsKey,
}: {
  locale: string;
  path: string;
  titleKey: string;
  descKey: string;
  kickerKey: string;
  sectionsKey: string;
}) {
  const [tm, tp, tn] = await Promise.all([
    getTranslations("meta"),
    getTranslations("pages"),
    getTranslations("nav"),
  ]);
  const sections = tp.raw(sectionsKey) as [string, string][];
  return (
    <>
      <Sky short />
      <div className="wrap">
        <Crumbs
          locale={locale}
          label={tn("main")}
          items={[
            { href: "/", label: tn("home") },
            { href: path, label: tm(titleKey) },
          ]}
        />
        <PageHero kicker={tp(kickerKey)} title={tm(titleKey)} desc={tm(descKey)} />
        <div className="prose-legal relative z-[1]">
          {sections.map(([h, p]) => (
            <section key={h} data-reveal="">
              <h2>{h}</h2>
              <p>{p}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/site/listing";
import { Link } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getModels, getPrompts } from "@/lib/data";
import { slugify } from "@/lib/normalize";
import { pageMetadata } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const out: { locale: string; model: string }[] = [];
  for (const locale of routing.locales)
    for (const m of await getModels(locale)) out.push({ locale, model: m.slug });
  return out;
}

type Params = { params: Promise<{ locale: string; model: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, model } = await params;
  const m = (await getModels(locale as Loc)).find((x) => x.slug === model);
  if (!m) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/m/${m.slug}`,
    title: t("modelTitle", { name: m.name }),
    description: t("modelDescription", { name: m.name, count: m.count }),
    siteName: t("siteName"),
  });
}

export default async function ModelPage({ params }: Params) {
  const { locale, model } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const models = await getModels(loc);
  const m = models.find((x) => x.slug === model);
  if (!m) notFound();
  const [tn, tm, tl] = await Promise.all([
    getTranslations("nav"),
    getTranslations("meta"),
    getTranslations("library"),
  ]);
  const prompts = (await getPrompts(loc)).filter((p) =>
    p.models.some((x) => slugify(x) === m.slug),
  );
  return (
    <Listing
      locale={loc}
      crumbs={[
        { href: "/", label: tn("home") },
        { href: "/prompts", label: tn("library") },
        { href: `/m/${m.slug}`, label: m.name },
      ]}
      kicker={tl("model")}
      title={tm("modelTitle", { name: m.name })}
      desc={tm("modelDescription", { name: m.name, count: m.count })}
      prompts={prompts}
      libraryHref={`/prompts?model=${m.slug}`}
      aside={
        <nav
          aria-label={tl("model")}
          className="relative z-[1] mb-6 flex flex-wrap gap-2"
          dir="ltr"
        >
          {models.map((x) => (
            <Link
              key={x.slug}
              href={`/m/${x.slug}`}
              className="chip"
              aria-current={x.slug === m.slug ? "page" : undefined}
              style={
                x.slug === m.slug ? { color: "var(--gold)", borderColor: "var(--gold)" } : undefined
              }
            >
              {x.name}
            </Link>
          ))}
        </nav>
      }
    />
  );
}

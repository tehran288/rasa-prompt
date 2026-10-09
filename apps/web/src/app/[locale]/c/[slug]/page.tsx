import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/site/category-icon";
import { Listing } from "@/components/site/listing";
import { Link } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getCategories, getPrompts } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales)
    for (const c of await getCategories(locale)) out.push({ locale, slug: c.slug });
  return out;
}

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = (await getCategories(locale as Loc)).find((x) => x.slug === slug);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/c/${c.slug}`,
    title: t("categoryTitle", { name: c.name }),
    description: t("categoryDescription", { name: c.name, count: c.count, blurb: c.blurb }),
    siteName: t("siteName"),
  });
}

export default async function CategoryPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Loc;
  const cats = await getCategories(loc);
  const c = cats.find((x) => x.slug === slug);
  if (!c) notFound();
  const [tn, tm, t] = await Promise.all([
    getTranslations("nav"),
    getTranslations("meta"),
    getTranslations("categories"),
  ]);
  const prompts = (await getPrompts(loc)).filter((p) => p.category === c.slug);
  return (
    <Listing
      locale={loc}
      crumbs={[
        { href: "/", label: tn("home") },
        { href: "/prompts", label: tn("library") },
        { href: `/c/${c.slug}`, label: c.name },
      ]}
      kicker={t("kicker")}
      title={tm("categoryTitle", { name: c.name })}
      desc={c.blurb}
      prompts={prompts}
      libraryHref={`/prompts?cat=${c.slug}`}
      aside={
        <nav aria-label={t("kicker")} className="relative z-[1] mb-6 flex flex-wrap gap-2">
          {cats.map((x) => (
            <Link
              key={x.slug}
              href={`/c/${x.slug}`}
              className="chip"
              aria-current={x.slug === c.slug ? "page" : undefined}
              style={
                x.slug === c.slug ? { color: "var(--gold)", borderColor: "var(--gold)" } : undefined
              }
            >
              <CategoryIcon icon={x.icon} size={13} /> {x.name}
            </Link>
          ))}
        </nav>
      }
    />
  );
}

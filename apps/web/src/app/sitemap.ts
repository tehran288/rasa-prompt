import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getCategories, getModels, getPrompts } from "@/lib/data";
import { localeUrl } from "@/lib/site";

const STATIC = [
  "/",
  "/prompts",
  "/trends",
  "/agents",
  "/bots",
  "/pricing",
  "/about",
  "/terms",
  "/privacy",
  "/refund",
];

function entry(
  path: string,
  priority: number,
  lastModified?: string,
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl("en", path);
  return {
    url: localeUrl(routing.defaultLocale, path),
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency: path.startsWith("/p/") ? "weekly" : "daily",
    priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [prompts, cats, models] = await Promise.all([
    getPrompts("fa"),
    getCategories("fa"),
    getModels("fa"),
  ]);
  const out: MetadataRoute.Sitemap = [];
  // One <url> per locale so every language version is discoverable, each with hreflang alternates.
  for (const l of routing.locales) {
    const add = (path: string, priority: number, lm?: string) =>
      out.push({ ...entry(path, priority, lm), url: localeUrl(l, path) });
    for (const p of STATIC) add(p, p === "/" ? 1 : 0.7);
    for (const p of prompts) add(`/p/${p.slug}`, 0.8, p.testedAt ?? undefined);
    for (const c of cats) add(`/c/${c.slug}`, 0.6);
    for (const m of models) add(`/m/${m.slug}`, 0.5);
  }
  return out;
}

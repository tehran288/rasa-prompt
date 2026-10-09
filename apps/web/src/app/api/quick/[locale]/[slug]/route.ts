import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getPrompt, getPrompts } from "@/lib/data";

// Quick-view JSON for the prompt sheet. Paid bodies are never included (data layer guarantees it).
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const p of await getPrompts(locale)) out.push({ locale, slug: p.slug });
  }
  return out;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await ctx.params;
  if (!hasLocale(routing.locales, locale))
    return Response.json({ error: "not_found" }, { status: 404 });
  const p = await getPrompt(decodeURIComponent(slug), locale as Loc);
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  const safe = { ...p, body: p.tier === "free" ? p.body : null };
  return Response.json(safe, {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
  });
}

import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import type { Loc } from "@/lib/catalog-types";
import { getCatalog } from "@/lib/data";

/** Logs zero-result library searches as demand signals for the trend agents. */
export async function POST(req: Request) {
  let body: { q?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "";
  const locale =
    typeof body.locale === "string" && hasLocale(routing.locales, body.locale) ? body.locale : "fa";
  if (q.length < 2) return Response.json({ ok: false }, { status: 422 });
  await (await getCatalog()).logSearch(q, locale as Loc);
  return Response.json({ ok: true }, { status: 202 });
}

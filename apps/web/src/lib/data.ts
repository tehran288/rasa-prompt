/**
 * Catalog data layer for the website.
 *
 * getCatalog() returns a locale-aware read API. Source selection:
 *   1. If DATABASE_URL is set AND `@rasa/db` exports createDb/createServices at runtime,
 *      we read through the shared CatalogService / IntelStore (dynamic import, try/catch).
 *   2. Otherwise (or on any DB error) we fall back to the local fixture in src/data/fixtures.ts.
 *
 * The site is fully functional on fixtures alone. Paid prompt bodies are never returned:
 * `body` is populated only for FREE prompts.
 */
import type { CatalogService, IntelStore, PromptDetail, PromptSummary } from "@rasa/shared";
import { cache } from "react";
import { FIXTURE_CATEGORIES, FIXTURE_PROMPTS, FIXTURE_TRENDS } from "@/data/fixtures";
import type {
  CategoryView,
  FixturePrompt,
  L3,
  Loc,
  ModelView,
  PromptCardView,
  PromptView,
  TrendView,
} from "./catalog-types";
import { slugify } from "./normalize";

export interface Catalog {
  source: "db" | "fixtures";
  listPrompts(locale: Loc): Promise<PromptCardView[]>;
  getPrompt(slug: string, locale: Loc): Promise<PromptView | null>;
  listCategories(locale: Loc): Promise<CategoryView[]>;
  listTrends(locale: Loc): Promise<TrendView[]>;
  listModels(locale: Loc): Promise<ModelView[]>;
  /** Records a (zero-result) search so the trend agents can pick it up as demand. */
  logSearch(query: string, locale: Loc): Promise<void>;
}

const pick = (t: L3, locale: Loc) => t[locale] || t.fa;

// ───────────────────────────── Fixture adapter ─────────────────────────────

function toCard(p: FixturePrompt, locale: Loc): PromptCardView {
  return {
    id: p.id,
    slug: p.slug,
    title: pick(p.title, locale),
    summary: pick(p.summary, locale),
    tier: p.tier,
    type: p.type,
    models: p.models,
    score: p.score,
    testedAt: p.testedAt,
    createdAt: p.createdAt,
    priceToman: p.tier === "free" ? null : p.priceToman,
    priceStars: p.tier === "free" ? null : p.priceStars,
    category: p.category,
    popularity: p.popularity,
  };
}

function toView(p: FixturePrompt, locale: Loc): PromptView {
  return {
    ...toCard(p, locale),
    description: pick(p.description, locale),
    version: p.version,
    preview: pick(p.preview, locale),
    example: pick(p.example, locale),
    // Defence in depth: never expose a body for paid tiers, even if a fixture had one.
    body: p.tier === "free" && p.body ? pick(p.body, locale) : null,
    breakdown: p.breakdown,
    variables: p.variables.map((v) => ({
      name: v.name,
      label: pick(v.label, locale),
      type: v.type,
      required: v.required,
      options: v.options ? v.options[locale] : undefined,
      default: v.default ? pick(v.default, locale) : undefined,
    })),
  };
}

function modelsFrom(cards: { models: string[] }[]): ModelView[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const c of cards) {
    for (const m of c.models) {
      const slug = slugify(m);
      const cur = counts.get(slug) ?? { name: m, count: 0 };
      cur.count += 1;
      counts.set(slug, cur);
    }
  }
  return [...counts.entries()]
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const fixtureCatalog: Catalog = {
  source: "fixtures",
  async listPrompts(locale) {
    return FIXTURE_PROMPTS.map((p) => toCard(p, locale));
  },
  async getPrompt(slug, locale) {
    const p = FIXTURE_PROMPTS.find((x) => x.slug === slug);
    return p ? toView(p, locale) : null;
  },
  async listCategories(locale) {
    return FIXTURE_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: pick(c.name, locale),
      blurb: pick(c.blurb, locale),
      icon: c.icon,
      count: FIXTURE_PROMPTS.filter((p) => p.category === c.slug).length,
    }));
  },
  async listTrends(locale) {
    return FIXTURE_TRENDS.map((t) => ({
      key: t.key,
      title: pick(t.title, locale),
      summary: pick(t.summary, locale),
      growth: t.growth,
      score: t.score,
      sources: t.sources,
      regions: t.regions,
      series: t.series,
      type: t.type,
      promptSlugs: t.promptSlugs,
    }));
  },
  async listModels() {
    return modelsFrom(FIXTURE_PROMPTS);
  },
  async logSearch(query, locale) {
    console.info(`[search] zero-result locale=${locale} q=${JSON.stringify(query.slice(0, 120))}`);
  },
};

// ───────────────────────────── Database adapter ─────────────────────────────

interface DbModule {
  createDb: (url: string, opts?: { max?: number }) => { db: unknown };
  createServices: (db: never) => { catalog: CatalogService; intel: IntelStore };
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

function summaryToCard(s: PromptSummary, rank: number): PromptCardView {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    tier: s.tier,
    type: s.outputType,
    models: s.models,
    score: s.qualityScore,
    testedAt: iso(s.lastTestedAt),
    createdAt: null,
    priceToman: s.tier === "free" ? null : s.priceToman,
    priceStars: s.tier === "free" ? null : s.priceStars,
    category: null,
    popularity: 100 - rank,
  };
}

function createDbCatalog(mod: DbModule, url: string): Catalog {
  const { db } = mod.createDb(url, { max: 3 });
  const services = mod.createServices(db as never);
  const { catalog, intel } = services;
  const cats = cache(async (locale: Loc) => catalog.listCategories(locale));

  return {
    source: "db",
    async listPrompts(locale) {
      // listTrending reads published prompts without writing a search log.
      const rows = await catalog.listTrending(locale, 100);
      return rows.map((r, i) => summaryToCard(r, i));
    },
    async getPrompt(slug, locale) {
      const d: PromptDetail | null = await catalog.getPrompt(slug, locale);
      if (!d) return null;
      const categories = await cats(locale);
      const category = categories.find((c) => d.categoryIds.includes(c.id))?.slug ?? null;
      const body = d.tier === "free" ? await catalog.getPromptBody(d.id, locale) : null;
      return {
        ...summaryToCard(d, 0),
        category,
        description: d.description,
        version: d.version,
        preview: d.preview,
        example: d.exampleOutput,
        body,
        breakdown: null,
        variables: d.variables.map((v) => ({ ...v })),
      };
    },
    async listCategories(locale) {
      const rows = await cats(locale);
      return rows.map((c) => {
        const fx = FIXTURE_CATEGORIES.find((f) => f.slug === c.slug);
        return {
          slug: c.slug,
          name: c.name,
          blurb: fx ? pick(fx.blurb, locale) : "",
          icon: fx?.icon ?? "pen",
          count: c.promptCount,
        };
      });
    },
    async listTrends(locale) {
      const topics = await intel.topTopics("published", 6);
      if (!topics.length) return fixtureCatalog.listTrends(locale);
      return topics.map((t) => ({
        key: t.key,
        title: (locale === "fa" ? t.title.fa : t.title[locale]) || t.title.fa,
        summary: t.summary,
        growth: Math.round(t.scores.velocity * 2),
        score: Math.round(t.trendScore),
        sources: [],
        regions: t.regions,
        series: [t.scores.volume, t.scores.velocity, t.scores.commercialIntent, t.trendScore].map(
          (n) => Math.max(1, Math.round(n)),
        ),
        type: t.outputType,
        promptSlugs: [],
      }));
    },
    async listModels(locale) {
      return modelsFrom(await this.listPrompts(locale));
    },
    async logSearch(query, locale) {
      // CatalogService.search writes a SearchLog row (the intel analyst reads zero-result queries).
      await catalog.search(query, locale, { pageSize: 1 });
    },
  };
}

/** Wraps a catalog so any DB failure transparently falls back to fixtures. */
function withFallback(primary: Catalog): Catalog {
  const guard =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>, fb: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      try {
        return await fn(...a);
      } catch (err) {
        console.warn("[rasa/web] catalog DB read failed, using fixtures:", (err as Error).message);
        return fb(...a);
      }
    };
  return {
    source: primary.source,
    listPrompts: guard(primary.listPrompts.bind(primary), fixtureCatalog.listPrompts),
    getPrompt: guard(primary.getPrompt.bind(primary), fixtureCatalog.getPrompt),
    listCategories: guard(primary.listCategories.bind(primary), fixtureCatalog.listCategories),
    listTrends: guard(primary.listTrends.bind(primary), fixtureCatalog.listTrends),
    listModels: guard(primary.listModels.bind(primary), fixtureCatalog.listModels),
    logSearch: guard(primary.logSearch.bind(primary), fixtureCatalog.logSearch),
  };
}

let catalogPromise: Promise<Catalog> | null = null;

async function resolveCatalog(): Promise<Catalog> {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.RASA_WEB_FIXTURES === "1") return fixtureCatalog;
  try {
    const mod = (await import("./db-entry")) as unknown as Partial<DbModule>;
    if (typeof mod.createDb !== "function" || typeof mod.createServices !== "function") {
      return fixtureCatalog;
    }
    return withFallback(createDbCatalog(mod as DbModule, url));
  } catch (err) {
    console.warn("[rasa/web] @rasa/db unavailable, using fixtures:", (err as Error).message);
    return fixtureCatalog;
  }
}

export function getCatalog(): Promise<Catalog> {
  catalogPromise ??= resolveCatalog();
  return catalogPromise;
}

// ───────────────────────────── Convenience helpers ─────────────────────────────

export const getPrompts = cache(async (locale: Loc) => (await getCatalog()).listPrompts(locale));
export const getPrompt = cache(async (slug: string, locale: Loc) =>
  (await getCatalog()).getPrompt(slug, locale),
);
export const getCategories = cache(async (locale: Loc) =>
  (await getCatalog()).listCategories(locale),
);
export const getTrends = cache(async (locale: Loc) => (await getCatalog()).listTrends(locale));
export const getModels = cache(async (locale: Loc) => (await getCatalog()).listModels(locale));

export async function getStats(locale: Loc) {
  const [prompts, models] = await Promise.all([getPrompts(locale), getModels(locale)]);
  const avg = prompts.length
    ? Math.round(prompts.reduce((s, p) => s + p.score, 0) / prompts.length)
    : 0;
  return { prompts: prompts.length, models: models.length, avgScore: avg, languages: 3 };
}

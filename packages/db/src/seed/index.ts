import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  bundlePrompts,
  bundles,
  categories,
  creditPacks,
  plans,
  promptCategories,
  prompts,
  promptVersions,
} from "../schema";
import { buildSearchColumns } from "../util";
import { SEED_BUNDLES, SEED_CATEGORIES, SEED_CREDIT_PACKS, SEED_PLANS } from "./catalog-meta";
import { PROMPTS_1 } from "./prompts-1";
import { PROMPTS_2 } from "./prompts-2";
import { PROMPTS_3 } from "./prompts-3";
import { PROMPTS_4 } from "./prompts-4";
import type { SeedPrompt } from "./types";

export const SEED_PROMPTS: SeedPrompt[] = [...PROMPTS_1, ...PROMPTS_2, ...PROMPTS_3, ...PROMPTS_4];
export { SEED_BUNDLES, SEED_CATEGORIES, SEED_CREDIT_PACKS, SEED_PLANS };

const DAY = 86_400_000;

/**
 * Idempotent seed: upserts categories, plans, credit packs, the starter prompts (by slug, version
 * 1.0.0) and bundles. Safe to run on every deploy; never touches users/orders.
 */
export async function seed(db: Db): Promise<{ categories: number; prompts: number }> {
  return db.transaction(async (tx) => {
    for (const [i, c] of SEED_CATEGORIES.entries()) {
      await tx
        .insert(categories)
        .values({ slug: c.slug, name: c.name, emoji: c.emoji, sort: (i + 1) * 10 })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { name: c.name, emoji: c.emoji, sort: (i + 1) * 10 },
        });
    }
    const catRows = await tx.select().from(categories);
    const catBySlug = new Map(catRows.map((c) => [c.slug, c]));

    for (const p of SEED_PLANS) {
      const values = {
        code: p.code,
        title: p.title,
        monthlyCredits: p.monthlyCredits,
        durationDays: p.durationDays,
        priceToman: p.priceToman,
        priceStars: p.priceStars,
        includesPremium: p.includesPremium,
        sort: p.sort,
      };
      const { code: _c, ...set } = values;
      await tx.insert(plans).values(values).onConflictDoUpdate({ target: plans.code, set });
    }
    for (const p of SEED_CREDIT_PACKS) {
      const { code: _c, ...set } = p;
      await tx.insert(creditPacks).values(p).onConflictDoUpdate({ target: creditPacks.code, set });
    }

    const now = Date.now();
    for (const [i, p] of SEED_PROMPTS.entries()) {
      const cats = p.categories.map((s) => {
        const c = catBySlug.get(s);
        if (!c) throw new Error(`seed: unknown category ${s} in ${p.slug}`);
        return c;
      });
      const paid = p.tier !== "free";
      if (paid && (p.priceToman == null || p.priceStars == null)) {
        throw new Error(`seed: paid prompt ${p.slug} needs prices`);
      }
      const values = {
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        description: p.description,
        body: p.body,
        variables: p.variables ?? [],
        exampleOutput: p.example ?? null,
        version: "1.0.0",
        sourceLocale: "fa" as const,
        tier: p.tier,
        outputType: p.outputType,
        models: p.models,
        qualityScore: p.quality,
        status: "published" as const,
        priceToman: paid ? (p.priceToman ?? null) : null,
        priceStars: paid ? (p.priceStars ?? null) : null,
        lastTestedAt: new Date(now - (i % 14) * DAY),
        publishedAt: new Date(now - (60 - i) * DAY),
        trendingScore: p.trending,
        source: "in_house_manual",
        license: "proprietary" as const,
        ...buildSearchColumns(
          p,
          cats.map((c) => c.name),
        ),
      };
      const { slug: _s, publishedAt: _p, ...set } = values;
      const [row] = await tx
        .insert(prompts)
        .values(values)
        .onConflictDoUpdate({ target: prompts.slug, set: { ...set, updatedAt: new Date() } })
        .returning({ id: prompts.id });
      if (!row) throw new Error(`seed: upsert failed for ${p.slug}`);
      await tx
        .insert(promptVersions)
        .values({
          promptId: row.id,
          semver: "1.0.0",
          body: p.body,
          variables: p.variables ?? [],
          changelog: { fa: "نسخه‌ی اول", ar: "الإصدار الأول", en: "Initial version" },
          createdBy: "seed",
        })
        .onConflictDoUpdate({
          target: [promptVersions.promptId, promptVersions.semver],
          set: { body: p.body, variables: p.variables ?? [] },
        });
      const catIds = cats.map((c) => c.id);
      await tx
        .delete(promptCategories)
        .where(
          and(
            eq(promptCategories.promptId, row.id),
            notInArray(promptCategories.categoryId, catIds),
          ),
        );
      await tx
        .insert(promptCategories)
        .values(catIds.map((categoryId) => ({ promptId: row.id, categoryId })))
        .onConflictDoNothing();
    }

    for (const b of SEED_BUNDLES) {
      const [row] = await tx
        .insert(bundles)
        .values({
          slug: b.slug,
          title: b.title,
          description: b.description,
          priceToman: b.priceToman,
          priceStars: b.priceStars,
        })
        .onConflictDoUpdate({
          target: bundles.slug,
          set: {
            title: b.title,
            description: b.description,
            priceToman: b.priceToman,
            priceStars: b.priceStars,
          },
        })
        .returning({ id: bundles.id });
      if (!row) throw new Error(`seed: bundle ${b.slug}`);
      const ps = await tx
        .select({ id: prompts.id })
        .from(prompts)
        .where(inArray(prompts.slug, b.prompts));
      if (ps.length !== b.prompts.length)
        throw new Error(`seed: bundle ${b.slug} has unknown prompts`);
      await tx
        .insert(bundlePrompts)
        .values(ps.map((p) => ({ bundleId: row.id, promptId: p.id })))
        .onConflictDoNothing();
    }

    const [n] = await tx.select({ n: sql<number>`count(*)::int` }).from(prompts);
    return { categories: catRows.length, prompts: n?.n ?? 0 };
  });
}

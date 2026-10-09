import type {
  CatalogService,
  Category,
  Locale,
  LocalizedText,
  Page,
  PromptDetail,
  PromptDraft,
  PromptSummary,
  SearchOptions,
} from "@rasa/shared";
import { and, asc, desc, eq, inArray, ne, type SQL, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  categories,
  intelTopics,
  promptCategories,
  prompts,
  promptVersions,
  searchLogs,
} from "../schema";
import { localeSearchColumn, matchSql, prepareQuery, rankSql } from "../search";
import {
  buildSearchColumns,
  clampPage,
  fnv1a,
  isUuid,
  loc,
  slugify,
  toDetail,
  toSummary,
} from "../util";

const published = eq(prompts.status, "published");

function filters(opts: SearchOptions | undefined): SQL[] | null {
  const out: SQL[] = [published];
  if (opts?.tier) out.push(eq(prompts.tier, opts.tier));
  if (opts?.categoryId) {
    if (!isUuid(opts.categoryId)) return null;
    out.push(
      sql`exists (select 1 from ${promptCategories} where ${promptCategories.promptId} = ${prompts.id} and ${promptCategories.categoryId} = ${opts.categoryId})`,
    );
  }
  return out;
}

function orderFor(sort: SearchOptions["sort"], rank: SQL<number> | null): SQL[] {
  switch (sort) {
    case "newest":
      return [sql`${prompts.publishedAt} desc nulls last`, desc(prompts.qualityScore)];
    case "trending":
      return [desc(prompts.trendingScore), desc(prompts.qualityScore)];
    case "quality":
      return [desc(prompts.qualityScore), desc(prompts.trendingScore)];
    default:
      return rank
        ? [desc(rank), desc(prompts.qualityScore)]
        : [desc(prompts.qualityScore), desc(prompts.trendingScore)];
  }
}

export function createCatalogService(db: Db): CatalogService {
  async function page(
    where: SQL[],
    order: SQL[],
    locale: Locale,
    opts?: SearchOptions,
  ): Promise<Page<PromptSummary>> {
    const { page, pageSize } = clampPage(opts?.page, opts?.pageSize);
    const cond = and(...where);
    const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(prompts).where(cond);
    const rows = await db
      .select()
      .from(prompts)
      .where(cond)
      .orderBy(...order, asc(prompts.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((r) => toSummary(r, locale)),
      total: countRow?.n ?? 0,
      page,
      pageSize,
    };
  }

  async function detail(row: typeof prompts.$inferSelect, locale: Locale): Promise<PromptDetail> {
    const cats = await db
      .select({ id: promptCategories.categoryId })
      .from(promptCategories)
      .where(eq(promptCategories.promptId, row.id));
    return toDetail(
      row,
      locale,
      cats.map((c) => c.id),
    );
  }

  async function findRow(idOrSlug: string) {
    const [row] = await db
      .select()
      .from(prompts)
      .where(isUuid(idOrSlug) ? eq(prompts.id, idOrSlug) : eq(prompts.slug, idOrSlug))
      .limit(1);
    return row ?? null;
  }

  return {
    async listCategories(locale) {
      const rows = await db
        .select({
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
          emoji: categories.emoji,
          // explicit qualification: drizzle renders bare column names in single-table selects
          promptCount: sql<number>`(
            select count(*)::int from prompt_categories pc
            join prompts p on p.id = pc.prompt_id
            where pc.category_id = "categories"."id" and p.status = 'published'
          )`,
        })
        .from(categories)
        .orderBy(asc(categories.sort), asc(categories.slug));
      return rows.map(
        (r): Category => ({
          id: r.id,
          slug: r.slug,
          name: loc(r.name, locale),
          emoji: r.emoji,
          promptCount: r.promptCount,
        }),
      );
    },

    async search(query, locale, opts, userId) {
      const q = prepareQuery(query);
      const where = filters(opts);
      let result: Page<PromptSummary>;
      if (!where) {
        const { page: p, pageSize } = clampPage(opts?.page, opts?.pageSize);
        result = { items: [], total: 0, page: p, pageSize };
      } else {
        let rank: SQL<number> | null = null;
        if (q.normalized) {
          where.push(matchSql(q));
          rank = rankSql(q, locale);
        }
        result = await page(where, orderFor(opts?.sort, rank), locale, opts);
      }
      await db.insert(searchLogs).values({
        userId: userId && isUuid(userId) ? userId : null,
        query: query.slice(0, 500),
        normalizedQuery: q.normalized.slice(0, 500),
        locale,
        resultsCount: result.total,
      });
      return result;
    },

    async listByCategory(categoryId, locale, opts) {
      const where = filters({ ...opts, categoryId });
      if (!where) {
        const { page: p, pageSize } = clampPage(opts?.page, opts?.pageSize);
        return { items: [], total: 0, page: p, pageSize };
      }
      return page(where, orderFor(opts?.sort ?? "quality", null), locale, opts);
    },

    async listTrending(locale, limit) {
      const rows = await db
        .select()
        .from(prompts)
        .where(published)
        .orderBy(desc(prompts.trendingScore), desc(prompts.qualityScore), asc(prompts.id))
        .limit(Math.max(1, Math.min(100, limit)));
      return rows.map((r) => toSummary(r, locale));
    },

    async getPrompt(id, locale) {
      const row = await findRow(id);
      return row ? detail(row, locale) : null;
    },

    async getPromptBody(id, locale) {
      const row = await findRow(id);
      return row ? loc(row.body, locale) : null;
    },

    async promptOfTheDay(locale, date = new Date()) {
      const rows = await db
        .select({ id: prompts.id, q: prompts.qualityScore })
        .from(prompts)
        .where(published);
      if (rows.length === 0) return null;
      const best = rows.filter((r) => r.q >= 80);
      const pool = (best.length >= 7 ? best : rows)
        .map((r) => ({ id: r.id, h: fnv1a(r.id) }))
        .sort((a, b) => a.h - b.h || a.id.localeCompare(b.id));
      const day = Math.floor(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
      );
      const pick = pool[day % pool.length];
      if (!pick) return null;
      const row = await findRow(pick.id);
      return row ? detail(row, locale) : null;
    },

    async createFromDraft(draft: PromptDraft, publish: boolean) {
      return db.transaction(async (tx) => {
        // Categories: create missing ones by slug.
        const slugs = [...new Set(draft.categorySlugs.map((s) => slugify(s)))];
        if (slugs.length > 0) {
          await tx
            .insert(categories)
            .values(
              slugs.map((s) => ({
                slug: s,
                name: { fa: s.replace(/-/g, " "), en: s.replace(/-/g, " ") },
              })),
            )
            .onConflictDoNothing({ target: categories.slug });
        }
        const cats = slugs.length
          ? await tx.select().from(categories).where(inArray(categories.slug, slugs))
          : [];

        let slug = slugify(draft.title.en || draft.title.fa || draft.topicId);
        const [taken] = await tx
          .select({ id: prompts.id })
          .from(prompts)
          .where(eq(prompts.slug, slug))
          .limit(1);
        if (taken) slug = `${slug.slice(0, 70)}-${Date.now().toString(36).slice(-6)}`;

        let trendingScore = 0;
        if (isUuid(draft.topicId)) {
          const [topic] = await tx
            .select({ s: intelTopics.trendScore })
            .from(intelTopics)
            .where(eq(intelTopics.id, draft.topicId));
          trendingScore = topic?.s ?? 0;
        }

        const variables = draft.variables.map((v) => ({
          name: v.name,
          label: v.label,
          type: v.type,
          required: v.required,
          ...(v.options ? { options: v.options } : {}),
        }));
        const example: LocalizedText | null = draft.exampleOutput
          ? { fa: draft.exampleOutput, [draft.sourceLocale]: draft.exampleOutput }
          : null;
        const free = draft.tier === "free";
        const now = new Date();
        const [row] = await tx
          .insert(prompts)
          .values({
            slug,
            title: draft.title,
            summary: draft.summary,
            description: draft.description,
            body: draft.body,
            variables,
            exampleOutput: example,
            version: "1.0.0",
            sourceLocale: draft.sourceLocale,
            tier: draft.tier,
            outputType: draft.outputType,
            models: draft.models,
            qualityScore: Math.round(draft.judge?.score ?? 0),
            status: publish ? "published" : "review",
            priceToman: free ? null : draft.suggestedPriceToman,
            priceStars: free ? null : draft.suggestedPriceStars,
            lastTestedAt: draft.judge ? now : null,
            publishedAt: publish ? now : null,
            trendingScore,
            source: "ai_pipeline",
            license: "proprietary",
            ...buildSearchColumns(
              { ...draft, models: draft.models },
              cats.map((c) => c.name),
            ),
          })
          .returning({ id: prompts.id });
        if (!row) throw new Error("insert prompt failed");
        await tx.insert(promptVersions).values({
          promptId: row.id,
          semver: "1.0.0",
          body: draft.body,
          variables,
          changelog: { fa: "نسخه‌ی اول", ar: "الإصدار الأول", en: "Initial version" },
          createdBy: "ai_pipeline",
        });
        if (cats.length > 0) {
          await tx
            .insert(promptCategories)
            .values(cats.map((c) => ({ promptId: row.id, categoryId: c.id })))
            .onConflictDoNothing();
        }
        return row.id;
      });
    },

    async coverageGap(keywords, locale) {
      const queries = keywords.map(prepareQuery).filter((q) => q.normalized.length > 0);
      if (queries.length === 0) return 100;
      const locCol = localeSearchColumn(locale);
      let covered = 0;
      for (const q of queries) {
        const [r] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(prompts)
          .where(and(published, ne(locCol, ""), matchSql(q)));
        covered += Math.min(1, (r?.n ?? 0) / 3);
      }
      return Math.round(100 * (1 - covered / queries.length));
    },
  };
}

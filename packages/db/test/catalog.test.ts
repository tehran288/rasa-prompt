import type { PromptDraft } from "@rasa/shared";
import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { schema } from "../src";
import { SEED_PROMPTS } from "../src/seed";
import { setupTestDb } from "./helpers";

let t: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  t = await setupTestDb("catalog");
}, 60_000);
afterAll(async () => {
  await t?.close();
});

describe("seed", () => {
  it("seeds ~40 prompts, 10 categories, plans and packs; is idempotent", async () => {
    expect(SEED_PROMPTS.length).toBe(40);
    const again = await (await import("../src")).seed(t.db);
    expect(again.prompts).toBe(40);
    expect(again.categories).toBe(10);
    const cats = await t.services.catalog.listCategories("fa");
    expect(cats).toHaveLength(10);
    expect(cats.every((c) => c.promptCount > 0)).toBe(true);
    const plans = await t.services.products.listPlans("en");
    expect(plans.map((p) => [p.code, p.priceToman, p.priceStars, p.monthlyCredits])).toEqual([
      ["pro_monthly", 199_000, 250, 200],
      ["pro_yearly", 1_490_000, 1_800, 250],
      ["lifetime", 3_900_000, 4_500, 300],
    ]);
    expect(await t.services.products.listCreditPacks("fa")).toHaveLength(3);
    for (const p of SEED_PROMPTS) {
      for (const l of ["fa", "ar", "en"] as const) {
        expect(p.title[l].length, `${p.slug} title.${l}`).toBeGreaterThan(3);
        expect(p.body[l].length, `${p.slug} body.${l}`).toBeGreaterThan(100);
        for (const v of p.variables ?? []) expect(p.body[l]).toContain(`{{${v.name}}}`);
      }
    }
  });
});

describe("search", () => {
  it("finds «کپشن» when typed with Arabic kaf and logs the search", async () => {
    const res = await t.services.catalog.search("كپشن", "fa");
    expect(res.total).toBeGreaterThan(0);
    expect(res.items[0]?.slug).toBe("instagram-caption-writer");
    const [log] = await t.db
      .select()
      .from(schema.searchLogs)
      .orderBy(desc(schema.searchLogs.id))
      .limit(1);
    expect(log?.query).toBe("كپشن");
    expect(log?.normalizedQuery).toBe("کپشن");
    expect(log?.resultsCount).toBe(res.total);
  });

  it("matches Arabic yeh, typos and multi-word queries", async () => {
    const r1 = await t.services.catalog.search("كپشن اينستاگرام", "fa");
    expect(r1.items.map((i) => i.slug)).toContain("instagram-caption-writer");
    const r2 = await t.services.catalog.search("instagram caption", "en");
    expect(r2.items[0]?.slug).toBe("instagram-caption-writer");
    expect(r2.items[0]?.title).toBe("Professional Instagram Caption Writer");
    const r3 = await t.services.catalog.search("كتابة تعليقات إنستغرام", "ar");
    expect(r3.items.map((i) => i.slug)).toContain("instagram-caption-writer");
  });

  it("returns zero results for nonsense and logs result count 0", async () => {
    const r = await t.services.catalog.search("zzqqxxyy", "fa");
    expect(r.total).toBe(0);
    const [log] = await t.db
      .select()
      .from(schema.searchLogs)
      .orderBy(desc(schema.searchLogs.id))
      .limit(1);
    expect(log?.resultsCount).toBe(0);
  });

  it("filters by tier and category and paginates", async () => {
    const cats = await t.services.catalog.listCategories("fa");
    const prog = cats.find((c) => c.slug === "programming");
    if (!prog) throw new Error("no programming category");
    const all = await t.services.catalog.listByCategory(prog.id, "fa", { pageSize: 2 });
    expect(all.total).toBe(prog.promptCount);
    expect(all.items).toHaveLength(2);
    const page2 = await t.services.catalog.listByCategory(prog.id, "fa", { pageSize: 2, page: 2 });
    expect(page2.items[0]?.id).not.toBe(all.items[0]?.id);
    const free = await t.services.catalog.search("", "fa", { tier: "free", pageSize: 50 });
    expect(free.items.every((i) => i.tier === "free" && i.priceToman === null)).toBe(true);
  });

  it("coverageGap uses the same matching", async () => {
    expect(await t.services.catalog.coverageGap(["كپشن"], "fa")).toBeLessThan(100);
    expect(await t.services.catalog.coverageGap(["zzqqxxyy"], "fa")).toBe(100);
    expect(await t.services.catalog.coverageGap([], "fa")).toBe(100);
  });
});

describe("prompts", () => {
  it("getPrompt returns a localized detail with preview only", async () => {
    const [row] = await t.db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.slug, "brand-voice-guide"));
    if (!row) throw new Error("missing");
    const d = await t.services.catalog.getPrompt(row.id, "ar");
    expect(d?.title).toBe("دليل متكامل لنبرة العلامة التجارية وصوتها");
    expect(d?.variables[0]?.label).toBe("اسم العلامة");
    expect(d?.categoryIds.length).toBeGreaterThan(0);
    const body = await t.services.catalog.getPromptBody(row.id, "ar");
    expect(body && d && d.preview.length < body.length).toBe(true);
    expect(await t.services.catalog.getPrompt(row.slug, "en")).not.toBeNull();
  });

  it("listTrending orders by trending score", async () => {
    const list = await t.services.catalog.listTrending("fa", 5);
    expect(list).toHaveLength(5);
    const top = [...SEED_PROMPTS].sort((a, b) => b.trending - a.trending)[0];
    expect(list[0]?.slug).toBe(top?.slug);
  });

  it("promptOfTheDay is deterministic per date and rotates", async () => {
    const d1 = new Date("2026-10-08T03:00:00Z");
    const a = await t.services.catalog.promptOfTheDay("fa", d1);
    const b = await t.services.catalog.promptOfTheDay("en", new Date("2026-10-08T22:00:00Z"));
    expect(a?.id).toBe(b?.id);
    const seen = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const p = await t.services.catalog.promptOfTheDay("fa", new Date(d1.getTime() + i * 86_400_000));
      if (p) seen.add(p.id);
      expect(p?.qualityScore).toBeGreaterThanOrEqual(80);
    }
    expect(seen.size).toBe(7);
  });

  it("createFromDraft creates prompt, version 1.0.0 and categories", async () => {
    const draft: PromptDraft = {
      topicId: "topic-x",
      sourceLocale: "fa",
      title: { fa: "پرامپت ویدیوی محصول با Sora", en: "Product Video Prompt for Sora" },
      summary: { fa: "ویدیوی کوتاه محصول", en: "Short product video" },
      description: { fa: "توضیح", en: "Description" },
      body: { fa: "برای {{product}} یک ویدیو بساز", en: "Make a video for {{product}}" },
      variables: [{ name: "product", label: { fa: "محصول" }, type: "text", required: true }],
      outputType: "video",
      models: ["Sora"],
      categorySlugs: ["video-ai", "product-photo"],
      tier: "premium",
      suggestedPriceToman: 149_000,
      suggestedPriceStars: 190,
      research: [],
      exampleOutput: null,
      judge: { score: 86, passed: true, notes: "" },
      compliance: null,
    };
    const id = await t.services.catalog.createFromDraft(draft, true);
    const d = await t.services.catalog.getPrompt(id, "fa");
    expect(d?.version).toBe("1.0.0");
    expect(d?.categoryIds).toHaveLength(2);
    expect(d?.qualityScore).toBe(86);
    const versions = await t.db
      .select()
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.promptId, id));
    expect(versions.map((v) => v.semver)).toEqual(["1.0.0"]);
    expect((await t.services.catalog.search("sora", "fa")).items.map((i) => i.id)).toContain(id);

    const id2 = await t.services.catalog.createFromDraft(draft, false);
    expect(id2).not.toBe(id);
    const [row] = await t.db.select().from(schema.prompts).where(eq(schema.prompts.id, id2));
    expect(row?.status).toBe("review");
    expect((await t.services.catalog.search("sora", "fa")).items.map((i) => i.id)).not.toContain(id2);
  });
});

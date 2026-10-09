import type { PromptDraft, TrendSignal } from "@rasa/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSessionStorage } from "../src";
import { setupTestDb, uniqueId } from "./helpers";

let t: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  t = await setupTestDb("platform", { seed: true });
}, 60_000);
afterAll(async () => {
  await t?.close();
});

const profile = (languageCode: string | null, platform: "telegram" | "bale" = "bale") => ({
  platform,
  platformUserId: uniqueId("p"),
  username: "user",
  firstName: "علی",
  languageCode,
});

describe("users", () => {
  it("creates on first sight with guessed locale, updates lastSeenAt after", async () => {
    const p = profile("ar");
    const a = await t.services.users.upsert(p);
    expect(a.created).toBe(true);
    expect(a.user.locale).toBe("ar");
    expect(a.user.referralCode).toMatch(/^[2-9A-HJKMNP-TV-Z]{8}$/);
    const b = await t.services.users.upsert({ ...p, username: "renamed", languageCode: "en" });
    expect(b.created).toBe(false);
    expect(b.user.id).toBe(a.user.id);
    expect(b.user.username).toBe("renamed");
    expect(b.user.locale).toBe("ar"); // locale is a user choice once set
    expect(b.user.lastSeenAt.getTime()).toBeGreaterThanOrEqual(a.user.lastSeenAt.getTime());
    expect((await t.services.users.getByPlatformId(p.platform, p.platformUserId))?.id).toBe(
      a.user.id,
    );
    expect((await t.services.users.getByReferralCode(a.user.referralCode))?.id).toBe(a.user.id);
    await t.services.users.setLocale(a.user.id, "en");
    expect((await t.services.users.getById(a.user.id))?.locale).toBe("en");
  });

  it("concurrent first contact creates one user", async () => {
    const p = profile("fa");
    const res = await Promise.all([1, 2, 3].map(() => t.services.users.upsert(p)));
    expect(new Set(res.map((r) => r.user.id)).size).toBe(1);
    expect(res.filter((r) => r.created)).toHaveLength(1);
  });

  it("isAdmin uses env ids per platform or the flag", async () => {
    const { user } = await t.services.users.upsert({
      ...profile("fa", "telegram"),
      platformUserId: "999",
    });
    expect(t.services.users.isAdmin(user)).toBe(true);
    expect(t.services.users.isAdmin({ ...user, platform: "bale" })).toBe(false);
    expect(t.services.users.isAdmin({ ...user, platform: "bale", isAdmin: true })).toBe(true);
  });

  it("iterateAudience yields batches, skips banned, filters segments", async () => {
    const platform = "bale" as const;
    const locale = "en" as const;
    const before = await t.services.users.count({ platform, locale });
    const created = [];
    for (let i = 0; i < 7; i++) created.push((await t.services.users.upsert(profile("en"))).user);
    expect(await t.services.users.count({ platform, locale })).toBe(before + 7);
    const banned = created[0];
    const buyer = created[1];
    if (!banned || !buyer) throw new Error("setup");
    await t.services.users.setBanned(banned.id, true);
    const o = await t.services.orders.create({
      userId: buyer.id,
      platform,
      provider: "bale_wallet",
      currency: "IRR",
      items: [{ kind: "credit_pack", refId: "x", title: "x", amount: 10 }],
    });
    await t.services.orders.markPaid(o.id, uniqueId("c"), 10);

    const batches: string[][] = [];
    for await (const batch of t.services.users.iterateAudience({ platform, locale }, 3)) {
      expect(batch.length).toBeLessThanOrEqual(3);
      batches.push(batch.map((u) => u.id));
    }
    const all = batches.flat();
    expect(all).toHaveLength(before + 6);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain(banned.id);
    expect(batches.length).toBe(Math.ceil((before + 6) / 3));

    const buyers: string[] = [];
    for await (const b of t.services.users.iterateAudience({ platform, segment: "buyers" }, 100)) {
      buyers.push(...b.map((u) => u.id));
    }
    expect(buyers).toEqual([buyer.id]);
    const non: string[] = [];
    for await (const b of t.services.users.iterateAudience(
      { platform, locale, segment: "non_buyers" },
      2,
    )) {
      non.push(...b.map((u) => u.id));
    }
    expect(non).not.toContain(buyer.id);
    expect(non).toHaveLength(before + 5);
    const subs: string[] = [];
    for await (const b of t.services.users.iterateAudience({ segment: "subscribers" }, 10)) {
      subs.push(...b.map((u) => u.id));
    }
    expect(subs).toEqual([]);
  });
});

describe("session storage", () => {
  it("reads, writes, overwrites and deletes", async () => {
    const s = createSessionStorage<{ step: string; n: number }>(t.db, "tg:");
    expect(await s.read("42")).toBeUndefined();
    await s.write("42", { step: "search", n: 1 });
    expect(await s.read("42")).toEqual({ step: "search", n: 1 });
    await s.write("42", { step: "checkout", n: 2 });
    expect(await s.read("42")).toEqual({ step: "checkout", n: 2 });
    const other = createSessionStorage(t.db, "bale:");
    expect(await other.read("42")).toBeUndefined();
    await s.delete("42");
    expect(await s.read("42")).toBeUndefined();
  });
});

describe("settings", () => {
  it("get falls back, set upserts", async () => {
    expect(await t.services.settings.get("x.y", { a: 1 })).toEqual({ a: 1 });
    await t.services.settings.set("x.y", { a: 2, list: ["فارسی"] });
    await t.services.settings.set("x.y", { a: 3, list: ["فارسی"] });
    expect(await t.services.settings.get("x.y", { a: 1 })).toEqual({ a: 3, list: ["فارسی"] });
  });
});

describe("tickets", () => {
  it("open → messages flip status → close", async () => {
    const { user } = await t.services.users.upsert(profile("fa"));
    const tk = await t.services.tickets.open(
      user.id,
      "مشکل پرداخت",
      "پرداخت کردم ولی پرامپت نیامد",
    );
    expect(tk.status).toBe("open");
    expect((await t.services.tickets.activeForUser(user.id))?.id).toBe(tk.id);
    await t.services.tickets.addMessage(tk.id, "admin", "بررسی شد، ارسال شد");
    expect((await t.services.tickets.get(tk.id))?.ticket.status).toBe("waiting_user");
    await t.services.tickets.addMessage(tk.id, "user", "ممنون");
    const full = await t.services.tickets.get(tk.id);
    expect(full?.ticket.status).toBe("waiting_admin");
    expect(full?.messages.map((m) => m.from)).toEqual(["user", "admin", "user"]);
    expect((await t.services.tickets.listOpen(100)).map((x) => x.id)).toContain(tk.id);
    await t.services.tickets.setStatus(tk.id, "closed");
    expect(await t.services.tickets.activeForUser(user.id)).toBeNull();
    await expect(t.services.tickets.addMessage(uniqueId(), "user", "x")).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("analytics", () => {
  it("dailyStats aggregates users, searches, orders and tickets", async () => {
    const { user } = await t.services.users.upsert(profile("fa"));
    await t.services.analytics.track("start", user.id, { ref: "channel" });
    await t.services.analytics.track("payment_refunded", user.id, { orderId: "o" });
    await t.services.catalog.search("كپشن", "fa", {}, user.id);
    await t.services.catalog.search("كپشن", "fa", {}, user.id);
    await t.services.catalog.search("qqqzzzxx", "fa", {}, user.id);
    const irr = await t.services.orders.create({
      userId: user.id,
      platform: "bale",
      provider: "bale_wallet",
      currency: "IRR",
      items: [{ kind: "plan", refId: "x", title: "x", amount: 1_990_000 }],
    });
    await t.services.orders.markPaid(irr.id, uniqueId("c"), 1_990_000);
    const xtr = await t.services.orders.create({
      userId: user.id,
      platform: "telegram",
      provider: "telegram_stars",
      currency: "XTR",
      items: [{ kind: "plan", refId: "x", title: "x", amount: 250 }],
    });
    await t.services.orders.markPaid(xtr.id, uniqueId("c"), 250);

    const s = await t.services.analytics.dailyStats(new Date());
    expect(s.date).toBe(new Date().toISOString().slice(0, 10));
    expect(s.newUsers).toBeGreaterThan(0);
    expect(s.activeUsers).toBeGreaterThan(0);
    expect(s.searches).toBeGreaterThanOrEqual(3);
    expect(s.zeroResultSearches).toBeGreaterThanOrEqual(1);
    expect(s.ordersPaid).toBeGreaterThanOrEqual(2);
    expect(s.revenueToman).toBeGreaterThanOrEqual(199_000);
    expect(s.revenueStars).toBeGreaterThanOrEqual(250);
    expect(s.topQueries[0]).toEqual({ query: "کپشن", count: expect.any(Number) });
    expect(s.zeroResultQueries.map((q) => q.query)).toContain("qqqzzzxx");
    const empty = await t.services.analytics.dailyStats(new Date("2001-01-01"));
    expect(empty).toMatchObject({ newUsers: 0, searches: 0, ordersPaid: 0, revenueToman: 0 });
  });
});

describe("intel store", () => {
  const sig = (externalId: string, source: TrendSignal["source"] = "reddit"): TrendSignal => ({
    source,
    externalId,
    url: `https://example.com/${externalId}`,
    title: `Signal ${externalId}`,
    snippet: "short excerpt",
    locale: "en",
    region: "GLOBAL",
    metric: 120,
    metricName: "upvotes",
    observedAt: new Date(),
    license: "unknown",
    tags: ["midjourney"],
  });

  it("saveSignals dedups by source+externalId", async () => {
    expect(await t.services.intel.saveSignals([sig("a"), sig("b"), sig("a", "github")])).toBe(3);
    expect(await t.services.intel.saveSignals([sig("a"), sig("c")])).toBe(1);
    expect(await t.services.intel.saveSignals([])).toBe(0);
    const recent = await t.services.intel.recentSignals(1, 100);
    expect(recent).toHaveLength(4);
    expect(recent[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("upserts topics by key, merges signals and keeps finished status", async () => {
    const base = {
      key: "ai-product-photography-flux",
      title: { fa: "عکاسی محصول با Flux", en: "Product photography with Flux" },
      summary: "s",
      outputType: "image" as const,
      models: ["Flux"],
      regions: ["IR" as const],
      scores: { velocity: 80, volume: 60, commercialIntent: 90, gap: 70, fit: 85 },
      trendScore: 78,
      signalIds: ["s1"],
      status: "new" as const,
    };
    const a = await t.services.intel.upsertTopic(base);
    const b = await t.services.intel.upsertTopic({ ...base, signalIds: ["s2"], trendScore: 81 });
    expect(b.id).toBe(a.id);
    expect(b.signalIds.sort()).toEqual(["s1", "s2"]);
    expect(b.firstSeenAt.getTime()).toBe(a.firstSeenAt.getTime());
    await t.services.intel.setTopicStatus(a.id, "published");
    const c = await t.services.intel.upsertTopic(base);
    expect(c.status).toBe("published");
    const d = await t.services.intel.upsertTopic({ ...base, id: a.id, status: "rejected" });
    expect(d.status).toBe("rejected");
    expect((await t.services.intel.topTopics("rejected", 5)).map((x) => x.id)).toEqual([a.id]);
  });

  it("drafts go to the review queue and resolve once", async () => {
    const draft = {
      topicId: "t1",
      sourceLocale: "fa",
      title: { fa: "عنوان" },
      summary: { fa: "خلاصه" },
      description: { fa: "توضیح" },
      body: { fa: "متن {{x}}" },
      variables: [],
      outputType: "text",
      models: ["Claude"],
      categorySlugs: [],
      tier: "pro",
      suggestedPriceToman: 79_000,
      suggestedPriceStars: 99,
      research: [],
      exampleOutput: null,
      judge: null,
      compliance: null,
    } satisfies PromptDraft;
    const id1 = await t.services.intel.saveDraft(draft, "review");
    await t.services.intel.saveDraft(draft, "rejected");
    const queue = await t.services.intel.reviewQueue(10);
    expect(queue.map((q) => q.id)).toEqual([id1]);
    expect(queue[0]?.draft.title.fa).toBe("عنوان");
    expect((await t.services.intel.resolveDraft(id1, "approve"))?.topicId).toBe("t1");
    expect(await t.services.intel.resolveDraft(id1, "reject")).toBeNull();
    expect(await t.services.intel.reviewQueue(10)).toEqual([]);
  });
});

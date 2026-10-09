import { DomainError, type OrderItem, type User } from "@rasa/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { schema } from "../src";
import { setupTestDb, uniqueId } from "./helpers";

let t: Awaited<ReturnType<typeof setupTestDb>>;
const ids: Record<string, string> = {};

beforeAll(async () => {
  t = await setupTestDb("commerce");
  const rows = await t.db.select().from(schema.prompts);
  for (const r of rows) ids[r.slug] = r.id;
  const [b] = await t.db
    .select()
    .from(schema.bundles)
    .where(eq(schema.bundles.slug, "developer-power-pack"));
  ids.bundle = b?.id ?? "";
}, 60_000);
afterAll(async () => {
  await t?.close();
});

async function newUser(referralCode?: string, languageCode = "fa"): Promise<User> {
  const { user } = await t.services.users.upsert(
    {
      platform: "telegram",
      platformUserId: uniqueId("tg"),
      username: null,
      firstName: "تست",
      languageCode,
    },
    referralCode,
  );
  return user;
}

async function paidOrder(user: User, items: OrderItem[], currency: "XTR" | "IRR" = "XTR") {
  const order = await t.services.orders.create({
    userId: user.id,
    platform: "telegram",
    provider: currency === "XTR" ? "telegram_stars" : "bale_wallet",
    currency,
    items,
  });
  const { order: paid } = await t.services.orders.markPaid(order.id, uniqueId("ch"), order.total);
  return paid;
}

const id = (slug: string) => {
  const v = ids[slug];
  if (!v) throw new Error(`no prompt ${slug}`);
  return v;
};

describe("products.quote", () => {
  it("quotes in stars and rial (toman × 10)", async () => {
    const xtr = await t.services.products.quote("prompt", id("brand-voice-guide"), "XTR", "en");
    expect(xtr).toMatchObject({ kind: "prompt", amount: 240, title: "Complete Brand Voice Guide" });
    const irr = await t.services.products.quote("plan", "pro_monthly", "IRR", "fa");
    expect(irr.amount).toBe(1_990_000);
    await expect(
      t.services.products.quote("prompt", id("instagram-caption-writer"), "XTR", "fa"),
    ).rejects.toMatchObject({ code: "invalid_state" });
  });
});

describe("entitlements", () => {
  it("free prompts are open to everyone; paid need entitlement", async () => {
    const u = await newUser();
    expect(await t.services.entitlements.canAccess(u.id, id("instagram-caption-writer"))).toBe(true);
    expect(await t.services.entitlements.canAccess(u.id, id("brand-voice-guide"))).toBe(false);
  });

  it("prompt purchase grants exactly that prompt", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("prompt", id("brand-voice-guide"), "XTR", "fa");
    const order = await paidOrder(u, [item]);
    await t.services.entitlements.grantForOrder(order);
    await t.services.entitlements.grantForOrder(order); // idempotent
    expect(await t.services.entitlements.canAccess(u.id, id("brand-voice-guide"))).toBe(true);
    expect(await t.services.entitlements.canAccess(u.id, id("seo-content-brief-pillar"))).toBe(false);
    const lib = await t.services.entitlements.library(u.id, "en");
    expect(lib.items.map((i) => i.slug)).toEqual(["brand-voice-guide"]);
    expect(await t.services.entitlements.activeSubscription(u.id)).toBeNull();
  });

  it("bundle grants its prompts", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("bundle", ids.bundle ?? "", "XTR", "fa");
    await t.services.entitlements.grantForOrder(await paidOrder(u, [item]));
    expect(await t.services.entitlements.canAccess(u.id, id("rest-api-design-spec"))).toBe(true);
    expect(await t.services.entitlements.canAccess(u.id, id("senior-code-review"))).toBe(true);
    expect(await t.services.entitlements.canAccess(u.id, id("brand-voice-guide"))).toBe(false);
    expect((await t.services.entitlements.library(u.id, "fa")).total).toBe(4);
  });

  it("monthly plan → all pro (not premium) until expiry; no credits granted", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("plan", "pro_monthly", "XTR", "fa");
    const order = await paidOrder(u, [item]);
    await t.services.entitlements.grantForOrder(order);
    expect(await t.services.entitlements.canAccess(u.id, id("senior-code-review"))).toBe(true);
    expect(await t.services.entitlements.canAccess(u.id, id("brand-voice-guide"))).toBe(false);
    const sub = await t.services.entitlements.activeSubscription(u.id);
    expect(sub?.plan.code).toBe("pro_monthly");
    const days = ((sub?.expiresAt?.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
    expect(await t.services.credits.balance(u.id)).toBe(0);

    // renewal stacks on top of the running period
    await t.services.entitlements.grantForOrder(await paidOrder(u, [item]));
    const sub2 = await t.services.entitlements.activeSubscription(u.id);
    const days2 = ((sub2?.expiresAt?.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days2).toBeGreaterThan(59.9);

    // expired entitlements no longer grant access
    await t.db
      .update(schema.entitlements)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.entitlements.userId, u.id));
    expect(await t.services.entitlements.canAccess(u.id, id("senior-code-review"))).toBe(false);
    expect(await t.services.entitlements.activeSubscription(u.id)).toBeNull();
  });

  it("yearly and lifetime include premium; lifetime never expires", async () => {
    const y = await newUser();
    await t.services.entitlements.grantForOrder(
      await paidOrder(y, [await t.services.products.quote("plan", "pro_yearly", "XTR", "fa")]),
    );
    expect(await t.services.entitlements.canAccess(y.id, id("brand-voice-guide"))).toBe(true);
    const l = await newUser();
    await t.services.entitlements.grantForOrder(
      await paidOrder(l, [await t.services.products.quote("plan", "lifetime", "IRR", "fa")], "IRR"),
    );
    expect(await t.services.entitlements.canAccess(l.id, id("n8n-telegram-lead-bot"))).toBe(true);
    const sub = await t.services.entitlements.activeSubscription(l.id);
    expect(sub?.plan.code).toBe("lifetime");
    expect(sub?.expiresAt).toBeNull();
  });

  it("credit_pack grants no entitlement and no credits (payments grants credits)", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("credit_pack", "credits_100", "XTR", "fa");
    await t.services.entitlements.grantForOrder(await paidOrder(u, [item]));
    expect(await t.services.credits.balance(u.id)).toBe(0);
    const ents = await t.db
      .select()
      .from(schema.entitlements)
      .where(eq(schema.entitlements.userId, u.id));
    expect(ents).toHaveLength(0);
  });

  it("refuses to grant for unpaid orders and revokes on refund", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("prompt", id("cosmetics-luxury-macro"), "XTR", "fa");
    const pending = await t.services.orders.create({
      userId: u.id,
      platform: "telegram",
      provider: "telegram_stars",
      currency: "XTR",
      items: [item],
    });
    await expect(t.services.entitlements.grantForOrder(pending)).rejects.toMatchObject({
      code: "invalid_state",
    });
    const { order } = await t.services.orders.markPaid(pending.id, uniqueId("ch"), pending.total);
    await t.services.entitlements.grantForOrder(order);
    expect(await t.services.entitlements.canAccess(u.id, id("cosmetics-luxury-macro"))).toBe(true);
    const refunded = await t.services.orders.markRefunded(order.id);
    expect(refunded.status).toBe("refunded");
    expect((await t.services.orders.markRefunded(order.id)).status).toBe("refunded");
    await t.services.entitlements.revokeForOrder(refunded);
    expect(await t.services.entitlements.canAccess(u.id, id("cosmetics-luxury-macro"))).toBe(false);
  });
});

describe("orders", () => {
  it("markPaid is idempotent per chargeId and checks the amount", async () => {
    const u = await newUser();
    const item = await t.services.products.quote("plan", "pro_monthly", "XTR", "fa");
    const o = await t.services.orders.create({
      userId: u.id,
      platform: "telegram",
      provider: "telegram_stars",
      currency: "XTR",
      items: [item],
    });
    expect(o.total).toBe(250);
    await expect(t.services.orders.markPaid(o.id, "charge-x", 249)).rejects.toMatchObject({
      code: "amount_mismatch",
    });
    expect((await t.services.orders.get(o.id))?.status).toBe("pending");

    const first = await t.services.orders.markPaid(o.id, `charge-${o.id}`, 250);
    expect(first.firstTime).toBe(true);
    expect(first.order.status).toBe("paid");
    expect(first.order.paidAt).toBeInstanceOf(Date);
    const second = await t.services.orders.markPaid(o.id, `charge-${o.id}`, 250);
    expect(second.firstTime).toBe(false);
    expect(second.order.id).toBe(o.id);

    const other = t.services.orders.markPaid(o.id, "another-charge", 250);
    await expect(other).rejects.toBeInstanceOf(DomainError);
    await expect(t.services.orders.markPaid(o.id, "another-charge", 250)).rejects.toMatchObject({
      code: "invalid_state",
    });
  });

  it("concurrent duplicate markPaid calls yield exactly one firstTime", async () => {
    const u = await newUser();
    const o = await t.services.orders.create({
      userId: u.id,
      platform: "bale",
      provider: "bale_wallet",
      currency: "IRR",
      items: [{ kind: "credit_pack", refId: "x", title: "x", amount: 790_000 }],
    });
    const res = await Promise.all(
      Array.from({ length: 5 }, () => t.services.orders.markPaid(o.id, `dup-${o.id}`, 790_000)),
    );
    expect(res.filter((r) => r.firstTime)).toHaveLength(1);
  });

  it("a chargeId used by another order is rejected", async () => {
    const u = await newUser();
    const mk = () =>
      t.services.orders.create({
        userId: u.id,
        platform: "telegram",
        provider: "telegram_stars",
        currency: "XTR",
        items: [{ kind: "credit_pack", refId: "x", title: "x", amount: 10 }],
      });
    const a = await mk();
    const b = await mk();
    await t.services.orders.markPaid(a.id, `shared-${a.id}`, 10);
    await expect(t.services.orders.markPaid(b.id, `shared-${a.id}`, 10)).rejects.toMatchObject({
      code: "invalid_state",
    });
  });

  it("markFulfilled: paid → fulfilled, idempotent, rejects other states", async () => {
    const u = await newUser();
    const o = await t.services.orders.create({
      userId: u.id,
      platform: "telegram",
      provider: "telegram_stars",
      currency: "XTR",
      items: [{ kind: "credit_pack", refId: "x", title: "x", amount: 5 }],
    });
    await expect(t.services.orders.markFulfilled(o.id)).rejects.toMatchObject({
      code: "invalid_state",
    });
    await t.services.orders.markPaid(o.id, `ful-${o.id}`, 5);
    expect((await t.services.orders.markFulfilled(o.id)).status).toBe("fulfilled");
    expect((await t.services.orders.markFulfilled(o.id)).status).toBe("fulfilled");
    // markPaid replay after fulfillment is still idempotent
    const replay = await t.services.orders.markPaid(o.id, `ful-${o.id}`, 5);
    expect(replay).toMatchObject({ firstTime: false, order: { status: "fulfilled" } });
    await expect(t.services.orders.markFulfilled(uniqueId())).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("listForUser returns most recent first, limited", async () => {
    const u = await newUser();
    const created: string[] = [];
    for (let i = 0; i < 3; i++) {
      const o = await t.services.orders.create({
        userId: u.id,
        platform: "telegram",
        provider: "telegram_stars",
        currency: "XTR",
        items: [{ kind: "credit_pack", refId: "x", title: `#${i}`, amount: i + 1 }],
      });
      created.push(o.id);
      await new Promise((r) => setTimeout(r, 5));
    }
    const list = await t.services.orders.listForUser(u.id, 2);
    expect(list.map((o) => o.id)).toEqual([created[2], created[1]]);
    expect(await t.services.orders.listForUser((await newUser()).id, 10)).toEqual([]);
  });

  it("expireStale and listPendingOlderThan", async () => {
    const u = await newUser();
    const o = await t.services.orders.create({
      userId: u.id,
      platform: "telegram",
      provider: "telegram_stars",
      currency: "XTR",
      items: [{ kind: "credit_pack", refId: "x", title: "x", amount: 1 }],
    });
    await t.db
      .update(schema.orders)
      .set({ createdAt: new Date(Date.now() - 2 * 3600_000) })
      .where(eq(schema.orders.id, o.id));
    expect((await t.services.orders.listPendingOlderThan(60)).map((x) => x.id)).toContain(o.id);
    expect(await t.services.orders.expireStale(60)).toBeGreaterThanOrEqual(1);
    expect((await t.services.orders.get(o.id))?.status).toBe("expired");
  });
});

describe("credits", () => {
  it("never goes negative under concurrent spends", async () => {
    const u = await newUser();
    expect(await t.services.credits.grant(u.id, 100, "bonus")).toBe(100);
    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () => t.services.credits.spend(u.id, 10, "run")),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(10);
    expect(failed).toHaveLength(5);
    for (const f of failed) {
      expect((f as PromiseRejectedResult).reason).toMatchObject({ code: "insufficient_credits" });
    }
    expect(await t.services.credits.balance(u.id)).toBe(0);
    const ledger = await t.db
      .select()
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.userId, u.id));
    expect(ledger.every((l) => l.balanceAfter >= 0)).toBe(true);
  });

  it("grants with a refId are idempotent; invalid amounts rejected", async () => {
    const u = await newUser();
    expect(await t.services.credits.grant(u.id, 200, "purchase", "order-1")).toBe(200);
    expect(await t.services.credits.grant(u.id, 200, "purchase", "order-1")).toBe(200);
    expect(await t.services.credits.spend(u.id, 5, "run", "p1")).toBe(195);
    expect(await t.services.credits.spend(u.id, 5, "run", "p1")).toBe(190);
    await expect(t.services.credits.grant(u.id, 0, "bonus")).rejects.toMatchObject({
      code: "invalid_state",
    });
    await expect(t.services.credits.spend(u.id, 1.5, "run")).rejects.toMatchObject({
      code: "invalid_state",
    });
  });
});

describe("referrals", () => {
  it("rewards both sides once, only after a paid order", async () => {
    const referrer = await newUser();
    const referred = await newUser(referrer.referralCode.toLowerCase());
    expect(referred.referredByUserId).toBe(referrer.id);

    await t.services.referrals.onFirstPurchase(referred.id); // no paid order yet
    expect(await t.services.credits.balance(referrer.id)).toBe(0);

    await paidOrder(referred, [{ kind: "credit_pack", refId: "x", title: "x", amount: 100 }]);
    await Promise.all([
      t.services.referrals.onFirstPurchase(referred.id),
      t.services.referrals.onFirstPurchase(referred.id),
    ]);
    await t.services.referrals.onFirstPurchase(referred.id);
    expect(await t.services.credits.balance(referrer.id)).toBe(50);
    expect(await t.services.credits.balance(referred.id)).toBe(50);
    expect(await t.services.referrals.stats(referrer.id)).toEqual({
      invited: 1,
      converted: 1,
      creditsEarned: 50,
    });
  });

  it("ignores unknown codes and does not re-attribute existing users", async () => {
    const u = await newUser("NOPE2345");
    expect(u.referredByUserId).toBeNull();
    const referrer = await newUser();
    const again = await t.services.users.upsert(
      {
        platform: u.platform,
        platformUserId: u.platformUserId,
        username: "x",
        firstName: null,
        languageCode: "fa",
      },
      referrer.referralCode,
    );
    expect(again.created).toBe(false);
    expect(again.user.referredByUserId).toBeNull();
  });
});

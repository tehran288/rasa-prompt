import { DomainError } from "@rasa/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPaymentService, ORDER_TTL_MINUTES } from "../src/index";
import { createFakes } from "./fakes";

const BALE_TOKEN = "WALLET-TOKEN-123";

function setup(opts: { baleToken?: string; withRefund?: boolean } = {}) {
  const clock = { now: new Date("2026-10-08T10:00:00Z") };
  const fakes = createFakes(clock);
  const refundStars = vi.fn(async (_userId: string, _chargeId: string) => {});
  const payments = createPaymentService(
    {
      BALE_WALLET_PROVIDER_TOKEN: opts.baleToken ?? BALE_TOKEN,
      WEB_BASE_URL: "https://rasa-prompt.ir/",
    },
    {
      ...fakes.services,
      ...(opts.withRefund === false ? {} : { refundStars }),
      now: () => clock.now,
    },
  );
  const advance = (minutes: number) => {
    clock.now = new Date(clock.now.getTime() + minutes * 60_000);
  };
  return { ...fakes, payments, refundStars, clock, advance };
}

describe("PaymentService — Telegram Stars", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("creates a Stars invoice, validates pre-checkout and fulfills (happy path)", async () => {
    const user = ctx.addUser("telegram", "111", { locale: "en" });
    const { order, invoice } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-2" }],
    });
    expect(order.provider).toBe("telegram_stars");
    expect(order.currency).toBe("XTR");
    expect(invoice).toMatchObject({
      currency: "XTR",
      amount: 299,
      providerToken: "",
      payload: order.id,
    });
    expect(Array.from(invoice.title).length).toBeLessThanOrEqual(32);
    expect(Array.from(invoice.description).length).toBeLessThanOrEqual(255);
    expect(ctx.state.events.map((e) => e.event)).toContain("checkout_started");

    const pre = await ctx.payments.validatePreCheckout(order.id, "XTR", 299, "111");
    expect(pre).toEqual({ ok: true });

    const res = await ctx.payments.fulfill({
      payload: order.id,
      chargeId: "tg-charge-1",
      currency: "XTR",
      totalAmount: 299,
    });
    expect(res.firstTime).toBe(true);
    expect(res.order.status).toBe("fulfilled");
    expect(ctx.state.grants).toEqual([order.id]);
    expect(ctx.state.referralCalls).toEqual([user.id]);
    expect(ctx.state.events.map((e) => e.event)).toContain("payment_succeeded");
  });

  it("grants plan monthly credits and credit pack credits", async () => {
    const user = ctx.addUser("telegram", "112");
    const { order, invoice } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [
        { kind: "plan", refId: "plan-pro-m" },
        { kind: "credit_pack", refId: "pack-100" },
      ],
    });
    expect(invoice.amount).toBe(499 + 99);
    await ctx.payments.fulfill({
      payload: order.id,
      chargeId: "c-2",
      currency: "XTR",
      totalAmount: 598,
    });
    expect(ctx.state.balances.get(user.id)).toBe(300);
  });

  it("double fulfill does not double grant", async () => {
    const user = ctx.addUser("telegram", "113");
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "credit_pack", refId: "pack-100" }],
    });
    const input = { payload: order.id, chargeId: "dup", currency: "XTR", totalAmount: 99 };
    const a = await ctx.payments.fulfill(input);
    const b = await ctx.payments.fulfill(input);
    expect(a.firstTime).toBe(true);
    expect(b.firstTime).toBe(false);
    expect(ctx.state.grants).toHaveLength(1);
    expect(ctx.state.referralCalls).toHaveLength(1);
    expect(ctx.state.balances.get(user.id)).toBe(100);
    expect(ctx.state.events.filter((e) => e.event === "payment_succeeded")).toHaveLength(1);
  });

  it("rejects wrong amount / currency at pre-checkout and at fulfill", async () => {
    const user = ctx.addUser("telegram", "114", { locale: "ar" });
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    const pre = await ctx.payments.validatePreCheckout(order.id, "XTR", 1, "114");
    expect(pre.ok).toBe(false);
    if (!pre.ok) expect(pre.error).toMatch(/[؀-ۿ]/); // Arabic text
    const pre2 = await ctx.payments.validatePreCheckout(order.id, "IRR", 99, "114");
    expect(pre2.ok).toBe(false);

    await expect(
      ctx.payments.fulfill({ payload: order.id, chargeId: "x", currency: "XTR", totalAmount: 50 }),
    ).rejects.toMatchObject({ code: "amount_mismatch" });
    expect(ctx.state.events.some((e) => e.event === "payment_failed")).toBe(true);
    expect(ctx.state.grants).toHaveLength(0);
    expect(ctx.state.ordersById.get(order.id)?.status).toBe("pending");
  });

  it("rejects a pre-checkout from a different user", async () => {
    const owner = ctx.addUser("telegram", "115", { locale: "en" });
    ctx.addUser("telegram", "999", { locale: "en" });
    const { order } = await ctx.payments.createInvoice({
      user: owner,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    const other = await ctx.payments.validatePreCheckout(order.id, "XTR", 99, "999");
    expect(other).toEqual({ ok: false, error: "This invoice does not belong to your account." });
    const unknown = await ctx.payments.validatePreCheckout(order.id, "XTR", 99, "12345");
    expect(unknown.ok).toBe(false);
  });

  it("rejects expired orders, unknown orders and already-paid orders", async () => {
    const user = ctx.addUser("telegram", "116", { locale: "en" });
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    ctx.advance(ORDER_TTL_MINUTES + 1);
    const pre = await ctx.payments.validatePreCheckout(order.id, "XTR", 99, "116");
    expect(pre).toEqual({ ok: false, error: "This invoice has expired. Please buy again." });

    const missing = await ctx.payments.validatePreCheckout("nope", "XTR", 99, "116");
    expect(missing.ok).toBe(false);

    const { order: o2 } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    await ctx.payments.fulfill({ payload: o2.id, chargeId: "c", currency: "XTR", totalAmount: 99 });
    const again = await ctx.payments.validatePreCheckout(o2.id, "XTR", 99, "116");
    expect(again.ok).toBe(false);
  });

  it("returns a generic error when validation exceeds the time budget", async () => {
    const clock = { now: new Date() };
    const fakes = createFakes(clock);
    const user = fakes.addUser("telegram", "117");
    const slowOrders = {
      ...fakes.services.orders,
      get: () => new Promise<null>((r) => setTimeout(() => r(null), 200)),
    };
    const payments = createPaymentService(
      { BALE_WALLET_PROVIDER_TOKEN: "", WEB_BASE_URL: "https://x" },
      { ...fakes.services, orders: slowOrders, preCheckoutTimeoutMs: 20 },
    );
    const res = await payments.validatePreCheckout("o", "XTR", 1, user.platformUserId);
    expect(res.ok).toBe(false);
  });

  it("rejects banned users at invoice and pre-checkout", async () => {
    const banned = ctx.addUser("telegram", "118", { isBanned: true });
    await expect(
      ctx.payments.createInvoice({
        user: banned,
        platform: "telegram",
        items: [{ kind: "prompt", refId: "p-1" }],
      }),
    ).rejects.toMatchObject({ code: "banned" });

    const user = ctx.addUser("telegram", "119");
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    await fakesBan(ctx, user.id);
    const pre = await ctx.payments.validatePreCheckout(order.id, "XTR", 99, "119");
    expect(pre.ok).toBe(false);
  });

  it("refunds Stars: calls refundStars, revokes, claws back unspent credits (never below 0)", async () => {
    const user = ctx.addUser("telegram", "120");
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "credit_pack", refId: "pack-100" }],
    });
    await ctx.payments.fulfill({
      payload: order.id,
      chargeId: "ch-r",
      currency: "XTR",
      totalAmount: 99,
    });
    await ctx.services.credits.spend(user.id, 70, "run_prompt");
    expect(ctx.state.balances.get(user.id)).toBe(30);

    const refunded = await ctx.payments.refund(order.id);
    expect(ctx.refundStars).toHaveBeenCalledWith("120", "ch-r");
    expect(refunded.status).toBe("refunded");
    expect(refunded.refundMode).toBe("automatic");
    expect(refunded.creditsClawedBack).toBe(30);
    expect(ctx.state.balances.get(user.id)).toBe(0);
    expect(ctx.state.revokes).toEqual([order.id]);

    // idempotent second call
    const again = await ctx.payments.refund(order.id);
    expect(again.status).toBe("refunded");
    expect(ctx.refundStars).toHaveBeenCalledTimes(1);
  });

  it("refuses to refund a pending order and Stars refunds without refundStars", async () => {
    const user = ctx.addUser("telegram", "121");
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    await expect(ctx.payments.refund(order.id)).rejects.toMatchObject({ code: "invalid_state" });

    const noRefund = setup({ withRefund: false });
    const u2 = noRefund.addUser("telegram", "122");
    const { order: o2 } = await noRefund.payments.createInvoice({
      user: u2,
      platform: "telegram",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    await noRefund.payments.fulfill({
      payload: o2.id,
      chargeId: "z",
      currency: "XTR",
      totalAmount: 99,
    });
    await expect(noRefund.payments.refund(o2.id)).rejects.toBeInstanceOf(DomainError);
    expect(noRefund.state.ordersById.get(o2.id)?.status).toBe("fulfilled");
  });
});

describe("PaymentService — Bale wallet", () => {
  it("creates an IRR invoice with the wallet token and fulfills (happy path)", async () => {
    const ctx = setup();
    const user = ctx.addUser("bale", "555");
    const { order, invoice } = await ctx.payments.createInvoice({
      user,
      platform: "bale",
      items: [
        { kind: "prompt", refId: "p-1" },
        { kind: "prompt", refId: "p-2" },
      ],
    });
    expect(order.provider).toBe("bale_wallet");
    expect(invoice).toMatchObject({
      currency: "IRR",
      amount: (49_000 + 149_000) * 10,
      providerToken: BALE_TOKEN,
      payload: order.id,
    });
    expect(invoice.title).toBe("خرید از رسا پرامپت");
    expect(Array.from(invoice.title).length).toBeLessThanOrEqual(32);

    expect(await ctx.payments.validatePreCheckout(order.id, "IRR", 1_980_000, "555")).toEqual({
      ok: true,
    });
    const res = await ctx.payments.fulfill({
      payload: order.id,
      chargeId: "bale-1",
      currency: "IRR",
      totalAmount: 1_980_000,
    });
    expect(res.firstTime).toBe(true);
    expect(ctx.state.grants).toEqual([order.id]);
  });

  it("a Telegram user id cannot pay a Bale order", async () => {
    const ctx = setup();
    const baleUser = ctx.addUser("bale", "777");
    ctx.addUser("telegram", "777");
    const { order } = await ctx.payments.createInvoice({
      user: baleUser,
      platform: "bale",
      items: [{ kind: "prompt", refId: "p-1" }],
    });
    // same numeric id on the bale platform = owner → ok
    expect((await ctx.payments.validatePreCheckout(order.id, "IRR", 490_000, "777")).ok).toBe(true);
    // invoice for another platform than the user's is refused
    await expect(
      ctx.payments.createInvoice({
        user: baleUser,
        platform: "telegram",
        items: [{ kind: "prompt", refId: "p-1" }],
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("refund marks refunded, revokes and returns a manual note", async () => {
    const ctx = setup();
    const user = ctx.addUser("bale", "556");
    const { order } = await ctx.payments.createInvoice({
      user,
      platform: "bale",
      items: [{ kind: "plan", refId: "plan-pro-m" }],
    });
    await ctx.payments.fulfill({
      payload: order.id,
      chargeId: "b-2",
      currency: "IRR",
      totalAmount: 1_990_000,
    });
    expect(ctx.state.balances.get(user.id)).toBe(200);
    const refunded = await ctx.payments.refund(order.id);
    expect(refunded.status).toBe("refunded");
    expect(refunded.refundMode).toBe("manual");
    expect(refunded.note).toMatch(/manual/i);
    expect(ctx.refundStars).not.toHaveBeenCalled();
    expect(ctx.state.revokes).toEqual([order.id]);
    expect(ctx.state.balances.get(user.id)).toBe(0);
  });

  it("without a wallet token: createInvoice throws invalid_state, web checkout still works", async () => {
    const ctx = setup({ baleToken: "" });
    const user = ctx.addUser("bale", "557");
    expect(ctx.payments.isAvailable("bale")).toBe(false);
    expect(ctx.payments.isAvailable("telegram")).toBe(true);
    await expect(
      ctx.payments.createInvoice({
        user,
        platform: "bale",
        items: [{ kind: "prompt", refId: "p-1" }],
      }),
    ).rejects.toMatchObject({ code: "invalid_state" });
    expect(ctx.state.ordersById.size).toBe(0);
    expect(ctx.payments.webCheckoutUrl("abc-123")).toBe("https://rasa-prompt.ir/checkout/abc-123");
  });
});

async function fakesBan(ctx: ReturnType<typeof setup>, userId: string) {
  await ctx.services.users.setBanned(userId, true);
}

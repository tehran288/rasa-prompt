import { describe, expect, it } from "vitest";
import { decodeWatermark } from "../src/watermark";
import { PAID_BODY_MARKER } from "./fakes";
import { createHarness } from "./harness";

describe("purchase flow — Telegram Stars", () => {
  it("sends an XTR invoice, validates pre-checkout and delivers on successful_payment", async () => {
    const h = createHarness("telegram");
    await h.onboard(1);
    const user = h.userOf(1);

    await h.tap("b:p:paid-agent");
    const inv = h.byMethod("sendInvoice")[0]?.payload;
    expect(inv).toBeDefined();
    expect(inv?.currency).toBe("XTR");
    expect(inv?.provider_token).toBe("");
    expect(inv?.prices).toEqual([{ label: expect.any(String), amount: 250 }]);
    expect(String(inv?.title).length).toBeLessThanOrEqual(32);
    expect(h.allOutgoing()).not.toContain(PAID_BODY_MARKER);
    const payload = String(inv?.payload);

    await h.preCheckout(payload, "XTR", 250);
    expect(h.byMethod("answerPreCheckoutQuery").at(-1)?.payload.ok).toBe(true);

    // tampered amount is rejected with a localized message
    await h.preCheckout(payload, "XTR", 1);
    const rejected = h.byMethod("answerPreCheckoutQuery").at(-1)?.payload;
    expect(rejected?.ok).toBe(false);
    expect(String(rejected?.error_message)).toContain("سفارش");

    h.reset();
    await h.successfulPayment(payload, "XTR", 250);
    const out = h.texts();
    expect(out[0]).toContain("پرداخت موفق بود");
    const delivered = out.find((t) => t.includes(PAID_BODY_MARKER)) ?? "";
    expect(delivered).not.toBe("");
    expect(decodeWatermark(delivered)).toBe(user?.id);
    expect(out.join("\n")).toContain("اشتراک Pro"); // upsell
    expect(h.state.entitlements.has(`${user?.id}:paid-agent`)).toBe(true);

    // duplicate delivery of the same update is idempotent (no second delivery)
    h.reset();
    await h.successfulPayment(payload, "XTR", 250);
    expect(h.texts()).toHaveLength(0);
  });

  it("buying a credit pack tops up the balance", async () => {
    const h = createHarness("telegram");
    await h.onboard(1);
    await h.tap("m:packs");
    await h.tap("b:k:pack-100");
    const inv = h.byMethod("sendInvoice")[0]?.payload;
    await h.successfulPayment(
      String(inv?.payload),
      "XTR",
      Number((inv?.prices as { amount: number }[] | undefined)?.[0]?.amount),
    );
    expect(h.texts().join("\n")).toContain("۱۰۰");
  });

  it("payment updates are processed even for banned users", async () => {
    const h = createHarness("telegram");
    await h.onboard(1);
    await h.tap("b:p:paid-agent");
    const payload = String(h.byMethod("sendInvoice")[0]?.payload.payload);
    const user = h.userOf(1);
    if (user) user.isBanned = true;
    await h.preCheckout(payload, "XTR", 250);
    expect(h.byMethod("answerPreCheckoutQuery").at(-1)?.payload.ok).toBe(true);
  });
});

describe("purchase flow — Bale wallet", () => {
  it("sends an IRR invoice with the wallet token and delivers after payment", async () => {
    const h = createHarness("bale");
    await h.onboard(1);
    await h.tap("p:paid-agent");
    // toman price on Bale (no Stars), plain text (no HTML parse mode)
    expect(h.lastButtons().find((b) => b.data === "b:p:paid-agent")?.text).toContain(
      "۱۴۹٬۰۰۰ تومان",
    );
    expect(
      h.calls.at(-2)?.payload.parse_mode ?? h.calls.at(-1)?.payload.parse_mode,
    ).toBeUndefined();

    await h.tap("b:p:paid-agent");
    const inv = h.byMethod("sendInvoice")[0]?.payload;
    expect(inv?.currency).toBe("IRR");
    expect(inv?.provider_token).toBe("wallet-token");
    expect(inv?.prices).toEqual([{ label: expect.any(String), amount: 1_490_000 }]);

    await h.preCheckout(String(inv?.payload), "IRR", 1_490_000);
    expect(h.byMethod("answerPreCheckoutQuery").at(-1)?.payload.ok).toBe(true);
    await h.successfulPayment(String(inv?.payload), "IRR", 1_490_000);
    expect(h.allOutgoing()).toContain(PAID_BODY_MARKER);
  });

  it("falls back to a web checkout link when the wallet is not configured", async () => {
    const h = createHarness("bale", { baleToken: "" });
    await h.onboard(1);
    await h.tap("b:p:paid-agent");
    expect(h.byMethod("sendInvoice")).toHaveLength(0);
    expect(h.lastButtons().some((b) => b.url?.startsWith("https://rasa-prompt.ir/checkout/"))).toBe(
      true,
    );
  });

  it("opens a bundle from a b_ deep link", async () => {
    const h = createHarness("bale");
    await h.onboard(1);
    await h.message("/start b_marketing");
    expect(h.lastText()).toContain("باندل مارکتینگ");
    expect(h.lastText()).toContain("۳۹۰٬۰۰۰ تومان");
    expect(h.lastButtons().map((b) => b.data)).toContain("b:b:marketing");
  });
});

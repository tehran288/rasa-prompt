import { LOCALES } from "@rasa/shared";
import { GrammyError } from "grammy";
import { describe, expect, it } from "vitest";
import { cb } from "../src/callbacks";
import { disableOnUnsupported, getCapabilities, isUnsupportedError } from "../src/capabilities";
import {
  catalogs,
  formatNumber,
  formatStars,
  formatToman,
  placeholders,
  t,
  tPlain,
} from "../src/i18n";
import { fa } from "../src/i18n/fa";
import { createServer } from "../src/server";
import { chunkText, htmlToPlain } from "../src/ui";
import {
  applyWatermark,
  decodeAllWatermarks,
  decodeWatermark,
  encodeWatermark,
  stripWatermark,
} from "../src/watermark";
import { createHarness } from "./harness";

describe("i18n", () => {
  const keys = Object.keys(fa).sort();

  it("every locale has exactly the Persian key set, non-empty, same placeholders", () => {
    for (const l of LOCALES) {
      const cat = catalogs[l] as Record<string, string>;
      expect(Object.keys(cat).sort()).toEqual(keys);
      for (const k of keys) {
        expect(cat[k]?.trim(), `${l}:${k}`).toBeTruthy();
        expect(placeholders(cat[k] ?? ""), `${l}:${k}`).toEqual(
          placeholders((fa as Record<string, string>)[k] ?? ""),
        );
      }
    }
  });

  it("Arabic copy is not a copy of Persian, and has no ZWNJ", () => {
    const ar = catalogs.ar as Record<string, string>;
    const same = keys.filter(
      (k) => ar[k] === (fa as Record<string, string>)[k] && /[آ-ی]/.test(ar[k] ?? ""),
    );
    // only trilingual / emoji-only strings may be identical
    expect(
      same.every((k) =>
        [
          "lang.pick",
          "page.indicator",
          "list.item",
          "builder.result",
          "wizard.ask",
          "inline.message",
          "tier.pro",
          "tier.premium",
        ].includes(k),
      ),
    ).toBe(true);
    expect(Object.values(ar).some((v) => v.includes("‌"))).toBe(false);
  });

  it("formats digits, toman and stars per locale", () => {
    expect(formatNumber("fa", 1234567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatNumber("ar", 49000)).toBe("٤٩٬٠٠٠");
    expect(formatNumber("en", 49000)).toBe("49,000");
    expect(formatToman("fa", 49000)).toBe("۴۹٬۰۰۰ تومان");
    expect(formatToman("ar", 149000)).toBe("١٤٩٬٠٠٠ تومان");
    expect(formatStars("en", 250)).toBe("⭐ 250");
    expect(formatStars("fa", 250)).toBe("⭐ ۲۵۰");
  });

  it("escapes params in HTML mode and not in plain mode", () => {
    expect(t("en", "search.results", { query: "<b>x</b>", total: 3 })).toContain(
      "&lt;b&gt;x&lt;/b&gt;",
    );
    expect(tPlain("en", "btn.buy", { price: "A & B" })).toBe("💳 Buy · A & B");
  });
});

describe("watermark", () => {
  it("round-trips a user id and keeps visible text identical", () => {
    const body =
      "خط اول پرامپت\nYou are an expert‌ نیم‌فاصله stays.\nخط سوم با متن طولانی‌تر برای وسط";
    const id = "0b6f6a1e-7d8c-4c1b-9a3e-2f1d4c5b6a7e";
    const marked = applyWatermark(body, id);
    expect(marked).not.toBe(body);
    expect(stripWatermark(marked)).toBe(body);
    expect(decodeWatermark(marked)).toBe(id);
    expect(decodeAllWatermarks(marked)).toEqual([id]);
    // ZWNJ in Persian text is untouched and not mistaken for a mark
    expect(decodeWatermark(body)).toBeNull();
  });

  it("survives a partial copy and rejects corrupted marks", () => {
    const id = "user-42";
    const marked = applyWatermark("line one\nline two is here\nline three", id);
    expect(decodeWatermark(marked.slice(marked.length / 2))).toBe(id);
    const mark = encodeWatermark(id);
    const flipped = mark.replace("⁡", "⁢");
    expect(decodeWatermark(`x${flipped}y`)).toBeNull();
  });
});

describe("callbacks, capabilities, rendering", () => {
  it("keeps callback data within 64 bytes for UUID ids", () => {
    const uuid = "0b6f6a1e-7d8c-4c1b-9a3e-2f1d4c5b6a7e";
    for (const d of [
      cb.prompt(uuid),
      cb.category(uuid, 999),
      cb.buy("credit_pack", uuid),
      cb.adminApprove(uuid),
    ]) {
      expect(Buffer.byteLength(d)).toBeLessThanOrEqual(64);
    }
    expect(() => cb.prompt("x".repeat(80))).toThrow();
  });

  it("has a Telegram vs Bale capability matrix and disables features on 'method not found'", () => {
    const tg = getCapabilities("telegram");
    const bale = getCapabilities("bale");
    expect([tg.inlineMode, tg.starsPayments, tg.html]).toEqual([true, true, true]);
    expect([bale.inlineMode, bale.starsPayments, bale.walletPayments, bale.html]).toEqual([
      false,
      false,
      true,
      false,
    ]);
    const err = new GrammyError(
      "x",
      { ok: false, error_code: 404, description: "Not Found: method not found" },
      "setMyCommands",
      {},
    );
    expect(isUnsupportedError(err)).toBe(true);
    expect(disableOnUnsupported(bale, "setMyCommands", err)).toBe(true);
    expect(bale.setMyCommands).toBe(false);
  });

  it("converts HTML to plain text for Bale and chunks long texts", () => {
    expect(htmlToPlain('<b>a</b> &amp; <a href="https://x.y">link</a><pre>1 &lt; 2</pre>')).toBe(
      "a & link (https://x.y)1 < 2",
    );
    const chunks = chunkText("word ".repeat(2000), 1000);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
  });
});

describe("server", () => {
  it("serves /healthz, /readyz and guards the webhook path secret", async () => {
    const h = createHarness("telegram");
    const app = createServer({
      platform: "telegram",
      secret: "s3cret",
      bot: h.bot,
      ready: async () => false,
    });
    expect((await app.request("/healthz")).status).toBe(200);
    expect((await app.request("/readyz")).status).toBe(503);
    const bad = await app.request("/webhook/telegram/wrong", { method: "POST", body: "{}" });
    expect(bad.status).toBe(404);
    const wrongPlatform = await app.request("/webhook/bale/s3cret", { method: "POST", body: "{}" });
    expect(wrongPlatform.status).toBe(404);
    const ok = await app.request("/webhook/telegram/s3cret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          date: 0,
          chat: { id: 77, type: "private", first_name: "A" },
          from: { id: 77, is_bot: false, first_name: "A", language_code: "en" },
          text: "/start",
          entities: [{ type: "bot_command", offset: 0, length: 6 }],
        },
      }),
    });
    expect(ok.status).toBe(200);
    expect(h.lastText()).toContain("Choose your language");
  });

  it("serves health without a bot (polling mode)", async () => {
    const app = createServer({ platform: "bale", secret: "" });
    const res = await app.request("/healthz");
    expect(await res.json()).toMatchObject({ ok: true, platform: "bale" });
  });
});

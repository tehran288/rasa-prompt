import { describe, expect, it } from "vitest";
import { buildQuotaKey } from "../src/handlers/builder";
import { decodeWatermark } from "../src/watermark";
import { PAID_BODY_MARKER } from "./fakes";
import { ADMIN_ID, createHarness } from "./harness";

describe("onboarding /start", () => {
  it("applies a ref_ deep link, asks for language, then shows the main menu", async () => {
    const h = createHarness();
    await h.onboard(7); // referrer
    const referrer = h.userOf(7);
    expect(referrer).toBeDefined();

    await h.message(`/start ref_${referrer?.referralCode}`, 8, { lang: "ar" });
    const newcomer = h.userOf(8);
    expect(newcomer?.referredByUserId).toBe(referrer?.id);
    // trilingual picker, keyboard with three languages
    expect(h.lastText()).toContain("Choose your language");
    expect(h.lastButtons().map((b) => b.data)).toEqual(["l:fa", "l:ar", "l:en"]);
    expect(h.state.events.some((e) => e.event === "referral_joined" && e.userId === newcomer?.id)).toBe(true);
    expect(h.state.events.some((e) => e.event === "start")).toBe(true);

    h.reset();
    await h.tap("l:ar", 8);
    expect(newcomer?.locale).toBe("ar");
    const all = h.texts().join("\n");
    expect(all).toContain("تم ضبط لغة البوت على العربية");
    expect(all).toContain("رسا برومبت");
    // reply keyboard (main menu) sent with the welcome
    const withReplyKb = h.calls.find(
      (c) => (c.payload.reply_markup as { keyboard?: unknown })?.keyboard !== undefined,
    );
    expect(JSON.stringify(withReplyKb?.payload.reply_markup)).toContain("🔎 بحث");
    // then the inline home menu
    expect(h.lastButtons().map((b) => b.data)).toContain("m:build");
  });

  it("opens a prompt from a p_ deep link after the language pick", async () => {
    const h = createHarness();
    await h.message("/start p_free-caption", 3);
    h.reset();
    await h.tap("l:fa", 3);
    expect(h.lastText()).toContain("کپشن اینستاگرام فروشگاه");
  });

  it("returning users skip the picker and land on the menu", async () => {
    const h = createHarness();
    await h.onboard(4);
    await h.message("/start", 4);
    expect(h.texts().join("\n")).toContain("خوش برگشتید");
    expect(h.lastButtons().map((b) => b.data)).toContain("m:search");
  });
});

describe("search & browsing", () => {
  it("paginates search results with compact callback data", async () => {
    const h = createHarness();
    await h.onboard(1);
    h.ai.conciergeResult = { intent: "search", query: "ایمیل پیگیری", locale: "fa", reply: null };
    await h.message("دنبال ایمیل پیگیری مشتری هستم");
    let text = h.lastText();
    expect(text).toContain("۱۲ پرامپت"); // Persian digits
    expect(text).toContain("🆓 رایگان");
    expect(text).toContain("ChatGPT");
    let buttons = h.lastButtons();
    expect(buttons.filter((b) => b.data?.startsWith("p:"))).toHaveLength(5);
    expect(buttons.map((b) => b.data)).toContain("s:2");
    expect(buttons.map((b) => b.data)).toContain("m:home");

    await h.tap("s:3");
    text = h.lastText();
    expect(h.byMethod("editMessageText").length).toBeGreaterThan(0);
    buttons = h.lastButtons();
    expect(buttons.filter((b) => b.data?.startsWith("p:"))).toHaveLength(2);
    expect(buttons.map((b) => b.data)).toContain("s:2");
    expect(buttons.map((b) => b.data)).not.toContain("s:4");
    for (const c of h.calls) {
      const kb = (c.payload.reply_markup as { inline_keyboard?: { callback_data?: string }[][] })
        ?.inline_keyboard;
      for (const b of kb?.flat() ?? []) {
        if (b.callback_data) expect(Buffer.byteLength(b.callback_data)).toBeLessThanOrEqual(64);
      }
    }
    expect(h.state.events.filter((e) => e.event === "search")).toHaveLength(1);
  });

  it("falls back to plain search when the AI concierge is down", async () => {
    const h = createHarness();
    await h.onboard(1);
    h.ai.conciergeResult = new Error("AI down");
    await h.message("کپشن");
    expect(h.state.searches).toContain("کپشن");
    expect(h.lastText()).toContain("کپشن اینستاگرام فروشگاه");
  });

  it("reports zero results and offers the AI builder", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("m:search");
    await h.message("چیزی که وجود ندارد");
    expect(h.lastText()).toContain("هنوز پرامپتی نداریم");
    expect(h.lastButtons().map((b) => b.data)).toContain("m:build");
    expect(h.state.events.some((e) => e.event === "search_zero_results")).toBe(true);
  });

  it("browses categories and trending with Back/Home everywhere", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("m:cats");
    expect(h.lastButtons().map((b) => b.data)).toContain("c:cat-email:1");
    await h.tap("c:cat-email:1");
    expect(h.lastText()).toContain("ایمیل");
    expect(h.lastButtons().map((b) => b.data)).toEqual(expect.arrayContaining(["c:cat-email:2", "cs:1", "m:home"]));
    await h.tap("m:trend");
    expect(h.lastButtons().map((b) => b.data)).toEqual(expect.arrayContaining(["tr:2", "m:home"]));
  });
});

describe("prompt card & access control", () => {
  it("shows a free prompt's full body as a copyable block", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("p:free-caption");
    const card = h.lastText();
    expect(card).toContain("✓ تست‌شده");
    expect(card).toContain("۸۷");
    expect(h.lastButtons().map((b) => b.data)).toEqual(
      expect.arrayContaining(["pf:free-caption", "w:free-caption", "r:free-caption", "m:home"]),
    );
    await h.tap("pf:free-caption");
    expect(h.lastText()).toContain("<pre>یک کپشن جذاب برای {{product}}");
    expect(h.state.events.some((e) => e.event === "copy_prompt")).toBe(true);
  });

  it("never sends a paid body to a user without entitlement", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("p:paid-agent");
    expect(h.lastText()).toContain("🔒");
    const data = h.lastButtons().map((b) => b.data);
    expect(data).toContain("b:p:paid-agent");
    expect(data).not.toContain("pf:paid-agent");
    expect(h.lastButtons().find((b) => b.data === "b:p:paid-agent")?.text).toContain("⭐ ۲۵۰");
    // try every door anyway
    await h.tap("pf:paid-agent");
    await h.tap("w:paid-agent");
    await h.tap("r:paid-agent");
    await h.inline("ایجنت");
    expect(h.allOutgoing()).not.toContain(PAID_BODY_MARKER);
    expect(h.allOutgoing()).not.toContain("senior sales strategist");
  });

  it("delivers the watermarked body to an entitled user", async () => {
    const h = createHarness();
    await h.onboard(1);
    const user = h.userOf(1);
    h.state.entitlements.add(`${user?.id}:paid-agent`);
    await h.tap("pf:paid-agent");
    const delivered = h.texts().find((t) => t.includes(PAID_BODY_MARKER)) ?? "";
    expect(delivered).not.toBe("");
    expect(decodeWatermark(delivered)).toBe(user?.id);
    expect(h.texts().join("\n")).toContain("مخصوص حساب شماست");
  });
});

describe("variables wizard", () => {
  it("asks each variable (text, select default, number) and outputs the final prompt", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("w:free-caption");
    expect(h.lastText()).toContain("نام محصول");
    await h.message("کفش ورزشی");
    expect(h.lastText()).toContain("لحن");
    expect(h.lastButtons().map((b) => b.data)).toEqual(expect.arrayContaining(["wo:0", "wo:1", "ws"]));
    await h.tap("wo:0");
    expect(h.lastText()).toContain("تعداد هشتگ");
    await h.message("پنج");
    expect(h.lastText()).toContain("عدد");
    await h.message("۵");
    const out = h.texts().join("\n");
    expect(out).toContain("یک کپشن جذاب برای کفش ورزشی با لحن رسمی بنویس. تعداد هشتگ: 5");
    expect(h.lastButtons().map((b) => b.data)).toContain("rs");
    expect(h.state.events.some((e) => e.event === "fill_variables")).toBe(true);
  });

  it("runs the filled prompt with AI, spending credits", async () => {
    const h = createHarness();
    await h.onboard(1);
    const user = h.userOf(1);
    h.state.credits.set(user?.id ?? "", 10);
    await h.tap("w:free-caption");
    await h.message("کفش");
    await h.tap("ws");
    await h.message("3");
    await h.tap("rs");
    expect(h.texts().join("\n")).toContain("AI-RUN-OUTPUT");
    expect(h.state.credits.get(user?.id ?? "")).toBe(8);
  });

  it("refunds credits when the AI run fails", async () => {
    const h = createHarness();
    await h.onboard(1);
    const user = h.userOf(1);
    h.state.credits.set(user?.id ?? "", 10);
    h.ai.runError = Object.assign(new Error("refused"), { code: "refusal" });
    await h.tap("r:email-1");
    expect(h.state.credits.get(user?.id ?? "")).toBe(10);
    expect(h.lastText()).toContain("اعتباری از شما کسر نشد");
  });
});

describe("AI prompt builder", () => {
  it("uses the free daily quota, then credits, then asks to top up", async () => {
    const h = createHarness(); // FREE_AI_BUILDS_PER_DAY=2
    await h.onboard(1);
    const user = h.userOf(1);
    await h.tap("m:build");
    expect(h.lastText()).toContain("۲ از ۲");
    await h.message("برنامه غذایی هفتگی برای ورزشکار");
    await h.message("ایمیل خوش‌آمدگویی به مشتری جدید");
    expect(h.ai.calls.filter((c) => c.method === "buildPrompt")).toHaveLength(2);
    expect(h.state.settings.get(buildQuotaKey(user?.id ?? "", new Date()))).toBe(2);
    expect(h.texts().join("\n")).toContain("پرامپت ساخته‌شده");

    // quota used up and no credits → insufficient
    await h.message("سومین ایده برای تست سهمیه");
    expect(h.lastText()).toContain("اعتبار کافی ندارید");
    expect(h.ai.calls.filter((c) => c.method === "buildPrompt")).toHaveLength(2);

    // with credits → charged
    h.state.credits.set(user?.id ?? "", 5);
    await h.message("سومین ایده برای تست سهمیه");
    expect(h.ai.calls.filter((c) => c.method === "buildPrompt")).toHaveLength(3);
    expect(h.state.credits.get(user?.id ?? "")).toBe(3);
  });

  it("moderates before building and does not consume quota on blocked ideas", async () => {
    const h = createHarness();
    await h.onboard(1);
    h.ai.moderationAllowed = false;
    await h.tap("m:build");
    await h.message("یک درخواست نامناسب و ممنوع");
    expect(h.lastText()).toContain("سیاست محتوای");
    expect(h.ai.calls.some((c) => c.method === "buildPrompt")).toBe(false);
    expect([...h.state.settings.keys()]).toHaveLength(0);
  });
});

describe("account, referral", () => {
  it("shows a platform-aware referral deep link", async () => {
    const h = createHarness("bale");
    await h.onboard(5);
    await h.tap("m:ref", 5);
    expect(h.lastText()).toContain("https://ble.ir/RasaPromptBot?start=ref_R5");
    const t = createHarness("telegram");
    await t.onboard(5);
    await t.tap("m:ref", 5);
    expect(t.lastText()).toContain("https://t.me/RasaPromptBot?start=ref_R5");
    expect(t.lastButtons().some((b) => b.url?.startsWith("https://t.me/share/url"))).toBe(true);
  });

  it("shows plans with buy buttons and balance", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.tap("m:acct");
    expect(h.lastText()).toContain("موجودی اعتبار");
    await h.tap("m:plans");
    expect(h.lastButtons().map((b) => b.data)).toContain("b:l:plan-monthly");
  });
});

describe("admin", () => {
  it("rejects admin commands for normal users", async () => {
    const h = createHarness();
    await h.onboard(1);
    for (const cmd of ["/admin", "/stats", "/broadcast", "/review", "/ban 2", "/tickets", "/reply x y"]) {
      h.reset();
      await h.message(cmd, 1);
      expect(h.lastText()).toContain("فقط برای مدیران");
    }
    h.reset();
    await h.tap("a:st", 1);
    expect(h.byMethod("answerCallbackQuery")[0]?.payload.show_alert).toBe(true);
    expect(h.broadcasts).toHaveLength(0);
  });

  it("lets an admin see stats, broadcast via the queue, review drafts and ban", async () => {
    const h = createHarness();
    await h.onboard(ADMIN_ID);
    await h.message("/admin", ADMIN_ID);
    expect(h.lastText()).toContain("پنل مدیریت");
    await h.message("/stats", ADMIN_ID);
    expect(h.lastText()).toContain("۱۴۹٬۰۰۰ تومان");

    await h.message("/broadcast", ADMIN_ID);
    await h.tap("bc:s:buyers", ADMIN_ID);
    await h.tap("bc:l:fa", ADMIN_ID);
    await h.message("<b>تخفیف</b> ویژه <script>x</script>", ADMIN_ID);
    expect(h.lastText()).toContain("پیش‌نمایش");
    expect(h.lastText()).toContain("&lt;script&gt;");
    await h.tap("bc:ok", ADMIN_ID);
    expect(h.broadcasts).toEqual([
      expect.objectContaining({ segment: "buyers", locale: "fa", platform: "telegram", html: true }),
    ]);
    expect(h.state.events.some((e) => e.event === "broadcast_sent")).toBe(true);

    h.state.reviewQueue.push({
      id: "d1",
      createdAt: new Date(),
      draft: {
        topicId: "t",
        sourceLocale: "fa",
        title: { fa: "پیش‌نویس تست" },
        summary: { fa: "خلاصه" },
        description: { fa: "" },
        body: { fa: "body" },
        variables: [],
        outputType: "text",
        models: ["Claude"],
        categorySlugs: [],
        tier: "pro",
        suggestedPriceToman: 49000,
        suggestedPriceStars: 100,
        research: [],
        exampleOutput: null,
        judge: { score: 90, passed: true, notes: "" },
        compliance: { originality: 95, licenseOk: true, policyOk: true, notes: "" },
      },
    });
    await h.message("/review", ADMIN_ID);
    expect(h.lastText()).toContain("پیش‌نویس تست");
    await h.tap("a:ap:d1", ADMIN_ID);
    expect(h.state.created).toHaveLength(1);
    expect(h.state.created[0]?.publish).toBe(true);

    await h.onboard(2);
    await h.message("/ban 2", ADMIN_ID);
    expect(h.userOf(2)?.isBanned).toBe(true);
    h.reset();
    await h.message("سلام", 2);
    expect(h.calls).toHaveLength(0); // banned users are ignored
  });

  it("refuses to broadcast when no queue is wired", async () => {
    const h = createHarness("telegram", { options: { enqueueBroadcast: undefined } });
    await h.onboard(ADMIN_ID);
    await h.message("/broadcast", ADMIN_ID);
    await h.tap("bc:s:all", ADMIN_ID);
    await h.tap("bc:l:all", ADMIN_ID);
    await h.message("سلام به همه", ADMIN_ID);
    await h.tap("bc:ok", ADMIN_ID);
    expect(h.lastText()).toContain("صف ارسال در دسترس نیست");
  });
});

describe("error boundary", () => {
  it("replies with a localized friendly error when a service throws", async () => {
    const h = createHarness();
    await h.onboard(1, "en");
    h.services.catalog.getPrompt = async () => {
      throw new Error("db down");
    };
    await h.message("/start p_x", 1);
    expect(h.lastText()).toContain("Something went wrong");
  });
});

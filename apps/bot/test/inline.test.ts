import { describe, expect, it } from "vitest";
import { getCapabilities } from "../src/capabilities";
import { PAID_BODY_MARKER } from "./fakes";
import { createHarness } from "./harness";

describe("inline mode", () => {
  it("returns articles with a deep-link button on Telegram and never leaks bodies", async () => {
    const h = createHarness("telegram");
    await h.inline("ایمیل");
    const res = h.byMethod("answerInlineQuery")[0]?.payload;
    const results = res?.results as {
      type: string;
      title: string;
      reply_markup: { inline_keyboard: { url: string }[][] };
    }[];
    expect(results).toHaveLength(12);
    expect(results[0]?.type).toBe("article");
    expect(results[0]?.reply_markup.inline_keyboard[0]?.[0]?.url).toMatch(
      /^https:\/\/t\.me\/RasaPromptBot\?start=p_email-/,
    );
    await h.inline("");
    expect(h.allOutgoing()).not.toContain(PAID_BODY_MARKER);
    expect(h.allOutgoing()).not.toContain("ایمیل پیگیری شماره"); // free bodies aren't sent inline either
  });

  it("is disabled on Bale (capability off)", async () => {
    expect(getCapabilities("bale").inlineMode).toBe(false);
    const h = createHarness("bale");
    await h.inline("ایمیل");
    expect(h.byMethod("answerInlineQuery")).toHaveLength(0);
  });
});

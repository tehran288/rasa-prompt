import type { AssistantAgents, CatalogService } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { containsPaidBody, runChannelPost } from "../src/jobs/channel-post";
import {
  apiError,
  FakeClock,
  FakeMessenger,
  logger,
  MemorySettings,
  makePrompt,
  testConfig,
} from "./fakes";

const PAID_BODY =
  "You are a world-class product photographer. Create a studio-quality photo of {{product}} on a seamless backdrop with softbox lighting from the left and a subtle reflection.";

function setup(writePost: AssistantAgents["writeChannelPost"]) {
  const clock = new FakeClock();
  const tg = new FakeMessenger("telegram", clock);
  const bale = new FakeMessenger("bale", clock);
  const settings = new MemorySettings();
  const prompt = makePrompt();
  const catalog = {
    promptOfTheDay: vi.fn(async () => prompt),
    getPromptBody: vi.fn(async () => PAID_BODY),
  } as unknown as CatalogService;
  const agents = { writeChannelPost: vi.fn(writePost) } as unknown as AssistantAgents;
  const deps = {
    config: testConfig(),
    logger,
    clock,
    messengers: { telegram: tg, bale },
    catalog,
    agents,
    settings,
  };
  return { deps, tg, bale, prompt, catalog, agents };
}

describe("channel-post", () => {
  it("posts per locale with correct deep links: HTML on Telegram, plain on Bale", async () => {
    const { deps, tg, bale, prompt, agents } = setup(
      async (_p, locale) => `<b>پست ${locale}</b> عالی`,
    );
    const posted = await runChannelPost(deps);
    expect(posted.map((p) => `${p.platform}:${p.locale}`)).toEqual([
      "telegram:fa",
      "telegram:ar",
      "bale:fa",
    ]);
    expect(agents.writeChannelPost).toHaveBeenCalledWith(prompt, "fa", "telegram");

    const tgFa = tg.to("@rasa_channel")[0];
    expect(tgFa?.opts?.html).toBe(true);
    expect(tgFa?.text).toContain(`href="https://t.me/RasaPromptBot?start=p_${prompt.id}"`);
    expect(tgFa?.opts?.buttons?.[0]?.[0]?.url).toBe(
      `https://t.me/RasaPromptBot?start=p_${prompt.id}`,
    );

    const baleFa = bale.to("@rasa_bale")[0];
    expect(baleFa?.opts?.html).toBeFalsy();
    expect(baleFa?.text).not.toMatch(/<\/?b>/);
    expect(baleFa?.text).toContain(`https://ble.ir/rasa_prompt_bot?start=p_${prompt.id}`);
  });

  it("never publishes the paid body even if the AI leaks it", async () => {
    const { deps, tg, bale } = setup(async () => `Try this: ${PAID_BODY}`);
    const posted = await runChannelPost(deps);
    expect(posted.every((p) => p.usedFallback)).toBe(true);
    for (const s of [...tg.sent, ...bale.sent]) {
      expect(containsPaidBody(s.text, PAID_BODY)).toBe(false);
      expect(s.text).not.toContain("softbox lighting");
    }
  });

  it("falls back to a template when the AI fails, and posts once per day", async () => {
    const { deps, tg } = setup(async () => {
      throw new Error("budget exceeded");
    });
    const posted = await runChannelPost(deps);
    expect(posted).toHaveLength(3);
    expect(tg.to("@rasa_channel")[0]?.text).toContain("عکاسی محصول حرفه‌ای");
    const again = await runChannelPost(deps);
    expect(again).toHaveLength(0);
    expect(tg.to("@rasa_channel")).toHaveLength(2);
  });

  it("resends as plain text when Telegram rejects the HTML", async () => {
    const { deps, tg } = setup(async () => "<b>broken <i>html</b>");
    tg.failures.set("@rasa_channel", [apiError(400, "Bad Request: can't parse entities")]);
    await runChannelPost(deps);
    const first = tg.to("@rasa_channel")[0];
    expect(first?.opts?.html).toBeFalsy();
    expect(first?.text).not.toContain("<b>");
  });

  it("detects body windows", () => {
    expect(containsPaidBody("nothing here", PAID_BODY)).toBe(false);
    expect(containsPaidBody(`x ${PAID_BODY.slice(30, 90)} y`, PAID_BODY)).toBe(true);
  });
});

import type { CatalogService, EntitlementService, PromptDraft, UserService } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { runIntelProduce } from "../src/jobs/intel";
import { runPromptUpdatedNotify } from "../src/jobs/prompt-updated-notify";
import {
  batches,
  FakeClock,
  FakeMessenger,
  logger,
  MemorySettings,
  makePrompt,
  makeUser,
  testConfig,
} from "./fakes";

function draft(title: string): PromptDraft {
  return {
    topicId: "t",
    sourceLocale: "fa",
    title: { fa: title },
    summary: { fa: "" },
    description: { fa: "" },
    body: { fa: "" },
    variables: [],
    outputType: "text",
    models: [],
    categorySlugs: [],
    tier: "premium",
    suggestedPriceToman: null,
    suggestedPriceStars: null,
    research: [],
    exampleOutput: null,
    judge: { score: 82, passed: true, notes: "" },
    compliance: null,
  };
}

describe("intel-produce", () => {
  function setup(spent: number) {
    const clock = new FakeClock();
    const tg = new FakeMessenger("telegram", clock);
    const produce = vi.fn(async () => ({ published: ["a"], queued: ["b", "c"], rejected: 4 }));
    const deps = {
      config: testConfig({ INTEL_DAILY_DRAFTS: "7" }),
      logger,
      clock,
      messengers: { telegram: tg },
      intel: { scout: vi.fn(), analyze: vi.fn(), produce },
      store: {
        reviewQueue: async () => [
          { id: "d1", draft: draft("پرامپت ویدیو"), createdAt: new Date() },
        ],
      },
      ai: { spentTodayUsd: async () => spent },
    };
    return { deps, tg, produce };
  }

  it("produces INTEL_DAILY_DRAFTS and sends the review-queue summary", async () => {
    const { deps, tg, produce } = setup(1);
    await runIntelProduce(deps);
    expect(produce).toHaveBeenCalledWith(7);
    const text = tg.to("-100admin")[0]?.text ?? "";
    expect(text).toContain("پرامپت ویدیو");
    expect(text).toContain("/review");
  });

  it("skips when the AI budget is exhausted", async () => {
    const { deps, tg, produce } = setup(50);
    expect(await runIntelProduce(deps)).toEqual({ skipped: true });
    expect(produce).not.toHaveBeenCalled();
    expect(tg.to("-100admin")[0]?.text).toContain("سقف بودجه");
  });
});

describe("prompt-updated-notify", () => {
  it("notifies only owners, once per (prompt, version)", async () => {
    const clock = new FakeClock();
    const tg = new FakeMessenger("telegram", clock);
    const bale = new FakeMessenger("bale", clock);
    const owners = new Set(["u1", "u3"]);
    const users = [makeUser(1, "telegram", "en"), makeUser(2), makeUser(3, "bale", "fa")];
    const prompt = makePrompt();
    const deps = {
      config: testConfig(),
      logger,
      clock,
      messengers: { telegram: tg, bale },
      users: { iterateAudience: () => batches(users, 2) } as unknown as UserService,
      settings: new MemorySettings(),
      catalog: { getPrompt: async () => prompt } as unknown as CatalogService,
      entitlements: {
        canAccess: async (u: string) => owners.has(u),
      } as unknown as EntitlementService,
    };
    const res = await runPromptUpdatedNotify(deps, { promptId: prompt.id, version: "1.3.0" });
    expect(res).toMatchObject({ sent: 2, skipped: 1 });
    expect(tg.to("1001")[0]?.text).toContain("v1.3.0");
    expect(bale.to("1003")[0]?.opts?.buttons?.[0]?.[0]?.url).toBe(
      `https://ble.ir/rasa_prompt_bot?start=p_${prompt.id}`,
    );
    expect(tg.to("1002")).toHaveLength(0);

    await runPromptUpdatedNotify(deps, { promptId: prompt.id, version: "1.3.0" });
    expect(tg.to("1001")).toHaveLength(1);
  });
});

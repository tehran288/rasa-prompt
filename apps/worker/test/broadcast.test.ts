import type { AnalyticsService, User, UserService } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { runBroadcast } from "../src/jobs/broadcast";
import { classifySendError, createRateLimiter } from "../src/messenger";
import { enqueueBroadcast, QUEUES } from "../src/public";
import {
  apiError,
  batches,
  FakeClock,
  FakeMessenger,
  logger,
  MemorySettings,
  makeUser,
  testConfig,
} from "./fakes";

function setup(users: User[], batchSize = 10) {
  const clock = new FakeClock();
  const tg = new FakeMessenger("telegram", clock);
  const bale = new FakeMessenger("bale", clock);
  const settings = new MemorySettings();
  const iterate = vi.fn((_filter: unknown, _size: number) => batches(users, batchSize));
  const usersSvc = { iterateAudience: iterate } as unknown as UserService;
  const analytics = { track: vi.fn(async () => {}) } as unknown as AnalyticsService;
  const deps = {
    config: testConfig(),
    logger,
    clock,
    messengers: { telegram: tg, bale },
    users: usersSvc,
    settings,
    analytics,
  };
  return { deps, clock, tg, bale, settings, iterate, analytics };
}

describe("rate limiter", () => {
  it("spaces acquisitions to the configured rate", async () => {
    const clock = new FakeClock();
    const acquire = createRateLimiter(25, clock);
    const start = clock.t;
    for (let i = 0; i < 51; i++) await acquire();
    // 51 sends at 25/s → at least 50 intervals of 40ms
    expect(clock.t - start).toBeGreaterThanOrEqual(2000);
    expect(clock.t - start).toBeLessThan(2100);
  });
});

describe("broadcast", () => {
  it("respects ≤25 msg/s on Telegram and ≤10 msg/s on Bale", async () => {
    const users = [
      ...Array.from({ length: 50 }, (_, i) => makeUser(i, "telegram")),
      ...Array.from({ length: 20 }, (_, i) => makeUser(100 + i, "bale")),
    ];
    const { deps, tg, bale } = setup(users);
    const res = await runBroadcast(
      deps,
      "job-1",
      { segment: "all", text: "سلام" },
      { progressEvery: 10_000 },
    );
    expect(res.sent).toBe(70);

    const userSends = (m: FakeMessenger) => m.sent.filter((s) => /^\d+$/.test(s.chatId));
    const maxInAnySecond = (m: FakeMessenger) => {
      const ts = userSends(m).map((s) => s.at);
      let max = 0;
      for (const t of ts) max = Math.max(max, ts.filter((x) => x >= t && x < t + 1000).length);
      return max;
    };
    expect(maxInAnySecond(tg)).toBeLessThanOrEqual(25);
    expect(maxInAnySecond(bale)).toBeLessThanOrEqual(10);
    expect(iterate(deps)).toEqual({ segment: "all" });
  });

  it("counts 403 as blocked, retries 429 after retry_after, and reports a summary to admins", async () => {
    const users = [makeUser(1), makeUser(2), makeUser(3), makeUser(4, "bale")];
    const { deps, tg, clock, analytics } = setup(users);
    tg.failures.set("1001", [apiError(403, "Forbidden: bot was blocked by the user")]);
    tg.failures.set("1002", [apiError(429, "Too Many Requests: retry after 7", 7)]);
    tg.failures.set("1003", [apiError(500, "Internal Server Error")]);

    const res = await runBroadcast(deps, "job-2", {
      segment: "buyers",
      locale: "fa",
      text: "<b>تخفیف</b>",
      html: true,
    });
    expect(res).toMatchObject({ processed: 4, sent: 2, blocked: 1, failed: 1 });
    expect(clock.sleeps.some((ms) => ms >= 7000)).toBe(true);
    expect(tg.to("1002")).toHaveLength(1);
    expect(tg.to("1002")[0]?.opts?.html).toBe(true);
    const baleMsg = (deps.messengers.bale as FakeMessenger).to("1004")[0];
    expect(baleMsg?.text).toBe("تخفیف"); // HTML stripped on Bale
    const summary = tg.to("-100admin").at(-1)?.text ?? "";
    expect(summary).toContain("ارسال همگانی تمام شد");
    expect(analytics.track).toHaveBeenCalledWith(
      "broadcast_sent",
      null,
      expect.objectContaining({ sent: 2 }),
    );
  });

  it("is idempotent: a completed job is not re-sent, and a retried job resumes from the checkpoint", async () => {
    const users = Array.from({ length: 30 }, (_, i) => makeUser(i));
    const { deps, tg, settings } = setup(users, 10);
    // Simulate a crash after the first batch of 10.
    await settings.set("broadcast:job-3", {
      processed: 10,
      done: false,
      stats: { processed: 10, sent: 10, blocked: 0, failed: 0, skipped: 0 },
    });
    const res = await runBroadcast(deps, "job-3", { segment: "all", text: "hi" });
    expect(res.sent).toBe(30);
    expect(tg.sent.filter((s) => /^\d+$/.test(s.chatId))).toHaveLength(20);

    const before = tg.sent.length;
    const again = await runBroadcast(deps, "job-3", { segment: "all", text: "hi" });
    expect(again.alreadyDone).toBe(true);
    expect(tg.sent.length).toBe(before);
  });

  it("sends periodic progress to admins", async () => {
    const users = Array.from({ length: 25 }, (_, i) => makeUser(i));
    const { deps, tg } = setup(users);
    await runBroadcast(deps, "job-4", { segment: "all", text: "x" }, { progressEvery: 10 });
    const progress = tg.to("-100admin").filter((s) => s.text.includes("پیشرفت"));
    expect(progress).toHaveLength(2);
  });

  it("rejects invalid payloads and enqueues via the helper", async () => {
    const { deps } = setup([]);
    await expect(runBroadcast(deps, "j", { segment: "all", text: " " })).rejects.toThrow();
    const send = vi.fn(async () => "id-1");
    await expect(enqueueBroadcast({ send }, { segment: "all", text: "hello" })).resolves.toBe(
      "id-1",
    );
    expect(send).toHaveBeenCalledWith(
      QUEUES.broadcast,
      { segment: "all", text: "hello" },
      { retryLimit: 1 },
    );
    await expect(
      enqueueBroadcast({ send }, { segment: "nope" as "all", text: "x" }),
    ).rejects.toThrow();
  });

  it("classifies Bot API errors", () => {
    expect(classifySendError(apiError(403, "Forbidden")).kind).toBe("blocked");
    expect(classifySendError(apiError(400, "Bad Request: chat not found")).kind).toBe("blocked");
    expect(classifySendError(apiError(429, "Too Many Requests", 3))).toEqual({
      kind: "rate_limited",
      retryAfterSec: 3,
    });
    expect(classifySendError(apiError(400, "Bad Request: can't parse entities")).kind).toBe(
      "bad_request",
    );
    expect(classifySendError(new Error("network")).kind).toBe("other");
  });
});

function iterate(deps: ReturnType<typeof setup>["deps"]) {
  return (deps.users.iterateAudience as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
}

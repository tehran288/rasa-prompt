import type { AnalyticsService, DailyStats } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { runDailyReport } from "../src/jobs/daily-report";
import { FakeClock, FakeMessenger, logger, MemorySettings, testConfig } from "./fakes";

const stats: DailyStats = {
  date: "2026-10-07",
  newUsers: 42,
  activeUsers: 300,
  searches: 900,
  zeroResultSearches: 31,
  ordersPaid: 12,
  revenueToman: 1_250_000,
  revenueStars: 400,
  openTickets: 3,
  topQueries: [{ query: "عکس محصول", count: 50 }],
  zeroResultQueries: [{ query: "ویدیو سورا", count: 9 }],
};

function setup(writeDailyReport: (s: DailyStats, e: Record<string, unknown>) => Promise<string>) {
  const clock = new FakeClock(Date.parse("2026-10-08T04:30:00Z"));
  const tg = new FakeMessenger("telegram", clock);
  const bale = new FakeMessenger("bale", clock);
  const analytics = { dailyStats: vi.fn(async () => stats) } as unknown as AnalyticsService;
  const deps = {
    config: testConfig(),
    logger,
    clock,
    messengers: { telegram: tg, bale },
    analytics,
    ai: { spentTodayUsd: async () => 1.234 },
    agents: { writeDailyReport: vi.fn(writeDailyReport) },
    intel: { reviewQueue: async () => [{}, {}] as never },
    tickets: { listOpen: async () => [{}] as never },
    settings: new MemorySettings(),
  };
  return { deps, tg, bale, analytics };
}

describe("daily-report", () => {
  it("uses the AI narrative and passes extras", async () => {
    const { deps, tg, bale, analytics } = setup(async () => "گزارش هوشمند امروز");
    const res = await runDailyReport(deps);
    expect(res?.usedFallback).toBe(false);
    expect(tg.to("-100admin")[0]?.text).toBe("گزارش هوشمند امروز");
    expect(bale.to("baleadmin")[0]?.text).toBe("گزارش هوشمند امروز");
    const day = (analytics.dailyStats as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date;
    expect(day.toISOString().slice(0, 10)).toBe("2026-10-07");
    expect(deps.agents.writeDailyReport).toHaveBeenCalledWith(
      stats,
      expect.objectContaining({
        aiSpentTodayUsd: 1.234,
        reviewQueue: 2,
        openTickets: 1,
        aiDailyBudgetUsd: 10,
      }),
    );
  });

  it("falls back to the template when the AI fails", async () => {
    const { deps, tg } = setup(async () => {
      throw new Error("AI down");
    });
    const res = await runDailyReport(deps);
    expect(res?.usedFallback).toBe(true);
    const text = tg.to("-100admin")[0]?.text ?? "";
    expect(text).toContain("گزارش روزانه");
    expect(text).toContain("۴۲"); // new users in Persian digits
    expect(text).toContain("ویدیو سورا");
    expect(text).toContain("$1.23");
  });

  it("still reports when stats are unavailable, and sends only once per day", async () => {
    const { deps, tg } = setup(async () => "x");
    deps.analytics.dailyStats = vi.fn(async () => {
      throw new Error("db down");
    });
    const res = await runDailyReport(deps);
    expect(res?.usedFallback).toBe(true);
    expect(tg.to("-100admin")[0]?.text).toContain("در دسترس نبود");
    expect(await runDailyReport(deps)).toBeNull();
    expect(tg.to("-100admin")).toHaveLength(1);
  });
});

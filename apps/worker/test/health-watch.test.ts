import { describe, expect, it } from "vitest";
import { diffHealth, type HealthMemory, runHealthWatch } from "../src/jobs/health-watch";
import { FakeClock, FakeMessenger, logger, MemorySettings, testConfig } from "./fakes";

function setup() {
  const clock = new FakeClock();
  const tg = new FakeMessenger("telegram", clock);
  const bale = new FakeMessenger("bale", clock);
  const state = { dbUp: true, spent: 1 };
  const memory: HealthMemory = { last: null };
  const settings = new MemorySettings();
  const deps = {
    config: testConfig(),
    logger,
    clock,
    messengers: { telegram: tg, bale },
    db: {
      ping: async () => {
        if (!state.dbUp) throw new Error("ECONNREFUSED");
      },
    },
    ai: { spentTodayUsd: async () => state.spent },
    settings,
    memory,
  };
  const alerts = () => tg.to("-100admin").map((s) => s.text);
  return { deps, tg, bale, state, alerts, memory, settings };
}

describe("health-watch", () => {
  it("is silent while healthy and alerts only on state changes", async () => {
    const { deps, state, alerts, bale } = setup();
    expect((await runHealthWatch(deps)).alerted).toBe(false);
    expect((await runHealthWatch(deps)).alerted).toBe(false);
    expect(alerts()).toHaveLength(0);

    state.dbUp = false;
    expect((await runHealthWatch(deps)).alerted).toBe(true);
    await runHealthWatch(deps);
    await runHealthWatch(deps);
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0]).toContain("پایگاه‌داده");

    state.dbUp = true;
    await runHealthWatch(deps);
    expect(alerts()).toHaveLength(2);
    expect(alerts()[1]).toContain("بازیابی");

    bale.getMeError = new Error("timeout");
    await runHealthWatch(deps);
    await runHealthWatch(deps);
    expect(alerts()).toHaveLength(3);
    expect(alerts()[2]).toContain("بله");
  });

  it("tracks AI budget thresholds", async () => {
    const { deps, state, alerts } = setup();
    await runHealthWatch(deps);
    state.spent = 8.5;
    await runHealthWatch(deps);
    state.spent = 9;
    await runHealthWatch(deps);
    state.spent = 10.5;
    await runHealthWatch(deps);
    expect(alerts()).toHaveLength(2);
    expect(alerts()[1]).toContain("تمام‌شده");
  });

  it("alerts on first run only when something is unhealthy, and survives restarts via settings", async () => {
    const { deps, state, alerts, settings } = setup();
    state.dbUp = true;
    await runHealthWatch(deps);
    // New process: memory empty, persisted state says healthy → no alert.
    const restarted = { ...deps, memory: { last: null } };
    await runHealthWatch(restarted);
    expect(alerts()).toHaveLength(0);
    expect(settings.map.get("health:last")).toMatchObject({
      db: "ok",
      telegram: "ok",
      bale: "ok",
      ai_budget: "ok",
    });
    expect(diffHealth(null, { db: "down" })).toEqual([{ key: "db", from: null, to: "down" }]);
  });
});

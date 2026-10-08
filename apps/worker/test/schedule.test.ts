import { PgBoss } from "pg-boss";
import { describe, expect, it, vi } from "vitest";
import { runCleanup } from "../src/jobs/cleanup";
import { QUEUES, type QueueName } from "../src/public";
import { type BossLike, JOBS, type JobHandlers, registerJobs } from "../src/schedule";
import { tehranDateKey } from "../src/util";
import { logger } from "./fakes";

const EXPECTED_CRON: Record<string, string> = {
  "intel-scout": "0 */6 * * *",
  "intel-analyze": "0 23 * * *",
  "intel-produce": "30 23 * * *",
  "channel-post": "30 6 * * *",
  "daily-report": "30 4 * * *",
  "abandoned-cart": "*/30 * * * *",
  "health-watch": "*/5 * * * *",
  cleanup: "45 0 * * *",
};

function fakeBoss() {
  const queues: string[] = [];
  const schedules: { name: string; cron: string; tz?: string }[] = [];
  const workers = new Map<string, (jobs: { id: string; data: unknown }[]) => Promise<unknown>>();
  const boss = {
    createQueue: vi.fn(async (name: string) => {
      queues.push(name);
    }),
    schedule: vi.fn(async (name: string, cron: string, _data: unknown, opts?: { tz?: string }) => {
      schedules.push({ name, cron, tz: opts?.tz });
    }),
    work: vi.fn(
      async (
        name: string,
        _opts: unknown,
        handler: (jobs: { id: string; data: unknown }[]) => Promise<unknown>,
      ) => {
        workers.set(name, handler);
        return `w-${name}`;
      },
    ),
  };
  return { boss: boss as unknown as BossLike, queues, schedules, workers };
}

function handlers(): JobHandlers {
  const h = {} as JobHandlers;
  for (const q of Object.values(QUEUES)) h[q as QueueName] = vi.fn(async () => ({ ok: q }));
  return h;
}

describe("schedule table", () => {
  it("registers every expected job with a queue, a worker and (for crons) a UTC schedule", async () => {
    const { boss, queues, schedules, workers } = fakeBoss();
    await registerJobs(boss, handlers(), logger);
    expect(new Set(queues)).toEqual(new Set(Object.values(QUEUES)));
    expect(workers.size).toBe(Object.values(QUEUES).length);
    expect(Object.fromEntries(schedules.map((s) => [s.name, s.cron]))).toEqual(EXPECTED_CRON);
    expect(schedules.every((s) => s.tz === "UTC")).toBe(true);
    // consumers are not scheduled
    expect(
      schedules.find((s) => s.name === "broadcast" || s.name === "prompt-updated-notify"),
    ).toBeUndefined();
  });

  it("cron times map to the intended Tehran wall-clock times", () => {
    const boss = new PgBoss("postgres://unused@localhost/unused");
    const from = new Date("2026-10-08T00:01:00Z");
    const tehranHHMM = (d: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    const first = (name: string) => {
      const spec = JOBS.find((j) => j.name === name);
      return boss.previewSchedule(spec?.cron ?? "", { tz: "UTC", from, count: 4 });
    };
    expect(tehranHHMM(first("channel-post")[0] as Date)).toBe("10:00");
    expect(tehranHHMM(first("daily-report")[0] as Date)).toBe("08:00");
    expect(tehranHHMM(first("intel-analyze")[0] as Date)).toBe("02:30");
    expect(tehranHHMM(first("intel-produce")[0] as Date)).toBe("03:00");
    expect(first("intel-scout").map(tehranHHMM)).toEqual(["09:30", "15:30", "21:30", "03:30"]);
    // analyze (02:30) runs before produce (03:00) on the same Tehran day
    expect(tehranDateKey(first("intel-analyze")[0] as Date)).toBe(
      tehranDateKey(first("intel-produce")[0] as Date),
    );
  });

  it("wrapped workers rethrow so pg-boss can retry, without affecting other queues", async () => {
    const { boss, workers } = fakeBoss();
    const h = handlers();
    h["daily-report"] = vi.fn(async () => {
      throw new Error("boom");
    });
    await registerJobs(boss, h, logger);
    await expect(workers.get("daily-report")?.([{ id: "1", data: null }])).rejects.toThrow("boom");
    await expect(workers.get("cleanup")?.([{ id: "2", data: null }])).resolves.toBeUndefined();
    expect(h.cleanup).toHaveBeenCalledOnce();
  });

  it("cleanup skips missing tables and isolates errors", async () => {
    const db = {
      deleteOlderThan: vi.fn(async (table: string) => {
        if (table === "bot_sessions") return null;
        if (table === "settings") throw new Error("x");
        return 5;
      }),
    };
    const res = await runCleanup({ logger, db });
    expect(res).toEqual({ search_logs: 5, bot_sessions: "missing", settings: "error" });
    expect(db.deleteOlderThan).toHaveBeenCalledWith("search_logs", "created_at", 90, undefined);
  });
});

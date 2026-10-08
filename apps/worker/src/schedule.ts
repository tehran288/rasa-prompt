/**
 * Job table and pg-boss registration.
 *
 * All cron expressions are in UTC (pg-boss `tz: "UTC"`). Tehran is a fixed UTC+03:30 (Iran
 * abolished DST in 2022), so "HH:MM Tehran" = "HH:MM − 3:30 UTC".
 */
import type { Logger } from "@rasa/shared";
import type { PgBoss, Queue } from "pg-boss";
import { QUEUES, type QueueName } from "./public";
import { errInfo } from "./util";

export interface JobSpec {
  name: QueueName;
  /** UTC cron; undefined = queue consumer only (enqueued by bot/other jobs). */
  cron?: string;
  tehran: string;
  description: string;
  queue: Omit<Queue, "name">;
}

const cronQueue = (retryLimit: number, expireInSeconds: number): Omit<Queue, "name"> => ({
  // stately: at most one queued + one active → slow runs never pile up.
  policy: "stately",
  retryLimit,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds,
});

export const JOBS: JobSpec[] = [
  {
    name: QUEUES.intelScout,
    cron: "0 */6 * * *", // 00,06,12,18 UTC = 03:30, 09:30, 15:30, 21:30 Tehran
    tehran: "every 6h (03:30/09:30/15:30/21:30)",
    description: "Collect trend signals from all configured scouts",
    queue: cronQueue(2, 30 * 60),
  },
  {
    name: QUEUES.intelAnalyze,
    cron: "0 23 * * *", // 23:00 UTC = 02:30 Tehran (next calendar day)
    tehran: "02:30 daily",
    description: "Cluster & score signals into trend topics",
    queue: cronQueue(2, 30 * 60),
  },
  {
    name: QUEUES.intelProduce,
    cron: "30 23 * * *", // 23:30 UTC = 03:00 Tehran
    tehran: "03:00 daily",
    description: "Produce INTEL_DAILY_DRAFTS prompts; notify admins with review-queue summary",
    queue: cronQueue(1, 2 * 3600),
  },
  {
    name: QUEUES.channelPost,
    cron: "30 6 * * *", // 06:30 UTC = 10:00 Tehran
    tehran: "10:00 daily",
    description: "Prompt of the day to Telegram (fa, ar) and Bale (fa) channels",
    queue: cronQueue(2, 15 * 60),
  },
  {
    name: QUEUES.dailyReport,
    cron: "30 4 * * *", // 04:30 UTC = 08:00 Tehran
    tehran: "08:00 daily",
    description: "Daily admin report (AI narrative, template fallback)",
    queue: cronQueue(2, 15 * 60),
  },
  {
    name: QUEUES.abandonedCart,
    cron: "*/30 * * * *", // every 30 min
    tehran: "every 30 min",
    description: "One reminder per pending order > 60 min; expire orders > 24 h",
    queue: cronQueue(1, 15 * 60),
  },
  {
    name: QUEUES.healthWatch,
    cron: "*/5 * * * *", // every 5 min
    tehran: "every 5 min",
    description: "DB / bots getMe / AI budget; alert on state change only",
    queue: cronQueue(0, 4 * 60),
  },
  {
    name: QUEUES.cleanup,
    cron: "45 0 * * *", // 00:45 UTC = 04:15 Tehran
    tehran: "04:15 daily",
    description: "Delete search logs / sessions older than 90 days",
    queue: cronQueue(2, 30 * 60),
  },
  {
    name: QUEUES.broadcast,
    tehran: "on demand",
    description: "Admin broadcast to a segment (rate-limited, checkpointed)",
    queue: { policy: "standard", retryLimit: 1, retryDelay: 60, expireInSeconds: 6 * 3600 },
  },
  {
    name: QUEUES.promptUpdatedNotify,
    tehran: "on demand",
    description: "Notify owners when a purchased prompt gets a new version",
    queue: { policy: "standard", retryLimit: 1, retryDelay: 60, expireInSeconds: 3 * 3600 },
  },
];

export type JobHandler = (job: { id: string; data: unknown }) => Promise<unknown>;
export type JobHandlers = Record<QueueName, JobHandler>;

/** Minimal pg-boss surface used here (structurally satisfied by `PgBoss`; fakes in tests). */
export type BossLike = Pick<PgBoss, "createQueue" | "schedule" | "work">;

/**
 * Creates every queue, (re)applies cron schedules and starts one worker per queue. Each handler
 * is wrapped with structured logging and error isolation: a failing job only fails its own
 * pg-boss job (which pg-boss retries per the queue's retryLimit); other queues are unaffected.
 */
export async function registerJobs(
  boss: BossLike,
  handlers: JobHandlers,
  logger: Logger,
): Promise<void> {
  for (const spec of JOBS) {
    await boss.createQueue(spec.name, spec.queue);
    if (spec.cron) {
      await boss.schedule(spec.name, spec.cron, null, { tz: "UTC" });
    }
    const handler = handlers[spec.name];
    await boss.work(spec.name, { localConcurrency: 1, pollingIntervalSeconds: 5 }, async (jobs) => {
      for (const job of jobs) {
        await runWrapped(spec.name, handler, job, logger);
      }
    });
    logger.info(
      { queue: spec.name, cron: spec.cron ?? null, tehran: spec.tehran },
      "job registered",
    );
  }
}

export async function runWrapped(
  name: string,
  handler: JobHandler,
  job: { id: string; data: unknown },
  logger: Logger,
) {
  const log = logger.child({ queue: name, jobId: job.id });
  const started = Date.now();
  log.info("job start");
  try {
    const result = await handler(job);
    log.info({ ms: Date.now() - started, result: summarize(result) }, "job done");
    return result;
  } catch (err) {
    log.error({ ms: Date.now() - started, err: errInfo(err) }, "job failed");
    throw err; // let pg-boss record the failure and retry
  }
}

function summarize(result: unknown): unknown {
  if (result === undefined || result === null) return null;
  const s = JSON.stringify(result);
  return s.length > 500 ? `${s.slice(0, 500)}…` : result;
}

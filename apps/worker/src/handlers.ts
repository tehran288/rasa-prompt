/** Binds every queue name to its job function using the container's deps. */
import type { WorkerDeps } from "./deps";
import { runAbandonedCart } from "./jobs/abandoned-cart";
import { runBroadcast } from "./jobs/broadcast";
import { runChannelPost } from "./jobs/channel-post";
import { runCleanup } from "./jobs/cleanup";
import { runDailyReport } from "./jobs/daily-report";
import { type HealthMemory, runHealthWatch } from "./jobs/health-watch";
import { runIntelAnalyze, runIntelProduce, runIntelScout } from "./jobs/intel";
import { runPromptUpdatedNotify } from "./jobs/prompt-updated-notify";
import { type BroadcastPayload, type PromptUpdatedPayload, QUEUES } from "./public";
import type { JobHandlers } from "./schedule";

export function createHandlers(d: WorkerDeps): JobHandlers {
  const s = d.services;
  const base = { config: d.config, logger: d.logger, clock: d.clock, messengers: d.messengers };
  const healthMemory: HealthMemory = { last: null };
  const intelDeps = { ...base, intel: d.intel, store: s.intel, ai: d.ai };

  return {
    [QUEUES.intelScout]: () => runIntelScout(intelDeps),
    [QUEUES.intelAnalyze]: () => runIntelAnalyze(intelDeps),
    [QUEUES.intelProduce]: () => runIntelProduce(intelDeps),
    [QUEUES.channelPost]: () =>
      runChannelPost({ ...base, catalog: s.catalog, agents: d.agents, settings: s.settings }),
    [QUEUES.dailyReport]: () =>
      runDailyReport({
        ...base,
        analytics: s.analytics,
        ai: d.ai,
        agents: d.agents,
        intel: s.intel,
        tickets: s.tickets,
        settings: s.settings,
      }),
    [QUEUES.broadcast]: (job) =>
      runBroadcast(
        { ...base, users: s.users, settings: s.settings, analytics: s.analytics },
        job.id,
        job.data as BroadcastPayload,
      ),
    [QUEUES.abandonedCart]: () =>
      runAbandonedCart({ ...base, orders: s.orders, users: s.users, settings: s.settings }),
    [QUEUES.promptUpdatedNotify]: (job) =>
      runPromptUpdatedNotify(
        {
          ...base,
          users: s.users,
          settings: s.settings,
          catalog: s.catalog,
          entitlements: s.entitlements,
        },
        job.data as PromptUpdatedPayload,
      ),
    [QUEUES.healthWatch]: () =>
      runHealthWatch({ ...base, db: d.db, ai: d.ai, settings: s.settings, memory: healthMemory }),
    [QUEUES.cleanup]: () => runCleanup({ logger: d.logger, db: d.db }),
  };
}

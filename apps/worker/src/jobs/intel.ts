/**
 * Trend-intelligence schedule: scout (6h) → analyze (02:30 Tehran) → produce (03:00 Tehran).
 * The pipeline itself (packages/intel) is idempotent by design: signals dedupe by
 * source+externalId, topics upsert by key. `produce` is skipped when the AI budget is exhausted
 * (P8: content pipelines pause on budget), and finishes by sending the review-queue summary to
 * admin chats so the founder can approve drafts from the bot.
 */
import type { AiRouter, Config, IntelStore, Logger } from "@rasa/shared";
import type { Clock, IntelPipeline, Messengers } from "../deps";
import { faNum, notifyAdmins, truncate } from "../util";

export interface IntelJobDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  intel: IntelPipeline;
  store: Pick<IntelStore, "reviewQueue">;
  ai: Pick<AiRouter, "spentTodayUsd">;
}

export async function runIntelScout(deps: Pick<IntelJobDeps, "logger" | "intel">) {
  const log = deps.logger.child({ job: "intel-scout" });
  const added = await deps.intel.scout();
  log.info({ added }, "scout done");
  return { added };
}

export async function runIntelAnalyze(deps: Pick<IntelJobDeps, "logger" | "intel">) {
  const log = deps.logger.child({ job: "intel-analyze" });
  const topics = await deps.intel.analyze();
  log.info({ topics: topics.length }, "analyze done");
  return { topics: topics.length };
}

export async function runIntelProduce(deps: IntelJobDeps) {
  const log = deps.logger.child({ job: "intel-produce" });
  const spent = await deps.ai.spentTodayUsd().catch(() => 0);
  if (spent >= deps.config.AI_DAILY_BUDGET_USD) {
    log.warn({ spent }, "AI budget exhausted — skipping produce");
    await notifyAdmins(
      deps,
      `⏸ تولید پرامپت امروز متوقف شد: سقف بودجه‌ی AI ($${deps.config.AI_DAILY_BUDGET_USD}) پر شده است.`,
    );
    return { skipped: true as const };
  }
  const limit = deps.config.INTEL_DAILY_DRAFTS;
  const result = await deps.intel.produce(limit);
  log.info(
    { published: result.published.length, queued: result.queued.length, rejected: result.rejected },
    "produce done",
  );

  const queue = await deps.store.reviewQueue(20).catch(() => []);
  const lines = [
    "🧠 خط تولید پرامپت امشب",
    `✅ منتشرشده خودکار: ${faNum(result.published.length)}`,
    `📝 منتظر تأیید شما: ${faNum(result.queued.length)}`,
    `❌ ردشده توسط داور/انطباق: ${faNum(result.rejected)}`,
    "",
    `صف بازبینی (${faNum(queue.length)} مورد):`,
    ...queue.slice(0, 10).map((q, i) => {
      const score = q.draft.judge ? ` · داور ${faNum(q.draft.judge.score)}` : "";
      return `${faNum(i + 1)}. ${truncate(q.draft.title.fa, 60)} (${q.draft.tier}${score})`;
    }),
    "",
    "برای تأیید/رد: در ربات دستور /review را بزنید.",
  ];
  await notifyAdmins(deps, lines.join("\n"));
  return { skipped: false as const, ...result, reviewQueue: queue.length };
}

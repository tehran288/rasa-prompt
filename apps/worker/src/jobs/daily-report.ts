/**
 * `daily-report` — 08:00 Tehran. Yesterday's stats (UTC day, as AnalyticsService defines it)
 * + AI spend + review queue + open tickets → `agents.writeDailyReport` → admin chats.
 * If the AI call fails (budget, outage) a deterministic Persian template is sent instead.
 * Each input is fetched in isolation: one failing source never blocks the report.
 * Idempotency: settings key `daily_report:<tehranDate>`.
 */
import type {
  AiRouter,
  AnalyticsService,
  AssistantAgents,
  Config,
  DailyStats,
  IntelStore,
  Logger,
  SettingsService,
  TicketService,
} from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import { errInfo, faNum, notifyAdmins, tehranDateKey } from "../util";

export interface DailyReportDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  analytics: AnalyticsService;
  ai: Pick<AiRouter, "spentTodayUsd">;
  agents: Pick<AssistantAgents, "writeDailyReport">;
  intel: Pick<IntelStore, "reviewQueue">;
  tickets: Pick<TicketService, "listOpen">;
  settings: SettingsService;
}

export interface ReportExtra {
  aiSpentTodayUsd: number | null;
  aiDailyBudgetUsd: number;
  reviewQueue: number | null;
  openTickets: number | null;
}

export async function runDailyReport(deps: DailyReportDeps, opts: { force?: boolean } = {}) {
  const log = deps.logger.child({ job: "daily-report" });
  const now = deps.clock.now();
  const key = `daily_report:${tehranDateKey(now)}`;
  if (!opts.force && (await deps.settings.get<string | null>(key, null))) {
    log.info("report already sent today");
    return null;
  }
  const yesterday = new Date(now.getTime() - 24 * 3600_000);
  const safe = async <T>(label: string, f: () => Promise<T>): Promise<T | null> => {
    try {
      return await f();
    } catch (err) {
      log.warn({ err: errInfo(err), source: label }, "report input failed");
      return null;
    }
  };
  const stats = await safe("dailyStats", () => deps.analytics.dailyStats(yesterday));
  const extra: ReportExtra = {
    aiSpentTodayUsd: await safe("aiSpend", () => deps.ai.spentTodayUsd()),
    aiDailyBudgetUsd: deps.config.AI_DAILY_BUDGET_USD,
    reviewQueue: await safe("reviewQueue", async () => (await deps.intel.reviewQueue(100)).length),
    openTickets: await safe("openTickets", async () => (await deps.tickets.listOpen(100)).length),
  };

  let text: string | null = null;
  let usedFallback = false;
  if (stats) {
    try {
      text = (await deps.agents.writeDailyReport(stats, { ...extra })).trim() || null;
    } catch (err) {
      log.warn({ err: errInfo(err) }, "writeDailyReport failed — using template");
    }
  }
  if (!text) {
    usedFallback = true;
    text = templateReport(stats, extra, tehranDateKey(yesterday));
  }
  const delivered = await notifyAdmins(deps, text);
  if (delivered > 0) await deps.settings.set(key, now.toISOString());
  log.info({ usedFallback, delivered }, "daily report done");
  return { text, usedFallback, delivered };
}

export function templateReport(stats: DailyStats | null, extra: ReportExtra, day: string): string {
  const lines = [`📊 گزارش روزانه — ${day}`];
  if (stats) {
    lines.push(
      `👤 کاربر جدید: ${faNum(stats.newUsers)} · فعال: ${faNum(stats.activeUsers)}`,
      `🛒 سفارش پرداخت‌شده: ${faNum(stats.ordersPaid)}`,
      `💰 درآمد: ${faNum(stats.revenueToman)} تومان + ${faNum(stats.revenueStars)} ⭐`,
      `🔎 جست‌وجو: ${faNum(stats.searches)} (بی‌نتیجه: ${faNum(stats.zeroResultSearches)})`,
    );
    if (stats.zeroResultQueries.length) {
      lines.push(
        `❓ بی‌نتیجه‌های پرتکرار: ${stats.zeroResultQueries
          .slice(0, 5)
          .map((q) => q.query)
          .join("، ")}`,
      );
    }
  } else {
    lines.push("⚠️ آمار دیروز در دسترس نبود (خطای پایگاه‌داده/سرویس).");
  }
  const spend = extra.aiSpentTodayUsd === null ? "نامشخص" : `$${extra.aiSpentTodayUsd.toFixed(2)}`;
  lines.push(
    `🤖 هزینه‌ی AI امروز: ${spend} از سقف $${extra.aiDailyBudgetUsd}`,
    `📝 صف بازبینی پرامپت: ${extra.reviewQueue === null ? "نامشخص" : faNum(extra.reviewQueue)}`,
    `🎫 تیکت باز: ${extra.openTickets === null ? "نامشخص" : faNum(extra.openTickets)}`,
    "",
    "(متن خودکار — نویسنده‌ی هوش مصنوعی در دسترس نبود)",
  );
  return lines.join("\n");
}

/**
 * `health-watch` — every 5 min. Checks DB, each bot's getMe, and AI budget usage, and alerts the
 * admin chats ONLY when a component's state changes (first run: alert only if something is bad).
 *
 * State is kept in memory (`HealthMemory`) and mirrored best-effort to settings key `health:last`
 * so a restart does not re-alert. When the DB is down the alert still goes out via the bots.
 */
import type { AiRouter, Config, Logger, Platform, SettingsService } from "@rasa/shared";
import type { Clock, DbOps, Messengers } from "../deps";
import { activeMessengers, errInfo, notifyAdmins, withTimeout } from "../util";

export type ComponentState = "ok" | "down" | "high" | "exceeded";
export type HealthState = Record<string, ComponentState>;

export interface HealthMemory {
  last: HealthState | null;
}

export interface HealthDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  db: Pick<DbOps, "ping">;
  ai: Pick<AiRouter, "spentTodayUsd">;
  settings: SettingsService;
  memory: HealthMemory;
}

const LABELS: Record<string, string> = {
  db: "پایگاه‌داده",
  telegram: "ربات تلگرام",
  bale: "ربات بله",
  ai_budget: "بودجه‌ی AI",
};
const STATE_FA: Record<ComponentState, string> = {
  ok: "🟢 سالم",
  down: "🔴 قطع",
  high: "🟠 بیش از ۸۰٪",
  exceeded: "🔴 تمام‌شده (پایپ‌لاین تولید متوقف)",
};

export async function checkHealth(
  deps: Omit<HealthDeps, "memory" | "settings">,
  timeoutMs = 8000,
): Promise<HealthState> {
  const state: HealthState = {};
  try {
    await withTimeout(deps.db.ping(), timeoutMs, "db ping");
    state.db = "ok";
  } catch (err) {
    deps.logger.warn({ err: errInfo(err) }, "db ping failed");
    state.db = "down";
  }
  for (const m of activeMessengers(deps.messengers)) {
    try {
      await withTimeout(m.getMe(), timeoutMs, `${m.platform} getMe`);
      state[m.platform satisfies Platform] = "ok";
    } catch (err) {
      deps.logger.warn({ err: errInfo(err), platform: m.platform }, "getMe failed");
      state[m.platform] = "down";
    }
  }
  try {
    const spent = await withTimeout(deps.ai.spentTodayUsd(), timeoutMs, "ai spend");
    const budget = deps.config.AI_DAILY_BUDGET_USD;
    state.ai_budget =
      budget > 0 && spent >= budget
        ? "exceeded"
        : budget > 0 && spent >= 0.8 * budget
          ? "high"
          : "ok";
  } catch (err) {
    deps.logger.warn({ err: errInfo(err) }, "ai spend check failed");
    // Usually the DB is down too; don't add a second alert for the same root cause.
    state.ai_budget = state.db === "down" ? "ok" : "down";
  }
  return state;
}

export function diffHealth(
  prev: HealthState | null,
  next: HealthState,
): { key: string; from: ComponentState | null; to: ComponentState }[] {
  const changes: { key: string; from: ComponentState | null; to: ComponentState }[] = [];
  for (const [key, to] of Object.entries(next)) {
    const from = prev?.[key] ?? null;
    if (prev === null ? to !== "ok" : from !== to) changes.push({ key, from, to });
  }
  return changes;
}

export async function runHealthWatch(deps: HealthDeps) {
  const log = deps.logger.child({ job: "health-watch" });
  if (deps.memory.last === null) {
    deps.memory.last = await deps.settings
      .get<HealthState | null>("health:last", null)
      .catch(() => null);
  }
  const state = await checkHealth({ ...deps, logger: log });
  const changes = diffHealth(deps.memory.last, state);
  deps.memory.last = state;
  await deps.settings.set("health:last", state).catch(() => undefined);

  if (changes.length === 0) {
    log.debug({ state }, "health unchanged");
    return { state, alerted: false, changes };
  }
  const recovered = changes.every((c) => c.to === "ok");
  const text = [
    recovered ? "✅ بازیابی سرویس" : "🚨 هشدار سلامت سیستم",
    ...changes.map((c) => `• ${LABELS[c.key] ?? c.key}: ${STATE_FA[c.to]}`),
  ].join("\n");
  log.warn({ changes, state }, "health state changed");
  const delivered = await notifyAdmins(deps, text);
  return { state, alerted: delivered > 0, changes };
}

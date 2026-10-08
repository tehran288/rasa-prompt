/**
 * `cleanup` — daily 04:15 Tehran. Data retention (90 days) for high-volume, low-value tables.
 * Table names belong to packages/db; missing tables/columns are skipped (logged), so this job is
 * safe against schema drift. Idempotent by nature (DELETE … WHERE ts < cutoff).
 */
import type { Logger } from "@rasa/shared";
import type { DbOps } from "../deps";
import { errInfo } from "../util";

export const RETENTION_DAYS = 90;

/** Candidate tables; whichever exist are cleaned. */
export const RETENTION_TARGETS: { table: string; column: string; keyPrefixes?: string[] }[] = [
  { table: "search_logs", column: "created_at" },
  { table: "bot_sessions", column: "updated_at" }, // grammY sessions untouched for 90 days
  // Worker's own dedupe/checkpoint keys in the settings KV (never other settings).
  {
    table: "settings",
    column: "updated_at",
    keyPrefixes: [
      "cart_reminder:",
      "channel_post:",
      "daily_report:",
      "broadcast:",
      "prompt_update:",
    ],
  },
];

export async function runCleanup(
  deps: { logger: Logger; db: Pick<DbOps, "deleteOlderThan"> },
  days = RETENTION_DAYS,
) {
  const log = deps.logger.child({ job: "cleanup" });
  const result: Record<string, number | "missing" | "error"> = {};
  for (const t of RETENTION_TARGETS) {
    try {
      const n = await deps.db.deleteOlderThan(t.table, t.column, days, t.keyPrefixes);
      result[t.table] = n === null ? "missing" : n;
    } catch (err) {
      result[t.table] = "error";
      log.error({ err: errInfo(err), table: t.table }, "cleanup failed for table");
    }
  }
  log.info({ result, days }, "cleanup done");
  return result;
}

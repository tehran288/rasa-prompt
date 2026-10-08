/**
 * Rate-limited fan-out of one message per user, shared by `broadcast` and
 * `prompt-updated-notify`.
 *
 * - Per-platform pacing (≤25 msg/s Telegram, 10 msg/s Bale).
 * - 429 → wait `retry_after` and retry (up to 3×). 403 / "chat not found" → counted as blocked and
 *   skipped (contract has no "mark unreachable" yet — see ops.md open issues).
 * - Checkpoint: after each batch the number of processed users is stored in settings under
 *   `checkpointKey`; a retried job skips that many users (assumes `iterateAudience` order is
 *   stable, which the db agent implements as ORDER BY id).
 */
import type { Logger, Platform, SettingsService, User } from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import {
  classifySendError,
  createRateLimiter,
  SEND_RATE_PER_SECOND,
  type SendOpts,
  sendWithRetry,
} from "../messenger";
import { errInfo } from "../util";

export interface FanoutStats {
  processed: number;
  sent: number;
  blocked: number;
  failed: number;
  skipped: number;
}

export interface Checkpoint {
  processed: number;
  done: boolean;
  stats?: FanoutStats;
}

export interface FanoutDeps {
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  settings: SettingsService;
}

export interface FanoutOptions {
  checkpointKey: string;
  audience: AsyncIterable<User[]>;
  /** Build the message for one user, or `null` to skip them. */
  render: (user: User) => Promise<{ text: string; opts?: SendOpts } | null>;
  /** Called every `progressEvery` processed users. */
  onProgress?: (stats: FanoutStats) => Promise<void>;
  progressEvery?: number;
  maxRetries?: number;
  ratePerSecond?: Partial<Record<Platform, number>>;
}

export async function fanout(
  deps: FanoutDeps,
  o: FanoutOptions,
): Promise<FanoutStats & { resumedFrom: number; alreadyDone: boolean }> {
  const cp = await deps.settings.get<Checkpoint | null>(o.checkpointKey, null);
  if (cp?.done) {
    deps.logger.info({ key: o.checkpointKey }, "fanout already completed — skipping (idempotent)");
    return { ...(cp.stats ?? emptyStats()), resumedFrom: cp.processed, alreadyDone: true };
  }
  const resumeFrom = cp?.processed ?? 0;
  const stats: FanoutStats = cp?.stats ? { ...cp.stats } : emptyStats();
  const limiters = {
    telegram: createRateLimiter(
      o.ratePerSecond?.telegram ?? SEND_RATE_PER_SECOND.telegram,
      deps.clock,
    ),
    bale: createRateLimiter(o.ratePerSecond?.bale ?? SEND_RATE_PER_SECOND.bale, deps.clock),
  } satisfies Record<Platform, () => Promise<void>>;
  const progressEvery = o.progressEvery ?? 1000;
  let index = 0;
  let nextProgress = Math.max(
    progressEvery,
    Math.ceil((stats.processed + 1) / progressEvery) * progressEvery,
  );

  for await (const batch of o.audience) {
    for (const user of batch) {
      index++;
      if (index <= resumeFrom) continue;
      stats.processed++;
      const m = deps.messengers[user.platform];
      if (!m) {
        stats.skipped++;
        continue;
      }
      let rendered: Awaited<ReturnType<FanoutOptions["render"]>>;
      try {
        rendered = await o.render(user);
      } catch (err) {
        stats.failed++;
        deps.logger.warn({ err: errInfo(err), userId: user.id }, "fanout render failed");
        continue;
      }
      if (!rendered) {
        stats.skipped++;
        continue;
      }
      await limiters[user.platform]();
      try {
        await sendWithRetry(
          m,
          deps.clock,
          user.platformUserId,
          rendered.text,
          rendered.opts,
          o.maxRetries ?? 3,
        );
        stats.sent++;
      } catch (err) {
        const c = classifySendError(err);
        if (c.kind === "blocked") stats.blocked++;
        else {
          stats.failed++;
          deps.logger.warn(
            { err: errInfo(err), userId: user.id, kind: c.kind },
            "fanout send failed",
          );
        }
      }
      if (o.onProgress && stats.processed >= nextProgress) {
        nextProgress += progressEvery;
        await o
          .onProgress({ ...stats })
          .catch((err) => deps.logger.warn({ err: errInfo(err) }, "progress notify failed"));
      }
    }
    await deps.settings.set<Checkpoint>(o.checkpointKey, {
      processed: index,
      done: false,
      stats: { ...stats },
    });
  }
  await deps.settings.set<Checkpoint>(o.checkpointKey, {
    processed: index,
    done: true,
    stats: { ...stats },
  });
  return { ...stats, resumedFrom: resumeFrom, alreadyDone: false };
}

function emptyStats(): FanoutStats {
  return { processed: 0, sent: 0, blocked: 0, failed: 0, skipped: 0 };
}

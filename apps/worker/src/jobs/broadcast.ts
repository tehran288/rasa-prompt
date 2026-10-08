/**
 * `broadcast` queue consumer — admin broadcast to a user segment.
 *
 * Idempotency: progress is checkpointed per batch under `broadcast:<jobId>`; a retried job resumes
 * after the last completed batch and a completed job is never re-sent. Enqueue with
 * `enqueueBroadcast()` from ../public.ts (retryLimit 1).
 */
import type { AnalyticsService, Config, Logger, SettingsService, UserService } from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import { stripHtml } from "../messenger";
import { type BroadcastPayload, validateBroadcast } from "../public";
import { errInfo, faNum, notifyAdmins } from "../util";
import { type FanoutStats, fanout } from "./fanout";

export interface BroadcastDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  users: UserService;
  settings: SettingsService;
  analytics: AnalyticsService;
}

export interface BroadcastOptions {
  batchSize?: number;
  progressEvery?: number;
}

export async function runBroadcast(
  deps: BroadcastDeps,
  jobId: string,
  payload: BroadcastPayload,
  opts: BroadcastOptions = {},
) {
  validateBroadcast(payload);
  const log = deps.logger.child({ job: "broadcast", jobId });
  const started = deps.clock.now().getTime();
  log.info(
    { segment: payload.segment, locale: payload.locale, platform: payload.platform },
    "broadcast start",
  );

  const audience = deps.users.iterateAudience(
    {
      segment: payload.segment,
      ...(payload.locale ? { locale: payload.locale } : {}),
      ...(payload.platform ? { platform: payload.platform } : {}),
    },
    opts.batchSize ?? 500,
  );

  const label = describe(payload);
  const result = await fanout(
    { logger: log, clock: deps.clock, messengers: deps.messengers, settings: deps.settings },
    {
      checkpointKey: `broadcast:${jobId}`,
      audience,
      progressEvery: opts.progressEvery ?? 2000,
      render: async (user) => {
        if (user.platform === "telegram") {
          return {
            text: payload.text,
            opts: { html: Boolean(payload.html), buttons: payload.buttons },
          };
        }
        // Bale: plain text only.
        return {
          text: payload.html ? stripHtml(payload.text) : payload.text,
          opts: { buttons: payload.buttons },
        };
      },
      onProgress: async (s) => {
        await notifyAdmins(deps, `📣 پیشرفت ارسال همگانی (${label}): ${summaryLine(s)}`);
      },
    },
  );

  if (result.alreadyDone) return result;
  const seconds = Math.round((deps.clock.now().getTime() - started) / 1000);
  log.info({ ...result, seconds }, "broadcast done");
  await notifyAdmins(
    deps,
    `✅ ارسال همگانی تمام شد (${label})\n${summaryLine(result)}\nمدت: ${faNum(seconds)} ثانیه`,
  );
  await deps.analytics
    .track("broadcast_sent", null, { jobId, segment: payload.segment, ...result })
    .catch((err) => log.warn({ err: errInfo(err) }, "analytics track failed"));
  return result;
}

function describe(p: BroadcastPayload): string {
  return [p.segment, p.locale ?? "همه‌ی زبان‌ها", p.platform ?? "همه‌ی پلتفرم‌ها"].join(" · ");
}

function summaryLine(s: FanoutStats): string {
  return `ارسال‌شده ${faNum(s.sent)} · مسدود ${faNum(s.blocked)} · خطا ${faNum(s.failed)} · ردشده ${faNum(s.skipped)} · کل ${faNum(s.processed)}`;
}

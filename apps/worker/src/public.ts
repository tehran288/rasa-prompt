/**
 * Public, dependency-light API of the worker, importable by apps/bot
 * (`import { enqueueBroadcast } from "@rasa/worker/public"`), or reproducible by just sending to
 * the queue names below with pg-boss.
 */
import type { Locale, Platform } from "@rasa/shared";
import type { UrlButton } from "./messenger";

export const QUEUES = {
  intelScout: "intel-scout",
  intelAnalyze: "intel-analyze",
  intelProduce: "intel-produce",
  channelPost: "channel-post",
  dailyReport: "daily-report",
  broadcast: "broadcast",
  abandonedCart: "abandoned-cart",
  promptUpdatedNotify: "prompt-updated-notify",
  healthWatch: "health-watch",
  cleanup: "cleanup",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type BroadcastSegment = "all" | "buyers" | "non_buyers" | "subscribers";

export interface BroadcastPayload {
  segment: BroadcastSegment;
  locale?: Locale;
  platform?: Platform;
  text: string;
  /** Telegram HTML parse mode (Bale always receives plain text, tags stripped). */
  html?: boolean;
  /** Inline URL buttons, rows of buttons. */
  buttons?: UrlButton[][];
  /** Admin who requested it (for the summary). */
  requestedBy?: string;
}

export interface PromptUpdatedPayload {
  promptId: string;
  version: string;
}

/** Minimal pg-boss surface needed to enqueue (structurally compatible with `PgBoss`). */
export interface Enqueuer {
  send(
    name: string,
    data?: object | null,
    options?: { retryLimit?: number; singletonKey?: string },
  ): Promise<string | null>;
}

export function validateBroadcast(p: BroadcastPayload): void {
  if (!p || typeof p.text !== "string" || p.text.trim() === "") {
    throw new Error("broadcast text is required");
  }
  if (p.text.length > 4000) throw new Error("broadcast text exceeds 4000 characters");
  if (!["all", "buyers", "non_buyers", "subscribers"].includes(p.segment)) {
    throw new Error(`invalid segment: ${String(p.segment)}`);
  }
}

/**
 * Enqueue a broadcast. Returns the pg-boss job id. retryLimit=1: the consumer checkpoints
 * progress per batch, so a retry resumes rather than re-sending.
 */
export async function enqueueBroadcast(
  boss: Enqueuer,
  payload: BroadcastPayload,
): Promise<string | null> {
  validateBroadcast(payload);
  return boss.send(QUEUES.broadcast, payload, { retryLimit: 1 });
}

/** Tell buyers that a prompt they own has a new version. Deduped per (promptId, version). */
export async function enqueuePromptUpdated(
  boss: Enqueuer,
  payload: PromptUpdatedPayload,
): Promise<string | null> {
  return boss.send(QUEUES.promptUpdatedNotify, payload, {
    retryLimit: 1,
    singletonKey: `${payload.promptId}@${payload.version}`,
  });
}

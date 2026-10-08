/**
 * Platform-neutral "send a message" abstraction over grammY's `Api` (Telegram and Bale share the
 * Bot API shape). Jobs depend on `Messenger`, never on grammY directly, so tests use fakes.
 */
import type { Platform } from "@rasa/shared";
import type { Api } from "grammy";
import type { Clock } from "./deps";

export interface UrlButton {
  text: string;
  url: string;
}

export interface SendOpts {
  /** Telegram HTML parse mode. Ignored (sent as plain text) on Bale. */
  html?: boolean;
  buttons?: UrlButton[][];
  disablePreview?: boolean;
}

export interface Messenger {
  readonly platform: Platform;
  send(chatId: string, text: string, opts?: SendOpts): Promise<void>;
  getMe(): Promise<{ username: string }>;
  /** Cached bot username (for deep links). */
  botUsername(): Promise<string>;
}

/** Wraps a grammY `Api` instance. */
export function apiMessenger(platform: Platform, api: Api): Messenger {
  let username: string | null = null;
  const getMe = async () => {
    const me = await api.getMe();
    username = me.username;
    return { username: me.username };
  };
  return {
    platform,
    async send(chatId, text, opts = {}) {
      const other: Record<string, unknown> = {};
      if (opts.html && platform === "telegram") other.parse_mode = "HTML";
      if (opts.disablePreview) other.link_preview_options = { is_disabled: true };
      if (opts.buttons?.length) other.reply_markup = { inline_keyboard: opts.buttons };
      await api.sendMessage(chatId, text, other);
    },
    getMe,
    async botUsername() {
      if (username) return username;
      return (await getMe()).username;
    },
  };
}

/** `?start=` deep link into the bot. Telegram: t.me, Bale: ble.ir. */
export function deepLink(platform: Platform, botUsername: string, startPayload: string): string {
  const host = platform === "telegram" ? "https://t.me" : "https://ble.ir";
  return `${host}/${botUsername}?start=${encodeURIComponent(startPayload)}`;
}

export type SendErrorKind =
  | { kind: "blocked"; description: string } // 403: user blocked bot / deactivated / kicked
  | { kind: "rate_limited"; retryAfterSec: number } // 429
  | { kind: "bad_request"; description: string } // 400 (chat not found, parse error…)
  | { kind: "other"; description: string };

/** Duck-typed classification of grammY `GrammyError` (and Bale's identical error envelope). */
export function classifySendError(err: unknown): SendErrorKind {
  const e = err as {
    error_code?: number;
    description?: string;
    parameters?: { retry_after?: number };
    message?: string;
  };
  const description = e?.description ?? e?.message ?? String(err);
  if (e?.error_code === 429) {
    return { kind: "rate_limited", retryAfterSec: Math.max(1, e.parameters?.retry_after ?? 5) };
  }
  if (e?.error_code === 403) return { kind: "blocked", description };
  if (e?.error_code === 400) {
    // "chat not found" / "user is deactivated" are effectively unreachable recipients.
    if (/chat not found|user is deactivated|bot was blocked/i.test(description)) {
      return { kind: "blocked", description };
    }
    return { kind: "bad_request", description };
  }
  return { kind: "other", description };
}

/** Simple pacing limiter: at most `perSecond` acquisitions per second (evenly spaced). */
export function createRateLimiter(perSecond: number, clock: Clock): () => Promise<void> {
  const interval = 1000 / perSecond;
  let next = 0;
  return async () => {
    const now = clock.now().getTime();
    const wait = next - now;
    next = Math.max(now, next) + interval;
    if (wait > 0) await clock.sleep(wait);
  };
}

/** Telegram: 30 msg/s global limit → use 25 for headroom. Bale: undocumented → conservative 10. */
export const SEND_RATE_PER_SECOND: Record<Platform, number> = { telegram: 25, bale: 10 };

/**
 * Send with automatic 429 handling: waits `retry_after` and retries up to `maxRetries` times.
 * Other errors are thrown to the caller.
 */
export async function sendWithRetry(
  messenger: Messenger,
  clock: Clock,
  chatId: string,
  text: string,
  opts?: SendOpts,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await messenger.send(chatId, text, opts);
      return;
    } catch (err) {
      const c = classifySendError(err);
      if (c.kind === "rate_limited" && attempt < maxRetries) {
        await clock.sleep(c.retryAfterSec * 1000 + 250);
        continue;
      }
      throw err;
    }
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Removes HTML tags and decodes the basic entities (for Bale / plain-text fallback). */
export function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

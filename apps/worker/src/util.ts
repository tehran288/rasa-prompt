import type { Config, Platform } from "@rasa/shared";
import type { Clock, Messengers } from "./deps";
import type { Messenger, SendOpts } from "./messenger";
import { sendWithRetry } from "./messenger";

/** YYYY-MM-DD in Asia/Tehran (Iran has had no DST since 2022: fixed UTC+03:30). */
export function tehranDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function adminChatId(config: Config, platform: Platform): string {
  return platform === "telegram" ? config.TELEGRAM_ADMIN_CHAT_ID : config.BALE_ADMIN_CHAT_ID;
}

export function channelId(config: Config, platform: Platform): string {
  return platform === "telegram" ? config.TELEGRAM_CHANNEL_ID : config.BALE_CHANNEL_ID;
}

export function activeMessengers(messengers: Messengers): Messenger[] {
  return Object.values(messengers).filter((m): m is Messenger => Boolean(m));
}

interface NotifyDeps {
  config: Config;
  messengers: Messengers;
  clock: Clock;
  logger: { warn: (obj: object, msg?: string) => void };
}

/**
 * Sends `text` to every configured admin chat (Telegram and/or Bale). Never throws: a failure on
 * one platform is logged and the other platform still gets the message. Returns # delivered.
 */
export async function notifyAdmins(
  deps: NotifyDeps,
  text: string,
  opts?: SendOpts,
): Promise<number> {
  let delivered = 0;
  for (const m of activeMessengers(deps.messengers)) {
    const chat = adminChatId(deps.config, m.platform);
    if (!chat) continue;
    try {
      await sendWithRetry(m, deps.clock, chat, truncate(text, 4000), opts);
      delivered++;
    } catch (err) {
      deps.logger.warn({ err: errInfo(err), platform: m.platform }, "admin notify failed");
    }
  }
  return delivered;
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Safe-to-log error summary (never the request payload, which may contain tokens). */
export function errInfo(err: unknown): { message: string; code?: number } {
  const e = err as { message?: string; error_code?: number };
  return { message: e?.message ?? String(err), ...(e?.error_code ? { code: e.error_code } : {}) };
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/** Persian digits for admin-facing text. */
export function faNum(n: number): string {
  return n.toLocaleString("fa-IR");
}

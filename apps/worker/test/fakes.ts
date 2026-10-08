import {
  type Config,
  createLogger,
  type Locale,
  loadConfig,
  type Platform,
  type PromptDetail,
  type SettingsService,
  type User,
} from "@rasa/shared";
import { GrammyError } from "grammy";
import type { Clock } from "../src/deps";
import type { Messenger, SendOpts } from "../src/messenger";

export const logger = createLogger("test", "silent");

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: "test",
    TELEGRAM_BOT_TOKEN: "tg-token",
    BALE_BOT_TOKEN: "bale-token",
    TELEGRAM_ADMIN_CHAT_ID: "-100admin",
    BALE_ADMIN_CHAT_ID: "baleadmin",
    TELEGRAM_CHANNEL_ID: "@rasa_channel",
    BALE_CHANNEL_ID: "@rasa_bale",
    AI_DAILY_BUDGET_USD: "10",
    ...overrides,
  });
}

/** Virtual clock: sleep() advances time instantly and records the requested delays. */
export class FakeClock implements Clock {
  t: number;
  sleeps: number[] = [];
  constructor(start = Date.parse("2026-10-08T06:30:00Z")) {
    this.t = start;
  }
  now() {
    return new Date(this.t);
  }
  async sleep(ms: number) {
    this.sleeps.push(ms);
    this.t += ms;
  }
}

export interface Sent {
  chatId: string;
  text: string;
  opts?: SendOpts;
  at: number;
}

export class FakeMessenger implements Messenger {
  sent: Sent[] = [];
  attempts = 0;
  /** chatId → errors to throw on successive attempts (then succeed). */
  failures = new Map<string, unknown[]>();
  getMeError: unknown = null;
  constructor(
    readonly platform: Platform,
    private clock: FakeClock,
    readonly username = platform === "telegram" ? "RasaPromptBot" : "rasa_prompt_bot",
  ) {}
  async send(chatId: string, text: string, opts?: SendOpts) {
    this.attempts++;
    const queue = this.failures.get(chatId);
    if (queue?.length) throw queue.shift();
    this.sent.push({ chatId, text, opts, at: this.clock.t });
  }
  async getMe() {
    if (this.getMeError) throw this.getMeError;
    return { username: this.username };
  }
  async botUsername() {
    return this.username;
  }
  to(chatId: string) {
    return this.sent.filter((s) => s.chatId === chatId);
  }
}

export function apiError(code: number, description: string, retryAfter?: number): GrammyError {
  return new GrammyError(
    `Call to 'sendMessage' failed! (${code}: ${description})`,
    {
      ok: false,
      error_code: code,
      description,
      ...(retryAfter ? { parameters: { retry_after: retryAfter } } : {}),
    },
    "sendMessage",
    {},
  );
}

export class MemorySettings implements SettingsService {
  map = new Map<string, unknown>();
  async get<T>(key: string, fallback: T): Promise<T> {
    return this.map.has(key) ? (structuredClone(this.map.get(key)) as T) : fallback;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, structuredClone(value));
  }
}

export function makeUser(i: number, platform: Platform = "telegram", locale: Locale = "fa"): User {
  return {
    id: `u${i}`,
    platform,
    platformUserId: String(1000 + i),
    username: null,
    firstName: `User${i}`,
    locale,
    referralCode: `r${i}`,
    referredByUserId: null,
    isAdmin: false,
    isBanned: false,
    createdAt: new Date("2026-01-01"),
    lastSeenAt: new Date("2026-10-01"),
  };
}

export async function* batches<T>(items: T[], size: number): AsyncIterable<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

export function makePrompt(overrides: Partial<PromptDetail> = {}): PromptDetail {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    slug: "product-photo",
    title: "عکاسی محصول حرفه‌ای",
    summary: "عکس محصول استودیویی بدون استودیو",
    tier: "pro",
    outputType: "image",
    models: ["Midjourney", "Flux"],
    qualityScore: 88,
    lastTestedAt: new Date("2026-10-01"),
    priceToman: 49000,
    priceStars: 50,
    description: "توضیحات",
    categoryIds: [],
    version: "1.2.0",
    variables: [],
    preview: "You are a world-class product photographer…",
    exampleOutput: null,
    ...overrides,
  };
}

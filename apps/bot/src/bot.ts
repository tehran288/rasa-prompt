import { autoRetry } from "@grammyjs/auto-retry";
import { limit } from "@grammyjs/ratelimiter";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import {
  type AssistantAgents,
  type Config,
  createLogger,
  type Locale,
  LOCALES,
  type PaymentService,
  type Platform,
  type PlatformProfile,
} from "@rasa/shared";
import { Bot, type BotError, MemorySessionStorage, session } from "grammy";
import type { BotCommand } from "grammy/types";
import { disableOnUnsupported, getCapabilities } from "./capabilities";
import { isDomainError } from "./flow";
import { accountComposer } from "./handlers/account";
import { adminComposer } from "./handlers/admin";
import { browseComposer } from "./handlers/browse";
import { builderComposer } from "./handlers/builder";
import { inlineComposer } from "./handlers/inline";
import { menuComposer } from "./handlers/menu";
import { buyComposer, paymentsComposer } from "./handlers/payments";
import { promptComposer } from "./handlers/prompt";
import { supportComposer } from "./handlers/support";
import { textComposer } from "./handlers/text";
import { guessLocale, type MessageKey, t, tPlain } from "./i18n";
import type { AppDeps, BotContext, BotServices, CreateBotOptions, SessionData } from "./types";
import { render } from "./ui";

/** Re-upsert (lastSeenAt / profile refresh) at most this often per user. */
const SEEN_REFRESH_MS = 10 * 60_000;
/** Answer callback queries automatically after this delay if the handler hasn't. */
const CALLBACK_AUTO_ANSWER_MS = 1_200;

export const ALLOWED_UPDATES = [
  "message",
  "callback_query",
  "inline_query",
  "pre_checkout_query",
] as const;

export function botToken(platform: Platform, config: Config): string {
  return platform === "telegram" ? config.TELEGRAM_BOT_TOKEN : config.BALE_BOT_TOKEN;
}

export function apiRootFor(platform: Platform, config: Config): string {
  return platform === "telegram" ? config.TELEGRAM_API_ROOT : config.BALE_API_ROOT;
}

function errorKey(err: unknown): MessageKey {
  if (isDomainError(err, "not_found")) return "error.notFound";
  if (isDomainError(err, "rate_limited")) return "ai.busy";
  if (isDomainError(err, "invalid_state")) return "error.invalidState";
  if (err && typeof err === "object" && (err as { code?: unknown }).code === "refusal") {
    return "ai.refused";
  }
  return "error.generic";
}

/** Replies with a friendly localized error. Never throws. */
async function replyError(ctx: BotContext, app: AppDeps, err: unknown): Promise<void> {
  const locale: Locale = ctx.locale ?? guessLocale(ctx.from?.language_code);
  const key = errorKey(err);
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: tPlain(locale, key), show_alert: true }).catch(() => {});
    } else if (ctx.chat?.type === "private") {
      const r = render(app.caps, t(locale, key));
      await ctx.reply(r.text, r.parse_mode ? { parse_mode: r.parse_mode } : {});
    }
  } catch (replyErr) {
    app.logger.warn({ err: replyErr }, "could not deliver error message");
  }
}

/**
 * Builds the bot for one platform. One codebase serves Telegram and Bale; platform
 * differences are expressed through the capability map (see capabilities.ts).
 */
export function createBot(
  platform: Platform,
  config: Config,
  services: BotServices,
  ai: AssistantAgents,
  payments: PaymentService,
  options: CreateBotOptions = {},
): Bot<BotContext> {
  const logger = options.logger ?? createLogger(`bot-${platform}`, config.LOG_LEVEL);
  const app: AppDeps = {
    platform,
    config,
    services,
    ai,
    payments,
    caps: getCapabilities(platform, options.capabilities),
    logger,
    options,
    now: options.now ?? (() => new Date()),
  };

  const bot = new Bot<BotContext>(options.token ?? botToken(platform, config), {
    client: { apiRoot: options.apiRoot ?? apiRootFor(platform, config) },
    ...(options.botInfo ? { botInfo: options.botInfo } : {}),
  });

  // ── outgoing API: retry on 429/5xx, throttle to stay within flood limits ──
  if (options.autoRetry !== false) {
    bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 30 }));
  }
  if (options.apiThrottle !== false) bot.api.config.use(apiThrottler());

  // ── 1. error boundary: every handler error becomes a friendly localized message ──
  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      if (isDomainError(err, "banned")) return;
      logger.error({ err, updateId: ctx.update.update_id }, "update handler failed");
      await replyError(ctx, app, err);
    }
  });

  // ── 2. resolve the user (creates on first sight, applies ref_ codes on /start) ──
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from || from.is_bot) return; // channel posts, service messages: ignore
    const profile: PlatformProfile = {
      platform,
      platformUserId: String(from.id),
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      languageCode: from.language_code ?? null,
    };
    const text = ctx.message?.text ?? "";
    const isStart = /^\/start(?:@\w+)?(?:\s|$)/.test(text);
    const ref = isStart ? (/^\/start(?:@\w+)?\s+ref_([A-Za-z0-9_-]{1,32})/.exec(text)?.[1] ?? null) : null;
    let user = isStart ? null : await services.users.getByPlatformId(platform, profile.platformUserId);
    let created = false;
    if (!user || isStart || app.now().getTime() - user.lastSeenAt.getTime() > SEEN_REFRESH_MS) {
      const res = await services.users.upsert(profile, ref);
      user = res.user;
      created = res.created;
    }
    ctx.user = user;
    ctx.locale = user.locale;
    ctx.isNewUser = created;
    ctx.isAdmin = services.users.isAdmin(user);
    ctx.t = (key, params) => t(ctx.locale, key, params);
    ctx.tp = (key, params) => tPlain(ctx.locale, key, params);
    await next();
  });

  // ── 3. per-user session (state machine for multi-step flows) ──
  bot.use(
    session<SessionData, BotContext>({
      initial: () => ({ step: { kind: "idle" } }),
      storage: options.storage ?? new MemorySessionStorage<SessionData>(),
      getSessionKey: (ctx) => (ctx.from ? `${platform}:${ctx.from.id}` : undefined),
    }),
  );

  // ── 4. callback queries are always answered (stops the client spinner) ──
  bot.on("callback_query", async (ctx, next) => {
    let answered = false;
    const original = ctx.answerCallbackQuery.bind(ctx);
    const answer = (...args: Parameters<typeof original>) => {
      if (answered) return Promise.resolve(true as const);
      answered = true;
      return original(...args);
    };
    ctx.answerCallbackQuery = answer;
    const timer = setTimeout(() => {
      answer().catch(() => {});
    }, CALLBACK_AUTO_ANSWER_MS);
    try {
      await next();
    } finally {
      clearTimeout(timer);
      if (!answered) await answer().catch(() => {});
    }
  });

  // ── 5. payments: before ban/rate-limit — an authorised payment is always honoured ──
  bot.use(paymentsComposer(app));

  // ── 6. banned users are silently ignored ──
  bot.use(async (ctx, next) => {
    if (ctx.user.isBanned && !ctx.isAdmin) return;
    await next();
  });

  // ── 7. per-user flood control ──
  if (options.rateLimit !== false) {
    const rl = options.rateLimit ?? { timeFrame: 3_000, limit: 8 };
    bot.use(
      limit<BotContext, never>({
        timeFrame: rl.timeFrame,
        limit: rl.limit,
        keyGenerator: (ctx) => ctx.from?.id.toString(),
        onLimitExceeded: async (ctx) => {
          if (ctx.callbackQuery) {
            await ctx.answerCallbackQuery({ text: ctx.tp("error.rateLimited") }).catch(() => {});
          } else if (ctx.chat?.type === "private") {
            await ctx.reply(ctx.tp("error.rateLimited")).catch(() => {});
          }
        },
      }),
    );
  }

  // ── 8. features ──
  bot.use(menuComposer(app));
  bot.use(adminComposer(app));
  bot.use(browseComposer(app));
  bot.use(promptComposer(app));
  bot.use(builderComposer(app));
  bot.use(accountComposer(app));
  bot.use(buyComposer(app));
  bot.use(supportComposer(app));
  bot.use(inlineComposer(app));
  bot.use(textComposer(app));

  // ── last resort (errors thrown outside the boundary, e.g. in session storage) ──
  bot.catch(async (err: BotError<BotContext>) => {
    logger.error({ err: err.error, updateId: err.ctx.update.update_id }, "unhandled bot error");
    await replyError(err.ctx, app, err.error);
  });

  appDepsByBot.set(bot, app);
  return bot;
}

const appDepsByBot = new WeakMap<Bot<BotContext>, AppDeps>();

/** The deps a bot was built with (capabilities etc.) — for main.ts and tests. */
export function getAppDeps(bot: Bot<BotContext>): AppDeps {
  const app = appDepsByBot.get(bot);
  if (!app) throw new Error("bot was not created by createBot()");
  return app;
}

const USER_COMMANDS: { command: string; key: MessageKey }[] = [
  { command: "start", key: "cmd.start" },
  { command: "search", key: "cmd.search" },
  { command: "build", key: "cmd.build" },
  { command: "library", key: "cmd.library" },
  { command: "account", key: "cmd.account" },
  { command: "invite", key: "cmd.invite" },
  { command: "support", key: "cmd.support" },
  { command: "language", key: "cmd.language" },
  { command: "help", key: "cmd.help" },
];

const ADMIN_COMMANDS: BotCommand[] = [
  { command: "admin", description: "پنل مدیریت" },
  { command: "stats", description: "آمار امروز" },
  { command: "review", description: "صف بررسی پیش‌نویس‌ها" },
  { command: "tickets", description: "درخواست‌های باز" },
  { command: "broadcast", description: "ارسال همگانی" },
  { command: "reply", description: "پاسخ به درخواست: /reply id متن" },
  { command: "close", description: "بستن درخواست: /close id" },
  { command: "ban", description: "مسدودسازی کاربر" },
  { command: "unban", description: "رفع مسدودی" },
];

export function userCommands(locale: Locale): BotCommand[] {
  return USER_COMMANDS.map((c) => ({ command: c.command, description: tPlain(locale, c.key) }));
}

/**
 * Installs the command menu (localized per language_code) — capability-gated and
 * feature-detected: a "method not found" answer switches the capability off.
 */
export async function registerCommands(bot: Bot<BotContext>): Promise<void> {
  const app = getAppDeps(bot);
  if (!app.caps.setMyCommands) return;
  try {
    await bot.api.setMyCommands(userCommands("fa"));
    for (const l of LOCALES) {
      await bot.api.setMyCommands(userCommands(l), { language_code: l });
    }
    const adminIds =
      app.platform === "telegram" ? app.config.TELEGRAM_ADMIN_IDS : app.config.BALE_ADMIN_IDS;
    for (const id of adminIds) {
      if (!/^-?\d+$/.test(id)) continue;
      await bot.api.setMyCommands([...userCommands("fa"), ...ADMIN_COMMANDS], {
        scope: { type: "chat", chat_id: Number(id) },
      });
    }
  } catch (err) {
    if (disableOnUnsupported(app.caps, "setMyCommands", err)) {
      app.logger.info("setMyCommands not supported on this platform — skipped");
    } else {
      app.logger.warn({ err }, "setMyCommands failed");
    }
  }
}

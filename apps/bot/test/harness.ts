/**
 * Test harness: builds a real grammY bot with fakes, captures every outgoing Bot API call
 * via an API transformer (no network), and feeds synthetic updates via bot.handleUpdate.
 */
import { createLogger, loadConfig, type Platform } from "@rasa/shared";
import type { Update, UserFromGetMe } from "grammy/types";
import { createBot } from "../src/bot";
import type { BroadcastPayload, CreateBotOptions } from "../src/types";
import { createFakeAi, createFakePayments, createFakeServices } from "./fakes";

export const BOT_INFO = {
  id: 999,
  is_bot: true,
  first_name: "Rasa Prompt",
  username: "RasaPromptBot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: true,
  can_connect_to_business: false,
  has_main_web_app: false,
} as unknown as UserFromGetMe;

export const ADMIN_ID = 1000;
export const ADMIN_CHAT = -100500;

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

export function createHarness(
  platform: Platform = "telegram",
  opts: { options?: Partial<CreateBotOptions>; baleToken?: string; adminChat?: boolean } = {},
) {
  const config = loadConfig({
    NODE_ENV: "test",
    TELEGRAM_BOT_TOKEN: "123:test",
    BALE_BOT_TOKEN: "456:test",
    TELEGRAM_ADMIN_IDS: String(ADMIN_ID),
    BALE_ADMIN_IDS: String(ADMIN_ID),
    TELEGRAM_ADMIN_CHAT_ID: opts.adminChat === false ? "" : String(ADMIN_CHAT),
    BALE_ADMIN_CHAT_ID: opts.adminChat === false ? "" : String(ADMIN_CHAT),
    FREE_AI_BUILDS_PER_DAY: "2",
  });
  const { services, state } = createFakeServices({ adminPlatformIds: [String(ADMIN_ID)] });
  const ai = createFakeAi();
  const payments = createFakePayments(services, { baleToken: opts.baleToken ?? "wallet-token" });
  const broadcasts: BroadcastPayload[] = [];
  const bot = createBot(platform, config, services, ai, payments, {
    botInfo: BOT_INFO,
    rateLimit: false,
    apiThrottle: false,
    autoRetry: false,
    logger: createLogger("bot-test", "silent"),
    enqueueBroadcast: async (p) => {
      broadcasts.push(p);
      return "job-1";
    },
    ...opts.options,
  });

  const calls: ApiCall[] = [];
  let messageId = 100;
  bot.api.config.use(async (_prev, method, payload) => {
    const p = (payload ?? {}) as Record<string, unknown>;
    calls.push({ method, payload: p });
    let result: unknown = true;
    if (method.startsWith("send") || method === "editMessageText") {
      result = {
        message_id: ++messageId,
        date: 0,
        chat: { id: p.chat_id ?? 0, type: "private" },
        text: p.text ?? "",
        from: BOT_INFO,
      };
    }
    // biome-ignore lint/suspicious/noExplicitAny: transformer must return the raw API response
    return { ok: true, result } as any;
  });

  let updateId = 0;
  const fromOf = (userId: number, lang = "fa") => ({
    id: userId,
    is_bot: false,
    first_name: `User${userId}`,
    username: `user${userId}`,
    language_code: lang,
  });

  async function handle(update: Omit<Update, "update_id">) {
    await bot.handleUpdate({ update_id: ++updateId, ...update } as Update);
  }

  function message(
    text: string,
    userId = 1,
    extra: { lang?: string; chatId?: number; replyTo?: { text: string } } = {},
  ) {
    const cmd = /^\/\w+(@\w+)?/.exec(text);
    const chatId = extra.chatId ?? userId;
    return handle({
      message: {
        message_id: ++messageId,
        date: 0,
        chat:
          chatId < 0
            ? { id: chatId, type: "supergroup", title: "Admins" }
            : { id: chatId, type: "private", first_name: `User${userId}` },
        from: fromOf(userId, extra.lang),
        text,
        ...(cmd ? { entities: [{ type: "bot_command", offset: 0, length: cmd[0].length }] } : {}),
        ...(extra.replyTo
          ? {
              reply_to_message: {
                message_id: 1,
                date: 0,
                chat: { id: chatId, type: "supergroup", title: "Admins" },
                from: BOT_INFO,
                text: extra.replyTo.text,
              },
            }
          : {}),
      },
    } as Omit<Update, "update_id">);
  }

  function tap(data: string, userId = 1) {
    return handle({
      callback_query: {
        id: `cq${++updateId}`,
        from: fromOf(userId),
        chat_instance: "ci",
        data,
        message: {
          message_id: messageId,
          date: 0,
          chat: { id: userId, type: "private", first_name: `User${userId}` },
          from: BOT_INFO,
          text: "previous screen",
        },
      },
    } as Omit<Update, "update_id">);
  }

  function inline(query: string, userId = 1) {
    return handle({
      inline_query: { id: `iq${++updateId}`, from: fromOf(userId), query, offset: "" },
    } as Omit<Update, "update_id">);
  }

  function preCheckout(payload: string, currency: string, total: number, userId = 1) {
    return handle({
      pre_checkout_query: {
        id: `pc${++updateId}`,
        from: fromOf(userId),
        currency,
        total_amount: total,
        invoice_payload: payload,
      },
    } as Omit<Update, "update_id">);
  }

  function successfulPayment(payload: string, currency: string, total: number, userId = 1) {
    return handle({
      message: {
        message_id: ++messageId,
        date: 0,
        chat: { id: userId, type: "private", first_name: `User${userId}` },
        from: fromOf(userId),
        successful_payment: {
          currency,
          total_amount: total,
          invoice_payload: payload,
          telegram_payment_charge_id: `charge-${payload}`,
          provider_payment_charge_id: `prov-${payload}`,
        },
      },
    } as Omit<Update, "update_id">);
  }

  /** Text of every outgoing message/edit, in order. */
  const texts = () =>
    calls
      .filter((c) => typeof c.payload.text === "string")
      .map((c) => c.payload.text as string);
  const lastText = () => texts().at(-1) ?? "";
  const byMethod = (m: string) => calls.filter((c) => c.method === m);
  /** Every outgoing payload serialized — for "never leaks" assertions. */
  const allOutgoing = () => JSON.stringify(calls);
  /** callback_data values of the last message's inline keyboard. */
  const lastButtons = (): { text: string; data?: string; url?: string }[] => {
    const withMarkup = calls.filter((c) => c.payload.reply_markup).at(-1);
    const markup = withMarkup?.payload.reply_markup as
      | { inline_keyboard?: { text: string; callback_data?: string; url?: string }[][] }
      | undefined;
    return (markup?.inline_keyboard ?? []).flat().map((b) => ({
      text: b.text,
      ...(b.callback_data ? { data: b.callback_data } : {}),
      ...(b.url ? { url: b.url } : {}),
    }));
  };
  const reset = () => {
    calls.length = 0;
  };

  /** Creates a user who already finished onboarding. */
  async function onboard(userId = 1, lang = "fa") {
    await message("/start", userId, { lang });
    await tap(`l:${lang}`, userId);
    reset();
  }

  const userOf = (platformId: number) =>
    [...state.users.values()].find((u) => u.platformUserId === String(platformId));

  return {
    bot,
    config,
    services,
    state,
    ai,
    payments,
    broadcasts,
    calls,
    message,
    tap,
    inline,
    preCheckout,
    successfulPayment,
    texts,
    lastText,
    byMethod,
    allOutgoing,
    lastButtons,
    reset,
    onboard,
    userOf,
  };
}

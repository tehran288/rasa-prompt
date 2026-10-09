/**
 * Production wiring: real Postgres services, AI router, payments and the broadcast queue.
 * Tests never import this file — they build the bot with in-memory fakes (test/fakes.ts).
 */
import { createAiRouter, createAssistantAgents } from "@rasa/ai";
import { createDb, createServices, createSessionStorage } from "@rasa/db";
import { createPaymentService, type RasaPaymentService } from "@rasa/payments";
import type { AssistantAgents, Config, Logger, Platform } from "@rasa/shared";
import { enqueueBroadcast } from "@rasa/worker/public";
import type { Api, StorageAdapter } from "grammy";
import { PgBoss } from "pg-boss";
import type { BotServices, BroadcastPayload, SessionData } from "./types";

export interface Container {
  services: BotServices;
  ai: AssistantAgents;
  payments: RasaPaymentService;
  storage: StorageAdapter<SessionData>;
  enqueueBroadcast: (payload: BroadcastPayload) => Promise<string | null>;
  /** Late-binds the bot API (payments need refundStarPayment, the bot needs payments). */
  bindApi(api: Api): void;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export async function createContainer(
  config: Config,
  platform: Platform,
  logger: Logger,
): Promise<Container> {
  const handle = createDb(config.DATABASE_URL);
  const services = createServices(handle.db, {
    referralRewardCredits: config.REFERRAL_REWARD_CREDITS,
    adminIds: { telegram: config.TELEGRAM_ADMIN_IDS, bale: config.BALE_ADMIN_IDS },
  });

  const router = createAiRouter(config, { settings: services.settings, logger });
  const ai = createAssistantAgents(router, {
    catalog: services.catalog,
    orders: services.orders,
    entitlements: services.entitlements,
    credits: services.credits,
    tickets: services.tickets,
    logger,
  });

  let api: Api | null = null;
  const payments = createPaymentService(config, {
    orders: services.orders,
    products: services.products,
    entitlements: services.entitlements,
    credits: services.credits,
    referrals: services.referrals,
    users: services.users,
    analytics: services.analytics,
    logger,
    // Called with the payer's Telegram user id (User.platformUserId) and the charge id.
    refundStars:
      platform === "telegram"
        ? async (platformUserId, chargeId) => {
            if (!api) throw new Error("bot api not bound yet");
            await api.refundStarPayment(Number(platformUserId), chargeId);
          }
        : undefined,
  });

  // Producer-only pg-boss instance: the worker owns scheduling/maintenance.
  const boss = new PgBoss({
    connectionString: config.DATABASE_URL,
    schema: "pgboss",
    supervise: false,
    schedule: false,
  });
  boss.on("error", (err: Error) =>
    logger.error({ err: { message: err.message } }, "pg-boss error"),
  );
  let bossStarted = false;
  try {
    await boss.start();
    bossStarted = true;
  } catch (err) {
    logger.error({ err }, "pg-boss start failed — broadcasts disabled until restart");
  }

  return {
    services,
    ai,
    payments,
    storage: createSessionStorage<SessionData>(handle.db, "bot:"),
    enqueueBroadcast: async (payload) => {
      if (!bossStarted) throw new Error("broadcast queue unavailable");
      return enqueueBroadcast(boss, payload);
    },
    bindApi(a) {
      api = a;
    },
    async ready() {
      await handle.sql`select 1`;
      return true;
    },
    async close() {
      if (bossStarted) await boss.stop({ graceful: true }).catch(() => {});
      await handle.close();
    },
  };
}

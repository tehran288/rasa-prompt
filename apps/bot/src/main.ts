/**
 * Bot process entrypoint (one process per platform: PLATFORM=telegram|bale).
 *   - BOT_MODE=polling  → long polling (dev)
 *   - BOT_MODE=webhook  → setWebhook + Hono webhook route (prod)
 * GET /healthz and /readyz are served on PORT in BOTH modes (Docker health checks).
 */
import { serve } from "@hono/node-server";
import { createLogger, loadConfig } from "@rasa/shared";
import { ALLOWED_UPDATES, createBot, getAppDeps, registerCommands } from "./bot";
import { createContainer } from "./container";
import { createServer, webhookPath } from "./server";

async function main(): Promise<void> {
  const config = loadConfig();
  const platform = config.PLATFORM;
  const logger = createLogger(`bot-${platform}`, config.LOG_LEVEL);

  const token = platform === "telegram" ? config.TELEGRAM_BOT_TOKEN : config.BALE_BOT_TOKEN;
  if (!token) throw new Error(`${platform.toUpperCase()}_BOT_TOKEN is not set`);

  const container = await createContainer(config, platform, logger);
  const bot = createBot(platform, config, container.services, container.ai, container.payments, {
    storage: container.storage,
    enqueueBroadcast: container.enqueueBroadcast,
    logger,
    ...(process.env.BOT_DEEP_LINK_BASE ? { deepLinkBase: process.env.BOT_DEEP_LINK_BASE } : {}),
  });
  container.bindApi(bot.api);
  const caps = getAppDeps(bot).caps;

  await bot.init(); // getMe
  logger.info({ username: bot.botInfo.username, platform }, "bot identity resolved");
  await registerCommands(bot);

  const webhook = config.BOT_MODE === "webhook";
  const server = serve({
    fetch: createServer({
      platform,
      secret: config.WEBHOOK_SECRET,
      ready: () => container.ready(),
      ...(webhook ? { bot, checkHeader: caps.webhookSecretToken } : {}),
    }).fetch,
    port: config.PORT,
  });
  logger.info({ port: config.PORT, mode: config.BOT_MODE }, "http server listening");

  if (webhook) {
    if (!config.WEBHOOK_PUBLIC_URL || !config.WEBHOOK_SECRET) {
      throw new Error("WEBHOOK_PUBLIC_URL and WEBHOOK_SECRET are required in webhook mode");
    }
    const url = `${config.WEBHOOK_PUBLIC_URL.replace(/\/+$/, "")}${webhookPath(platform, config.WEBHOOK_SECRET)}`;
    await bot.api.setWebhook(url, {
      allowed_updates: [...ALLOWED_UPDATES],
      ...(caps.webhookSecretToken ? { secret_token: config.WEBHOOK_SECRET } : {}),
    });
    logger.info({ platform }, "webhook registered");
  } else {
    await bot.api.deleteWebhook().catch((err: unknown) => logger.warn({ err }, "deleteWebhook failed"));
    void bot.start({
      allowed_updates: [...ALLOWED_UPDATES],
      onStart: () => logger.info("long polling started"),
    });
  }

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "shutting down");
    const force = setTimeout(() => process.exit(1), 20_000);
    force.unref();
    try {
      if (!webhook) await bot.stop();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await container.close();
    } catch (err) {
      logger.error({ err }, "error during shutdown");
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("bot failed to start", err);
  process.exit(1);
});

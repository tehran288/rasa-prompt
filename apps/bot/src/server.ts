import { timingSafeEqual } from "node:crypto";
import type { Platform } from "@rasa/shared";
import { type Bot, webhookCallback } from "grammy";
import { Hono } from "hono";
import type { BotContext } from "./types";

export interface ServerOptions {
  platform: Platform;
  /** Path secret (and Telegram X-Telegram-Bot-Api-Secret-Token). Required for the webhook route. */
  secret: string;
  /** Mount POST /webhook/<platform>/<secret> (webhook mode only). */
  bot?: Bot<BotContext>;
  /** Check the Telegram secret header too (Bale does not send it). */
  checkHeader?: boolean;
  /** Readiness probe, e.g. a DB ping. */
  ready?: () => Promise<boolean>;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * HTTP surface of the bot process. Always serves /healthz and /readyz (Docker
 * health checks), and in webhook mode also the update endpoint.
 */
export function createServer(opts: ServerOptions): Hono {
  const app = new Hono();
  const startedAt = Date.now();

  app.get("/healthz", (c) =>
    c.json({
      ok: true,
      platform: opts.platform,
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    }),
  );

  app.get("/readyz", async (c) => {
    let ready = true;
    try {
      ready = opts.ready ? await opts.ready() : true;
    } catch {
      ready = false;
    }
    return c.json({ ok: ready }, ready ? 200 : 503);
  });

  if (opts.bot) {
    if (!opts.secret) throw new Error("WEBHOOK_SECRET is required in webhook mode");
    const handle = webhookCallback(opts.bot, "hono", {
      onTimeout: "return",
      timeoutMilliseconds: 9_000,
      ...(opts.checkHeader ? { secretToken: opts.secret } : {}),
    });
    app.post("/webhook/:platform/:secret", async (c) => {
      if (
        c.req.param("platform") !== opts.platform ||
        !safeEqual(c.req.param("secret"), opts.secret)
      ) {
        return c.json({ ok: false }, 404);
      }
      return handle(c);
    });
  }

  app.notFound((c) => c.json({ ok: false }, 404));
  return app;
}

export function webhookPath(platform: Platform, secret: string): string {
  return `/webhook/${platform}/${secret}`;
}

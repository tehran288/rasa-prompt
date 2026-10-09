import type { ConciergeResult } from "@rasa/shared";
import { Composer } from "grammy";
import { aiErrorKey, aiTimeout, resetStep, withTimeout } from "../flow";
import { escapeHtml } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { mainInlineMenu, screenForLabel, send } from "../ui";
import { showAccount } from "./account";
import { broadcastText } from "./admin";
import { runSearch } from "./browse";
import { buildFromIdea } from "./builder";
import { openScreen } from "./menu";
import { wizardAnswer } from "./prompt";
import { relayAdminReply, startSupport, supportMessage } from "./support";

const CONCIERGE_TIMEOUT_MS = 8_000;

/** Free text with no active flow: AI concierge routes it; plain search if AI is unavailable. */
async function concierge(ctx: BotContext, app: AppDeps, text: string): Promise<void> {
  let r: ConciergeResult;
  try {
    r = await withTimeout(
      app.ai.concierge(text, ctx.locale),
      Math.min(aiTimeout(app), CONCIERGE_TIMEOUT_MS),
      "concierge",
    );
  } catch (err) {
    app.logger.info({ err: aiErrorKey(err) ?? String(err) }, "concierge unavailable — plain search");
    return runSearch(ctx, app, text);
  }
  switch (r.intent) {
    case "search":
      return runSearch(ctx, app, r.query?.trim() || text);
    case "build_prompt":
      ctx.session.step = { kind: "builder" };
      return buildFromIdea(ctx, app, text);
    case "support":
      await startSupport(ctx, app);
      return supportMessage(ctx, app, text);
    case "buy":
    case "account":
      return showAccount(ctx, app);
    case "unsafe":
      return send(ctx, app, ctx.t("concierge.unsafe"));
    default:
      await send(
        ctx,
        app,
        r.reply ? escapeHtml(r.reply) : ctx.t("concierge.fallback"),
        mainInlineMenu(ctx.locale),
      );
  }
}

export function textComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();

  c.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const step0 = ctx.session.step.kind;
    // In groups (the admin chat) only admin flows react to plain text.
    if (ctx.chat.type !== "private" && step0 !== "admin_reply" && step0 !== "admin_broadcast") {
      return;
    }
    if (text.startsWith("/")) {
      await send(ctx, app, ctx.t("unknown.command"));
      return;
    }
    // Reply-keyboard taps always win: they are the user's escape hatch from any flow.
    const screen = screenForLabel(text);
    if (screen) return openScreen(ctx, app, screen);

    const step = ctx.session.step;
    switch (step.kind) {
      case "await_search":
        resetStep(ctx);
        return runSearch(ctx, app, text);
      case "wizard":
        return wizardAnswer(ctx, app, text);
      case "builder":
        return buildFromIdea(ctx, app, text);
      case "support":
        return supportMessage(ctx, app, text);
      case "admin_reply":
        if (!ctx.isAdmin) break;
        resetStep(ctx);
        await relayAdminReply(ctx, app, step.ticketId, text);
        return;
      case "admin_broadcast":
        if (!ctx.isAdmin) break;
        if (step.stage === "text") return broadcastText(ctx, app, text);
        break;
      case "idle":
        break;
    }
    resetStep(ctx);
    return concierge(ctx, app, text);
  });

  c.on("message", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await send(ctx, app, ctx.t("unknown.media"));
  });
  return c;
}


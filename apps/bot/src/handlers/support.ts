import { DEFAULT_LOCALE, type Ticket, type User } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import { aiTimeout, resetStep, track, withTimeout } from "../flow";
import { escapeHtml, t, tPlain } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { navRow, send, sendTo, show, truncate } from "../ui";
import { adminTargets } from "./payments";
import { typing } from "./prompt";

const MAX_HISTORY = 12;
/** Language-independent tag used to find the ticket when an admin replies to a forwarded message. */
export const ticketTag = (ticketId: string) => `#T${ticketId}`;
export const TICKET_TAG_RE = /#T([A-Za-z0-9_-]+)/;

function userLabel(u: Pick<User, "firstName" | "username" | "platformUserId">): string {
  const name = [u.firstName, u.username ? `@${u.username}` : null].filter(Boolean).join(" ");
  return `${name || "—"} (${u.platformUserId})`;
}

function supportKeyboard(ctx: BotContext): InlineKeyboard {
  const k = new InlineKeyboard()
    .text(ctx.tp("btn.human"), cb.supportHuman())
    .text(ctx.tp("btn.endSupport"), cb.supportEnd())
    .row();
  return navRow(k, ctx.locale);
}

function adminTicketKeyboard(ticketId: string): InlineKeyboard {
  const L = DEFAULT_LOCALE;
  return new InlineKeyboard()
    .text(tPlain(L, "btn.admin.reply"), cb.adminReply(ticketId))
    .text(tPlain(L, "btn.admin.close"), cb.adminClose(ticketId));
}

/** Sends a ticket message to the admin chat (or every admin) with Reply/Close buttons. */
async function forwardToAdmins(
  ctx: BotContext,
  app: AppDeps,
  ticket: Ticket,
  text: string,
  isNew: boolean,
): Promise<void> {
  const L = DEFAULT_LOCALE; // the support team works in Persian
  const params = {
    tag: ticketTag(ticket.id),
    user: userLabel(ctx.user),
    subject: ticket.subject,
    text: truncate(text, 3000),
  };
  const body = `${t(L, isNew ? "admin.ticketNew" : "admin.ticketMsg", params)}\n\n<i>${t(L, "admin.ticketHint")}</i>`;
  for (const chatId of adminTargets(app)) {
    try {
      await sendTo(app, ctx.api, chatId, body, adminTicketKeyboard(ticket.id));
    } catch (err) {
      app.logger.warn({ err, chatId, ticketId: ticket.id }, "forward to admins failed");
    }
  }
}

export async function startSupport(ctx: BotContext, app: AppDeps): Promise<void> {
  const active = await app.services.tickets.activeForUser(ctx.user.id);
  ctx.session.step = { kind: "support", history: [], ticketId: active?.id ?? null };
  track(app, "support_opened", ctx.user.id, { existingTicket: active?.id ?? null });
  await show(ctx, app, ctx.t("support.intro"), supportKeyboard(ctx));
}

async function escalate(
  ctx: BotContext,
  app: AppDeps,
  message: string,
  note?: string,
): Promise<void> {
  const step = ctx.session.step;
  const history = step.kind === "support" ? step.history : [];
  const subject = truncate(message.replace(/\s+/g, " "), 60) || ctx.t("support.subject");
  const ticket = await app.services.tickets.open(ctx.user.id, subject, message);
  // keep the AI's answers in the ticket so the human sees the context
  for (const m of history) {
    if (m.role === "assistant") await app.services.tickets.addMessage(ticket.id, "ai", m.content);
  }
  await app.services.tickets.setStatus(ticket.id, "waiting_admin");
  ctx.session.step = { kind: "support", history, ticketId: ticket.id };
  track(app, "support_opened", ctx.user.id, { ticketId: ticket.id, escalated: true });
  await forwardToAdmins(ctx, app, ticket, message, true);
  const text = [note, ctx.t("support.escalated", { ticket: ticket.id })]
    .filter(Boolean)
    .join("\n\n");
  await send(ctx, app, text, supportKeyboard(ctx));
}

/** A user message while in support mode. */
export async function supportMessage(ctx: BotContext, app: AppDeps, text: string): Promise<void> {
  const step = ctx.session.step;
  if (step.kind !== "support") return;

  // A human is already on it → append to the ticket and relay.
  if (step.ticketId) {
    const data = await app.services.tickets.get(step.ticketId);
    if (data && data.ticket.status !== "closed") {
      await app.services.tickets.addMessage(step.ticketId, "user", text);
      await app.services.tickets.setStatus(step.ticketId, "waiting_admin");
      await forwardToAdmins(ctx, app, data.ticket, text, false);
      await send(
        ctx,
        app,
        ctx.t("support.forwarded", { ticket: step.ticketId }),
        supportKeyboard(ctx),
      );
      return;
    }
    step.ticketId = null; // closed meanwhile → start fresh
  }
  if (step.human) return escalate(ctx, app, text);

  await typing(ctx);
  let res: { answer: string; escalate: boolean; reason?: string };
  try {
    res = await withTimeout(
      app.ai.support({
        userId: ctx.user.id,
        locale: ctx.locale,
        history: step.history,
        message: text,
      }),
      aiTimeout(app),
      "support",
    );
  } catch (err) {
    app.logger.warn({ err }, "ai.support failed — escalating");
    return escalate(ctx, app, text, ctx.t("support.aiUnavailable"));
  }
  const history = [
    ...step.history,
    { role: "user" as const, content: text },
    { role: "assistant" as const, content: res.answer },
  ].slice(-MAX_HISTORY);
  ctx.session.step = { kind: "support", history, ticketId: null };
  if (res.answer)
    await send(ctx, app, escapeHtml(res.answer), res.escalate ? undefined : supportKeyboard(ctx));
  if (res.escalate) await escalate(ctx, app, text);
}

/** Admin → user relay. Used by /reply, reply-to-message and the "Reply" button flow. */
export async function relayAdminReply(
  ctx: BotContext,
  app: AppDeps,
  ticketId: string,
  text: string,
): Promise<boolean> {
  const data = await app.services.tickets.get(ticketId);
  if (!data) {
    await send(ctx, app, ctx.t("admin.ticketNotFound"));
    return false;
  }
  const user = await app.services.users.getById(data.ticket.userId);
  if (!user) {
    await send(ctx, app, ctx.t("admin.userNotFound"));
    return false;
  }
  await app.services.tickets.addMessage(ticketId, "admin", text);
  await app.services.tickets.setStatus(ticketId, "waiting_user");
  const L = user.locale;
  const k = new InlineKeyboard()
    .text(tPlain(L, "btn.replySupport"), `sup:c:${ticketId}`)
    .text(tPlain(L, "btn.endSupport"), `sup:d:${ticketId}`);
  await sendTo(
    app,
    ctx.api,
    user.platformUserId,
    t(L, "support.adminReply", { ticket: ticketId, text }),
    k,
  );
  await send(ctx, app, ctx.t("admin.replySent"));
  return true;
}

export async function closeTicket(ctx: BotContext, app: AppDeps, ticketId: string): Promise<void> {
  const data = await app.services.tickets.get(ticketId);
  if (!data) {
    await send(ctx, app, ctx.t("admin.ticketNotFound"));
    return;
  }
  await app.services.tickets.setStatus(ticketId, "closed");
  const user = await app.services.users.getById(data.ticket.userId);
  if (user) {
    try {
      await sendTo(
        app,
        ctx.api,
        user.platformUserId,
        t(user.locale, "support.closedByAdmin", { ticket: ticketId }),
      );
    } catch (err) {
      app.logger.warn({ err, ticketId }, "notify user of close failed");
    }
  }
  await send(ctx, app, ctx.t("admin.ticketClosed", { tag: ticketTag(ticketId) }));
}

export function supportComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.command("support", (ctx) => {
    resetStep(ctx);
    return startSupport(ctx, app);
  });
  c.callbackQuery("sup:h", async (ctx) => {
    const step = ctx.session.step;
    const lastUser =
      step.kind === "support"
        ? [...step.history].reverse().find((m) => m.role === "user")
        : undefined;
    if (step.kind === "support" && step.ticketId) {
      await send(ctx, app, ctx.t("support.replyAsk"));
      return;
    }
    if (lastUser) return escalate(ctx, app, lastUser.content);
    ctx.session.step = {
      kind: "support",
      history: step.kind === "support" ? step.history : [],
      ticketId: null,
      human: true,
    };
    await send(ctx, app, ctx.t("support.humanAsk"), navRow(new InlineKeyboard(), ctx.locale));
  });
  c.callbackQuery("sup:x", async (ctx) => {
    const step = ctx.session.step;
    if (step.kind === "support" && step.ticketId) {
      await app.services.tickets.setStatus(step.ticketId, "closed");
    }
    resetStep(ctx);
    await show(ctx, app, ctx.t("support.closedByUser"), navRow(new InlineKeyboard(), ctx.locale));
  });
  // From an admin reply: continue the conversation in that ticket.
  c.callbackQuery(/^sup:c:(.+)$/, async (ctx) => {
    const ticketId = ctx.match[1] ?? "";
    const data = await app.services.tickets.get(ticketId);
    if (!data || data.ticket.userId !== ctx.user.id || data.ticket.status === "closed") {
      return startSupport(ctx, app);
    }
    ctx.session.step = { kind: "support", history: [], ticketId };
    await send(ctx, app, ctx.t("support.replyAsk"), supportKeyboard(ctx));
  });
  c.callbackQuery(/^sup:d:(.+)$/, async (ctx) => {
    const ticketId = ctx.match[1] ?? "";
    const data = await app.services.tickets.get(ticketId);
    if (data && data.ticket.userId === ctx.user.id) {
      await app.services.tickets.setStatus(ticketId, "closed");
    }
    resetStep(ctx);
    await send(ctx, app, ctx.t("support.closedByUser"), navRow(new InlineKeyboard(), ctx.locale));
  });
  return c;
}

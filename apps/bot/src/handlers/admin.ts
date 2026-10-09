import { LOCALES, type Locale } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import { resetStep, track } from "../flow";
import { escapeHtml, formatDate, formatNumber, formatStars, formatToman, isLocale, raw } from "../i18n";
import type { AppDeps, BotContext, BroadcastPayload, BroadcastSegment } from "../types";
import { joinList, navRow, send, show, truncate } from "../ui";
import { closeTicket, relayAdminReply, TICKET_TAG_RE, ticketTag } from "./support";

const SEGMENTS: BroadcastSegment[] = ["all", "buyers", "non_buyers", "subscribers"];
const LOCALE_NAMES: Record<Locale, string> = { fa: "فارسی", ar: "العربية", en: "English" };

/** Allows only Telegram-safe inline tags in admin-authored broadcast text; escapes the rest. */
export function sanitizeAdminHtml(text: string): string {
  return escapeHtml(text)
    .replace(/&lt;(\/?)(b|i|u|s|code|pre)&gt;/g, "<$1$2>")
    .replace(/&lt;a href=&quot;(https?:\/\/[^"&<>]+)&quot;&gt;/g, '<a href="$1">')
    .replace(/&lt;\/a&gt;/g, "</a>");
}

/** Guards an admin handler; normal users get a localized refusal. */
function adminOnly<A extends unknown[]>(
  app: AppDeps,
  fn: (ctx: BotContext, ...args: A) => Promise<unknown>,
) {
  return async (ctx: BotContext, ...args: A): Promise<void> => {
    if (!ctx.isAdmin) {
      app.logger.info({ userId: ctx.user.id }, "admin command rejected");
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: ctx.tp("admin.only"), show_alert: true });
      else await send(ctx, app, ctx.t("admin.only"));
      return;
    }
    await fn(ctx, ...args);
  };
}

function argOf(ctx: BotContext): string {
  return typeof ctx.match === "string" ? ctx.match.trim() : "";
}

async function showPanel(ctx: BotContext, app: AppDeps): Promise<void> {
  const k = new InlineKeyboard()
    .text(ctx.tp("btn.admin.stats"), cb.admin("st"))
    .text(ctx.tp("btn.admin.broadcast"), cb.admin("bc"))
    .row()
    .text(ctx.tp("btn.admin.review"), cb.admin("rv"))
    .text(ctx.tp("btn.admin.tickets"), cb.admin("tk"))
    .row();
  await show(ctx, app, ctx.t("admin.panel"), navRow(k, ctx.locale));
}

async function showStats(ctx: BotContext, app: AppDeps): Promise<void> {
  const now = app.now();
  const s = await app.services.analytics.dailyStats(now);
  const L = ctx.locale;
  const lines = [
    ctx.t("admin.stats", {
      date: formatDate(L, now),
      newUsers: s.newUsers,
      activeUsers: s.activeUsers,
      searches: s.searches,
      zero: s.zeroResultSearches,
      orders: s.ordersPaid,
      toman: formatToman(L, s.revenueToman),
      stars: formatStars(L, s.revenueStars),
      tickets: s.openTickets,
    }),
  ];
  const fmtQ = (q: { query: string; count: number }[]) =>
    q
      .slice(0, 5)
      .map((x) => `• ${escapeHtml(truncate(x.query, 40))} (${formatNumber(L, x.count)})`)
      .join("\n");
  if (s.topQueries.length) lines.push("", ctx.t("admin.topQueries"), fmtQ(s.topQueries));
  if (s.zeroResultQueries.length) lines.push("", ctx.t("admin.zeroQueries"), fmtQ(s.zeroResultQueries));
  await show(ctx, app, lines.join("\n"), new InlineKeyboard().text(ctx.tp("btn.back"), "a:panel").text(ctx.tp("btn.home"), cb.menu("home")));
}

// ───────────────────────── review queue ─────────────────────────

async function showReview(ctx: BotContext, app: AppDeps): Promise<void> {
  const intel = app.services.intel;
  if (!intel) {
    await send(ctx, app, ctx.t("admin.review.unavailable"));
    return;
  }
  const queue = await intel.reviewQueue(10);
  const first = queue[0];
  if (!first) {
    await send(ctx, app, ctx.t("admin.review.empty"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const d = first.draft;
  const L = ctx.locale;
  const loc = (x: { fa: string; ar?: string | null; en?: string | null }) => x[L] || x.fa;
  const price = [
    d.suggestedPriceToman ? formatToman(L, d.suggestedPriceToman) : null,
    d.suggestedPriceStars ? formatStars(L, d.suggestedPriceStars) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const text = ctx.t("admin.review.item", {
    count: queue.length,
    title: loc(d.title),
    summary: truncate(loc(d.summary), 500),
    tier: d.tier,
    models: joinList(L, d.models),
    judge: d.judge ? d.judge.score : "—",
    originality: d.compliance ? d.compliance.originality : "—",
    price: price || "—",
  });
  const k = new InlineKeyboard()
    .text(ctx.tp("btn.approve"), cb.adminApprove(first.id))
    .text(ctx.tp("btn.reject"), cb.adminReject(first.id))
    .row();
  await send(ctx, app, text, navRow(k, ctx.locale));
}

async function resolveDraft(
  ctx: BotContext,
  app: AppDeps,
  draftId: string,
  decision: "approve" | "reject",
): Promise<void> {
  const intel = app.services.intel;
  if (!intel) {
    await send(ctx, app, ctx.t("admin.review.unavailable"));
    return;
  }
  const draft = await intel.resolveDraft(draftId, decision);
  if (!draft) {
    await send(ctx, app, ctx.t("error.notFound"));
  } else if (decision === "approve") {
    const id = await app.services.catalog.createFromDraft(draft, true);
    await show(ctx, app, ctx.t("admin.review.approved", { id }));
  } else {
    await show(ctx, app, ctx.t("admin.review.rejected"));
  }
  await showReview(ctx, app);
}

// ───────────────────────── tickets ─────────────────────────

async function showTickets(ctx: BotContext, app: AppDeps): Promise<void> {
  const open = await app.services.tickets.listOpen(20);
  if (open.length === 0) {
    await send(ctx, app, ctx.t("admin.tickets.empty"));
    return;
  }
  const lines = [ctx.t("admin.tickets.title", { count: open.length }), ""];
  const k = new InlineKeyboard();
  for (const tk of open) {
    lines.push(ctx.t("admin.ticketItem", { tag: ticketTag(tk.id), subject: truncate(tk.subject, 50), status: tk.status }));
    k.text(`✍️ ${truncate(ticketTag(tk.id), 20)}`, cb.adminReply(tk.id))
      .text(ctx.tp("btn.admin.close"), cb.adminClose(tk.id))
      .row();
  }
  await send(ctx, app, lines.join("\n"), k);
}

// ───────────────────────── broadcast composer ─────────────────────────

async function startBroadcast(ctx: BotContext, app: AppDeps): Promise<void> {
  ctx.session.step = { kind: "admin_broadcast", stage: "segment" };
  const k = new InlineKeyboard();
  for (const s of SEGMENTS) k.text(ctx.tp(`seg.${s}`), cb.bcSegment(s)).row();
  k.text(ctx.tp("btn.cancel"), cb.bcCancel());
  await show(ctx, app, ctx.t("admin.bc.segment"), k);
}

export async function broadcastText(ctx: BotContext, app: AppDeps, text: string): Promise<void> {
  const step = ctx.session.step;
  if (step.kind !== "admin_broadcast" || step.stage !== "text") return;
  const clean = sanitizeAdminHtml(text.slice(0, 3500));
  ctx.session.step = { ...step, stage: "confirm", text: clean };
  const locale = step.locale ?? null;
  const count = await app.services.users.count({
    platform: app.platform,
    ...(locale ? { locale } : {}),
  });
  const preview = ctx.t("admin.bc.preview", {
    segment: ctx.tp(`seg.${step.segment ?? "all"}`),
    locale: locale ? LOCALE_NAMES[locale] : ctx.tp("btn.allLocales"),
    count,
    text: raw(clean),
  });
  const k = new InlineKeyboard()
    .text(ctx.tp("btn.confirmSend"), cb.bcConfirm())
    .text(ctx.tp("btn.cancel"), cb.bcCancel());
  await send(ctx, app, preview, k);
}

async function confirmBroadcast(ctx: BotContext, app: AppDeps): Promise<void> {
  const step = ctx.session.step;
  if (step.kind !== "admin_broadcast" || step.stage !== "confirm" || !step.text) {
    await send(ctx, app, ctx.t("error.invalidState"));
    return;
  }
  resetStep(ctx);
  const enqueue = app.options.enqueueBroadcast;
  if (!enqueue) {
    await show(ctx, app, ctx.t("admin.bc.noQueue"));
    return;
  }
  const payload: BroadcastPayload = {
    segment: step.segment ?? "all",
    ...(step.locale ? { locale: step.locale } : {}),
    platform: app.platform,
    text: step.text,
    html: app.caps.html,
    requestedBy: ctx.user.id,
  };
  const jobId = await enqueue(payload);
  track(app, "broadcast_sent", ctx.user.id, {
    segment: payload.segment,
    locale: payload.locale ?? null,
    jobId: jobId ?? null,
  });
  await show(ctx, app, ctx.t("admin.bc.queued", { id: jobId ? `(${jobId})` : "" }));
}

// ───────────────────────── ban ─────────────────────────

async function setBan(ctx: BotContext, app: AppDeps, banned: boolean): Promise<void> {
  const id = argOf(ctx).replace(/^@/, "");
  if (!/^\d+$/.test(id)) {
    await send(ctx, app, ctx.t("admin.banUsage"));
    return;
  }
  const user = await app.services.users.getByPlatformId(app.platform, id);
  if (!user) {
    await send(ctx, app, ctx.t("admin.userNotFound"));
    return;
  }
  await app.services.users.setBanned(user.id, banned);
  await send(ctx, app, ctx.t(banned ? "admin.banned" : "admin.unbanned", { user: id }));
}

export function adminComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  const guard = <A extends unknown[]>(fn: (ctx: BotContext, ...a: A) => Promise<unknown>) =>
    adminOnly(app, fn);

  c.command("admin", guard((ctx) => showPanel(ctx, app)));
  c.command("stats", guard((ctx) => showStats(ctx, app)));
  c.command("broadcast", guard((ctx) => startBroadcast(ctx, app)));
  c.command("review", guard((ctx) => showReview(ctx, app)));
  c.command(["tickets", "ticket"], guard((ctx) => showTickets(ctx, app)));
  c.command("ban", guard((ctx) => setBan(ctx, app, true)));
  c.command("unban", guard((ctx) => setBan(ctx, app, false)));
  c.command(
    "reply",
    guard(async (ctx) => {
      const m = /^(\S+)\s+([\s\S]+)$/.exec(argOf(ctx));
      if (!m) return send(ctx, app, ctx.t("admin.replyUsage"));
      return relayAdminReply(ctx, app, (m[1] ?? "").replace(/^#T/, ""), (m[2] ?? "").trim());
    }),
  );
  c.command(
    "close",
    guard(async (ctx) => {
      const id = argOf(ctx).replace(/^#T/, "");
      if (!id) return send(ctx, app, ctx.t("admin.closeUsage"));
      return closeTicket(ctx, app, id);
    }),
  );

  c.callbackQuery("a:panel", guard((ctx) => showPanel(ctx, app)));
  c.callbackQuery("a:st", guard((ctx) => showStats(ctx, app)));
  c.callbackQuery("a:bc", guard((ctx) => startBroadcast(ctx, app)));
  c.callbackQuery("a:rv", guard((ctx) => showReview(ctx, app)));
  c.callbackQuery("a:tk", guard((ctx) => showTickets(ctx, app)));
  c.callbackQuery(/^a:ap:(.+)$/, guard((ctx) => resolveDraft(ctx, app, String(ctx.match?.[1]), "approve")));
  c.callbackQuery(/^a:rj:(.+)$/, guard((ctx) => resolveDraft(ctx, app, String(ctx.match?.[1]), "reject")));
  c.callbackQuery(
    /^a:rp:(.+)$/,
    guard(async (ctx) => {
      const ticketId = String(ctx.match?.[1]);
      ctx.session.step = { kind: "admin_reply", ticketId };
      await send(ctx, app, ctx.t("admin.replyAsk", { tag: ticketTag(ticketId) }));
    }),
  );
  c.callbackQuery(/^a:cl:(.+)$/, guard((ctx) => closeTicket(ctx, app, String(ctx.match?.[1]))));

  c.callbackQuery(
    /^bc:s:(\w+)$/,
    guard(async (ctx) => {
      const seg = String(ctx.match?.[1]) as BroadcastSegment;
      const step = ctx.session.step;
      if (step.kind !== "admin_broadcast" || !SEGMENTS.includes(seg)) {
        return send(ctx, app, ctx.t("error.invalidState"));
      }
      ctx.session.step = { kind: "admin_broadcast", stage: "locale", segment: seg };
      const k = new InlineKeyboard();
      for (const l of LOCALES) k.text(LOCALE_NAMES[l], cb.bcLocale(l));
      k.row().text(ctx.tp("btn.allLocales"), cb.bcLocale("all")).row();
      k.text(ctx.tp("btn.cancel"), cb.bcCancel());
      await show(ctx, app, ctx.t("admin.bc.locale"), k);
    }),
  );
  c.callbackQuery(
    /^bc:l:(\w+)$/,
    guard(async (ctx) => {
      const v = String(ctx.match?.[1]);
      const step = ctx.session.step;
      if (step.kind !== "admin_broadcast" || step.stage !== "locale") {
        return send(ctx, app, ctx.t("error.invalidState"));
      }
      ctx.session.step = { ...step, stage: "text", locale: isLocale(v) ? v : null };
      await show(ctx, app, ctx.t("admin.bc.text"), new InlineKeyboard().text(ctx.tp("btn.cancel"), cb.bcCancel()));
    }),
  );
  c.callbackQuery("bc:ok", guard((ctx) => confirmBroadcast(ctx, app)));
  c.callbackQuery(
    "bc:x",
    guard(async (ctx) => {
      resetStep(ctx);
      await show(ctx, app, ctx.t("admin.bc.cancelled"));
    }),
  );

  // Admin replies to a forwarded ticket message (reply-to-message) → relay to the user.
  c.on("message:text", async (ctx, next) => {
    const replied = ctx.message.reply_to_message;
    if (!ctx.isAdmin || !replied || replied.from?.id !== ctx.me.id) return next();
    const source = replied.text ?? replied.caption ?? "";
    const m = TICKET_TAG_RE.exec(source);
    if (!m?.[1]) return next();
    await relayAdminReply(ctx, app, m[1], ctx.message.text);
  });
  return c;
}


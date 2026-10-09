import type { InvoiceSpec, Order, ProductKind } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { disableOnUnsupported } from "../capabilities";
import { cb, parseBuyKind } from "../callbacks";
import { isDomainError, isPaidTier, loadAccessibleBody, withTimeout } from "../flow";
import { escapeHtml, formatStars, formatToman, tPlain } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { navRow, send, sendTo, show, truncate } from "../ui";
import { deliverBody, openPromptCard } from "./prompt";

/** Telegram requires an answer to pre_checkout_query within 10 s. */
const PRECHECKOUT_TIMEOUT_MS = 8_000;

function checkoutCurrency(app: AppDeps): "XTR" | "IRR" {
  return app.platform === "telegram" ? "XTR" : "IRR";
}

/** Can this invoice be paid inside the messenger? */
export function canSendInvoice(app: AppDeps, invoice: InvoiceSpec): boolean {
  const svc = app.payments as { isAvailable?: (p: AppDeps["platform"]) => boolean };
  if (typeof svc.isAvailable === "function" && !svc.isAvailable(app.platform)) return false;
  if (invoice.currency === "XTR") return app.platform === "telegram" && app.caps.starsPayments;
  return app.platform === "bale" && app.caps.walletPayments && invoice.providerToken !== "";
}

async function sendWebCheckout(ctx: BotContext, app: AppDeps, order: Order): Promise<void> {
  const url = app.payments.webCheckoutUrl(order.id);
  const k = new InlineKeyboard().url(ctx.tp("btn.payWeb"), url).row();
  await send(ctx, app, ctx.t("pay.web"), navRow(k, ctx.locale));
}

export async function startCheckout(
  ctx: BotContext,
  app: AppDeps,
  kind: ProductKind,
  refId: string,
): Promise<void> {
  // Already owned? Don't sell it twice.
  if (kind === "prompt" && (await app.services.entitlements.canAccess(ctx.user.id, refId))) {
    await openPromptCard(ctx, app, refId);
    return;
  }
  let created: Awaited<ReturnType<AppDeps["payments"]["createInvoice"]>>;
  try {
    created = await app.payments.createInvoice({
      user: ctx.user,
      platform: app.platform,
      items: [{ kind, refId }],
    });
  } catch (err) {
    if (isDomainError(err)) {
      app.logger.info({ err, kind, refId }, "createInvoice refused");
      await send(ctx, app, ctx.t("pay.unavailable"), navRow(new InlineKeyboard(), ctx.locale));
      return;
    }
    throw err;
  }
  // checkout_started / payment_succeeded / payment_failed are tracked by @rasa/payments.
  const { order, invoice } = created;

  if (!canSendInvoice(app, invoice) || ctx.chat === undefined) {
    await sendWebCheckout(ctx, app, order);
    return;
  }
  try {
    const title = truncate(invoice.title, 32);
    await ctx.api.sendInvoice(
      ctx.chat.id,
      title,
      truncate(invoice.description || invoice.title, 255),
      invoice.payload,
      invoice.currency,
      [{ label: title, amount: invoice.amount }],
      {
        provider_token: invoice.providerToken,
        ...(invoice.photoUrl ? { photo_url: invoice.photoUrl } : {}),
      },
    );
  } catch (err) {
    app.logger.warn({ err, orderId: order.id }, "sendInvoice failed — falling back to web checkout");
    disableOnUnsupported(
      app.caps,
      invoice.currency === "XTR" ? "starsPayments" : "walletPayments",
      err,
    );
    await sendWebCheckout(ctx, app, order);
  }
}

export async function showBundle(ctx: BotContext, app: AppDeps, bundleId: string): Promise<void> {
  const currency = checkoutCurrency(app);
  let item: Awaited<ReturnType<AppDeps["services"]["products"]["quote"]>>;
  try {
    item = await app.services.products.quote("bundle", bundleId, currency, ctx.locale);
  } catch (err) {
    if (!isDomainError(err)) app.logger.warn({ err, bundleId }, "bundle quote failed");
    await show(ctx, app, ctx.t("bundle.notFound"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const price =
    currency === "XTR"
      ? formatStars(ctx.locale, item.amount)
      : formatToman(ctx.locale, Math.round(item.amount / 10));
  const k = new InlineKeyboard().text(ctx.tp("btn.buy", { price }), cb.buy("bundle", bundleId)).row();
  await show(
    ctx,
    app,
    ctx.t("bundle.title", { title: item.title, price }),
    navRow(k, ctx.locale),
  );
}

/** Delivers what an order bought, right after payment. */
async function deliverOrder(ctx: BotContext, app: AppDeps, order: Order): Promise<void> {
  await send(ctx, app, ctx.t("pay.thanks", { order: order.id }));
  let boughtSinglePrompt = false;
  for (const item of order.items) {
    switch (item.kind) {
      case "prompt": {
        const p = await app.services.catalog.getPrompt(item.refId, ctx.locale);
        if (!p) break;
        const access = await loadAccessibleBody(app, ctx, p);
        if (access) {
          await deliverBody(ctx, app, p, access.body, isPaidTier(p.tier));
          boughtSinglePrompt = true;
        }
        break;
      }
      case "plan":
        await send(ctx, app, ctx.t("pay.planActive", { plan: item.title }));
        break;
      case "credit_pack": {
        const balance = await app.services.credits.balance(ctx.user.id);
        await send(ctx, app, ctx.t("pay.creditsAdded", { balance }));
        break;
      }
      case "bundle":
        await send(ctx, app, ctx.t("pay.bundleAdded", { title: item.title }));
        break;
    }
  }
  const k = new InlineKeyboard().text(ctx.tp("btn.library"), cb.library(1)).row();
  if (boughtSinglePrompt && !(await app.services.entitlements.activeSubscription(ctx.user.id))) {
    k.text(ctx.tp("btn.plans"), cb.menu("plans")).row();
    await send(ctx, app, ctx.t("pay.upsellPro"), navRow(k, ctx.locale));
  } else {
    await send(ctx, app, ctx.t("menu.title"), navRow(k, ctx.locale));
  }
}

async function notifyAdmins(app: AppDeps, ctx: BotContext, text: string): Promise<void> {
  const targets = adminTargets(app);
  for (const chatId of targets) {
    try {
      await sendTo(app, ctx.api, chatId, text);
    } catch (err) {
      app.logger.warn({ err, chatId }, "admin notify failed");
    }
  }
}

/** Admin chat if configured, else every admin id of this platform. */
export function adminTargets(app: AppDeps): string[] {
  const chat =
    app.platform === "telegram" ? app.config.TELEGRAM_ADMIN_CHAT_ID : app.config.BALE_ADMIN_CHAT_ID;
  if (chat) return [chat];
  return app.platform === "telegram" ? app.config.TELEGRAM_ADMIN_IDS : app.config.BALE_ADMIN_IDS;
}

/**
 * Payment updates. Registered BEFORE the ban filter and rate limiter: a payment that
 * the user already authorised must always be validated and fulfilled.
 */
export function paymentsComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();

  c.on("pre_checkout_query", async (ctx) => {
    const q = ctx.preCheckoutQuery;
    let result: { ok: true } | { ok: false; error: string };
    try {
      result = await withTimeout(
        app.payments.validatePreCheckout(q.invoice_payload, q.currency, q.total_amount, String(q.from.id)),
        PRECHECKOUT_TIMEOUT_MS,
        "validatePreCheckout",
      );
    } catch (err) {
      app.logger.error({ err, payload: q.invoice_payload }, "validatePreCheckout failed");
      result = { ok: false, error: "validation_error" };
    }
    if (result.ok) {
      await ctx.answerPreCheckoutQuery(true);
    } else {
      app.logger.info({ payload: q.invoice_payload, error: result.error }, "pre-checkout rejected");
      await ctx.answerPreCheckoutQuery(false, {
        error_message: tPlain(ctx.locale, "pay.precheckFailed"),
      });
    }
  });

  c.on("message:successful_payment", async (ctx) => {
    const sp = ctx.message.successful_payment;
    const chargeId = sp.telegram_payment_charge_id || sp.provider_payment_charge_id;
    try {
      const { order, firstTime } = await app.payments.fulfill({
        payload: sp.invoice_payload,
        chargeId,
        currency: sp.currency,
        totalAmount: sp.total_amount,
      });
      if (!firstTime) {
        app.logger.info({ orderId: order.id }, "duplicate successful_payment ignored");
        return;
      }
      await deliverOrder(ctx, app, order);
    } catch (err) {
      app.logger.error({ err, payload: sp.invoice_payload, chargeId }, "fulfillment failed");
      await send(ctx, app, ctx.t("pay.fulfillFailed"));
      await notifyAdmins(
        app,
        ctx,
        `⚠️ <b>Fulfillment failed</b>\npayload: <code>${escapeHtml(sp.invoice_payload)}</code>\ncharge: <code>${escapeHtml(chargeId)}</code>\nuser: <code>${ctx.user.id}</code> (${ctx.from.id})\n${escapeHtml(sp.currency)} ${sp.total_amount}`,
      );
    }
  });

  return c;
}

export function buyComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.callbackQuery(/^b:([pblk]):(.+)$/, async (ctx) => {
    const kind = parseBuyKind(ctx.match[1] ?? "");
    if (!kind) return;
    await startCheckout(ctx, app, kind, ctx.match[2] ?? "");
  });
  return c;
}

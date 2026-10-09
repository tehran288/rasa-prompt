import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import { resetStep } from "../flow";
import { formatDate, raw } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { deepLink, navRow, priceLabel, shareLink, show, truncate } from "../ui";

export async function showAccount(ctx: BotContext, app: AppDeps): Promise<void> {
  const [sub, balance] = await Promise.all([
    app.services.entitlements.activeSubscription(ctx.user.id),
    app.services.credits.balance(ctx.user.id),
  ]);
  const lines = [ctx.t("account.title"), ""];
  if (sub) {
    lines.push(
      sub.expiresAt
        ? ctx.t("account.sub", {
            plan: sub.plan.title,
            date: formatDate(ctx.locale, sub.expiresAt),
          })
        : ctx.t("account.subLifetime", { plan: sub.plan.title }),
    );
  } else {
    lines.push(ctx.t("account.noSub"));
  }
  lines.push(ctx.t("account.balance", { balance }));
  if (!sub) lines.push("", ctx.t("account.hint"));
  const k = new InlineKeyboard()
    .text(ctx.t("btn.plans"), cb.menu("plans"))
    .text(ctx.t("btn.buyCredits"), cb.menu("packs"))
    .row()
    .text(ctx.t("btn.library"), cb.library(1))
    .row();
  await show(ctx, app, lines.join("\n"), navRow(k, ctx.locale));
}

export async function showPlans(ctx: BotContext, app: AppDeps): Promise<void> {
  const plans = await app.services.products.listPlans(ctx.locale);
  const k = new InlineKeyboard();
  if (plans.length === 0) {
    await show(ctx, app, ctx.t("plans.empty"), navRow(k, ctx.locale, cb.menu("acct")));
    return;
  }
  const items = plans.map((p) => {
    const price = priceLabel(ctx.locale, app.platform, app.caps, p) ?? "—";
    k.text(
      truncate(ctx.tp("btn.buy", { price: `${p.title} · ${price}` }), 60),
      cb.buy("plan", p.id),
    ).row();
    return ctx.t("plans.item", {
      title: p.title,
      price,
      credits: p.monthlyCredits,
      duration:
        p.durationDays === null
          ? ctx.t("plans.lifetime")
          : ctx.t("plans.days", { days: p.durationDays }),
    });
  });
  await show(
    ctx,
    app,
    `${ctx.t("plans.title")}\n\n${items.join("\n\n")}`,
    navRow(k, ctx.locale, cb.menu("acct")),
  );
}

export async function showPacks(ctx: BotContext, app: AppDeps): Promise<void> {
  const packs = await app.services.products.listCreditPacks(ctx.locale);
  const k = new InlineKeyboard();
  if (packs.length === 0) {
    await show(ctx, app, ctx.t("packs.empty"), navRow(k, ctx.locale, cb.menu("acct")));
    return;
  }
  const items = packs.map((p) => {
    const price = priceLabel(ctx.locale, app.platform, app.caps, p) ?? "—";
    k.text(
      truncate(ctx.tp("btn.buy", { price: `${p.title} · ${price}` }), 60),
      cb.buy("credit_pack", p.id),
    ).row();
    return ctx.t("packs.item", { title: p.title, credits: p.credits, price });
  });
  await show(
    ctx,
    app,
    `${ctx.t("packs.title")}\n\n${items.join("\n")}`,
    navRow(k, ctx.locale, cb.menu("acct")),
  );
}

export function referralLink(app: AppDeps, botUsername: string, referralCode: string): string {
  return deepLink(app, botUsername, `ref_${referralCode}`);
}

export async function showReferral(ctx: BotContext, app: AppDeps): Promise<void> {
  const link = referralLink(app, ctx.me.username, ctx.user.referralCode);
  const stats = await app.services.referrals.stats(ctx.user.id);
  const text = [
    ctx.t("ref.title", { reward: app.config.REFERRAL_REWARD_CREDITS }),
    "",
    ctx.t("ref.link", { link: raw(`<code>${link}</code>`) }),
    "",
    ctx.t("ref.stats", {
      invited: stats.invited,
      converted: stats.converted,
      earned: stats.creditsEarned,
    }),
  ].join("\n");
  const k = new InlineKeyboard();
  if (app.caps.shareUrl) k.url(ctx.t("btn.share"), shareLink(link, ctx.t("ref.shareText"))).row();
  await show(ctx, app, text, navRow(k, ctx.locale));
}

export function accountComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.command("account", (ctx) => {
    resetStep(ctx);
    return showAccount(ctx, app);
  });
  c.command("invite", (ctx) => {
    resetStep(ctx);
    return showReferral(ctx, app);
  });
  return c;
}

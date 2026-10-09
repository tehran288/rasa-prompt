import { LOCALES, type Locale } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { cb, type Screen } from "../callbacks";
import { resetStep, track } from "../flow";
import { isLocale, t } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { mainInlineMenu, mainReplyKeyboard, send, show } from "../ui";
import { showAccount, showPacks, showPlans, showReferral } from "./account";
import { askSearch, showCategories, showLibrary, showTrending } from "./browse";
import { startBuilder } from "./builder";
import { showBundle } from "./payments";
import { openPromptCard } from "./prompt";
import { startSupport } from "./support";

const LANGUAGE_LABELS: Record<Locale, string> = { fa: "فارسی", ar: "العربية", en: "English" };

export async function showHome(ctx: BotContext, app: AppDeps): Promise<void> {
  await show(ctx, app, ctx.t("menu.title"), mainInlineMenu(ctx.locale));
}

/** Greeting that (re)installs the persistent reply keyboard, then the inline home screen. */
async function sendWelcome(ctx: BotContext, app: AppDeps, firstTime: boolean): Promise<void> {
  const name = ctx.user.firstName ?? ctx.from?.first_name ?? "";
  const lines = [firstTime ? ctx.t("welcome.new", { name }) : ctx.t("welcome.back", { name })];
  if (firstTime && ctx.user.referredByUserId) lines.push("", ctx.t("welcome.referred"));
  await send(ctx, app, lines.join("\n"), mainReplyKeyboard(ctx.locale));
}

export async function showLanguagePicker(ctx: BotContext, app: AppDeps): Promise<void> {
  const k = new InlineKeyboard();
  for (const l of LOCALES) {
    k.text(`${l === ctx.locale ? "✅ " : ""}${LANGUAGE_LABELS[l]}`, cb.lang(l));
  }
  await show(ctx, app, t("fa", "lang.pick"), k);
}

/** Opens a deep-link payload: p_<promptId>, b_<bundleId>, ref_<code> (handled at upsert). */
async function openStartPayload(ctx: BotContext, app: AppDeps, payload: string): Promise<void> {
  if (payload.startsWith("p_") && payload.length > 2) {
    await openPromptCard(ctx, app, payload.slice(2));
    return;
  }
  if (payload.startsWith("b_") && payload.length > 2) {
    await showBundle(ctx, app, payload.slice(2));
    return;
  }
  await showHome(ctx, app);
}

export async function openScreen(ctx: BotContext, app: AppDeps, screen: Screen): Promise<void> {
  resetStep(ctx);
  switch (screen) {
    case "home":
      return showHome(ctx, app);
    case "search":
      return askSearch(ctx, app);
    case "cats":
      return showCategories(ctx, app, 1);
    case "trend":
      return showTrending(ctx, app, 1);
    case "build":
      return startBuilder(ctx, app);
    case "lib":
      return showLibrary(ctx, app, 1);
    case "acct":
      return showAccount(ctx, app);
    case "ref":
      return showReferral(ctx, app);
    case "sup":
      return startSupport(ctx, app);
    case "lang":
      return showLanguagePicker(ctx, app);
    case "plans":
      return showPlans(ctx, app);
    case "packs":
      return showPacks(ctx, app);
  }
}

const SCREENS = new Set<Screen>([
  "home",
  "search",
  "cats",
  "trend",
  "build",
  "lib",
  "acct",
  "ref",
  "sup",
  "lang",
  "plans",
  "packs",
]);

export function menuComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();

  c.command("start", async (ctx) => {
    resetStep(ctx);
    const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";
    track(app, "start", ctx.user.id, {
      created: ctx.isNewUser,
      payload: payload ? payload.split("_")[0] : null,
    });
    if (ctx.isNewUser && payload.startsWith("ref_") && ctx.user.referredByUserId) {
      track(app, "referral_joined", ctx.user.id, { referrerId: ctx.user.referredByUserId });
    }
    if (ctx.isNewUser || !ctx.session.onboarded) {
      ctx.session.pendingStart = payload || null;
      await showLanguagePicker(ctx, app);
      return;
    }
    await sendWelcome(ctx, app, false);
    await openStartPayload(ctx, app, payload);
  });

  c.callbackQuery(/^l:(\w+)$/, async (ctx) => {
    const l = ctx.match[1];
    if (!isLocale(l)) return;
    const firstTime = !ctx.session.onboarded;
    await app.services.users.setLocale(ctx.user.id, l);
    ctx.user.locale = l;
    ctx.locale = l;
    ctx.session.onboarded = true;
    await show(ctx, app, ctx.t("lang.changed"));
    await sendWelcome(ctx, app, firstTime);
    const pending = ctx.session.pendingStart;
    ctx.session.pendingStart = null;
    // fresh message for the next screen (the picker message now shows the confirmation)
    const fresh = Object.create(ctx) as BotContext;
    Object.defineProperty(fresh, "callbackQuery", { value: undefined });
    await openStartPayload(fresh, app, pending ?? "");
  });

  c.callbackQuery(/^m:(\w+)$/, (ctx) => {
    const s = ctx.match[1] as Screen;
    if (!SCREENS.has(s)) return;
    return openScreen(ctx, app, s);
  });

  c.command(["menu", "home"], (ctx) => openScreen(ctx, app, "home"));
  c.command(["language", "lang"], (ctx) => openScreen(ctx, app, "lang"));
  c.command("cancel", (ctx) => openScreen(ctx, app, "home"));
  c.command("help", async (ctx) => {
    resetStep(ctx);
    await send(ctx, app, ctx.t("help.text"), mainInlineMenu(ctx.locale));
  });
  c.callbackQuery("noop", () => undefined);
  return c;
}

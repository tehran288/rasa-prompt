import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import {
  AI_BUILD_COST,
  aiErrorKey,
  aiTimeout,
  dayKey,
  isDomainError,
  resetStep,
  SESSION_RUN_COST,
  track,
  withTimeout,
} from "../flow";
import { escapeHtml } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { chunkText, codeBlock, navRow, send, show } from "../ui";
import { insufficientCredits, typing } from "./prompt";

const MIN_IDEA_LENGTH = 6;
const MAX_IDEA_LENGTH = 1500;

/** Persistent per-user-per-day counter in SettingsService (survives session loss / restarts). */
export function buildQuotaKey(userId: string, now: Date): string {
  return `bot:ai_builds:${userId}:${dayKey(now)}`;
}

async function usedToday(app: AppDeps, userId: string): Promise<number> {
  return app.services.settings.get<number>(buildQuotaKey(userId, app.now()), 0);
}

export async function startBuilder(ctx: BotContext, app: AppDeps): Promise<void> {
  ctx.session.step = { kind: "builder" };
  const free = app.config.FREE_AI_BUILDS_PER_DAY;
  const left = Math.max(0, free - (await usedToday(app, ctx.user.id)));
  const quota =
    left > 0
      ? ctx.t("builder.quotaFree", { left, total: free })
      : ctx.t("builder.quotaPaid", {
          cost: AI_BUILD_COST,
          balance: await app.services.credits.balance(ctx.user.id),
        });
  await show(
    ctx,
    app,
    `${ctx.t("builder.intro")}\n\n${quota}`,
    navRow(new InlineKeyboard(), ctx.locale),
  );
}

export async function buildFromIdea(ctx: BotContext, app: AppDeps, rawIdea: string): Promise<void> {
  const idea = rawIdea.trim().slice(0, MAX_IDEA_LENGTH);
  if (idea.length < MIN_IDEA_LENGTH) {
    await send(ctx, app, ctx.t("builder.tooShort"));
    return;
  }
  await typing(ctx);

  // 1) moderation first — never spend quota/credits on disallowed requests
  try {
    const mod = await withTimeout(app.ai.moderate(idea), aiTimeout(app), "moderate");
    if (!mod.allowed) {
      track(app, "ai_build_prompt", ctx.user.id, { blocked: true, category: mod.category });
      await send(ctx, app, ctx.t("builder.blocked"), navRow(new InlineKeyboard(), ctx.locale));
      return;
    }
  } catch (err) {
    app.logger.warn({ err }, "ai.moderate failed");
    await send(
      ctx,
      app,
      ctx.t(aiErrorKey(err) ?? "builder.failed"),
      navRow(new InlineKeyboard(), ctx.locale),
    );
    return;
  }

  // 2) quota: free builds first, then credits
  const free = app.config.FREE_AI_BUILDS_PER_DAY;
  const used = await usedToday(app, ctx.user.id);
  const isFree = used < free;
  let balance: number | null = null;
  if (!isFree) {
    try {
      balance = await app.services.credits.spend(ctx.user.id, AI_BUILD_COST, "ai_build");
    } catch (err) {
      if (isDomainError(err, "insufficient_credits")) {
        return insufficientCredits(ctx, app, AI_BUILD_COST);
      }
      throw err;
    }
  }

  await send(ctx, app, ctx.t("builder.working"));
  let built: Awaited<ReturnType<AppDeps["ai"]["buildPrompt"]>>;
  try {
    built = await withTimeout(app.ai.buildPrompt(idea, ctx.locale), aiTimeout(app), "buildPrompt");
  } catch (err) {
    app.logger.warn({ err }, "ai.buildPrompt failed");
    if (!isFree) await app.services.credits.grant(ctx.user.id, AI_BUILD_COST, "ai_build_refund");
    await send(
      ctx,
      app,
      ctx.t(aiErrorKey(err) ?? "builder.failed"),
      navRow(new InlineKeyboard(), ctx.locale),
    );
    return;
  }
  if (isFree) {
    await app.services.settings.set(buildQuotaKey(ctx.user.id, app.now()), used + 1);
  }
  ctx.session.runnable = { text: built.prompt, promptId: null };
  track(app, "ai_build_prompt", ctx.user.id, { free: isFree, cost: isFree ? 0 : AI_BUILD_COST });

  const usage = isFree
    ? ctx.t("builder.freeUsed", { left: Math.max(0, free - used - 1) })
    : ctx.t("builder.paidUsed", { cost: AI_BUILD_COST, balance: balance ?? 0 });
  const extras: string[] = [];
  if (built.variables.length > 0) {
    extras.push(
      ctx.t("builder.variables", { vars: built.variables.map((v) => `{{${v}}}`).join(" ") }),
    );
  }
  if (built.tips.length > 0) {
    extras.push(
      `${ctx.t("builder.tips")}\n${built.tips.map((tip) => `• ${escapeHtml(tip)}`).join("\n")}`,
    );
  }
  extras.push(usage, `<i>${ctx.t("builder.footer")}</i>`);

  const k = new InlineKeyboard()
    .text(ctx.t("btn.run", { cost: SESSION_RUN_COST }), cb.runSession())
    .row()
    .text(ctx.t("btn.buildAgain"), cb.menu("build"))
    .row();
  navRow(k, ctx.locale);
  const chunks = chunkText(built.prompt, 3000);
  for (let i = 0; i < chunks.length; i++) {
    const parts: string[] = [];
    if (i === 0) parts.push(ctx.t("builder.result", { title: built.title }));
    parts.push(codeBlock(chunks[i] ?? ""));
    const last = i === chunks.length - 1;
    if (last) parts.push(extras.join("\n\n"));
    await send(ctx, app, parts.join("\n\n"), last ? k : undefined);
  }
  // stay in builder mode: the next text message is the next idea
  ctx.session.step = { kind: "builder" };
}

export function builderComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.command("build", (ctx) => {
    resetStep(ctx);
    const idea = typeof ctx.match === "string" ? ctx.match.trim() : "";
    if (idea) return buildFromIdea(ctx, app, idea);
    return startBuilder(ctx, app);
  });
  return c;
}

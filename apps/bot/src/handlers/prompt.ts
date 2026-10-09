import type { PromptDetail, PromptVariable } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import {
  aiErrorKey,
  aiTimeout,
  fillTemplate,
  isDomainError,
  isPaidTier,
  isRunnable,
  loadAccessibleBody,
  resetStep,
  runCost,
  SESSION_RUN_COST,
  track,
  withTimeout,
} from "../flow";
import { escapeHtml, formatDate, type MessageKey } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import {
  chunkText,
  codeBlock,
  joinList,
  navRow,
  priceLabel,
  send,
  show,
  tierBadge,
  truncate,
} from "../ui";
import { applyWatermark } from "../watermark";

/** Raw chars per code block chunk (HTML escaping can expand it). */
const BODY_CHUNK = 3000;

export async function typing(ctx: BotContext): Promise<void> {
  try {
    await ctx.replyWithChatAction("typing");
  } catch {
    // not supported everywhere (Bale) — cosmetic only
  }
}

function cardText(ctx: BotContext, app: AppDeps, p: PromptDetail, entitled: boolean): string {
  const L = ctx.locale;
  const lines: string[] = [];
  lines.push(`${tierBadge(L, p.tier)} <b>${escapeHtml(p.title)}</b>`);
  if (p.summary) lines.push(escapeHtml(p.summary));
  lines.push("");
  lines.push(ctx.t("card.models", { models: joinList(L, p.models) }));
  lines.push(
    p.lastTestedAt
      ? ctx.t("card.tested", { date: formatDate(L, p.lastTestedAt) })
      : ctx.t("card.untested"),
  );
  lines.push(ctx.t("card.quality", { score: p.qualityScore }));
  if (p.version) lines.push(ctx.t("card.version", { version: p.version }));
  const price = priceLabel(L, app.platform, app.caps, p);
  if (isPaidTier(p.tier) && !entitled && price) lines.push(ctx.t("card.price", { price }));
  if (p.preview) {
    lines.push(
      "",
      ctx.t("card.preview"),
      `<blockquote>${escapeHtml(truncate(p.preview, 900))}</blockquote>`,
    );
  }
  if (p.exampleOutput) {
    lines.push(
      "",
      ctx.t("card.example"),
      `<blockquote expandable>${escapeHtml(truncate(p.exampleOutput, 700))}</blockquote>`,
    );
  }
  if (isPaidTier(p.tier)) {
    lines.push("", entitled ? ctx.t("card.owned") : ctx.t("card.locked"));
  }
  return lines.join("\n");
}

function actionKeyboard(ctx: BotContext, p: PromptDetail): InlineKeyboard {
  const k = new InlineKeyboard().text(ctx.t("btn.fullPrompt"), cb.full(p.id)).row();
  if (p.variables.length > 0) k.text(ctx.t("btn.fill"), cb.wizard(p.id)).row();
  if (isRunnable(p.outputType)) {
    k.text(ctx.t("btn.run", { cost: runCost(p.outputType) }), cb.run(p.id)).row();
  }
  return k;
}

function buyKeyboard(ctx: BotContext, app: AppDeps, p: PromptDetail): InlineKeyboard {
  const k = new InlineKeyboard();
  const price = priceLabel(ctx.locale, app.platform, app.caps, p);
  if (price) k.text(ctx.tp("btn.buy", { price }), cb.buy("prompt", p.id)).row();
  k.text(ctx.t("btn.inPro"), cb.menu("plans")).row();
  return k;
}

export async function openPromptCard(ctx: BotContext, app: AppDeps, id: string): Promise<void> {
  const p = await app.services.catalog.getPrompt(id, ctx.locale);
  if (!p) {
    await show(ctx, app, ctx.t("prompt.notFound"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const entitled =
    !isPaidTier(p.tier) || (await app.services.entitlements.canAccess(ctx.user.id, p.id));
  track(app, "view_prompt", ctx.user.id, { promptId: p.id, tier: p.tier, entitled });
  const k = entitled ? actionKeyboard(ctx, p) : buyKeyboard(ctx, app, p);
  await show(
    ctx,
    app,
    cardText(ctx, app, p, entitled),
    navRow(k, ctx.locale, ctx.session.lastList),
  );
}

/** Sends a (possibly long) prompt text as copyable code blocks. Last message gets `keyboard`. */
async function sendPromptText(
  ctx: BotContext,
  app: AppDeps,
  header: string,
  text: string,
  keyboard: InlineKeyboard,
  footer?: string,
): Promise<void> {
  const chunks = chunkText(text, BODY_CHUNK);
  for (let i = 0; i < chunks.length; i++) {
    const parts: string[] = [];
    if (i === 0) parts.push(header);
    if (chunks.length > 1)
      parts.push(`<i>${ctx.t("prompt.part", { part: i + 1, parts: chunks.length })}</i>`);
    parts.push(codeBlock(chunks[i] ?? ""));
    const last = i === chunks.length - 1;
    if (last && footer) parts.push(footer);
    await send(ctx, app, parts.join("\n\n"), last ? keyboard : undefined);
  }
}

/** Delivers the full body: watermarked when paid. Caller must have checked access. */
export async function deliverBody(
  ctx: BotContext,
  app: AppDeps,
  p: PromptDetail,
  body: string,
  paid: boolean,
): Promise<void> {
  const text = paid ? applyWatermark(body, ctx.user.id) : body;
  const k = new InlineKeyboard();
  if (p.variables.length > 0) k.text(ctx.t("btn.fill"), cb.wizard(p.id)).row();
  if (isRunnable(p.outputType)) {
    k.text(ctx.t("btn.run", { cost: runCost(p.outputType) }), cb.run(p.id)).row();
  }
  navRow(k, ctx.locale, cb.prompt(p.id));
  await sendPromptText(
    ctx,
    app,
    ctx.t("prompt.full", { title: p.title }),
    text,
    k,
    paid ? ctx.t("prompt.watermarkNote") : undefined,
  );
  track(app, "copy_prompt", ctx.user.id, { promptId: p.id, tier: p.tier });
}

async function forbidden(ctx: BotContext, app: AppDeps, p: PromptDetail): Promise<void> {
  await show(
    ctx,
    app,
    ctx.t("prompt.forbidden"),
    navRow(buyKeyboard(ctx, app, p), ctx.locale, cb.prompt(p.id)),
  );
}

export async function showFullPrompt(ctx: BotContext, app: AppDeps, id: string): Promise<void> {
  const p = await app.services.catalog.getPrompt(id, ctx.locale);
  if (!p) {
    await show(ctx, app, ctx.t("prompt.notFound"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const access = await loadAccessibleBody(app, ctx, p);
  if (!access) return forbidden(ctx, app, p);
  await deliverBody(ctx, app, p, access.body, access.paid);
}

// ───────────────────────── variables wizard ─────────────────────────

function wizardQuestion(ctx: BotContext, v: PromptVariable, index: number, count: number) {
  const lines = [ctx.t("wizard.ask", { index: index + 1, count, label: v.label })];
  if (!v.required) lines.push(ctx.t("wizard.optional"));
  if (v.default) lines.push(ctx.t("wizard.default", { value: v.default }));
  if (v.type === "select" && v.options?.length) lines.push(ctx.t("wizard.choose"));
  const k = new InlineKeyboard();
  if (v.type === "select") {
    (v.options ?? []).slice(0, 20).forEach((opt, i) => {
      k.text(truncate(opt, 40), cb.wizardOption(i)).row();
    });
  }
  if (v.default) k.text(ctx.t("btn.useDefault"), cb.wizardSkip()).row();
  else if (!v.required) k.text(ctx.t("btn.skip"), cb.wizardSkip()).row();
  return { text: lines.join("\n"), keyboard: k };
}

async function askVariable(ctx: BotContext, app: AppDeps, p: PromptDetail, index: number) {
  const v = p.variables[index];
  if (!v) return;
  const q = wizardQuestion(ctx, v, index, p.variables.length);
  q.keyboard.text(ctx.t("btn.cancel"), cb.prompt(p.id));
  await send(ctx, app, q.text, q.keyboard);
}

export async function startWizard(
  ctx: BotContext,
  app: AppDeps,
  id: string,
  runAfter = false,
): Promise<void> {
  const p = await app.services.catalog.getPrompt(id, ctx.locale);
  if (!p) {
    await show(ctx, app, ctx.t("prompt.notFound"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const access = await loadAccessibleBody(app, ctx, p);
  if (!access) return forbidden(ctx, app, p);
  if (p.variables.length === 0) {
    if (runAfter) return executeRun(ctx, app, access.body, runCost(p.outputType), p.id);
    await show(
      ctx,
      app,
      ctx.t("wizard.noVars"),
      navRow(
        new InlineKeyboard().text(ctx.t("btn.fullPrompt"), cb.full(p.id)).row(),
        ctx.locale,
        cb.prompt(p.id),
      ),
    );
    return;
  }
  ctx.session.step = { kind: "wizard", promptId: p.id, index: 0, values: {}, runAfter };
  await send(ctx, app, ctx.t("wizard.start", { count: p.variables.length }));
  await askVariable(ctx, app, p, 0);
}

const PERSIAN_ARABIC_DIGITS = /[۰-۹٠-٩]/g;
function asciiDigits(s: string): string {
  return s.replace(PERSIAN_ARABIC_DIGITS, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

/** Handles one wizard answer. `value === null` means "skip / use default". */
export async function wizardAnswer(
  ctx: BotContext,
  app: AppDeps,
  value: string | null,
): Promise<void> {
  const step = ctx.session.step;
  if (step.kind !== "wizard") {
    await send(ctx, app, ctx.t("error.invalidState"));
    return;
  }
  const p = await app.services.catalog.getPrompt(step.promptId, ctx.locale);
  const v = p?.variables[step.index];
  if (!p || !v) {
    resetStep(ctx);
    await send(ctx, app, ctx.t("error.invalidState"));
    return;
  }
  let answer = value?.trim() ?? "";
  if (value === null) {
    if (v.default) answer = v.default;
    else if (v.required) {
      await send(ctx, app, ctx.t("wizard.required"));
      return;
    }
  } else if (v.type === "number") {
    answer = asciiDigits(answer)
      .replace(/[٬,\s]/g, "")
      .replace("٫", ".");
    if (!/^-?\d+(\.\d+)?$/.test(answer)) {
      await send(ctx, app, ctx.t("wizard.invalidNumber"));
      return;
    }
  }
  if (!answer && v.required) {
    await send(ctx, app, ctx.t("wizard.required"));
    return;
  }
  const values = { ...step.values, [v.name]: answer.slice(0, 1000) };
  const next = step.index + 1;
  if (next < p.variables.length) {
    ctx.session.step = { ...step, index: next, values };
    await askVariable(ctx, app, p, next);
    return;
  }
  await finishWizard(ctx, app, p, values, step.runAfter);
}

async function finishWizard(
  ctx: BotContext,
  app: AppDeps,
  p: PromptDetail,
  values: Record<string, string>,
  runAfter: boolean,
): Promise<void> {
  resetStep(ctx);
  const access = await loadAccessibleBody(app, ctx, p); // re-check: entitlement may have changed
  if (!access) return forbidden(ctx, app, p);
  for (const v of p.variables) if (!(v.name in values)) values[v.name] = v.default ?? "";
  const filled = fillTemplate(access.body, values);
  ctx.session.runnable = { text: filled, promptId: p.id };
  track(app, "fill_variables", ctx.user.id, { promptId: p.id, count: p.variables.length });
  if (runAfter) {
    await executeRun(ctx, app, filled, runCost(p.outputType), p.id);
    return;
  }
  const delivered = access.paid ? applyWatermark(filled, ctx.user.id) : filled;
  const k = new InlineKeyboard();
  if (isRunnable(p.outputType)) {
    k.text(ctx.t("btn.run", { cost: runCost(p.outputType) }), cb.runSession()).row();
  }
  k.text(ctx.t("btn.fill"), cb.wizard(p.id)).row();
  navRow(k, ctx.locale, cb.prompt(p.id));
  await sendPromptText(
    ctx,
    app,
    ctx.t("wizard.done"),
    delivered,
    k,
    access.paid ? ctx.t("prompt.watermarkNote") : undefined,
  );
}

// ───────────────────────── run with AI ─────────────────────────

export async function insufficientCredits(
  ctx: BotContext,
  app: AppDeps,
  need: number,
): Promise<void> {
  const balance = await app.services.credits.balance(ctx.user.id);
  const k = new InlineKeyboard()
    .text(ctx.t("btn.buyCredits"), cb.menu("packs"))
    .text(ctx.t("btn.plans"), cb.menu("plans"))
    .row();
  await send(ctx, app, ctx.t("credits.insufficient", { need, balance }), navRow(k, ctx.locale));
}

/** Spends credits, runs the prompt, refunds on failure. */
export async function executeRun(
  ctx: BotContext,
  app: AppDeps,
  text: string,
  cost: number,
  promptId: string | null,
): Promise<void> {
  let balance: number;
  try {
    balance = await app.services.credits.spend(ctx.user.id, cost, "ai_run", promptId ?? undefined);
  } catch (err) {
    if (isDomainError(err, "insufficient_credits")) return insufficientCredits(ctx, app, cost);
    throw err;
  }
  await send(ctx, app, ctx.t("run.working"));
  await typing(ctx);
  let output: string;
  let model = "";
  try {
    const res = await withTimeout(app.ai.runPrompt(text, ctx.locale), aiTimeout(app), "runPrompt");
    output = res.text;
    model = `${res.provider}:${res.model}`;
  } catch (err) {
    app.logger.warn({ err, promptId }, "ai.runPrompt failed — refunding");
    await app.services.credits.grant(ctx.user.id, cost, "ai_run_refund", promptId ?? undefined);
    await send(
      ctx,
      app,
      ctx.t(aiErrorKey(err) ?? "run.failed"),
      navRow(new InlineKeyboard(), ctx.locale),
    );
    return;
  }
  track(app, "ai_run_prompt", ctx.user.id, { promptId, cost, model });
  const chunks = chunkText(output, 3500);
  const k = navRow(new InlineKeyboard(), ctx.locale, promptId ? cb.prompt(promptId) : undefined);
  for (let i = 0; i < chunks.length; i++) {
    const head = i === 0 ? `${ctx.t("run.result", { cost, balance })}\n\n` : "";
    await send(
      ctx,
      app,
      `${head}${escapeHtml(chunks[i] ?? "")}`,
      i === chunks.length - 1 ? k : undefined,
    );
  }
}

export async function runCatalogPrompt(ctx: BotContext, app: AppDeps, id: string): Promise<void> {
  const p = await app.services.catalog.getPrompt(id, ctx.locale);
  if (!p) {
    await show(ctx, app, ctx.t("prompt.notFound"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  if (!isRunnable(p.outputType)) {
    const typeKey = `output.${p.outputType}` as MessageKey;
    await show(
      ctx,
      app,
      ctx.t("run.notRunnable", { type: ctx.t(typeKey) }),
      navRow(new InlineKeyboard(), ctx.locale, cb.prompt(p.id)),
    );
    return;
  }
  const access = await loadAccessibleBody(app, ctx, p);
  if (!access) return forbidden(ctx, app, p);
  if (p.variables.some((v) => v.required && !v.default)) {
    await startWizard(ctx, app, p.id, true);
    return;
  }
  const values = Object.fromEntries(p.variables.map((v) => [v.name, v.default ?? ""]));
  await executeRun(ctx, app, fillTemplate(access.body, values), runCost(p.outputType), p.id);
}

export function promptComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.callbackQuery(/^p:(.+)$/, (ctx) => {
    if (ctx.session.step.kind === "wizard") resetStep(ctx);
    return openPromptCard(ctx, app, ctx.match[1] ?? "");
  });
  c.callbackQuery(/^pf:(.+)$/, (ctx) => showFullPrompt(ctx, app, ctx.match[1] ?? ""));
  c.callbackQuery(/^w:(.+)$/, (ctx) => startWizard(ctx, app, ctx.match[1] ?? ""));
  c.callbackQuery(/^wo:(\d+)$/, async (ctx) => {
    const step = ctx.session.step;
    if (step.kind !== "wizard") return send(ctx, app, ctx.t("error.invalidState"));
    const p = await app.services.catalog.getPrompt(step.promptId, ctx.locale);
    const opt = p?.variables[step.index]?.options?.[Number(ctx.match[1])];
    if (opt === undefined) return send(ctx, app, ctx.t("error.invalidState"));
    return wizardAnswer(ctx, app, opt);
  });
  c.callbackQuery("ws", (ctx) => wizardAnswer(ctx, app, null));
  c.callbackQuery(/^r:(.+)$/, (ctx) => runCatalogPrompt(ctx, app, ctx.match[1] ?? ""));
  c.callbackQuery("rs", async (ctx) => {
    const r = ctx.session.runnable;
    if (!r) return send(ctx, app, ctx.t("run.nothing"), navRow(new InlineKeyboard(), ctx.locale));
    // For catalog prompts, re-check access before spending (entitlement could have been revoked).
    if (r.promptId) {
      const p = await app.services.catalog.getPrompt(r.promptId, ctx.locale);
      if (!p || !(await loadAccessibleBody(app, ctx, p))) {
        ctx.session.runnable = null;
        return send(ctx, app, ctx.t("run.nothing"));
      }
      return executeRun(ctx, app, r.text, runCost(p.outputType), r.promptId);
    }
    return executeRun(ctx, app, r.text, SESSION_RUN_COST, null);
  });
  return c;
}

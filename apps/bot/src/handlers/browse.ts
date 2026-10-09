import type { Page, PromptSummary } from "@rasa/shared";
import { Composer, InlineKeyboard } from "grammy";
import { cb } from "../callbacks";
import { resetStep, track } from "../flow";
import type { AppDeps, BotContext } from "../types";
import { listItems, listKeyboard, navRow, pagerRow, show, truncate } from "../ui";

export const PAGE_SIZE = 5;
const CATS_PER_PAGE = 8;
const TRENDING_LIMIT = 30;

function pagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

export async function askSearch(ctx: BotContext, app: AppDeps): Promise<void> {
  ctx.session.step = { kind: "await_search" };
  await show(ctx, app, ctx.t("search.ask"), navRow(new InlineKeyboard(), ctx.locale));
}

export async function runSearch(
  ctx: BotContext,
  app: AppDeps,
  query: string,
  page = 1,
): Promise<void> {
  const q = query.trim().slice(0, 200);
  ctx.session.lastQuery = q;
  const res = await app.services.catalog.search(
    q,
    ctx.locale,
    { page, pageSize: PAGE_SIZE, sort: "relevance" },
    ctx.user.id,
  );
  if (page === 1) {
    track(app, "search", ctx.user.id, { query: q, total: res.total, locale: ctx.locale });
    if (res.total === 0) {
      track(app, "search_zero_results", ctx.user.id, { query: q, locale: ctx.locale });
    }
  }
  if (res.total === 0 || res.items.length === 0) {
    const k = new InlineKeyboard()
      .text(ctx.t("btn.tryBuilder"), cb.menu("build"))
      .row()
      .text(ctx.t("btn.newSearch"), cb.menu("search"))
      .row();
    await show(ctx, app, ctx.t("search.empty", { query: q }), navRow(k, ctx.locale));
    return;
  }
  ctx.session.lastList = cb.search(res.page);
  await showPage(ctx, app, ctx.t("search.results", { query: q, total: res.total }), res, cb.search);
}

async function showPage(
  ctx: BotContext,
  app: AppDeps,
  header: string,
  res: Page<PromptSummary>,
  pageData: (page: number) => string,
  back?: string,
): Promise<void> {
  const offset = (res.page - 1) * res.pageSize;
  const pages = pagesOf(res.total, res.pageSize);
  const body = `${header}\n\n${listItems(ctx.locale, res.items, offset)}`;
  await show(
    ctx,
    app,
    body,
    listKeyboard(ctx.locale, res.items, offset, res.page, pages, pageData, back),
  );
}

export async function showCategories(ctx: BotContext, app: AppDeps, page = 1): Promise<void> {
  const cats = await app.services.catalog.listCategories(ctx.locale);
  const visible = cats.filter((c) => c.promptCount > 0 || cats.length <= CATS_PER_PAGE);
  if (visible.length === 0) {
    await show(ctx, app, ctx.t("cats.empty"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const pages = pagesOf(visible.length, CATS_PER_PAGE);
  const p = Math.min(Math.max(1, page), pages);
  const slice = visible.slice((p - 1) * CATS_PER_PAGE, p * CATS_PER_PAGE);
  const k = new InlineKeyboard();
  slice.forEach((c, i) => {
    k.text(truncate(`${c.emoji ? `${c.emoji} ` : ""}${c.name}`, 30), cb.category(c.id, 1));
    if (i % 2 === 1) k.row();
  });
  if (slice.length % 2 === 1) k.row();
  pagerRow(k, ctx.locale, p, pages, cb.cats);
  await show(ctx, app, ctx.t("cats.title"), navRow(k, ctx.locale));
}

export async function showCategory(
  ctx: BotContext,
  app: AppDeps,
  categoryId: string,
  page = 1,
): Promise<void> {
  const [cats, res] = await Promise.all([
    app.services.catalog.listCategories(ctx.locale),
    app.services.catalog.listByCategory(categoryId, ctx.locale, {
      page,
      pageSize: PAGE_SIZE,
      sort: "quality",
    }),
  ]);
  const cat = cats.find((c) => c.id === categoryId);
  if (res.items.length === 0) {
    await show(ctx, app, ctx.t("cat.empty"), navRow(new InlineKeyboard(), ctx.locale, cb.cats(1)));
    return;
  }
  ctx.session.lastList = cb.category(categoryId, res.page);
  const header = ctx.t("cat.title", {
    emoji: cat?.emoji ?? "📚",
    name: cat?.name ?? "",
    total: res.total,
  });
  await showPage(ctx, app, header, res, (p) => cb.category(categoryId, p), cb.cats(1));
}

export async function showTrending(ctx: BotContext, app: AppDeps, page = 1): Promise<void> {
  const all = await app.services.catalog.listTrending(ctx.locale, TRENDING_LIMIT);
  if (all.length === 0) {
    await show(ctx, app, ctx.t("trending.empty"), navRow(new InlineKeyboard(), ctx.locale));
    return;
  }
  const pages = pagesOf(all.length, PAGE_SIZE);
  const p = Math.min(Math.max(1, page), pages);
  ctx.session.lastList = cb.trending(p);
  await showPage(
    ctx,
    app,
    ctx.t("trending.title"),
    {
      items: all.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE),
      total: all.length,
      page: p,
      pageSize: PAGE_SIZE,
    },
    cb.trending,
  );
}

export async function showLibrary(ctx: BotContext, app: AppDeps, page = 1): Promise<void> {
  const res = await app.services.entitlements.library(ctx.user.id, ctx.locale, page);
  if (res.total === 0 || res.items.length === 0) {
    const k = new InlineKeyboard()
      .text(ctx.t("menu.trending"), cb.menu("trend"))
      .text(ctx.t("btn.plans"), cb.menu("plans"))
      .row();
    await show(ctx, app, ctx.t("library.empty"), navRow(k, ctx.locale));
    return;
  }
  ctx.session.lastList = cb.library(res.page);
  await showPage(ctx, app, ctx.t("library.title", { total: res.total }), res, cb.library);
}

export function browseComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.callbackQuery(/^s:(\d+)$/, async (ctx) => {
    const q = ctx.session.lastQuery;
    if (!q) {
      await show(ctx, app, ctx.t("search.expired"), navRow(new InlineKeyboard(), ctx.locale));
      return;
    }
    await runSearch(ctx, app, q, Number(ctx.match[1]));
  });
  c.callbackQuery(/^cs:(\d+)$/, (ctx) => showCategories(ctx, app, Number(ctx.match[1])));
  c.callbackQuery(/^c:(.+):(\d+)$/, (ctx) =>
    showCategory(ctx, app, ctx.match[1] ?? "", Number(ctx.match[2])),
  );
  c.callbackQuery(/^tr:(\d+)$/, (ctx) => showTrending(ctx, app, Number(ctx.match[1])));
  c.callbackQuery(/^lib:(\d+)$/, (ctx) => showLibrary(ctx, app, Number(ctx.match[1])));
  c.command("search", async (ctx) => {
    resetStep(ctx);
    const q = typeof ctx.match === "string" ? ctx.match.trim() : "";
    if (q) await runSearch(ctx, app, q);
    else await askSearch(ctx, app);
  });
  c.command("library", (ctx) => {
    resetStep(ctx);
    return showLibrary(ctx, app, 1);
  });
  return c;
}

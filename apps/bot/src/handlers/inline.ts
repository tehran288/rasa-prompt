import { Composer } from "grammy";
import type { InlineQueryResultArticle } from "grammy/types";
import { track } from "../flow";
import { tPlain } from "../i18n";
import type { AppDeps, BotContext } from "../types";
import { deepLink, joinList, render, tierBadge, truncate } from "../ui";

const PAGE = 20;

/**
 * Inline mode (Telegram only — capability-gated). Results carry ONLY public data
 * (title, summary, badge, models, score) plus a deep link into the bot; never a body.
 */
export function inlineComposer(app: AppDeps): Composer<BotContext> {
  const c = new Composer<BotContext>();
  c.on("inline_query", async (ctx) => {
    if (!app.caps.inlineMode) return;
    const q = ctx.inlineQuery.query.trim().slice(0, 200);
    const offset = Number.parseInt(ctx.inlineQuery.offset || "0", 10) || 0;
    const page = Math.floor(offset / PAGE) + 1;
    const L = ctx.locale;
    let items: Awaited<ReturnType<AppDeps["services"]["catalog"]["listTrending"]>>;
    let total: number;
    if (q) {
      const res = await app.services.catalog.search(q, L, { page, pageSize: PAGE }, ctx.user.id);
      items = res.items;
      total = res.total;
      if (page === 1) track(app, "search", ctx.user.id, { query: q, total, source: "inline" });
    } else {
      items = page === 1 ? await app.services.catalog.listTrending(L, PAGE) : [];
      total = items.length;
    }
    const results: InlineQueryResultArticle[] = items.map((p) => {
      const msg = render(
        app.caps,
        ctx.t("inline.message", {
          badge: tierBadge(L, p.tier),
          title: p.title,
          summary: truncate(p.summary, 400),
          models: joinList(L, p.models),
          score: p.qualityScore,
        }),
      );
      return {
        type: "article",
        id: p.id.slice(0, 64),
        title: truncate(`${tierBadge(L, p.tier)} ${p.title}`, 100),
        description: truncate(p.summary, 200),
        input_message_content: {
          message_text: msg.text,
          ...(msg.parse_mode ? { parse_mode: msg.parse_mode } : {}),
        },
        reply_markup: {
          inline_keyboard: [
            [{ text: tPlain(L, "inline.open"), url: deepLink(app, ctx.me.username, `p_${p.id}`) }],
          ],
        },
      };
    });
    const nextOffset = q && offset + items.length < total ? String(offset + items.length) : "";
    await ctx.answerInlineQuery(results, {
      cache_time: 60,
      is_personal: true,
      next_offset: nextOffset,
      button: { text: tPlain(L, "inline.startButton"), start_parameter: "inline" },
    });
  });
  return c;
}

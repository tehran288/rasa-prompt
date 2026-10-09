import type { Locale, Platform, PromptSummary, PromptTier } from "@rasa/shared";
import { GrammyError, InlineKeyboard, Keyboard } from "grammy";
import type { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "grammy/types";
import { cb, type Screen } from "./callbacks";
import { type Capabilities, disableOnUnsupported } from "./capabilities";
import { escapeHtml, formatNumber, formatStars, formatToman, type MessageKey, t } from "./i18n";
import type { AppDeps, BotContext } from "./types";

/** Telegram hard limit is 4096 chars; keep headroom for tags/entities. */
export const MAX_MESSAGE = 3800;

// ───────────────────────── text rendering ─────────────────────────

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Our HTML subset → plain text, for platforms without parse_mode=HTML (Bale). */
export function htmlToPlain(html: string): string {
  return unescapeHtml(
    html
      .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gs, (_m, href: string, label: string) =>
        label === href ? href : `${label} (${href})`,
      )
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/?(b|strong|i|em|u|s|code|pre|blockquote|tg-spoiler|span)[^>]*>/g, ""),
  );
}

export interface Rendered {
  text: string;
  parse_mode?: "HTML";
  link_preview_options?: { is_disabled: boolean };
}

export function render(caps: Capabilities, html: string): Rendered {
  const out: Rendered = caps.html
    ? { text: html, parse_mode: "HTML" }
    : { text: htmlToPlain(html) };
  if (caps.linkPreviewOptions) out.link_preview_options = { is_disabled: true };
  return out;
}

/** Splits long text at paragraph/line/space boundaries. */
export function chunkText(text: string, max = MAX_MESSAGE): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut <= 0) cut = max;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest.length > 0 || chunks.length === 0) chunks.push(rest);
  return chunks;
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** A copyable code block (HTML) or the raw text (plain platforms). */
export function codeBlock(text: string): string {
  return `<pre>${escapeHtml(text)}</pre>`;
}

// ───────────────────────── sending ─────────────────────────

type Markup = InlineKeyboard | InlineKeyboardMarkup | Keyboard | ReplyKeyboardMarkup;

export async function send(
  ctx: BotContext,
  app: AppDeps,
  html: string,
  markup?: Markup,
): Promise<void> {
  const r = render(app.caps, html);
  await ctx.reply(r.text, {
    ...(r.parse_mode ? { parse_mode: r.parse_mode } : {}),
    ...(r.link_preview_options ? { link_preview_options: r.link_preview_options } : {}),
    ...(markup ? { reply_markup: markup } : {}),
  });
}

export async function sendTo(
  app: AppDeps,
  api: BotContext["api"],
  chatId: number | string,
  html: string,
  markup?: InlineKeyboard,
): Promise<void> {
  const r = render(app.caps, html);
  await api.sendMessage(chatId, r.text, {
    ...(r.parse_mode ? { parse_mode: r.parse_mode } : {}),
    ...(r.link_preview_options ? { link_preview_options: r.link_preview_options } : {}),
    ...(markup ? { reply_markup: markup } : {}),
  });
}

/**
 * Shows a screen: edits the message the tapped button belongs to (callback queries),
 * otherwise sends a new message. Falls back to sending when editing is impossible.
 */
export async function show(
  ctx: BotContext,
  app: AppDeps,
  html: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const msg = ctx.callbackQuery?.message;
  if (msg && !ctx.forceNewMessage && app.caps.editMessages && "text" in msg) {
    const r = render(app.caps, html);
    try {
      await ctx.editMessageText(r.text, {
        ...(r.parse_mode ? { parse_mode: r.parse_mode } : {}),
        ...(r.link_preview_options ? { link_preview_options: r.link_preview_options } : {}),
        ...(keyboard ? { reply_markup: keyboard } : {}),
      });
      return;
    } catch (err) {
      if (err instanceof GrammyError && /not modified/i.test(err.description)) return;
      disableOnUnsupported(app.caps, "editMessages", err);
      // fall through to a fresh message (e.g. message too old / deleted)
    }
  }
  await send(ctx, app, html, keyboard);
}

// ───────────────────────── keyboards ─────────────────────────

export const MENU_ITEMS: { key: MessageKey; screen: Screen }[] = [
  { key: "menu.search", screen: "search" },
  { key: "menu.categories", screen: "cats" },
  { key: "menu.trending", screen: "trend" },
  { key: "menu.builder", screen: "build" },
  { key: "menu.library", screen: "lib" },
  { key: "menu.account", screen: "acct" },
  { key: "menu.invite", screen: "ref" },
  { key: "menu.support", screen: "sup" },
  { key: "menu.language", screen: "lang" },
];

/** Persistent reply keyboard with the main menu (2 per row, AI builder on its own row). */
export function mainReplyKeyboard(locale: Locale): Keyboard {
  const k = new Keyboard();
  const label = (key: MessageKey) => t(locale, key);
  k.text(label("menu.search")).text(label("menu.categories")).row();
  k.text(label("menu.builder")).row();
  k.text(label("menu.trending")).text(label("menu.library")).row();
  k.text(label("menu.account")).text(label("menu.invite")).row();
  k.text(label("menu.support")).text(label("menu.language"));
  return k
    .resized()
    .persistent()
    .placeholder(truncate(t(locale, "menu.placeholder"), 64));
}

export function mainInlineMenu(locale: Locale): InlineKeyboard {
  const k = new InlineKeyboard();
  MENU_ITEMS.forEach((item, i) => {
    k.text(t(locale, item.key), cb.menu(item.screen));
    if (item.screen === "build" || i % 2 === 1) k.row();
  });
  return k;
}

/** Reverse map from any locale's menu label → screen (reply keyboard taps arrive as text). */
const LABEL_TO_SCREEN = new Map<string, Screen>();
for (const locale of ["fa", "ar", "en"] as const) {
  for (const item of MENU_ITEMS) LABEL_TO_SCREEN.set(t(locale, item.key), item.screen);
}
export function screenForLabel(text: string): Screen | undefined {
  return LABEL_TO_SCREEN.get(text.trim());
}

export function navRow(k: InlineKeyboard, locale: Locale, back?: string): InlineKeyboard {
  if (back) k.text(t(locale, "btn.back"), back);
  return k.text(t(locale, "btn.home"), cb.menu("home"));
}

export function pagerRow(
  k: InlineKeyboard,
  locale: Locale,
  page: number,
  pages: number,
  data: (page: number) => string,
): InlineKeyboard {
  if (pages <= 1) return k;
  if (page > 1) k.text(t(locale, "btn.prev"), data(page - 1));
  k.text(t(locale, "page.indicator", { page, pages }), cb.noop());
  if (page < pages) k.text(t(locale, "btn.next"), data(page + 1));
  return k.row();
}

// ───────────────────────── domain formatting ─────────────────────────

export function tierBadge(locale: Locale, tier: PromptTier): string {
  return t(locale, tier === "free" ? "tier.free" : tier === "pro" ? "tier.pro" : "tier.premium");
}

/** Price for the current platform's checkout currency. Null if not sold individually there. */
export function priceLabel(
  locale: Locale,
  platform: Platform,
  caps: Capabilities,
  p: { priceToman: number | null; priceStars: number | null },
): string | null {
  if (platform === "telegram" && caps.starsPayments && p.priceStars) {
    return formatStars(locale, p.priceStars);
  }
  if (p.priceToman) return formatToman(locale, p.priceToman);
  if (p.priceStars) return formatStars(locale, p.priceStars);
  return null;
}

export function joinList(locale: Locale, items: string[]): string {
  if (items.length === 0) return "—";
  return items.join(locale === "en" ? ", " : "، ");
}

export function listItems(locale: Locale, items: PromptSummary[], offset: number): string {
  return items
    .map((p, i) =>
      t(locale, "list.item", {
        n: offset + i + 1,
        badge: tierBadge(locale, p.tier),
        title: p.title,
        models: joinList(locale, p.models),
        score: p.qualityScore,
      }),
    )
    .join("\n\n");
}

/** One button per prompt + pager + nav. */
export function listKeyboard(
  locale: Locale,
  items: PromptSummary[],
  offset: number,
  page: number,
  pages: number,
  pageData: (page: number) => string,
  back?: string,
): InlineKeyboard {
  const k = new InlineKeyboard();
  items.forEach((p, i) => {
    k.text(
      `${formatNumber(locale, offset + i + 1)}. ${truncate(p.title, 40)}`,
      cb.prompt(p.id),
    ).row();
  });
  pagerRow(k, locale, page, pages, pageData);
  return navRow(k, locale, back);
}

// ───────────────────────── links ─────────────────────────

/**
 * Platform-aware deep link: https://t.me/<bot>?start=<payload> (Telegram) or
 * https://ble.ir/<bot>?start=<payload> (Bale). Base is configurable via options.deepLinkBase.
 */
export function deepLink(app: AppDeps, botUsername: string, payload: string): string {
  const base = (app.options.deepLinkBase ?? app.caps.deepLinkBase).replace(/\/+$/, "");
  return `${base}/${botUsername}?start=${encodeURIComponent(payload)}`;
}

export function shareLink(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

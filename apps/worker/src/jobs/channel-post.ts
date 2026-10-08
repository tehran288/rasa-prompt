/**
 * `channel-post` — daily 10:00 Tehran. "Prompt of the day" per locale to each platform channel.
 *
 * - Telegram channel gets fa + ar (HTML); Bale channel gets fa (plain text) — see CHANNEL_LOCALES.
 * - Text from `agents.writeChannelPost`; on AI failure a safe template (title + summary) is used.
 * - Paid-body guard: the AI only ever receives `PromptDetail` (no body), but as defence in depth
 *   any post that contains a run of the paid body is replaced by the template.
 * - Deep link `?start=p_<id>` is appended by the worker (and attached as a URL button).
 * Idempotency: settings key `channel_post:<platform>:<locale>:<tehranDate>`.
 */
import type {
  AssistantAgents,
  CatalogService,
  Config,
  Locale,
  Logger,
  Platform,
  PromptDetail,
  SettingsService,
} from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import { msg } from "../i18n";
import { classifySendError, deepLink, escapeHtml, sendWithRetry, stripHtml } from "../messenger";
import { channelId, errInfo, tehranDateKey } from "../util";

export const CHANNEL_LOCALES: Record<Platform, Locale[]> = { telegram: ["fa", "ar"], bale: ["fa"] };

export interface ChannelPostDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  catalog: CatalogService;
  agents: AssistantAgents;
  settings: SettingsService;
}

export interface PostedItem {
  platform: Platform;
  locale: Locale;
  promptId: string;
  text: string;
  usedFallback: boolean;
}

export async function runChannelPost(deps: ChannelPostDeps): Promise<PostedItem[]> {
  const log = deps.logger.child({ job: "channel-post" });
  const now = deps.clock.now();
  const day = tehranDateKey(now);
  const posted: PostedItem[] = [];

  for (const platform of ["telegram", "bale"] as const) {
    const m = deps.messengers[platform];
    const chat = channelId(deps.config, platform);
    if (!m || !chat) continue;
    for (const locale of CHANNEL_LOCALES[platform]) {
      const key = `channel_post:${platform}:${locale}:${day}`;
      try {
        if (await deps.settings.get<string | null>(key, null)) {
          log.info({ platform, locale }, "already posted today");
          continue;
        }
        const prompt = await deps.catalog.promptOfTheDay(locale, now);
        if (!prompt) {
          log.warn({ platform, locale }, "no prompt of the day");
          continue;
        }
        const link = deepLink(platform, await m.botUsername(), `p_${prompt.id}`);
        const { text, usedFallback } = await composePost(deps, prompt, locale, platform, link);
        const buttons = [[{ text: msg("channelCta", locale).replace(/^👈\s*/, ""), url: link }]];
        try {
          await sendWithRetry(m, deps.clock, chat, text, {
            html: platform === "telegram",
            buttons,
          });
        } catch (err) {
          const c = classifySendError(err);
          if (platform !== "telegram" || c.kind !== "bad_request") throw err;
          // Most likely invalid HTML from the model → resend as plain text.
          log.warn({ err: errInfo(err) }, "HTML rejected, resending as plain text");
          await sendWithRetry(m, deps.clock, chat, stripHtml(text), { buttons });
        }
        await deps.settings.set(key, prompt.id);
        posted.push({ platform, locale, promptId: prompt.id, text, usedFallback });
        log.info({ platform, locale, promptId: prompt.id, usedFallback }, "channel post sent");
      } catch (err) {
        log.error({ err: errInfo(err), platform, locale }, "channel post failed");
      }
    }
  }
  return posted;
}

export async function composePost(
  deps: Pick<ChannelPostDeps, "agents" | "catalog" | "logger">,
  prompt: PromptDetail,
  locale: Locale,
  platform: Platform,
  link: string,
): Promise<{ text: string; usedFallback: boolean }> {
  const html = platform === "telegram";
  let body: string | null = null;
  let usedFallback = false;
  try {
    body = (await deps.agents.writeChannelPost(prompt, locale, platform)).trim();
    if (!body) body = null;
  } catch (err) {
    deps.logger.warn({ err: errInfo(err) }, "writeChannelPost failed — using template");
  }
  if (body && prompt.tier !== "free") {
    const paid = await deps.catalog.getPromptBody(prompt.id, locale).catch(() => null);
    if (paid && containsPaidBody(body, paid)) {
      deps.logger.error({ promptId: prompt.id }, "AI post contained paid body — using template");
      body = null;
    }
  }
  if (!body) {
    usedFallback = true;
    body = templatePost(prompt, locale, html);
  } else if (!html) {
    body = stripHtml(body);
  }
  const cta = msg("channelCta", locale);
  const footer = html
    ? `\n\n<a href="${escapeHtml(link)}">${escapeHtml(cta)}</a>`
    : `\n\n${cta}\n${link}`;
  return { text: `${body}${footer}`, usedFallback };
}

export function templatePost(prompt: PromptDetail, locale: Locale, html: boolean): string {
  const e = html ? escapeHtml : (s: string) => s;
  const title = html ? `<b>${e(prompt.title)}</b>` : prompt.title;
  const models = prompt.models.length ? `\n🤖 ${e(prompt.models.join(" · "))}` : "";
  return `${msg("channelHeader", locale)}\n\n${title}\n${e(prompt.summary)}${models}`;
}

/**
 * True when `post` contains any 40-char window of `body` (whitespace-normalized). Short bodies
 * (< 40 chars) are compared whole.
 */
export function containsPaidBody(post: string, body: string, window = 40): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const p = norm(stripHtml(post));
  const b = norm(body);
  if (!b) return false;
  if (b.length <= window) return p.includes(b);
  for (let i = 0; i + window <= b.length; i += Math.floor(window / 2)) {
    if (p.includes(b.slice(i, i + window))) return true;
  }
  return false;
}

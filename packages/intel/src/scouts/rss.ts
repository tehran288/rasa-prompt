import type { TrendSignal } from "@rasa/shared";
import { createRobotsChecker } from "../http";
import { DEFAULT_RSS_FEEDS } from "../sources";
import { sha1 } from "../text";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal, xmlAttr, xmlBlocks, xmlText } from "./common";

/** Curated AI newsletters/blogs (RSS 2.0 or Atom). Items from the last 72h, title + excerpt. */
export function createRssScout(ctx: ScoutContext): Scout {
  const feeds = ctx.options.rssFeeds ?? DEFAULT_RSS_FEEDS;
  const robots = createRobotsChecker(ctx.http);
  return {
    kind: "rss",
    enabled: () => feeds.length > 0,
    async collect() {
      const now = ctx.now();
      const cutoff = now.getTime() - 72 * 3600_000;
      const out: TrendSignal[] = [];
      for (const feed of feeds) {
        try {
          if (!(await robots.allowed(feed.url))) {
            ctx.logger.info({ url: feed.url }, "rss: disallowed by robots.txt");
            continue;
          }
          const { text } = await ctx.http.text(feed.url, { bucket: "rss" });
          const isAtom = /<feed\b/i.test(text) && !/<rss\b/i.test(text);
          const items = xmlBlocks(text, isAtom ? "entry" : "item");
          for (const item of items.slice(0, 30)) {
            const title = xmlText(item, "title");
            const link = isAtom
              ? xmlAttr(item, "link", "href", /rel="alternate"|^(?![\s\S]*rel=)/) ||
                xmlAttr(item, "link", "href")
              : xmlText(item, "link");
            if (!title || !link) continue;
            const dateRaw = isAtom
              ? xmlText(item, "updated") || xmlText(item, "published")
              : xmlText(item, "pubDate") || xmlText(item, "dc:date");
            const date = dateRaw ? new Date(dateRaw) : null;
            if (date && Number.isFinite(date.getTime()) && date.getTime() < cutoff) continue;
            const guid = isAtom ? xmlText(item, "id") : xmlText(item, "guid");
            out.push(
              signal({
                source: "rss",
                externalId: guid || sha1(link),
                url: link,
                title,
                snippet: isAtom
                  ? xmlText(item, "summary") || xmlText(item, "content")
                  : xmlText(item, "description"),
                ...(feed.locale ? { locale: feed.locale } : {}),
                region: "GLOBAL",
                metric: 1,
                metricName: "post",
                observedAt: now,
                license: "proprietary",
                tags: [`feed:${feed.title}`],
              }),
            );
          }
        } catch (err) {
          ctx.logger.warn({ url: feed.url, err: String(err) }, "rss: feed failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

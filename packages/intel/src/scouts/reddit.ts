import type { TrendSignal } from "@rasa/shared";
import { DEFAULT_SUBREDDITS } from "../sources";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal } from "./common";

interface RedditListing {
  data?: {
    children?: {
      kind?: string;
      data?: {
        id?: string;
        name?: string;
        title?: string;
        selftext?: string;
        permalink?: string;
        score?: number;
        num_comments?: number;
        created_utc?: number;
        subreddit?: string;
        link_flair_text?: string | null;
        over_18?: boolean;
        stickied?: boolean;
      };
    }[];
  };
}

/**
 * Official Reddit API (OAuth2 application-only "client_credentials" grant, oauth.reddit.com).
 * We keep titles, a short excerpt, score and permalink — never full post bodies.
 */
export function createRedditScout(ctx: ScoutContext): Scout {
  const subs = ctx.options.subreddits ?? DEFAULT_SUBREDDITS;
  return {
    kind: "reddit",
    enabled: (c) => Boolean(c.REDDIT_CLIENT_ID && c.REDDIT_CLIENT_SECRET),
    async collect() {
      const basic = Buffer.from(
        `${ctx.config.REDDIT_CLIENT_ID}:${ctx.config.REDDIT_CLIENT_SECRET}`,
      ).toString("base64");
      const token = await ctx.http.json<{ access_token?: string }>(
        "https://www.reddit.com/api/v1/access_token",
        {
          bucket: "reddit",
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        },
      );
      if (!token.access_token) throw new Error("reddit: no access_token in OAuth response");
      const headers = { Authorization: `Bearer ${token.access_token}` };
      const observedAt = ctx.now();
      const out: TrendSignal[] = [];
      for (const sub of subs) {
        for (const path of [`top?t=day&limit=25`, `hot?limit=25`]) {
          try {
            const listing = await ctx.http.json<RedditListing>(
              `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/${path}&raw_json=1`,
              { bucket: "reddit", headers },
            );
            for (const child of listing.data?.children ?? []) {
              const p = child.data;
              if (!p?.id || !p.title || p.over_18 || p.stickied) continue;
              out.push(
                signal({
                  source: "reddit",
                  externalId: p.name ?? `t3_${p.id}`,
                  url: `https://www.reddit.com${p.permalink ?? `/comments/${p.id}`}`,
                  title: p.title,
                  snippet: p.selftext ?? "",
                  region: "GLOBAL",
                  metric: p.score ?? 0,
                  metricName: "score",
                  observedAt,
                  license: "unknown",
                  tags: [`r/${p.subreddit ?? sub}`, p.link_flair_text ?? ""],
                }),
              );
            }
          } catch (err) {
            ctx.logger.warn({ sub, path, err: String(err) }, "reddit: listing failed");
          }
        }
      }
      return dedupeSignals(out);
    },
  };
}

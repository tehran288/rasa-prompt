import type { Region, TrendSignal } from "@rasa/shared";
import { DEFAULT_YOUTUBE_QUERIES } from "../sources";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, hoursAgo, signal } from "./common";

interface SearchResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string };
  }[];
}
interface VideosResponse {
  items?: { id?: string; statistics?: { viewCount?: string; likeCount?: string } }[];
}

/**
 * YouTube Data API v3: recent AI tutorial videos per language/region, ranked by views.
 * Quota: search.list = 100 units, videos.list = 1 unit (default daily quota 10,000).
 */
export function createYoutubeScout(ctx: ScoutContext): Scout {
  const queries = ctx.options.youtubeQueries ?? DEFAULT_YOUTUBE_QUERIES;
  return {
    kind: "youtube",
    enabled: (c) => Boolean(c.YOUTUBE_API_KEY),
    async collect() {
      const now = ctx.now();
      const key = encodeURIComponent(ctx.config.YOUTUBE_API_KEY);
      const after = hoursAgo(now, 24 * 7).toISOString();
      const out: TrendSignal[] = [];
      for (const yq of queries) {
        try {
          const search = await ctx.http.json<SearchResponse>(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=15` +
              `&q=${encodeURIComponent(yq.q)}&regionCode=${yq.regionCode}&relevanceLanguage=${yq.relevanceLanguage}` +
              `&publishedAfter=${encodeURIComponent(after)}&key=${key}`,
            { bucket: "youtube" },
          );
          const items = (search.items ?? []).filter((i) => i.id?.videoId);
          if (!items.length) continue;
          const ids = items.map((i) => i.id?.videoId as string);
          const stats = await ctx.http.json<VideosResponse>(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&key=${key}`,
            { bucket: "youtube" },
          );
          const views = new Map(
            (stats.items ?? []).map((v) => [v.id, Number(v.statistics?.viewCount ?? 0)]),
          );
          for (const it of items) {
            const id = it.id?.videoId as string;
            out.push(
              signal({
                source: "youtube",
                externalId: id,
                url: `https://www.youtube.com/watch?v=${id}`,
                title: it.snippet?.title ?? id,
                snippet: it.snippet?.description ?? "",
                locale: yq.relevanceLanguage,
                region: yq.regionCode as Region,
                metric: views.get(id) ?? 0,
                metricName: "views",
                observedAt: now,
                license: "proprietary",
                tags: [`q:${yq.q}`, it.snippet?.channelTitle ?? ""],
              }),
            );
          }
        } catch (err) {
          ctx.logger.warn({ q: yq.q, err: String(err) }, "youtube: query failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

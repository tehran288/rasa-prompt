import type { TrendSignal } from "@rasa/shared";
import { DEFAULT_HN_QUERIES } from "../sources";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal } from "./common";

interface AlgoliaResponse {
  hits?: {
    objectID?: string;
    title?: string | null;
    url?: string | null;
    story_text?: string | null;
    points?: number | null;
    num_comments?: number | null;
    created_at_i?: number;
    _tags?: string[];
  }[];
}

/** HN Algolia search API (public, no key). Stories from the last 72h with real traction. */
export function createHackerNewsScout(ctx: ScoutContext): Scout {
  const queries = ctx.options.hnQueries ?? DEFAULT_HN_QUERIES;
  return {
    kind: "hackernews",
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const since = Math.floor(now.getTime() / 1000) - 72 * 3600;
      const out: TrendSignal[] = [];
      for (const q of queries) {
        const url =
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}` +
          `&tags=story&numericFilters=${encodeURIComponent(`created_at_i>${since},points>15`)}&hitsPerPage=30`;
        try {
          const res = await ctx.http.json<AlgoliaResponse>(url, { bucket: "hackernews" });
          for (const h of res.hits ?? []) {
            if (!h.objectID || !h.title) continue;
            out.push(
              signal({
                source: "hackernews",
                externalId: h.objectID,
                url: `https://news.ycombinator.com/item?id=${h.objectID}`,
                title: h.title,
                snippet: h.story_text ?? h.url ?? "",
                locale: "en",
                region: "GLOBAL",
                metric: h.points ?? 0,
                metricName: "points",
                observedAt: now,
                license: "unknown",
                tags: [`q:${q}`],
              }),
            );
          }
        } catch (err) {
          ctx.logger.warn({ q, err: String(err) }, "hackernews: query failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

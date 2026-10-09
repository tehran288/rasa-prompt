import type { Locale, Region, TrendSignal } from "@rasa/shared";
import { DEFAULT_TREND_SEEDS } from "../sources";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, isoDay, signal } from "./common";

interface SerpTrendsResponse {
  related_queries?: {
    rising?: { query?: string; value?: string; extracted_value?: number; link?: string }[];
    top?: { query?: string; value?: string; extracted_value?: number; link?: string }[];
  };
  error?: string;
}

/** "Breakout" means > +5000% growth in Google Trends. */
export const BREAKOUT_VALUE = 5000;

const REGION_LOCALE: Partial<Record<Region, Locale>> = {
  IR: "fa",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  IQ: "ar",
  US: "en",
  GB: "en",
};

/**
 * Google Trends "related queries → rising" via SerpApi (engine=google_trends,
 * data_type=RELATED_QUERIES). One call per (seed, geo); each call costs one SerpApi credit.
 * The externalId carries the day so the same rising query re-observed tomorrow counts again
 * (that repetition is what feeds the analyst's velocity score).
 */
export function createGoogleTrendsScout(ctx: ScoutContext): Scout {
  const seeds = ctx.options.trendSeeds ?? DEFAULT_TREND_SEEDS;
  return {
    kind: "google_trends",
    enabled: (c) => Boolean(c.SERPAPI_KEY),
    async collect() {
      const now = ctx.now();
      const day = isoDay(now);
      const out: TrendSignal[] = [];
      for (const seed of seeds) {
        for (const geo of seed.geos) {
          const url =
            `https://serpapi.com/search.json?engine=google_trends&data_type=RELATED_QUERIES` +
            `&q=${encodeURIComponent(seed.query)}&geo=${geo === "GLOBAL" ? "" : geo}` +
            `&date=${encodeURIComponent("now 7-d")}&api_key=${encodeURIComponent(ctx.config.SERPAPI_KEY)}`;
          try {
            const res = await ctx.http.json<SerpTrendsResponse>(url, { bucket: "google_trends" });
            if (res.error) throw new Error(res.error);
            for (const r of res.related_queries?.rising ?? []) {
              if (!r.query) continue;
              const breakout = /breakout/i.test(r.value ?? "");
              out.push(
                signal({
                  source: "google_trends",
                  externalId: `${geo}:${seed.query}:${r.query}:${day}`.toLowerCase(),
                  url: `https://trends.google.com/trends/explore?date=now%207-d&geo=${geo}&q=${encodeURIComponent(r.query)}`,
                  title: r.query,
                  snippet: `Rising related query for "${seed.query}" in ${geo}: ${r.value ?? ""}`,
                  locale: REGION_LOCALE[geo] ?? "other",
                  region: geo,
                  metric: breakout ? BREAKOUT_VALUE : (r.extracted_value ?? 0),
                  metricName: "rising_pct",
                  observedAt: now,
                  license: "unknown",
                  tags: [`seed:${seed.query}`, breakout ? "breakout" : "rising"],
                }),
              );
            }
          } catch (err) {
            ctx.logger.warn({ seed: seed.query, geo, err: String(err) }, "google_trends: failed");
          }
        }
      }
      return dedupeSignals(out);
    },
  };
}

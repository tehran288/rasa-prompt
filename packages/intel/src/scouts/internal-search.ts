import type { Region } from "@rasa/shared";
import { normalizeText } from "../text";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, isoDay, signal } from "./common";

const LOCALE_REGION: Record<string, Region> = { fa: "IR", ar: "SA", en: "GLOBAL" };

/**
 * Our own demand: searches in the bots/site that returned nothing. The strongest
 * commercial-intent signal we have — someone already tried to buy this.
 */
export function createInternalSearchScout(ctx: ScoutContext): Scout {
  return {
    kind: "internal_search",
    enabled: () => Boolean(ctx.zeroResultQueries),
    async collect() {
      if (!ctx.zeroResultQueries) return [];
      const now = ctx.now();
      const day = isoDay(now);
      const rows = await ctx.zeroResultQueries();
      return dedupeSignals(
        rows
          .filter((r) => r.query.trim().length >= 2 && r.count > 0)
          .map((r) => {
            const norm = normalizeText(r.query);
            return signal({
              source: "internal_search",
              externalId: `${day}:${norm}`,
              url: `https://rasa-prompt.ir/search?q=${encodeURIComponent(r.query.trim())}`,
              title: r.query.trim(),
              snippet: `Zero-result search (${r.count}× on ${day})`,
              ...(r.locale ? { locale: r.locale } : {}),
              region: r.locale ? (LOCALE_REGION[r.locale] ?? "GLOBAL") : "IR",
              metric: r.count,
              metricName: "zero_result_searches",
              observedAt: now,
              license: "unknown",
              tags: ["internal", "zero-result"],
            });
          }),
      );
    },
  };
}

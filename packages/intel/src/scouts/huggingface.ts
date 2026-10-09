import type { TrendSignal } from "@rasa/shared";
import { normalizeLicense } from "../licenses";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal } from "./common";

interface HfDataset {
  id?: string;
  likes?: number;
  downloads?: number;
  trendingScore?: number;
  lastModified?: string;
  description?: string;
  tags?: string[];
  cardData?: { license?: string | string[]; pretty_name?: string; language?: string[] };
  private?: boolean;
  gated?: boolean | string;
}

/** Hugging Face Hub datasets search. License from cardData.license (fallback: `license:` tag). */
export function createHuggingFaceScout(ctx: ScoutContext): Scout {
  return {
    kind: "huggingface",
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const out: TrendSignal[] = [];
      for (const search of ["prompts", "prompt"]) {
        try {
          const list = await ctx.http.json<HfDataset[]>(
            `https://huggingface.co/api/datasets?search=${search}&sort=trendingScore&direction=-1&limit=30&full=true`,
            { bucket: "huggingface" },
          );
          for (const d of list) {
            if (!d.id || d.private) continue;
            const tagLicense = (d.tags ?? [])
              .filter((t) => t.startsWith("license:"))
              .map((t) => t.slice("license:".length));
            const raw = d.cardData?.license ?? (tagLicense.length ? tagLicense : undefined);
            out.push(
              signal({
                source: "huggingface",
                externalId: d.id,
                url: `https://huggingface.co/datasets/${d.id}`,
                title: d.cardData?.pretty_name ?? d.id,
                snippet: d.description ?? "",
                region: "GLOBAL",
                metric: d.likes ?? 0,
                metricName: "likes",
                observedAt: now,
                license: normalizeLicense(raw),
                tags: [
                  ...(Array.isArray(raw) ? raw : raw ? [raw] : []).map((l) => `license:${l}`),
                  ...(d.cardData?.language ?? []).slice(0, 3).map((l) => `lang:${l}`),
                  d.gated ? "gated" : "",
                ],
              }),
            );
          }
        } catch (err) {
          ctx.logger.warn({ search, err: String(err) }, "huggingface: search failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

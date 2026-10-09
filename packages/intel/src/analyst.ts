import {
  type AiRouter,
  type CatalogService,
  DEFAULT_TREND_WEIGHTS,
  type IntelStore,
  type Locale,
  TARGET_REGIONS,
  type TrendSignal,
  type TrendTopic,
} from "@rasa/shared";
import { z } from "zod";
import { askJson } from "./llm";
import { clamp, keywords as keywordsOf, slugify, truncate } from "./text";
import type { IntelLogger } from "./types";

export type StoredSignal = TrendSignal & { id: string };
export type TrendWeights = { [K in keyof typeof DEFAULT_TREND_WEIGHTS]: number };

export interface PreCluster {
  id: string;
  signals: StoredSignal[];
  keywords: string[];
  /** Ranking strength used to cap how many clusters go to the LLM. */
  strength: number;
}

/** Tags that are bookkeeping, not topic words. */
const META_TAG =
  /^(r\/|q:|seed:|feed:|vendor:|license:|lang:|internal$|zero-result$|technique$|rising$|breakout$|gated$)/;

function signalKeywords(s: TrendSignal): Set<string> {
  const tagText = s.tags.filter((t) => !META_TAG.test(t)).join(" ");
  return new Set(keywordsOf(`${s.title} ${tagText}`));
}

/**
 * Percentile of each signal's metric within its own source (0..1]. Makes Reddit scores,
 * GitHub stars and Trends percentages comparable.
 */
export function sourcePercentiles(signals: TrendSignal[]): Map<TrendSignal, number> {
  const bySource = new Map<string, number[]>();
  for (const s of signals) {
    const arr = bySource.get(s.source) ?? [];
    arr.push(s.metric);
    bySource.set(s.source, arr);
  }
  for (const arr of bySource.values()) arr.sort((a, b) => a - b);
  const out = new Map<TrendSignal, number>();
  for (const s of signals) {
    const arr = bySource.get(s.source) ?? [s.metric];
    let le = 0;
    for (const m of arr) if (m <= s.metric) le++;
    out.set(s, le / arr.length);
  }
  return out;
}

/**
 * Deterministic pre-clustering by normalized keyword overlap (union-find). Keywords that
 * appear in more than `genericShare` of all signals ("ai", "chatgpt"…) never link clusters.
 */
export function preCluster(
  signals: StoredSignal[],
  opts: { genericShare?: number; percentiles?: Map<TrendSignal, number> } = {},
): PreCluster[] {
  const kws = signals.map(signalKeywords);
  const df = new Map<string, number>();
  for (const set of kws) for (const k of set) df.set(k, (df.get(k) ?? 0) + 1);
  const genericShare = opts.genericShare ?? 0.15;
  const genericMin = Math.max(3, genericShare * signals.length);
  const generic = new Set([...df].filter(([, n]) => n > genericMin).map(([k]) => k));
  const linkKws = kws.map((set) => new Set([...set].filter((k) => !generic.has(k))));

  const parent = signals.map((_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] as number;
    while (parent[i] !== r) {
      const next = parent[i] as number;
      parent[i] = r;
      i = next;
    }
    return r;
  };
  for (let i = 0; i < signals.length; i++) {
    const a = linkKws[i] as Set<string>;
    if (a.size === 0) continue;
    for (let j = i + 1; j < signals.length; j++) {
      const b = linkKws[j] as Set<string>;
      if (b.size === 0) continue;
      let inter = 0;
      for (const k of a) if (b.has(k)) inter++;
      if (inter === 0) continue;
      const minSize = Math.min(a.size, b.size);
      const jac = inter / (a.size + b.size - inter);
      const linked =
        (inter >= 2 && (jac >= 0.34 || inter / minSize >= 0.6)) ||
        (minSize <= 2 && inter === minSize);
      if (linked) parent[find(i)] = find(j);
    }
  }

  const pct = opts.percentiles ?? sourcePercentiles(signals);
  const groups = new Map<number, number[]>();
  signals.forEach((_, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });
  const clusters: PreCluster[] = [];
  for (const idxs of groups.values()) {
    const members = idxs.map((i) => signals[i] as StoredSignal);
    const freq = new Map<string, number>();
    for (const i of idxs) for (const k of kws[i] ?? []) freq.set(k, (freq.get(k) ?? 0) + 1);
    const top = [...freq].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 8);
    const sources = new Set(members.map((m) => m.source));
    const strength =
      members.reduce((acc, m) => acc + (pct.get(m) ?? 0), 0) + 0.5 * (sources.size - 1);
    clusters.push({
      id: `c${clusters.length + 1}`,
      signals: members,
      keywords: top.map(([k]) => k),
      strength,
    });
  }
  clusters.sort((a, b) => b.strength - a.strength);
  clusters.forEach((c, i) => {
    c.id = `c${i + 1}`;
  });
  return clusters;
}

/** Absolute interest: saturating sum of per-source percentiles (1 strong signal ≈ 28, 6 ≈ 86). */
export function computeVolume(signals: TrendSignal[], pct: Map<TrendSignal, number>): number {
  const sum = signals.reduce((acc, s) => acc + (pct.get(s) ?? 0), 0);
  return Math.round(clamp(100 * (1 - Math.exp(-sum / 3))));
}

/**
 * Growth speed: share of the topic's signal strength observed in the last 24h, blended
 * with explicit growth metrics (Google Trends rising %, researcher momentum) when present.
 */
export function computeVelocity(
  signals: TrendSignal[],
  pct: Map<TrendSignal, number>,
  now: Date,
): number {
  if (signals.length === 0) return 0;
  const dayAgo = now.getTime() - 24 * 3600_000;
  let total = 0;
  let recent = 0;
  for (const s of signals) {
    const w = Math.max(pct.get(s) ?? 0, 0.05);
    total += w;
    if (s.observedAt.getTime() >= dayAgo) recent += w;
  }
  const recentShare = total > 0 ? recent / total : 0;
  const growth: number[] = [];
  for (const s of signals) {
    if (s.source === "google_trends")
      growth.push(Math.min(1, Math.log10(1 + Math.max(0, s.metric)) / Math.log10(5001)));
    if (s.source === "web_search") growth.push(clamp(s.metric) / 100);
  }
  const v = growth.length ? 0.6 * recentShare + 0.4 * Math.max(...growth) : recentShare;
  return Math.round(clamp(100 * v));
}

export function computeTrendScore(
  scores: TrendTopic["scores"],
  weights: TrendWeights = DEFAULT_TREND_WEIGHTS,
): number {
  const wsum =
    weights.velocity + weights.volume + weights.commercialIntent + weights.gap + weights.fit;
  const raw =
    weights.velocity * scores.velocity +
    weights.volume * scores.volume +
    weights.commercialIntent * scores.commercialIntent +
    weights.gap * scores.gap +
    weights.fit * scores.fit;
  return Math.round(clamp(wsum > 0 ? raw / wsum : 0) * 10) / 10;
}

export const ANALYST_SYSTEM = `You are the senior market analyst of Rasa Prompt (rasa-prompt.ir), which sells tested, original premium AI prompts to Persian speakers (primary, Iran), Arabic speakers (Gulf, Egypt, Iraq) and English speakers.

You receive pre-clustered public signals (Reddit, Hacker News, GitHub, Hugging Face, Product Hunt, YouTube, Google Trends, arXiv, official prompting guides, newsletters, our own zero-result searches, web research). Each cluster has an id, keywords and sample titles.

Your task: turn them into SELLABLE TOPICS — a topic is a concrete job-to-be-done that a ready-made premium prompt (or small prompt pack) can solve, e.g. "Instagram product-photo prompts for Flux/Midjourney", "Excel & Google Sheets formula assistant", "n8n customer-support automation agent", "Persian SEO blog writer".

Rules:
- You may merge several clusters into one topic (list all their ids) or drop clusters. Every topic must cite at least one cluster id from the input.
- Drop: pure news/gossip, model releases without a user job, hardware, jailbreaks, adult or political content, anything that would require copying someone else's paid prompts.
- key: short English kebab-case slug describing the job (stable across days: same job → same key).
- title: natural, marketable title in fa (Persian), ar (Modern Standard Arabic) and en. Not literal translations.
- keywords: 4-10 search keywords buyers would type, mixing fa, ar and en.
- outputType: text | image | video | audio | code | automation — what the prompt's output is.
- models: target tools (e.g. "ChatGPT", "Claude", "Gemini", "Midjourney", "Flux", "n8n").
- regions: where demand is visible (IR, SA, AE, EG, IQ, US, GB, GLOBAL).
- commercialIntent 0-100: would people PAY for a tested prompt? (business, money, career, content-creation outcomes score high; curiosity scores low; zero-result searches from our store score high).
- fit 0-100: fit with our audience (Persian/Arabic creators, freelancers, small businesses, students) and our brand (professional, safe, tested).
- sellable: false if it should not become a product; give a one-line reason either way.
Be decisive and concise. Prefer 3-15 strong topics over many weak ones.`;

const OUTPUT_TYPES = ["text", "image", "video", "audio", "code", "automation"] as const;

export const AnalystOutputSchema = z.object({
  topics: z
    .array(
      z.object({
        clusterIds: z.array(z.string()).min(1),
        key: z.string().min(3).max(80),
        title: z.object({ fa: z.string().min(1), ar: z.string(), en: z.string() }),
        summary: z.string().max(600),
        keywords: z.array(z.string()).max(12),
        outputType: z.enum(OUTPUT_TYPES),
        models: z.array(z.string()).max(8),
        regions: z.array(z.enum(TARGET_REGIONS)).max(8),
        commercialIntent: z.number().min(0).max(100),
        fit: z.number().min(0).max(100),
        sellable: z.boolean(),
        reason: z.string().max(300),
      }),
    )
    .max(30),
});

const ARAB_REGIONS = new Set(["SA", "AE", "EG", "IQ"]);

/** Locale the topic's demand speaks: Arabic-only regions → ar, otherwise fa (our home market). */
export function primaryLocaleFor(regions: readonly string[]): Locale {
  return regions.length > 0 && regions.every((r) => ARAB_REGIONS.has(r)) ? "ar" : "fa";
}

export function createAnalyst(deps: {
  ai: AiRouter;
  store: IntelStore;
  catalog: CatalogService;
  logger: IntelLogger;
  now: () => Date;
  weights?: TrendWeights;
  windowHours?: number;
  maxClusters?: number;
}) {
  const weights = deps.weights ?? DEFAULT_TREND_WEIGHTS;
  return {
    async analyze(): Promise<TrendTopic[]> {
      const now = deps.now();
      const signals = await deps.store.recentSignals(deps.windowHours ?? 72, 1000);
      if (signals.length === 0) return [];
      const pct = sourcePercentiles(signals);
      const clusters = preCluster(signals, { percentiles: pct }).slice(0, deps.maxClusters ?? 40);
      const byId = new Map(clusters.map((c) => [c.id, c]));

      const payload = clusters.map((c) => ({
        id: c.id,
        keywords: c.keywords,
        sources: [...new Set(c.signals.map((s) => s.source))],
        regions: [...new Set(c.signals.map((s) => s.region))],
        locales: [...new Set(c.signals.map((s) => s.locale))],
        signals: c.signals.length,
        samples: c.signals
          .slice()
          .sort((a, b) => (pct.get(b) ?? 0) - (pct.get(a) ?? 0))
          .slice(0, 5)
          .map((s) => `[${s.source} ${s.metricName}=${s.metric}] ${truncate(s.title, 140)}`),
      }));

      const result = await askJson(deps.ai, {
        task: "intel_analyze",
        system: ANALYST_SYSTEM,
        user: `Date: ${now.toISOString().slice(0, 10)}\nClusters (strongest first):\n${JSON.stringify(payload)}`,
        schema: AnalystOutputSchema,
        maxTokens: 6000,
        validate: (v) => {
          const unknown = v.topics.flatMap((t) => t.clusterIds).filter((id) => !byId.has(id));
          return unknown.length ? `unknown cluster ids: ${unknown.join(", ")}` : null;
        },
      });

      const existing = await loadExistingTopics(deps.store);
      const out: TrendTopic[] = [];
      for (const t of result.topics) {
        if (!t.sellable) continue;
        const members = t.clusterIds.flatMap((id) => byId.get(id)?.signals ?? []);
        if (members.length === 0) continue;
        const key = slugify(t.key);
        const regions = t.regions.length ? t.regions : [...new Set(members.map((m) => m.region))];
        const locale = primaryLocaleFor(regions);
        const clusterKw = t.clusterIds.flatMap((id) => byId.get(id)?.keywords ?? []);
        const kw = [...new Set([...t.keywords, ...clusterKw])].slice(0, 12);
        let gap = 50;
        try {
          gap = clamp(await deps.catalog.coverageGap(kw, locale));
        } catch (err) {
          deps.logger.warn({ key, err: String(err) }, "analyst: coverageGap failed, using 50");
        }
        const scores = {
          velocity: computeVelocity(members, pct, now),
          volume: computeVolume(members, pct),
          commercialIntent: Math.round(clamp(t.commercialIntent)),
          gap: Math.round(gap),
          fit: Math.round(clamp(t.fit)),
        };
        const prev = existing.get(key);
        const signalIds = [...new Set([...(prev?.signalIds ?? []), ...members.map((m) => m.id)])];
        const saved = await deps.store.upsertTopic({
          ...(prev ? { id: prev.id } : {}),
          key,
          title: t.title,
          summary: t.summary,
          outputType: t.outputType,
          models: t.models,
          regions,
          scores,
          trendScore: computeTrendScore(scores, weights),
          signalIds: signalIds.slice(-300),
          status: prev?.status ?? "new",
        });
        out.push(saved);
      }
      deps.logger.info(
        { signals: signals.length, clusters: clusters.length, topics: out.length },
        "analyst: done",
      );
      return out;
    },
  };
}

async function loadExistingTopics(store: IntelStore): Promise<Map<string, TrendTopic>> {
  const statuses: TrendTopic["status"][] = [
    "new",
    "researching",
    "drafted",
    "published",
    "rejected",
  ];
  const map = new Map<string, TrendTopic>();
  for (const st of statuses) for (const t of await store.topTopics(st, 500)) map.set(t.key, t);
  return map;
}

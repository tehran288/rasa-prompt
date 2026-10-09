import { DEFAULT_TREND_WEIGHTS, type TrendSignal } from "@rasa/shared";
import { describe, expect, it } from "vitest";
import {
  computeTrendScore,
  computeVelocity,
  computeVolume,
  createAnalyst,
  preCluster,
  type StoredSignal,
  sourcePercentiles,
} from "../src/analyst";
import { fakeAi, fakeCatalog, MemoryIntelStore, silentLogger } from "./helpers";

const NOW = new Date();
let seq = 0;
function sig(over: Partial<TrendSignal>): StoredSignal {
  seq++;
  return {
    id: `s${seq}`,
    source: "reddit",
    externalId: `e${seq}`,
    url: `https://x/${seq}`,
    title: "",
    snippet: "",
    locale: "en",
    region: "GLOBAL",
    metric: 10,
    metricName: "score",
    observedAt: NOW,
    license: "unknown",
    tags: [],
    ...over,
  };
}

describe("analyst math", () => {
  it("trendScore is the weighted sum of the five scores", () => {
    const scores = { velocity: 80, volume: 60, commercialIntent: 90, gap: 50, fit: 70 };
    // 0.3*80 + 0.15*60 + 0.25*90 + 0.2*50 + 0.1*70 = 24 + 9 + 22.5 + 10 + 7 = 72.5
    expect(computeTrendScore(scores)).toBe(72.5);
    expect(
      computeTrendScore({ velocity: 100, volume: 100, commercialIntent: 100, gap: 100, fit: 100 }),
    ).toBe(100);
    expect(computeTrendScore({ velocity: 0, volume: 0, commercialIntent: 0, gap: 0, fit: 0 })).toBe(
      0,
    );
    // custom weights are normalised
    expect(
      computeTrendScore(scores, { velocity: 1, volume: 0, commercialIntent: 0, gap: 0, fit: 0 }),
    ).toBe(80);
    expect(Object.values(DEFAULT_TREND_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("percentiles are per source", () => {
    const a = sig({ source: "reddit", metric: 10 });
    const b = sig({ source: "reddit", metric: 1000 });
    const c = sig({ source: "github", metric: 5 });
    const p = sourcePercentiles([a, b, c]);
    expect(p.get(a)).toBe(0.5);
    expect(p.get(b)).toBe(1);
    expect(p.get(c)).toBe(1);
  });

  it("volume saturates with signal strength", () => {
    const one = [sig({ metric: 1 })];
    const p1 = sourcePercentiles(one);
    expect(computeVolume(one, p1)).toBe(Math.round(100 * (1 - Math.exp(-1 / 3))));
    const six = Array.from({ length: 6 }, (_, i) =>
      sig({ source: "github", metric: 7, externalId: `g${i}` }),
    );
    expect(computeVolume(six, sourcePercentiles(six))).toBe(Math.round(100 * (1 - Math.exp(-2))));
  });

  it("velocity rewards fresh signals and rising Trends values", () => {
    const old = new Date(NOW.getTime() - 48 * 3600_000);
    const fresh = [sig({ metric: 5 }), sig({ metric: 5 })];
    const stale = [sig({ metric: 5, observedAt: old }), sig({ metric: 5, observedAt: old })];
    expect(computeVelocity(fresh, sourcePercentiles(fresh), NOW)).toBe(100);
    expect(computeVelocity(stale, sourcePercentiles(stale), NOW)).toBe(0);
    const mixed = [
      sig({ metric: 5, observedAt: old }),
      sig({ source: "google_trends", metric: 5000 }),
    ];
    // recentShare = 0.5 (both percentile 1), growth = 1 → 0.6*0.5 + 0.4*1 = 0.7
    expect(computeVelocity(mixed, sourcePercentiles(mixed), NOW)).toBe(70);
  });
});

describe("pre-clustering", () => {
  it("groups by keyword overlap and ignores generic words", () => {
    const signals: StoredSignal[] = [
      sig({ title: "Instagram product photography prompts with Flux" }),
      sig({ title: "Flux product photography for Instagram shops", source: "hackernews" }),
      sig({ title: "n8n customer support agent workflow" }),
      sig({ title: "Building an n8n support agent", source: "github" }),
      sig({ title: "Resume writing ChatGPT" }),
      // generic filler so "chatgpt"/"ai" become generic
      ...Array.from({ length: 8 }, (_, i) => sig({ title: `chatgpt ai news item${i}` })),
    ];
    const clusters = preCluster(signals);
    const find = (t: string) => clusters.find((c) => c.signals.some((s) => s.title.startsWith(t)));
    expect(find("Instagram")).toBe(find("Flux product"));
    expect(find("n8n customer")).toBe(find("Building an n8n"));
    expect(find("Instagram")).not.toBe(find("n8n customer"));
    expect(find("Resume")).not.toBe(find("Instagram"));
    expect(find("Instagram")?.keywords).toEqual(
      expect.arrayContaining(["flux", "product", "photography"]),
    );
    // strongest first, ids renumbered
    expect(clusters[0]?.id).toBe("c1");
  });
});

describe("analyze()", () => {
  it("clusters, asks the LLM, scores with catalog gap, upserts and keeps existing status", async () => {
    const store = new MemoryIntelStore();
    await store.saveSignals([
      { ...sig({ title: "Instagram product photography prompts Flux", metric: 900 }) },
      {
        ...sig({ title: "Flux product photography Instagram", source: "hackernews", metric: 300 }),
      },
      {
        ...sig({
          title: "پرامپت عکس محصول",
          source: "google_trends",
          metric: 5000,
          region: "IR",
          locale: "fa",
        }),
      },
    ]);
    await store.upsertTopic({
      key: "other-topic",
      title: { fa: "x" },
      summary: "",
      outputType: "text",
      models: [],
      regions: [],
      scores: { velocity: 0, volume: 0, commercialIntent: 0, gap: 0, fit: 0 },
      trendScore: 0,
      signalIds: [],
      status: "published",
    });
    const { catalog, gapCalls } = fakeCatalog({ gap: 60 });
    const { ai, calls } = fakeAi({
      intel_analyze: (req) => {
        const payload = String(req.messages[0]?.content);
        expect(payload).toContain('"id":"c1"');
        return {
          topics: [
            {
              clusterIds: ["c1", "c2"],
              key: "Instagram Product Photo Prompts",
              title: { fa: "عکس محصول", ar: "صور المنتجات", en: "Product photos" },
              summary: "Shops want product photos",
              keywords: ["عکس محصول", "product photo"],
              outputType: "image",
              models: ["Flux"],
              regions: ["IR", "GLOBAL"],
              commercialIntent: 90,
              fit: 80,
              sellable: true,
              reason: "money",
            },
            {
              clusterIds: ["c1"],
              key: "gossip",
              title: { fa: "x", ar: "x", en: "x" },
              summary: "",
              keywords: [],
              outputType: "text",
              models: [],
              regions: [],
              commercialIntent: 5,
              fit: 5,
              sellable: false,
              reason: "news",
            },
          ],
        };
      },
    });
    const analyst = createAnalyst({ ai, store, catalog, logger: silentLogger(), now: () => NOW });
    const topics = await analyst.analyze();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.jsonSchema).toBeTruthy();
    expect(topics).toHaveLength(1);
    const t = topics[0];
    expect(t?.key).toBe("instagram-product-photo-prompts");
    expect(t?.status).toBe("new");
    expect(t?.scores.gap).toBe(60);
    expect(t?.scores.commercialIntent).toBe(90);
    expect(t?.trendScore).toBe(t ? computeTrendScore(t.scores) : -1);
    expect(t?.signalIds.length).toBeGreaterThanOrEqual(2);
    expect(gapCalls[0]?.locale).toBe("fa");
    expect(gapCalls[0]?.keywords).toContain("product photo");

    // second run: status of an existing topic is preserved
    await store.setTopicStatus(t?.id ?? "", "drafted");
    const again = await analyst.analyze();
    expect(again[0]?.id).toBe(t?.id);
    expect(again[0]?.status).toBe("drafted");
  });

  it("repairs unknown cluster ids via a retry round", async () => {
    const store = new MemoryIntelStore();
    await store.saveSignals([sig({ title: "Excel formula assistant prompts" })]);
    let n = 0;
    const topic = (ids: string[]) => ({
      topics: [
        {
          clusterIds: ids,
          key: "excel-formulas",
          title: { fa: "فرمول اکسل", ar: "صيغ إكسل", en: "Excel formulas" },
          summary: "",
          keywords: ["excel"],
          outputType: "text",
          models: ["ChatGPT"],
          regions: ["IR"],
          commercialIntent: 70,
          fit: 70,
          sellable: true,
          reason: "",
        },
      ],
    });
    const { ai } = fakeAi({ intel_analyze: () => (n++ === 0 ? topic(["c99"]) : topic(["c1"])) });
    const analyst = createAnalyst({
      ai,
      store,
      catalog: fakeCatalog().catalog,
      logger: silentLogger(),
      now: () => NOW,
    });
    const topics = await analyst.analyze();
    expect(n).toBe(2);
    expect(topics).toHaveLength(1);
  });
});

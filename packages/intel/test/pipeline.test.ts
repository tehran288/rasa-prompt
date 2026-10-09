import type { AiTask, TrendTopic } from "@rasa/shared";
import { describe, expect, it } from "vitest";
import { createIntelPipeline } from "../src/pipeline";
import {
  type AiHandler,
  engineeredFixture,
  fakeAi,
  fakeCatalog,
  fakeFetch,
  has,
  json,
  MemoryIntelStore,
  noSleep,
  silentLogger,
  testConfig,
  topicFixture,
} from "./helpers";

const AR_BODY = `أنت خبير تصوير لمتجر {{shop_name}} يبيع {{product}} لجمهور {{audience}} بأسلوب {{style}}. اكتب ثلاثة أوصاف للصور بإضاءات مختلفة. أجب بالعربية.`;
const EN_BODY = `You are a product photographer for {{shop_name}} selling {{product}} to {{audience}} in a {{style}} look. Write three image prompts with different lighting. Answer in English.`;
const LABELS = ["shop_name", "product", "audience", "style"].map((name) => ({ name, label: name }));

function happyHandlers(): Partial<Record<AiTask, AiHandler>> {
  return {
    intel_analyze: () => ({
      topics: [
        {
          clusterIds: ["c1"],
          key: "instagram-product-photo-prompts",
          title: { fa: "عکس محصول اینستاگرام", ar: "صور المنتجات", en: "Instagram product photos" },
          summary: "Shops want product photos",
          keywords: ["product photo", "عکس محصول"],
          outputType: "image",
          models: ["Flux"],
          regions: ["IR"],
          commercialIntent: 95,
          fit: 90,
          sellable: true,
          reason: "",
        },
      ],
    }),
    intel_research: () => ({
      text: `\`\`\`json\n${JSON.stringify({
        notes: [
          {
            kind: "best_practice",
            claim: "State lighting and lens explicitly for consistent product shots.",
            sourceUrl: "https://docs.example.com/flux",
            sourceTitle: "Flux docs",
          },
          {
            kind: "pain_point",
            claim: "Copied marketplace text",
            sourceUrl: "https://promptbase.com/p/1",
            sourceTitle: "PB",
          },
        ],
      })}\n\`\`\``,
      citations: [
        { url: "https://docs.example.com/flux", title: "Flux docs" },
        { url: "https://promptbase.com/p/1", title: "PB" },
      ],
    }),
    intel_engineer: () => engineeredFixture(),
    intel_critic: () => ({ verdict: "pass", issues: [], unsafeUses: [] }),
    run_prompt: () => "| سبک | پرامپت | نسبت |\n| مینیمال | شمع معطر روی میز چوبی، نور صبح | 4:5 |",
    intel_judge: () => ({
      relevance: 9,
      completeness: 9,
      formatAdherence: 9,
      languageQuality: 9,
      safety: 10,
      issues: [],
    }),
    intel_localize: (req) => {
      const ar = String(req.messages[0]?.content).includes("Target language: ar");
      return {
        title: ar ? "صور منتجات احترافية" : "Pro product photos",
        summary: "A summary sentence.",
        description: "A longer description of the prompt.",
        body: ar ? AR_BODY : EN_BODY,
        variableLabels: LABELS,
        exampleOutput: null,
      };
    },
    intel_compliance: () => ({ policyOk: true, violations: [], notes: "ok" }),
  };
}

const hnHits = {
  hits: [
    { objectID: "1", title: "Instagram product photography prompts with Flux", points: 300 },
    { objectID: "2", title: "Flux product photography for Instagram shops", points: 120 },
  ],
};

describe("createIntelPipeline", () => {
  it("runAll: scout → analyze → produce → auto-publish, with report and cost", async () => {
    const store = new MemoryIntelStore();
    const { catalog, created } = fakeCatalog({ gap: 90 });
    const { ai, calls } = fakeAi(happyHandlers());
    const f = fakeFetch([{ match: has("hn.algolia.com"), reply: () => json(hnHits) }]);
    const pipeline = createIntelPipeline(
      testConfig({ INTEL_AUTO_PUBLISH: "true", INTEL_DAILY_DRAFTS: "3" }),
      {
        ai,
        store,
        catalog,
        logger: silentLogger(),
        fetch: f.fetch,
        options: { sources: ["hackernews"], hnQueries: ["prompt"], sleep: noSleep },
      },
    );
    const report = await pipeline.runAll();
    expect(report.errors).toEqual([]);
    expect(report).toMatchObject({ signalsCollected: 2, newSignals: 2, topics: 1, rejected: 0 });
    expect(report.published).toEqual(["p1"]);
    expect(report.costUsd).toBeGreaterThan(0);

    const draft = created[0]?.draft;
    expect(draft?.body.ar).toBe(AR_BODY);
    expect(draft?.body.en).toBe(EN_BODY);
    expect(draft?.judge).toMatchObject({ score: 92, passed: true });
    expect(draft?.compliance).toMatchObject({ licenseOk: true, policyOk: true });
    expect(draft?.compliance?.originality).toBeGreaterThanOrEqual(85);
    expect(draft?.suggestedPriceToman).toBeGreaterThanOrEqual(49_000);
    // marketplace note dropped from research
    expect(draft?.research.map((r) => r.sourceUrl)).toEqual(["https://docs.example.com/flux"]);
    expect(store.topics[0]?.status).toBe("published");
    // two sample inputs → two test runs
    expect(calls.filter((c) => c.task === "run_prompt")).toHaveLength(2);
    // web research carries blocked marketplaces
    const research = calls.find((c) => c.task === "intel_research");
    expect(research?.webResearch?.blockedDomains).toContain("promptbase.com");
  });

  it("scout() skips sources without keys and never calls their APIs", async () => {
    const f = fakeFetch([]);
    const pipeline = createIntelPipeline(testConfig(), {
      ai: fakeAi({}).ai,
      store: new MemoryIntelStore(),
      catalog: fakeCatalog().catalog,
      logger: silentLogger(),
      fetch: f.fetch,
      options: {
        sources: ["reddit", "producthunt", "youtube", "google_trends", "internal_search"],
        sleep: noSleep,
      },
    });
    expect(await pipeline.scout()).toBe(0);
    expect(f.calls).toHaveLength(0);
  });

  it("runAll isolates failures: scout, analyze and one topic fail, the rest still ships", async () => {
    const store = new MemoryIntelStore();
    const good = await store.upsertTopic({
      ...topicFixture({ key: "good-topic", trendScore: 90 }),
      id: undefined,
    } as never);
    const bad = await store.upsertTopic({
      ...topicFixture({ key: "bad-topic", trendScore: 85 }),
      id: undefined,
    } as never);
    await store.saveSignals([
      {
        source: "hackernews",
        externalId: "x",
        url: "https://news.ycombinator.com/item?id=x",
        title: "Something",
        snippet: "",
        locale: "en",
        region: "GLOBAL",
        metric: 1,
        metricName: "points",
        observedAt: new Date(),
        license: "unknown",
        tags: [],
      },
    ]);
    const handlers = happyHandlers();
    handlers.intel_analyze = () => {
      throw new Error("analyst LLM down");
    };
    handlers.intel_engineer = (req) => {
      if (String(req.messages[0]?.content).includes("bad-topic"))
        throw new Error("engineer exploded");
      return engineeredFixture();
    };
    const { ai } = fakeAi(handlers);
    const f = fakeFetch([
      {
        match: has("reddit.com/api/v1/access_token"),
        reply: () => json({ error: "invalid_grant" }, 401),
      },
    ]);
    const pipeline = createIntelPipeline(
      testConfig({ REDDIT_CLIENT_ID: "a", REDDIT_CLIENT_SECRET: "b", INTEL_DAILY_DRAFTS: "5" }),
      {
        ai,
        store,
        catalog: fakeCatalog().catalog,
        logger: silentLogger(),
        fetch: f.fetch,
        options: { sources: ["reddit"], sleep: noSleep },
      },
    );
    const report = await pipeline.runAll();
    const stages = report.errors.map((e) => `${e.stage}:${e.ref ?? ""}`).sort();
    expect(stages).toEqual(["analyze:", "produce:bad-topic", "scout:reddit"]);
    expect(report.queued).toHaveLength(1); // auto-publish off → review queue
    expect(report.published).toEqual([]);
    const statusOf = (t: TrendTopic) => store.topics.find((x) => x.id === t.id)?.status;
    expect(statusOf(good)).toBe("drafted");
    expect(statusOf(bad)).toBe("new"); // returned to the pool for a retry
  });

  it("produce(): judge score below the hard floor rejects without localizing", async () => {
    const store = new MemoryIntelStore();
    await store.upsertTopic({ ...topicFixture(), id: undefined } as never);
    const handlers = happyHandlers();
    handlers.intel_judge = () => ({
      relevance: 3,
      completeness: 3,
      formatAdherence: 3,
      languageQuality: 3,
      safety: 10,
      issues: ["off-topic"],
    });
    const { ai, calls } = fakeAi(handlers);
    const pipeline = createIntelPipeline(testConfig(), {
      ai,
      store,
      catalog: fakeCatalog().catalog,
      logger: silentLogger(),
      options: { sleep: noSleep },
    });
    const res = await pipeline.produce(1);
    expect(res).toEqual({ published: [], queued: [], rejected: 1 });
    expect(calls.some((c) => c.task === "intel_localize")).toBe(false);
    expect(store.drafts[0]?.state).toBe("rejected");
  });

  it("critic loop revises at most twice", async () => {
    const store = new MemoryIntelStore();
    await store.upsertTopic({ ...topicFixture(), id: undefined } as never);
    const handlers = happyHandlers();
    handlers.intel_critic = () => ({
      verdict: "revise",
      issues: [{ severity: "major", category: "ambiguity", problem: "vague", fix: "be specific" }],
      unsafeUses: [],
    });
    const { ai, calls } = fakeAi(handlers);
    const pipeline = createIntelPipeline(testConfig(), {
      ai,
      store,
      catalog: fakeCatalog().catalog,
      logger: silentLogger(),
      options: { sleep: noSleep },
    });
    await pipeline.produce(1);
    expect(calls.filter((c) => c.task === "intel_critic")).toHaveLength(2);
    expect(calls.filter((c) => c.task === "intel_engineer")).toHaveLength(3); // write + 2 revisions
  });
});

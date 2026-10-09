import { PUBLISH_GATES } from "@rasa/shared";
import { describe, expect, it } from "vitest";
import { aggregateGrades } from "../src/judge";
import { complexityOf, PRICE_BANDS, roundStars, roundToman, suggestPrice } from "../src/pricer";
import { createPublisher, evaluateGates } from "../src/publisher";
import { draftFixture, fakeCatalog, MemoryIntelStore, silentLogger, topicFixture } from "./helpers";

async function setup(autoPublish: boolean, opts: { failCreate?: boolean } = {}) {
  const store = new MemoryIntelStore();
  const topic = await store.upsertTopic({ ...topicFixture(), id: undefined } as never);
  const cat = fakeCatalog(opts);
  const publisher = createPublisher({
    catalog: cat.catalog,
    store,
    logger: silentLogger(),
    autoPublish,
  });
  return { store, topic, cat, publisher };
}

describe("publisher gates", () => {
  it("passes a good draft", () => {
    expect(evaluateGates(draftFixture(), { trendScore: 80 })).toEqual([]);
  });
  it("reports each failing gate", () => {
    const d = draftFixture({
      judge: { score: PUBLISH_GATES.minJudgeScore - 1, passed: false, notes: "" },
      compliance: {
        originality: PUBLISH_GATES.minOriginality - 1,
        licenseOk: false,
        policyOk: false,
        notes: "",
      },
      body: { fa: "" },
    });
    expect(evaluateGates(d, { trendScore: PUBLISH_GATES.minTrendScore - 1 }).sort()).toEqual(
      [
        "fa_missing",
        "judge_failed",
        "judge_score",
        "license",
        "originality",
        "policy",
        "trend_score",
      ].sort(),
    );
    expect(
      evaluateGates(draftFixture({ judge: null, compliance: null }), { trendScore: 90 }),
    ).toEqual(["judge_missing", "compliance_missing"]);
  });
});

describe("publisher", () => {
  it("auto-publish ON + all gates pass → catalog.createFromDraft(draft, true)", async () => {
    const { store, topic, cat, publisher } = await setup(true);
    const out = await publisher.publish(draftFixture(), topic);
    expect(out.state).toBe("published");
    expect(out.promptId).toBe("p1");
    expect(cat.created).toEqual([{ draft: expect.anything(), publish: true }]);
    expect(store.drafts[0]).toMatchObject({ state: "published", promptId: "p1" });
    expect(store.topics[0]?.status).toBe("published");
  });

  it("auto-publish OFF → review queue even when gates pass", async () => {
    const { store, topic, cat, publisher } = await setup(false);
    const out = await publisher.publish(draftFixture(), topic);
    expect(out.state).toBe("review");
    expect(cat.created).toHaveLength(0);
    expect(store.drafts[0]?.state).toBe("review");
    expect(store.topics[0]?.status).toBe("drafted");
  });

  it("compliance failure (originality/license) blocks auto-publish → review", async () => {
    const { store, topic, cat, publisher } = await setup(true);
    const out = await publisher.publish(
      draftFixture({
        compliance: { originality: 40, licenseOk: false, policyOk: true, notes: "" },
      }),
      topic,
    );
    expect(out.state).toBe("review");
    expect(out.failedGates).toEqual(["originality", "license"]);
    expect(cat.created).toHaveLength(0);
    expect(store.drafts[0]?.state).toBe("review");
  });

  it("policy failure → rejected, never published", async () => {
    const { store, topic, cat, publisher } = await setup(true);
    const out = await publisher.publish(
      draftFixture({
        compliance: { originality: 99, licenseOk: true, policyOk: false, notes: "" },
      }),
      topic,
    );
    expect(out.state).toBe("rejected");
    expect(cat.created).toHaveLength(0);
    expect(store.drafts[0]?.state).toBe("rejected");
    expect(store.topics[0]?.status).toBe("rejected");
  });

  it("low trend score or judge score → review", async () => {
    const { topic, publisher } = await setup(true);
    expect((await publisher.publish(draftFixture(), { ...topic, trendScore: 30 })).state).toBe(
      "review",
    );
    expect(
      (
        await publisher.publish(
          draftFixture({ judge: { score: 70, passed: false, notes: "" } }),
          topic,
        )
      ).state,
    ).toBe("review");
  });

  it("catalog failure falls back to review", async () => {
    const { store, topic, publisher } = await setup(true, { failCreate: true });
    const out = await publisher.publish(draftFixture(), topic);
    expect(out.state).toBe("review");
    expect(store.drafts).toHaveLength(1);
  });
});

describe("pricer", () => {
  it("psychological rounding", () => {
    expect(roundToman(74_000, 49_000, 99_000)).toBe(79_000);
    expect(roundToman(61_000, 49_000, 99_000)).toBe(59_000);
    expect(roundToman(10_000, 49_000, 99_000)).toBe(49_000);
    expect(roundToman(300_000, 149_000, 290_000)).toBe(290_000);
    expect(roundToman(212_000, 149_000, 290_000)).toBe(209_000);
    expect(roundStars(94, 60, 120)).toBe(90);
    expect(roundStars(95, 60, 120)).toBe(100);
    expect(roundStars(500, 180, 350)).toBe(350);
  });

  it("stays inside tier bands; complex automation → premium", () => {
    const simple = draftFixture({ outputType: "text", variables: [], body: { fa: "کوتاه" } });
    const s = suggestPrice(simple, 20);
    expect(s.tier).toBe("pro");
    expect(s.priceToman).toBeGreaterThanOrEqual(PRICE_BANDS.pro.toman[0]);
    expect(s.priceToman).toBeLessThanOrEqual(PRICE_BANDS.pro.toman[1]);
    expect(s.priceToman % 10_000).toBe(9_000);
    expect(s.priceStars % 10).toBe(0);

    const vars = Array.from({ length: 8 }, (_, i) => ({
      name: `v${i}`,
      label: { fa: "x" },
      type: "text" as const,
      required: true,
    }));
    const complex = draftFixture({
      outputType: "automation",
      variables: vars,
      body: { fa: "کلمه ".repeat(1000) },
    });
    expect(complexityOf(complex)).toBe(1);
    const p = suggestPrice(complex, 100);
    expect(p).toMatchObject({ tier: "premium", priceToman: 289_000, priceStars: 350 });
    const mid = suggestPrice(complex, 0);
    expect(mid.priceToman).toBeLessThan(290_000);
    expect(mid.priceToman).toBeGreaterThanOrEqual(149_000);
  });
});

describe("judge aggregation", () => {
  const g = (n: number, safety = 10) => ({
    relevance: n,
    completeness: n,
    formatAdherence: n,
    languageQuality: n,
    safety,
    issues: [],
  });
  it("score = mean*10; pass needs mean≥7.5, min≥6, safety≥8", () => {
    expect(aggregateGrades([g(9), g(8)])).toEqual({ score: 88, passed: true });
    expect(aggregateGrades([g(9), g(5)]).passed).toBe(false);
    expect(aggregateGrades([g(9, 7)]).passed).toBe(false);
    expect(aggregateGrades([])).toEqual({ score: 0, passed: false });
  });
});

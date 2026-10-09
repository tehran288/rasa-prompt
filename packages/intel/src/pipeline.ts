import type { Config, TrendSignal, TrendTopic } from "@rasa/shared";
import { createAnalyst, type StoredSignal } from "./analyst";
import { createCompliance, type SourceText } from "./compliance";
import { mapLimit } from "./concurrency";
import { createCritic, refineWithCritic } from "./critic";
import { createEngineer, sourceLocaleFor, toDraft } from "./engineer";
import { createHttpClient } from "./http";
import { createJudge } from "./judge";
import { createLocalizer } from "./localizer";
import { applyPrice } from "./pricer";
import { createPublisher } from "./publisher";
import { createResearcher } from "./researcher";
import { createScouts, dedupeSignals } from "./scouts";
import { errorMessage } from "./text";
import type {
  IntelDeps,
  IntelPipeline,
  IntelRunError,
  IntelRunReport,
  ProduceResult,
  ScoutContext,
} from "./types";

/** Drafts whose judge score is below this are rejected without spending on localization. */
export const HARD_REJECT_JUDGE_SCORE = 50;

export function createIntelPipeline(config: Config, deps: IntelDeps): IntelPipeline {
  const options = deps.options ?? {};
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const { ai, store, catalog, logger } = deps;

  const http = createHttpClient({
    fetch: fetchImpl,
    logger,
    sleep,
    ...(options.httpTimeoutMs ? { defaultTimeoutMs: options.httpTimeoutMs } : {}),
  });
  const ctx: ScoutContext = {
    config,
    http,
    ai,
    logger,
    options,
    now,
    ...(deps.zeroResultQueries ? { zeroResultQueries: deps.zeroResultQueries } : {}),
  };
  const scouts = createScouts(ctx);
  const analyst = createAnalyst({
    ai,
    store,
    catalog,
    logger,
    now,
    ...(options.weights ? { weights: options.weights } : {}),
    ...(options.signalWindowHours ? { windowHours: options.signalWindowHours } : {}),
    ...(options.maxClustersForLlm ? { maxClusters: options.maxClustersForLlm } : {}),
  });
  const researcher = createResearcher({ ai, logger });
  const engineer = createEngineer({ ai });
  const critic = createCritic({ ai });
  const judge = createJudge({ ai, logger });
  const compliance = createCompliance({ ai });
  const localizer = createLocalizer({ ai, logger });
  const publisher = createPublisher({
    catalog,
    store,
    logger,
    autoPublish: config.INTEL_AUTO_PUBLISH,
  });

  async function runScouts(errors: IntelRunError[]) {
    const collected: TrendSignal[] = [];
    for (const s of scouts) {
      if (!s.enabled(config)) {
        logger.info({ scout: s.kind }, "scout skipped (not configured)");
        continue;
      }
      try {
        const got = await s.collect();
        collected.push(...got);
        logger.info({ scout: s.kind, signals: got.length }, "scout done");
      } catch (err) {
        errors.push({ stage: "scout", ref: s.kind, message: errorMessage(err) });
        logger.warn({ scout: s.kind, err: errorMessage(err) }, "scout failed");
      }
    }
    const unique = dedupeSignals(collected);
    const newSignals = unique.length ? await store.saveSignals(unique) : 0;
    return { collected: unique.length, newSignals };
  }

  async function produceTopic(
    topic: TrendTopic,
    signalsById: Map<string, StoredSignal>,
    categories: string[],
  ): Promise<{ state: "published" | "review" | "rejected"; id: string }> {
    await store.setTopicStatus(topic.id, "researching");
    const locale = sourceLocaleFor(topic);
    const signals = topic.signalIds.flatMap((id) => signalsById.get(id) ?? []);

    let notes: Awaited<ReturnType<typeof researcher.research>> = [];
    try {
      notes = await researcher.research(topic);
    } catch (err) {
      logger.warn(
        { topic: topic.key, err: errorMessage(err) },
        "research failed; continuing without notes",
      );
    }

    const first = await engineer.write({
      topic,
      locale,
      notes,
      signalTitles: signals.map((s) => s.title),
      categories,
    });
    const { prompt } = await refineWithCritic(first, { locale, categories, critic, engineer });
    const verdict = await judge.evaluate(prompt, locale);

    let draft = toDraft(topic, locale, prompt, notes);
    draft = {
      ...draft,
      judge: { score: verdict.score, passed: verdict.passed, notes: verdict.notes },
      exampleOutput: verdict.exampleOutput ?? draft.exampleOutput,
    };
    if (verdict.score < HARD_REJECT_JUDGE_SCORE) {
      const id = await store.saveDraft(draft, "rejected");
      await store.setTopicStatus(topic.id, "rejected");
      return { state: "rejected", id };
    }

    const localized = await localizer.localizeDraft(draft);
    draft = localized.draft;
    const sources: SourceText[] = [
      ...signals.map((s) => ({ text: `${s.title}\n${s.snippet}`, license: s.license, url: s.url })),
      ...notes.map((n) => ({ text: n.claim, license: "unknown" as const, url: n.sourceUrl })),
    ];
    const comp = await compliance.check(draft, sources);
    if (localized.failed.length)
      comp.notes = `${comp.notes} | localization missing: ${localized.failed.join(", ")}`;
    draft = applyPrice({ ...draft, compliance: comp }, topic.trendScore);

    const outcome = await publisher.publish(draft, topic);
    logger.info(
      { topic: topic.key, state: outcome.state, failedGates: outcome.failedGates },
      "draft produced",
    );
    return { state: outcome.state, id: outcome.promptId ?? outcome.draftId };
  }

  async function runProduce(limit: number, errors: IntelRunError[]): Promise<ProduceResult> {
    const result: ProduceResult = { published: [], queued: [], rejected: 0 };
    if (limit <= 0) return result;
    const minScore = options.minTrendScoreToProduce ?? 40;
    const topics = (await store.topTopics("new", Math.max(limit * 3, limit)))
      .filter((t) => t.trendScore >= minScore)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
    if (topics.length === 0) return result;

    const recent = await store.recentSignals(24 * 14, 5000);
    const signalsById = new Map(recent.map((s) => [s.id, s]));
    let categories: string[] = [];
    try {
      categories = (await catalog.listCategories("fa")).map((c) => c.slug);
    } catch (err) {
      logger.warn({ err: errorMessage(err) }, "listCategories failed; engineer picks slugs freely");
    }

    await mapLimit(topics, options.concurrency ?? 2, async (topic) => {
      try {
        const r = await produceTopic(topic, signalsById, categories);
        if (r.state === "published") result.published.push(r.id);
        else if (r.state === "review") result.queued.push(r.id);
        else result.rejected++;
      } catch (err) {
        errors.push({ stage: "produce", ref: topic.key, message: errorMessage(err) });
        logger.warn({ topic: topic.key, err: errorMessage(err) }, "topic production failed");
        // Back to the pool so tomorrow's run can retry it.
        await store.setTopicStatus(topic.id, "new").catch(() => undefined);
      }
    });
    return result;
  }

  const pipeline: IntelPipeline = {
    async scout() {
      const errors: IntelRunError[] = [];
      const r = await runScouts(errors);
      return r.newSignals;
    },
    analyze: () => analyst.analyze(),
    async produce(limit) {
      return runProduce(limit, []);
    },
    async runAll() {
      const startedAt = now();
      const errors: IntelRunError[] = [];
      const report: IntelRunReport = {
        startedAt,
        finishedAt: startedAt,
        signalsCollected: 0,
        newSignals: 0,
        topics: 0,
        published: [],
        queued: [],
        rejected: 0,
        errors,
      };
      let spentBefore: number | null = null;
      try {
        spentBefore = await ai.spentTodayUsd();
      } catch {
        spentBefore = null;
      }

      try {
        const s = await runScouts(errors);
        report.signalsCollected = s.collected;
        report.newSignals = s.newSignals;
      } catch (err) {
        errors.push({ stage: "scout", message: errorMessage(err) });
      }
      try {
        report.topics = (await analyst.analyze()).length;
      } catch (err) {
        errors.push({ stage: "analyze", message: errorMessage(err) });
      }
      try {
        const p = await runProduce(config.INTEL_DAILY_DRAFTS, errors);
        report.published = p.published;
        report.queued = p.queued;
        report.rejected = p.rejected;
      } catch (err) {
        errors.push({ stage: "produce", message: errorMessage(err) });
      }

      if (spentBefore !== null) {
        try {
          const after = await ai.spentTodayUsd();
          // A negative delta means the budget day rolled over mid-run; report what we know.
          report.costUsd = Math.round(Math.max(0, after - spentBefore) * 10_000) / 10_000;
        } catch {
          // cost unavailable
        }
      }
      report.finishedAt = now();
      logger.info(
        {
          signals: report.signalsCollected,
          newSignals: report.newSignals,
          topics: report.topics,
          published: report.published.length,
          queued: report.queued.length,
          rejected: report.rejected,
          errors: errors.length,
          costUsd: report.costUsd,
        },
        "intel run finished",
      );
      return report;
    },
  };
  return pipeline;
}

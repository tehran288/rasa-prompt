import type { IntelStore, PromptDraft, TrendSignal, TrendTopic } from "@rasa/shared";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "../db";
import { intelDrafts, intelSignals, intelTopics } from "../schema";
import { isUuid } from "../util";

type TopicRow = typeof intelTopics.$inferSelect;
type SignalRow = typeof intelSignals.$inferSelect;

const toTopic = (r: TopicRow): TrendTopic => ({
  id: r.id,
  key: r.key,
  title: r.title,
  summary: r.summary,
  outputType: r.outputType,
  models: r.models,
  regions: r.regions,
  scores: r.scores,
  trendScore: r.trendScore,
  signalIds: r.signalIds,
  status: r.status,
  firstSeenAt: r.firstSeenAt,
  updatedAt: r.updatedAt,
});

const toSignal = (r: SignalRow): TrendSignal & { id: string } => ({
  id: r.id,
  source: r.source,
  externalId: r.externalId,
  url: r.url,
  title: r.title,
  snippet: r.snippet,
  locale: r.locale,
  region: r.region,
  metric: r.metric,
  metricName: r.metricName,
  observedAt: r.observedAt,
  license: r.license,
  tags: r.tags,
});

export function createIntelStore(db: Db): IntelStore {
  return {
    async saveSignals(signals) {
      if (signals.length === 0) return 0;
      let inserted = 0;
      // chunk to stay well below the parameter limit
      for (let i = 0; i < signals.length; i += 500) {
        const rows = await db
          .insert(intelSignals)
          .values(
            signals.slice(i, i + 500).map((s) => ({
              source: s.source,
              externalId: s.externalId,
              url: s.url,
              title: s.title.slice(0, 1000),
              snippet: s.snippet.slice(0, 2000),
              locale: s.locale,
              region: s.region,
              metric: s.metric,
              metricName: s.metricName,
              observedAt: s.observedAt,
              license: s.license,
              tags: s.tags,
            })),
          )
          .onConflictDoNothing({ target: [intelSignals.source, intelSignals.externalId] })
          .returning({ id: intelSignals.id });
        inserted += rows.length;
      }
      return inserted;
    },

    async recentSignals(sinceHours, limit) {
      const rows = await db
        .select()
        .from(intelSignals)
        .where(
          gte(
            intelSignals.createdAt,
            sql`now() - make_interval(hours => ${Math.max(0, Math.floor(sinceHours))})`,
          ),
        )
        .orderBy(desc(intelSignals.createdAt), desc(intelSignals.metric))
        .limit(Math.max(1, limit));
      return rows.map(toSignal);
    },

    async upsertTopic(topic) {
      const values = {
        key: topic.key,
        title: topic.title,
        summary: topic.summary,
        outputType: topic.outputType,
        models: topic.models,
        regions: topic.regions,
        scores: topic.scores,
        trendScore: topic.trendScore,
        signalIds: topic.signalIds,
        status: topic.status,
      };
      if (topic.id && isUuid(topic.id)) {
        const [r] = await db
          .update(intelTopics)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(intelTopics.id, topic.id))
          .returning();
        if (r) return toTopic(r);
      }
      const [r] = await db
        .insert(intelTopics)
        .values(values)
        .onConflictDoUpdate({
          target: intelTopics.key,
          set: {
            title: values.title,
            summary: values.summary,
            outputType: values.outputType,
            models: values.models,
            regions: values.regions,
            scores: values.scores,
            trendScore: values.trendScore,
            // merge signal ids
            signalIds: sql`(select coalesce(array_agg(distinct x), '{}') from unnest(${intelTopics.signalIds} || excluded.signal_ids) x)`,
            // a re-discovered topic never downgrades a finished one back to "new"
            status: sql`case when ${intelTopics.status} in ('published','rejected','drafted','researching') and excluded.status = 'new' then ${intelTopics.status} else excluded.status end`,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!r) throw new Error("upsertTopic failed");
      return toTopic(r);
    },

    async topTopics(status, limit) {
      const rows = await db
        .select()
        .from(intelTopics)
        .where(eq(intelTopics.status, status))
        .orderBy(desc(intelTopics.trendScore), asc(intelTopics.firstSeenAt))
        .limit(Math.max(1, limit));
      return rows.map(toTopic);
    },

    async setTopicStatus(id, status) {
      if (!isUuid(id)) return;
      await db
        .update(intelTopics)
        .set({ status, updatedAt: new Date() })
        .where(eq(intelTopics.id, id));
    },

    async saveDraft(draft: PromptDraft, state, promptId) {
      const [r] = await db
        .insert(intelDrafts)
        .values({
          topicId: draft.topicId,
          state,
          draft,
          promptId: promptId && isUuid(promptId) ? promptId : null,
          resolvedAt: state === "review" ? null : new Date(),
        })
        .returning({ id: intelDrafts.id });
      if (!r) throw new Error("saveDraft failed");
      return r.id;
    },

    async reviewQueue(limit) {
      const rows = await db
        .select()
        .from(intelDrafts)
        .where(eq(intelDrafts.state, "review"))
        .orderBy(asc(intelDrafts.createdAt))
        .limit(Math.max(1, limit));
      return rows.map((r) => ({ id: r.id, draft: r.draft, createdAt: r.createdAt }));
    },

    async resolveDraft(id, decision) {
      if (!isUuid(id)) return null;
      const [r] = await db
        .update(intelDrafts)
        .set({ state: decision === "approve" ? "approved" : "rejected", resolvedAt: new Date() })
        .where(and(eq(intelDrafts.id, id), eq(intelDrafts.state, "review")))
        .returning();
      return r ? r.draft : null;
    },
  };
}

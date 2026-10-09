import {
  type CatalogService,
  type IntelStore,
  type PromptDraft,
  PUBLISH_GATES,
  type TrendTopic,
} from "@rasa/shared";
import { errorMessage } from "./text";
import type { IntelLogger } from "./types";

export type GateFailure =
  | "judge_missing"
  | "judge_failed"
  | "judge_score"
  | "compliance_missing"
  | "originality"
  | "license"
  | "policy"
  | "trend_score"
  | "fa_missing";

/** Every PUBLISH_GATES check plus the hard compliance requirements. Empty list = publishable. */
export function evaluateGates(
  draft: PromptDraft,
  topic: Pick<TrendTopic, "trendScore">,
): GateFailure[] {
  const f: GateFailure[] = [];
  if (!draft.judge) f.push("judge_missing");
  else {
    if (!draft.judge.passed) f.push("judge_failed");
    if (draft.judge.score < PUBLISH_GATES.minJudgeScore) f.push("judge_score");
  }
  if (!draft.compliance) f.push("compliance_missing");
  else {
    if (draft.compliance.originality < PUBLISH_GATES.minOriginality) f.push("originality");
    if (!draft.compliance.licenseOk) f.push("license");
    if (!draft.compliance.policyOk) f.push("policy");
  }
  if (topic.trendScore < PUBLISH_GATES.minTrendScore) f.push("trend_score");
  if (!draft.body.fa?.trim() || !draft.title.fa?.trim()) f.push("fa_missing");
  return f;
}

export interface PublishOutcome {
  state: "published" | "review" | "rejected";
  draftId: string;
  promptId?: string;
  failedGates: GateFailure[];
}

/**
 * Editor-in-chief. Policy failures are rejected outright; everything else that misses a gate
 * (or when auto-publish is off) goes to the admin review queue. Compliance failures never publish.
 */
export function createPublisher(deps: {
  catalog: CatalogService;
  store: IntelStore;
  logger: IntelLogger;
  autoPublish: boolean;
}) {
  return {
    evaluateGates,
    async publish(draft: PromptDraft, topic: TrendTopic): Promise<PublishOutcome> {
      const failedGates = evaluateGates(draft, topic);
      if (draft.compliance && !draft.compliance.policyOk) {
        const draftId = await deps.store.saveDraft(draft, "rejected");
        await deps.store.setTopicStatus(topic.id, "rejected");
        return { state: "rejected", draftId, failedGates };
      }
      if (deps.autoPublish && failedGates.length === 0) {
        let promptId: string | null = null;
        try {
          promptId = await deps.catalog.createFromDraft(draft, true);
        } catch (err) {
          deps.logger.error(
            { topic: topic.key, err: errorMessage(err) },
            "publisher: catalog publish failed, queueing for review",
          );
        }
        if (promptId) {
          const draftId = await deps.store.saveDraft(draft, "published", promptId);
          await deps.store.setTopicStatus(topic.id, "published");
          deps.logger.info({ topic: topic.key, promptId }, "publisher: auto-published");
          return { state: "published", draftId, promptId, failedGates };
        }
      }
      const draftId = await deps.store.saveDraft(draft, "review");
      await deps.store.setTopicStatus(topic.id, "drafted");
      return { state: "review", draftId, failedGates };
    },
  };
}

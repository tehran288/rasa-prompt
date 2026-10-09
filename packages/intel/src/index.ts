/**
 * @rasa/intel — the trend-intelligence agent team.
 *
 *   scouts → analyst → researcher → engineer ⇄ critic → tester/judge → localizer
 *          → compliance → pricer → publisher (editor-in-chief)
 *
 * Entry point: createIntelPipeline(config, deps). Everything else is exported for tests,
 * the worker (scheduling) and admin tooling.
 */
export {
  ANALYST_SYSTEM,
  computeTrendScore,
  computeVelocity,
  computeVolume,
  createAnalyst,
  type PreCluster,
  preCluster,
  primaryLocaleFor,
  type StoredSignal,
  sourcePercentiles,
  type TrendWeights,
} from "./analyst";
export {
  COMPLIANCE_SYSTEM,
  createCompliance,
  licenseCheck,
  originalityScore,
  overlap,
  redFlags,
  type SourceText,
} from "./compliance";
export {
  CRITIC_SYSTEM,
  type Critique,
  createCritic,
  needsRevision,
  refineWithCritic,
} from "./critic";
export {
  createEngineer,
  ENGINEER_SYSTEM,
  type EngineeredPrompt,
  sourceLocaleFor,
  toDraft,
  validateEngineered,
} from "./engineer";
export { createHttpClient, type HttpClient, HttpError, USER_AGENT } from "./http";
export { aggregateGrades, createJudge, JUDGE_SYSTEM, type JudgeResult, RUBRIC } from "./judge";
export { isAllowedLicense, normalizeLicense } from "./licenses";
export { createLocalizer, LOCALIZER_SYSTEM, validateLocalized } from "./localizer";
export { createIntelPipeline, HARD_REJECT_JUDGE_SCORE } from "./pipeline";
export {
  applyPrice,
  PRICE_BANDS,
  type PriceSuggestion,
  roundStars,
  roundToman,
  suggestPrice,
} from "./pricer";
export { createPublisher, evaluateGates, type GateFailure, type PublishOutcome } from "./publisher";
export { createResearcher, RESEARCHER_SYSTEM } from "./researcher";
export * from "./scouts";
export * as intelSources from "./sources";
export type {
  FeedSource,
  IntelDeps,
  IntelLogger,
  IntelOptions,
  IntelPipeline,
  IntelRunError,
  IntelRunReport,
  OfficialGuide,
  ProduceResult,
  Scout,
  ScoutContext,
  TrendSeed,
  YoutubeQuery,
  ZeroResultQuery,
} from "./types";

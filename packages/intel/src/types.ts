import type {
  AiRouter,
  CatalogService,
  Config,
  IntelStore,
  Locale,
  Region,
  SourceKind,
  TrendSignal,
  TrendTopic,
} from "@rasa/shared";
import type { HttpClient } from "./http";

/** Minimal structural logger; a pino `Logger` from @rasa/shared satisfies it. */
export interface IntelLogger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface ZeroResultQuery {
  query: string;
  count: number;
  locale?: Locale;
}

export interface FeedSource {
  url: string;
  title: string;
  locale?: Locale;
}

export interface OfficialGuide {
  url: string;
  title: string;
  vendor: string;
}

export interface TrendSeed {
  query: string;
  geos: Region[];
}

export interface YoutubeQuery {
  q: string;
  regionCode: "IR" | "SA" | "AE" | "US";
  relevanceLanguage: Locale;
}

/** Everything here is optional; defaults live in `sources.ts`. */
export interface IntelOptions {
  /** Allow-list of scouts to run (default: all). */
  sources?: SourceKind[];
  subreddits?: string[];
  hnQueries?: string[];
  githubTopics?: string[];
  rssFeeds?: FeedSource[];
  officialGuides?: OfficialGuide[];
  arxivQuery?: string;
  trendSeeds?: TrendSeed[];
  youtubeQueries?: YoutubeQuery[];
  webResearchTargets?: { locale: Locale; regions: Region[]; label: string }[];
  /** Trend score weights (default DEFAULT_TREND_WEIGHTS). */
  weights?: {
    velocity: number;
    volume: number;
    commercialIntent: number;
    gap: number;
    fit: number;
  };
  /** Analyst looks at signals from the last N hours (default 72). */
  signalWindowHours?: number;
  /** Topics below this trend score are not worth an LLM production run (default 40). */
  minTrendScoreToProduce?: number;
  /** Parallel topics in produce() (default 2). */
  concurrency?: number;
  /** Max pre-clusters sent to the analyst LLM (default 40). */
  maxClustersForLlm?: number;
  httpTimeoutMs?: number;
  /** Injected clock/sleep — tests pass no-op sleep so rate limits do not slow them down. */
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface IntelDeps {
  ai: AiRouter;
  store: IntelStore;
  catalog: CatalogService;
  logger: IntelLogger;
  fetch?: typeof fetch;
  /** Zero-result search queries from our bots/site (internal_search scout). */
  zeroResultQueries?: () => Promise<ZeroResultQuery[]>;
  options?: IntelOptions;
}

/** Context every scout factory receives. */
export interface ScoutContext {
  config: Config;
  http: HttpClient;
  ai: AiRouter;
  logger: IntelLogger;
  options: IntelOptions;
  now: () => Date;
  zeroResultQueries?: () => Promise<ZeroResultQuery[]>;
}

export interface Scout {
  kind: SourceKind;
  enabled(config: Config): boolean;
  collect(): Promise<TrendSignal[]>;
}

export interface IntelRunError {
  stage: "scout" | "analyze" | "produce" | "run";
  /** Scout kind or topic key/id when known. */
  ref?: string;
  message: string;
}

export interface IntelRunReport {
  startedAt: Date;
  finishedAt: Date;
  signalsCollected: number;
  newSignals: number;
  topics: number;
  published: string[];
  queued: string[];
  rejected: number;
  /** USD spent by the AI router during the run, when the router can tell. */
  costUsd?: number;
  errors: IntelRunError[];
}

export interface ProduceResult {
  published: string[];
  queued: string[];
  rejected: number;
}

export interface IntelPipeline {
  /** Runs all enabled scouts and stores signals. Returns # of new signals. */
  scout(): Promise<number>;
  /** Clusters recent signals into scored topics and upserts them. */
  analyze(): Promise<TrendTopic[]>;
  /** Takes the best "new" topics and turns up to `limit` of them into drafts. */
  produce(limit: number): Promise<ProduceResult>;
  /** scout → analyze → produce(config.INTEL_DAILY_DRAFTS) with per-stage error isolation. */
  runAll(): Promise<IntelRunReport>;
}

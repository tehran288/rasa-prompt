/**
 * Dependency shapes for worker jobs. Every job is a pure-ish async function that receives
 * only the slice of these deps it needs, so tests can pass small fakes.
 */
import type {
  AiRouter,
  AnalyticsService,
  AssistantAgents,
  CatalogService,
  Config,
  EntitlementService,
  IntelStore,
  Logger,
  OrderService,
  Platform,
  SettingsService,
  TicketService,
  UserService,
} from "@rasa/shared";
import type { Messenger } from "./messenger";

/** Wall clock + sleep, injectable so rate limits and timestamps are testable. */
export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Services from `@rasa/db` createServices() that the worker uses. */
export interface WorkerServices {
  catalog: CatalogService;
  users: UserService;
  entitlements: EntitlementService;
  orders: OrderService;
  tickets: TicketService;
  analytics: AnalyticsService;
  settings: SettingsService;
  intel: IntelStore;
}

/** Return type of `@rasa/intel` createIntelPipeline(). */
export interface IntelPipeline {
  scout(): Promise<number>;
  analyze(): Promise<unknown[]>;
  produce(limit: number): Promise<{ published: string[]; queued: string[]; rejected: number }>;
}

/** Thin raw-DB helpers (implemented in container.ts on top of postgres.js). */
export interface DbOps {
  ping(): Promise<void>;
  /**
   * Deletes rows where `column < now() - days`. Returns the number deleted, or `null` when the
   * table/column does not exist (schema owned by the db agent may differ). With `keyPrefixes`,
   * only rows whose `key` column starts with one of the prefixes are deleted.
   */
  deleteOlderThan(
    table: string,
    column: string,
    days: number,
    keyPrefixes?: string[],
  ): Promise<number | null>;
}

export type Messengers = Partial<Record<Platform, Messenger>>;

export interface WorkerDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  services: WorkerServices;
  ai: AiRouter;
  agents: AssistantAgents;
  intel: IntelPipeline;
  messengers: Messengers;
  db: DbOps;
}

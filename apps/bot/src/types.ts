import type {
  AiMessage,
  AnalyticsService,
  AssistantAgents,
  CatalogService,
  Config,
  CreditService,
  EntitlementService,
  IntelStore,
  Locale,
  Logger,
  OrderService,
  PaymentService,
  Platform,
  ProductService,
  ReferralService,
  SettingsService,
  TicketService,
  User,
  UserService,
} from "@rasa/shared";
import type { Context, SessionFlavor, StorageAdapter } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import type { Capabilities } from "./capabilities";
import type { MessageKey, Params } from "./i18n";

/** The db-backed services the bot depends on (= what @rasa/db createServices returns). */
export interface BotServices {
  catalog: CatalogService;
  users: UserService;
  entitlements: EntitlementService;
  credits: CreditService;
  products: ProductService;
  orders: OrderService;
  referrals: ReferralService;
  tickets: TicketService;
  analytics: AnalyticsService;
  settings: SettingsService;
  /** Trend-intelligence store (admin review queue). Optional so the bot works without it. */
  intel?: IntelStore;
}

export type BroadcastSegment = "all" | "buyers" | "non_buyers" | "subscribers";

/**
 * Handed to the worker's broadcast queue — structurally identical to
 * `BroadcastPayload` from "@rasa/worker/public". The bot never fans out messages itself.
 */
export interface BroadcastPayload {
  segment: BroadcastSegment;
  /** undefined = every locale */
  locale?: Locale;
  platform?: Platform;
  text: string;
  /** Telegram HTML parse mode (Bale receives plain text). */
  html?: boolean;
  buttons?: { text: string; url: string }[][];
  /** Admin user id who requested it. */
  requestedBy?: string;
}

/** One step of a multi-step flow. `idle` = free text goes to the concierge. */
export type FlowStep =
  | { kind: "idle" }
  | { kind: "await_search" }
  | {
      kind: "wizard";
      promptId: string;
      index: number;
      values: Record<string, string>;
      runAfter: boolean;
    }
  | { kind: "builder" }
  | {
      kind: "support";
      history: AiMessage[];
      ticketId: string | null;
      /** User asked for a human: the next message opens a ticket without the AI. */
      human?: boolean;
    }
  | { kind: "admin_reply"; ticketId: string }
  | {
      kind: "admin_broadcast";
      stage: "segment" | "locale" | "text" | "confirm";
      segment?: BroadcastSegment;
      locale?: Locale | null;
      text?: string;
    };

export interface SessionData {
  step: FlowStep;
  /** Last search query (callback_data can't carry Persian text within 64 bytes). */
  lastQuery?: string;
  /** callback_data of the last list screen — target of "Back" on a prompt card. */
  lastList?: string;
  /** Text the user may run with AI ("rs" callback): a filled or AI-built prompt. */
  runnable?: { text: string; promptId: string | null } | null;
  /** Deep-link payload waiting for the first-time language pick. */
  pendingStart?: string | null;
  /** True once the user has picked a language (first-run onboarding). */
  onboarded?: boolean;
}

export interface BotFlavor {
  /** Resolved for every update that has a `from`. */
  user: User;
  locale: Locale;
  isAdmin: boolean;
  /** True when the user row was created by this update. */
  isNewUser: boolean;
  /** When true, show() sends a new message instead of editing the tapped one. */
  forceNewMessage?: boolean;
  /** HTML-safe translation (params escaped) — for message bodies. */
  t(key: MessageKey, params?: Params): string;
  /** Plain translation (params not escaped) — for button labels and other non-HTML fields. */
  tp(key: MessageKey, params?: Params): string;
}

export type BotContext = Context & SessionFlavor<SessionData> & BotFlavor;

export interface CreateBotOptions {
  /** Session storage (per user). Defaults to in-memory — use the db adapter in production. */
  storage?: StorageAdapter<SessionData>;
  /** Hands a broadcast to the worker queue; returns a job id. Absent → broadcasts are refused. */
  enqueueBroadcast?: (payload: BroadcastPayload) => Promise<string | null | undefined | void>;
  logger?: Logger;
  /** Pre-set bot info (skips getMe — used by tests and when already known). */
  botInfo?: UserFromGetMe;
  /** Override platform capabilities (e.g. tests, or disabling a broken Bale feature). */
  capabilities?: Partial<Capabilities>;
  /** Per-user flood limit. false disables (tests). Default: 8 updates / 3 s. */
  rateLimit?: { timeFrame: number; limit: number } | false;
  /** Install @grammyjs/transformer-throttler (default true). */
  apiThrottle?: boolean;
  /** Install @grammyjs/auto-retry (default true). */
  autoRetry?: boolean;
  /** Overrides the deep-link base, e.g. "https://t.me" or "https://ble.ir". */
  deepLinkBase?: string;
  /** Override token / api root (defaults from config by platform). */
  token?: string;
  apiRoot?: string;
  /** Timeout for AI calls in interactive flows (ms). Default 25 s; concierge uses min(this, 8 s). */
  aiTimeoutMs?: number;
  /** Clock (tests). */
  now?: () => Date;
}

/** Everything handlers need, closed over at bot construction. */
export interface AppDeps {
  platform: Platform;
  config: Config;
  services: BotServices;
  ai: AssistantAgents;
  payments: PaymentService;
  caps: Capabilities;
  logger: Logger;
  options: CreateBotOptions;
  now: () => Date;
}

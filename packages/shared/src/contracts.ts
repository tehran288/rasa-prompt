/**
 * Service interfaces. Implementations:
 *   - db services      → packages/db      (Postgres via Drizzle)
 *   - AI               → packages/ai      (provider router + conversational agents)
 *   - payments         → packages/payments
 *   - trend pipeline   → packages/intel
 * Apps (bot, worker) depend only on these interfaces, wired in each app's container.ts.
 */
import type { PromptDraft, TrendSignal, TrendTopic } from "./intel";
import type {
  AnalyticsEvent,
  Category,
  CreditPack,
  DailyStats,
  Locale,
  Order,
  OrderItem,
  PaymentProvider,
  Plan,
  Platform,
  PromptDetail,
  PromptSummary,
  PromptTier,
  Ticket,
  TicketMessage,
  User,
} from "./types";

export interface Page<T> {
  items: T[];
  total: number;
  page: number; // 1-based
  pageSize: number;
}

// ───────────────────────────── Catalog ─────────────────────────────
export interface SearchOptions {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  tier?: PromptTier;
  sort?: "relevance" | "quality" | "newest" | "trending";
}

export interface CatalogService {
  listCategories(locale: Locale): Promise<Category[]>;
  /** Query is normalized (fa/ar letters, digits, ZWNJ) inside; logs SearchLog. */
  search(
    query: string,
    locale: Locale,
    opts?: SearchOptions,
    userId?: string,
  ): Promise<Page<PromptSummary>>;
  listByCategory(
    categoryId: string,
    locale: Locale,
    opts?: SearchOptions,
  ): Promise<Page<PromptSummary>>;
  listTrending(locale: Locale, limit: number): Promise<PromptSummary[]>;
  getPrompt(id: string, locale: Locale): Promise<PromptDetail | null>;
  /** Full body — callers MUST check EntitlementService.canAccess first for non-free prompts. */
  getPromptBody(id: string, locale: Locale): Promise<string | null>;
  promptOfTheDay(locale: Locale, date?: Date): Promise<PromptDetail | null>;
  /** Used by the trend pipeline publisher. Returns new prompt id. */
  createFromDraft(draft: PromptDraft, publish: boolean): Promise<string>;
  /** Simple coverage check for the analyst's "gap" score (0 = well covered, 100 = nothing). */
  coverageGap(keywords: string[], locale: Locale): Promise<number>;
}

// ───────────────────────────── Users ─────────────────────────────
export interface PlatformProfile {
  platform: Platform;
  platformUserId: string;
  username: string | null;
  firstName: string | null;
  languageCode: string | null; // from the messenger client
}

export interface UserService {
  /** Creates on first sight (locale guessed from languageCode), updates lastSeenAt otherwise. */
  upsert(
    profile: PlatformProfile,
    referralCode?: string | null,
  ): Promise<{ user: User; created: boolean }>;
  getById(id: string): Promise<User | null>;
  getByPlatformId(platform: Platform, platformUserId: string): Promise<User | null>;
  getByReferralCode(code: string): Promise<User | null>;
  setLocale(userId: string, locale: Locale): Promise<void>;
  setBanned(userId: string, banned: boolean): Promise<void>;
  /** Admins = env ADMIN_IDS per platform OR users.is_admin. */
  isAdmin(user: User): boolean;
  /** For broadcasts. Yields batches of non-banned users. */
  iterateAudience(
    filter: {
      platform?: Platform;
      locale?: Locale;
      segment?: "all" | "buyers" | "non_buyers" | "subscribers";
    },
    batchSize: number,
  ): AsyncIterable<User[]>;
  count(filter?: { platform?: Platform; locale?: Locale }): Promise<number>;
}

// ───────────────────────────── Entitlements / library ─────────────────────────────
export interface EntitlementService {
  canAccess(userId: string, promptId: string): Promise<boolean>;
  library(userId: string, locale: Locale, page?: number): Promise<Page<PromptSummary>>;
  activeSubscription(userId: string): Promise<{ plan: Plan; expiresAt: Date | null } | null>;
  /** Called by fulfillment only. */
  grantForOrder(order: Order): Promise<void>;
  revokeForOrder(order: Order): Promise<void>;
}

// ───────────────────────────── Credits ─────────────────────────────
export interface CreditService {
  balance(userId: string): Promise<number>;
  grant(userId: string, amount: number, reason: string, refId?: string): Promise<number>;
  /** Throws DomainError("insufficient_credits"). Atomic. */
  spend(userId: string, amount: number, reason: string, refId?: string): Promise<number>;
}

// ───────────────────────────── Orders / products ─────────────────────────────
export interface ProductService {
  listPlans(locale: Locale): Promise<Plan[]>;
  listCreditPacks(locale: Locale): Promise<CreditPack[]>;
  /** Resolves current price + title for an item in the given currency. */
  quote(
    kind: OrderItem["kind"],
    refId: string,
    currency: "XTR" | "IRR",
    locale: Locale,
  ): Promise<OrderItem>;
}

export interface OrderService {
  create(input: {
    userId: string;
    platform: Platform;
    provider: PaymentProvider;
    currency: "XTR" | "IRR";
    items: OrderItem[];
  }): Promise<Order>;
  get(id: string): Promise<Order | null>;
  /** Most recent first. Used by the support agent (scoped to the given user). */
  listForUser(userId: string, limit: number): Promise<Order[]>;
  /** paid → fulfilled after entitlements/credits were granted; lets a failed fulfillment be resumed. */
  markFulfilled(orderId: string): Promise<Order>;
  /** Idempotent: second call with the same chargeId returns the same order without re-granting. */
  markPaid(
    orderId: string,
    providerChargeId: string,
    paidAmount: number,
  ): Promise<{ order: Order; firstTime: boolean }>;
  markRefunded(orderId: string): Promise<Order>;
  expireStale(olderThanMinutes: number): Promise<number>;
  listPendingOlderThan(minutes: number): Promise<Order[]>; // abandoned-cart reminders
}

// ───────────────────────────── Referrals ─────────────────────────────
export interface ReferralService {
  /** Rewards both sides once, after the referred user's first paid order. */
  onFirstPurchase(userId: string): Promise<void>;
  stats(userId: string): Promise<{ invited: number; converted: number; creditsEarned: number }>;
}

// ───────────────────────────── Support ─────────────────────────────
export interface TicketService {
  open(userId: string, subject: string, firstMessage: string): Promise<Ticket>;
  addMessage(ticketId: string, from: TicketMessage["from"], text: string): Promise<TicketMessage>;
  setStatus(ticketId: string, status: Ticket["status"]): Promise<void>;
  get(ticketId: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null>;
  activeForUser(userId: string): Promise<Ticket | null>;
  listOpen(limit: number): Promise<Ticket[]>;
}

// ───────────────────────────── Analytics ─────────────────────────────
export interface AnalyticsService {
  track(
    event: AnalyticsEvent,
    userId: string | null,
    props?: Record<string, unknown>,
  ): Promise<void>;
  dailyStats(date: Date): Promise<DailyStats>;
}

// ───────────────────────────── Settings / KV ─────────────────────────────
export interface SettingsService {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
}

// ───────────────────────────── Trend intelligence storage ─────────────────────────────
export interface IntelStore {
  saveSignals(signals: TrendSignal[]): Promise<number>; // returns # new (dedup by source+externalId)
  recentSignals(sinceHours: number, limit: number): Promise<(TrendSignal & { id: string })[]>;
  upsertTopic(
    topic: Omit<TrendTopic, "id" | "firstSeenAt" | "updatedAt"> & { id?: string },
  ): Promise<TrendTopic>;
  topTopics(status: TrendTopic["status"], limit: number): Promise<TrendTopic[]>;
  setTopicStatus(id: string, status: TrendTopic["status"]): Promise<void>;
  saveDraft(
    draft: PromptDraft,
    state: "review" | "published" | "rejected",
    promptId?: string,
  ): Promise<string>;
  reviewQueue(limit: number): Promise<{ id: string; draft: PromptDraft; createdAt: Date }[]>;
  resolveDraft(id: string, decision: "approve" | "reject"): Promise<PromptDraft | null>;
}

// ───────────────────────────── AI ─────────────────────────────
/** Model routing is by task, configured via env — never hard-coded at call sites. */
export type AiTask =
  | "concierge" // intent detection on free text
  | "build_prompt" // user idea → professional prompt
  | "run_prompt" // execute a prompt for the user (credits)
  | "support" // support agent with tools
  | "moderate" // safety classification
  | "write_post" // channel post / marketing copy
  | "report" // daily admin report narrative
  | "intel_analyze" // cluster & score signals
  | "intel_research" // web research with citations
  | "intel_engineer" // write premium prompt
  | "intel_critic" // red-team / critique
  | "intel_judge" // grade test outputs
  | "intel_localize" // fa/ar/en localization
  | "intel_compliance"; // originality / policy

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiTextResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiProvider {
  readonly name: string;
  complete(req: {
    task: AiTask;
    system: string;
    messages: AiMessage[];
    maxTokens?: number;
    /** When set, provider must return JSON matching this JSON Schema (structured output). */
    jsonSchema?: Record<string, unknown>;
    /** Enables provider-side web search/fetch when supported (intel_research). */
    webResearch?: { maxSearches: number; allowedDomains?: string[]; blockedDomains?: string[] };
  }): Promise<AiTextResult & { citations?: { url: string; title: string }[] }>;
}

export interface AiRouter {
  /** Picks provider+model for the task from config; enforces daily USD budget. */
  complete: AiProvider["complete"];
  /** Convenience: structured output parsed & validated with zod schema by caller-provided parser. */
  json<T>(req: Parameters<AiProvider["complete"]>[0] & { parse: (raw: unknown) => T }): Promise<T>;
  spentTodayUsd(): Promise<number>;
}

export interface ConciergeResult {
  intent:
    | "search"
    | "build_prompt"
    | "support"
    | "buy"
    | "account"
    | "smalltalk"
    | "unsafe"
    | "other";
  query: string | null; // cleaned search query when intent=search
  locale: Locale;
  reply: string | null; // short reply for smalltalk/other
}

export interface AssistantAgents {
  concierge(text: string, locale: Locale): Promise<ConciergeResult>;
  buildPrompt(
    idea: string,
    locale: Locale,
  ): Promise<{ title: string; prompt: string; variables: string[]; tips: string[] }>;
  runPrompt(prompt: string, locale: Locale): Promise<AiTextResult>;
  /** Support agent may call tools (order lookup, library, FAQ). Returns answer or escalation. */
  support(input: {
    userId: string;
    locale: Locale;
    history: AiMessage[];
    message: string;
  }): Promise<{ answer: string; escalate: boolean; reason?: string }>;
  moderate(text: string): Promise<{ allowed: boolean; category: string | null }>;
  writeChannelPost(prompt: PromptDetail, locale: Locale, platform: Platform): Promise<string>;
  writeDailyReport(stats: DailyStats, extra: Record<string, unknown>): Promise<string>;
}

// ───────────────────────────── Payments ─────────────────────────────
export interface InvoiceSpec {
  title: string;
  description: string;
  payload: string; // our order id, opaque to user
  currency: "XTR" | "IRR";
  amount: number;
  providerToken: string; // "" for Stars
  photoUrl?: string;
}

export interface PaymentService {
  /** Creates an order and returns the invoice to send via the platform API. */
  createInvoice(input: {
    user: User;
    platform: Platform;
    items: { kind: OrderItem["kind"]; refId: string }[];
  }): Promise<{ order: Order; invoice: InvoiceSpec }>;
  /** Validate pre_checkout_query. Must answer within 10s. */
  validatePreCheckout(
    payload: string,
    currency: string,
    totalAmount: number,
    platformUserId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Handle successful_payment: idempotent fulfillment (entitlements, credits, referral). */
  fulfill(input: {
    payload: string;
    chargeId: string;
    currency: string;
    totalAmount: number;
  }): Promise<{ order: Order; firstTime: boolean }>;
  /** Telegram Stars refund via refundStarPayment; Bale: mark + manual. */
  refund(orderId: string): Promise<Order>;
  /** Link to website checkout (Zarinpal) — used when in-messenger payment unavailable. */
  webCheckoutUrl(orderId: string): string;
}

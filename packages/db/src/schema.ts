import type {
  ContentLicense,
  Locale,
  LocalizedText,
  OrderItem,
  OrderStatus,
  OutputType,
  PaymentProvider,
  Platform,
  PromptDraft,
  PromptStatus,
  PromptTier,
  Region,
  SourceKind,
  TicketMessage,
  TicketStatus,
  TrendTopic,
} from "@rasa/shared";
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => tsz("created_at").notNull().defaultNow();
const pk = () => uuid("id").primaryKey().defaultRandom();

/** Variable as stored (labels localized; resolved per locale when read). */
export interface StoredVariable {
  name: string;
  label: LocalizedText;
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
  default?: string;
}

// ───────────────────────────── Users ─────────────────────────────
export const users = pgTable(
  "users",
  {
    id: pk(),
    platform: text("platform").$type<Platform>().notNull(),
    platformUserId: text("platform_user_id").notNull(),
    username: text("username"),
    firstName: text("first_name"),
    locale: text("locale").$type<Locale>().notNull().default("fa"),
    referralCode: text("referral_code").notNull().unique(),
    referredByUserId: uuid("referred_by_user_id"),
    isAdmin: boolean("is_admin").notNull().default(false),
    isBanned: boolean("is_banned").notNull().default(false),
    createdAt: createdAt(),
    lastSeenAt: tsz("last_seen_at").notNull().defaultNow(),
  },
  (t) => [
    unique("users_platform_user_uq").on(t.platform, t.platformUserId),
    index("users_created_at_idx").on(t.createdAt),
    index("users_last_seen_idx").on(t.lastSeenAt),
  ],
);

// ───────────────────────────── Catalog ─────────────────────────────
export const categories = pgTable("categories", {
  id: pk(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  emoji: text("emoji"),
  sort: integer("sort").notNull().default(100),
  createdAt: createdAt(),
});

export const prompts = pgTable(
  "prompts",
  {
    id: pk(),
    slug: text("slug").notNull().unique(),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    summary: jsonb("summary").$type<LocalizedText>().notNull(),
    description: jsonb("description").$type<LocalizedText>().notNull(),
    /** Current body (mirror of the latest prompt_versions row). */
    body: jsonb("body").$type<LocalizedText>().notNull(),
    variables: jsonb("variables").$type<StoredVariable[]>().notNull().default([]),
    exampleOutput: jsonb("example_output").$type<LocalizedText | null>(),
    version: text("version").notNull().default("1.0.0"),
    sourceLocale: text("source_locale").$type<Locale>().notNull().default("fa"),
    tier: text("tier").$type<PromptTier>().notNull().default("free"),
    outputType: text("output_type").$type<OutputType>().notNull().default("text"),
    models: text("models").array().notNull().default(sql`'{}'::text[]`),
    qualityScore: integer("quality_score").notNull().default(0),
    status: text("status").$type<PromptStatus>().notNull().default("draft"),
    priceToman: integer("price_toman"),
    priceStars: integer("price_stars"),
    lastTestedAt: tsz("last_tested_at"),
    publishedAt: tsz("published_at"),
    trendingScore: real("trending_score").notNull().default(0),
    /** in_house_ai | in_house_manual | cc0_import | creator | ai_pipeline */
    source: text("source").notNull().default("in_house_manual"),
    license: text("license").$type<ContentLicense>().notNull().default("proprietary"),
    attribution: text("attribution"),
    sourceUrl: text("source_url"),
    /** normalizeForSearch() of all locales + category names; trigram-indexed. */
    searchText: text("search_text").notNull().default(""),
    searchFa: text("search_fa").notNull().default(""),
    searchAr: text("search_ar").notNull().default(""),
    searchEn: text("search_en").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: tsz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("prompts_search_trgm_idx").using("gin", t.searchText.op("gin_trgm_ops")),
    index("prompts_status_quality_idx").on(t.status, t.qualityScore),
    index("prompts_status_trending_idx").on(t.status, t.trendingScore),
    index("prompts_published_at_idx").on(t.publishedAt),
  ],
);

export const promptCategories = pgTable(
  "prompt_categories",
  {
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.promptId, t.categoryId] }),
    index("prompt_categories_category_idx").on(t.categoryId),
  ],
);

export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: pk(),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    semver: text("semver").notNull(),
    body: jsonb("body").$type<LocalizedText>().notNull(),
    variables: jsonb("variables").$type<StoredVariable[]>().notNull().default([]),
    changelog: jsonb("changelog").$type<LocalizedText | null>(),
    /** ai_pipeline | admin | creator | seed */
    createdBy: text("created_by").notNull().default("admin"),
    createdAt: createdAt(),
  },
  (t) => [unique("prompt_versions_prompt_semver_uq").on(t.promptId, t.semver)],
);

export const bundles = pgTable("bundles", {
  id: pk(),
  slug: text("slug").notNull().unique(),
  title: jsonb("title").$type<LocalizedText>().notNull(),
  description: jsonb("description").$type<LocalizedText | null>(),
  priceToman: integer("price_toman").notNull(),
  priceStars: integer("price_stars").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const bundlePrompts = pgTable(
  "bundle_prompts",
  {
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.bundleId, t.promptId] }),
    index("bundle_prompts_prompt_idx").on(t.promptId),
  ],
);

// ───────────────────────────── Products ─────────────────────────────
export const plans = pgTable("plans", {
  id: pk(),
  code: text("code").$type<"pro_monthly" | "pro_yearly" | "lifetime">().notNull().unique(),
  title: jsonb("title").$type<LocalizedText>().notNull(),
  monthlyCredits: integer("monthly_credits").notNull(),
  /** null => lifetime */
  durationDays: integer("duration_days"),
  priceToman: integer("price_toman").notNull(),
  priceStars: integer("price_stars").notNull(),
  includesPremium: boolean("includes_premium").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(100),
  createdAt: createdAt(),
});

export const creditPacks = pgTable("credit_packs", {
  id: pk(),
  code: text("code").notNull().unique(),
  title: jsonb("title").$type<LocalizedText>().notNull(),
  credits: integer("credits").notNull(),
  priceToman: integer("price_toman").notNull(),
  priceStars: integer("price_stars").notNull(),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(100),
  createdAt: createdAt(),
});

// ───────────────────────────── Orders ─────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: pk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    platform: text("platform").$type<Platform>().notNull(),
    provider: text("provider").$type<PaymentProvider>().notNull(),
    currency: text("currency").$type<"XTR" | "IRR">().notNull(),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    /** UNIQUE: the idempotency key for payment callbacks. */
    providerChargeId: text("provider_charge_id").unique(),
    createdAt: createdAt(),
    paidAt: tsz("paid_at"),
    refundedAt: tsz("refunded_at"),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_paid_at_idx").on(t.paidAt),
  ],
);

/** All access control reads only this table. */
export const entitlements = pgTable(
  "entitlements",
  {
    id: pk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").$type<"prompt" | "bundle" | "all_pro" | "all_premium">().notNull(),
    /** prompt id | bundle id | plan id */
    refId: uuid("ref_id").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    planId: uuid("plan_id").references(() => plans.id),
    /** order | referral | admin */
    source: text("source").notNull().default("order"),
    expiresAt: tsz("expires_at"),
    revokedAt: tsz("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("entitlements_user_idx").on(t.userId, t.kind),
    uniqueIndex("entitlements_order_kind_ref_uq")
      .on(t.orderId, t.kind, t.refId)
      .where(sql`${t.orderId} is not null`),
  ],
);

/**
 * Append-only credit ledger. Balance = SUM(delta). There is deliberately no balance column on
 * users. balance_after is informational (computed under a per-user advisory lock).
 */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    delta: integer("delta").notNull(),
    /** subscription_grant | purchase | run | refund | bonus | referral | ... */
    reason: text("reason").notNull(),
    refId: text("ref_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("credit_ledger_user_idx").on(t.userId),
    // Grants with a refId are idempotent per (user, reason, refId).
    uniqueIndex("credit_ledger_grant_uq")
      .on(t.userId, t.reason, t.refId)
      .where(sql`${t.delta} > 0 and ${t.refId} is not null`),
  ],
);

export const referrals = pgTable(
  "referrals",
  {
    id: pk(),
    referrerUserId: uuid("referrer_user_id")
      .notNull()
      .references(() => users.id),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    rewardCredits: integer("reward_credits"),
    rewardedAt: tsz("rewarded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("referrals_referrer_idx").on(t.referrerUserId)],
);

// ───────────────────────────── Support ─────────────────────────────
export const tickets = pgTable(
  "tickets",
  {
    id: pk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").$type<TicketStatus>().notNull().default("open"),
    subject: text("subject").notNull(),
    createdAt: createdAt(),
    updatedAt: tsz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tickets_user_idx").on(t.userId),
    index("tickets_status_idx").on(t.status, t.updatedAt),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: pk(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    from: text("from").$type<TicketMessage["from"]>().notNull(),
    text: text("text").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

// ───────────────────────────── Analytics ─────────────────────────────
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    event: text("event").notNull(),
    userId: uuid("user_id"),
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("analytics_events_created_idx").on(t.createdAt),
    index("analytics_events_event_created_idx").on(t.event, t.createdAt),
  ],
);

export const searchLogs = pgTable(
  "search_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id"),
    query: text("query").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    resultsCount: integer("results_count").notNull(),
    clickedPromptId: uuid("clicked_prompt_id"),
    createdAt: createdAt(),
  },
  (t) => [index("search_logs_created_idx").on(t.createdAt)],
);

// ───────────────────────────── KV ─────────────────────────────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

/** grammY session storage. */
export const botSessions = pgTable("bot_sessions", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

// ───────────────────────────── Trend intelligence ─────────────────────────────
export const intelSignals = pgTable(
  "intel_signals",
  {
    id: pk(),
    source: text("source").$type<SourceKind>().notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    snippet: text("snippet").notNull().default(""),
    locale: text("locale").$type<Locale | "other">().notNull(),
    region: text("region").$type<Region>().notNull(),
    metric: real("metric").notNull().default(0),
    metricName: text("metric_name").notNull().default(""),
    observedAt: tsz("observed_at").notNull(),
    license: text("license").$type<ContentLicense>().notNull().default("unknown"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [
    unique("intel_signals_source_external_uq").on(t.source, t.externalId),
    index("intel_signals_created_idx").on(t.createdAt),
  ],
);

export const intelTopics = pgTable(
  "intel_topics",
  {
    id: pk(),
    key: text("key").notNull().unique(),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    summary: text("summary").notNull().default(""),
    outputType: text("output_type").$type<OutputType>().notNull(),
    models: text("models").array().notNull().default(sql`'{}'::text[]`),
    regions: text("regions").array().$type<Region[]>().notNull().default(sql`'{}'::text[]`),
    scores: jsonb("scores").$type<TrendTopic["scores"]>().notNull(),
    trendScore: real("trend_score").notNull().default(0),
    signalIds: text("signal_ids").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").$type<TrendTopic["status"]>().notNull().default("new"),
    firstSeenAt: tsz("first_seen_at").notNull().defaultNow(),
    updatedAt: tsz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("intel_topics_status_score_idx").on(t.status, t.trendScore)],
);

export const intelDrafts = pgTable(
  "intel_drafts",
  {
    id: pk(),
    topicId: text("topic_id").notNull(),
    /** review | published | rejected | approved */
    state: text("state").notNull(),
    draft: jsonb("draft").$type<PromptDraft>().notNull(),
    promptId: uuid("prompt_id").references(() => prompts.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    resolvedAt: tsz("resolved_at"),
  },
  (t) => [index("intel_drafts_state_idx").on(t.state, t.createdAt)],
);

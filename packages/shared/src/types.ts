/**
 * Domain types shared by every package. This file is the contract between
 * the db, payments, ai, bot and worker packages — change it deliberately.
 */

export const LOCALES = ["fa", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fa";

export const PLATFORMS = ["telegram", "bale"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Text in all three locales. `fa` is always present; others fall back to it. */
export type LocalizedText = { fa: string; ar?: string | null; en?: string | null };

export type PromptTier = "free" | "pro" | "premium";
export type OutputType = "text" | "image" | "video" | "audio" | "code" | "automation";
export type PromptStatus =
  | "draft"
  | "testing"
  | "review"
  | "published"
  | "needs_update"
  | "archived";

export interface Category {
  id: string;
  slug: string;
  name: string; // resolved for the requested locale
  emoji: string | null;
  promptCount: number;
}

export interface PromptVariable {
  name: string; // matches {{name}} in body
  label: string; // resolved for locale
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
  default?: string;
}

/** What lists and search results show. Never contains the paid body. */
export interface PromptSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tier: PromptTier;
  outputType: OutputType;
  models: string[]; // e.g. ["ChatGPT", "Claude"]
  qualityScore: number; // 0..100
  lastTestedAt: Date | null;
  priceToman: number | null; // null => not sold individually (free or subscription-only)
  priceStars: number | null;
}

export interface PromptDetail extends PromptSummary {
  description: string;
  categoryIds: string[];
  version: string; // semver
  variables: PromptVariable[];
  /** First ~25% of the body, safe to show anyone. */
  preview: string;
  exampleOutput: string | null;
}

export interface User {
  id: string;
  platform: Platform;
  platformUserId: string; // Telegram/Bale numeric id as string
  username: string | null;
  firstName: string | null;
  locale: Locale;
  referralCode: string;
  referredByUserId: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}

export type OrderStatus = "pending" | "paid" | "fulfilled" | "refunded" | "cancelled" | "expired";
export type PaymentProvider = "telegram_stars" | "bale_wallet" | "web_zarinpal";
export type ProductKind = "prompt" | "bundle" | "plan" | "credit_pack";

export interface OrderItem {
  kind: ProductKind;
  refId: string;
  title: string;
  /** amount in the order currency's smallest unit (Stars: stars, IRR: rial) */
  amount: number;
}

export interface Order {
  id: string;
  userId: string;
  platform: Platform;
  provider: PaymentProvider;
  currency: "XTR" | "IRR";
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  providerChargeId: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface Plan {
  id: string;
  code: "pro_monthly" | "pro_yearly" | "lifetime";
  title: string;
  monthlyCredits: number;
  durationDays: number | null; // null => lifetime
  priceToman: number;
  priceStars: number;
}

export interface CreditPack {
  id: string;
  title: string;
  credits: number;
  priceToman: number;
  priceStars: number;
}

export type TicketStatus = "open" | "waiting_admin" | "waiting_user" | "closed";
export interface Ticket {
  id: string;
  userId: string;
  status: TicketStatus;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface TicketMessage {
  id: string;
  ticketId: string;
  from: "user" | "admin" | "ai";
  text: string;
  createdAt: Date;
}

export type AnalyticsEvent =
  | "start"
  | "search"
  | "search_zero_results"
  | "view_prompt"
  | "copy_prompt"
  | "fill_variables"
  | "checkout_started"
  | "payment_succeeded"
  | "payment_failed"
  | "ai_build_prompt"
  | "ai_run_prompt"
  | "support_opened"
  | "referral_joined"
  | "broadcast_sent";

export interface DailyStats {
  date: string; // YYYY-MM-DD (UTC)
  newUsers: number;
  activeUsers: number;
  searches: number;
  zeroResultSearches: number;
  ordersPaid: number;
  revenueToman: number;
  revenueStars: number;
  openTickets: number;
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
}

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "forbidden"
      | "insufficient_credits"
      | "invalid_state"
      | "amount_mismatch"
      | "banned"
      | "rate_limited",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DomainError";
  }
}

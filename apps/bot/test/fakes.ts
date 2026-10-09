/**
 * In-memory fakes of every @rasa/shared contract the bot uses. Deterministic, no I/O.
 */
import {
  type AnalyticsEvent,
  type AssistantAgents,
  type Category,
  type ConciergeResult,
  type CreditPack,
  type DailyStats,
  DomainError,
  type InvoiceSpec,
  type Locale,
  type Order,
  type OrderItem,
  type Page,
  type PaymentService,
  type Plan,
  type Platform,
  type PlatformProfile,
  type PromptDetail,
  type PromptDraft,
  type PromptSummary,
  type Ticket,
  type TicketMessage,
  type User,
} from "@rasa/shared";
import type { BotServices } from "../src/types";

export const PAID_BODY_MARKER = "PAID-SECRET-BODY-7f3a";

export interface FakePrompt extends PromptDetail {
  body: string;
}

function prompt(p: Partial<FakePrompt> & { id: string; title: string; body: string }): FakePrompt {
  return {
    slug: p.id,
    summary: `${p.title} — خلاصه`,
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude"],
    qualityScore: 87,
    lastTestedAt: new Date("2026-09-01T00:00:00Z"),
    priceToman: null,
    priceStars: null,
    description: "",
    categoryIds: ["cat-marketing"],
    version: "1.0.0",
    variables: [],
    preview: p.body.slice(0, Math.ceil(p.body.length / 4)),
    exampleOutput: "نمونه خروجی",
    ...p,
  };
}

export function seedPrompts(): FakePrompt[] {
  const list: FakePrompt[] = [
    prompt({
      id: "free-caption",
      title: "کپشن اینستاگرام فروشگاه",
      body: "یک کپشن جذاب برای {{product}} با لحن {{tone}} بنویس. تعداد هشتگ: {{count}}",
      variables: [
        { name: "product", label: "نام محصول", type: "text", required: true },
        {
          name: "tone",
          label: "لحن",
          type: "select",
          options: ["رسمی", "صمیمی"],
          required: false,
          default: "صمیمی",
        },
        { name: "count", label: "تعداد هشتگ", type: "number", required: true },
      ],
    }),
    prompt({
      id: "paid-agent",
      title: "ایجنت فروش حرفه‌ای",
      tier: "premium",
      priceStars: 250,
      priceToman: 149000,
      preview: "ایجنتی که بازار شما را تحلیل و برنامه فروش می‌نویسد…",
      body: `${PAID_BODY_MARKER} You are a senior sales strategist.\nStep 1: analyse the market.\nStep 2: write the plan for {{company}}.`,
      variables: [{ name: "company", label: "نام شرکت", type: "text", required: true }],
    }),
  ];
  for (let i = 1; i <= 12; i++) {
    list.push(
      prompt({
        id: `email-${i}`,
        title: `ایمیل پیگیری مشتری ${i}`,
        body: `ایمیل پیگیری شماره ${i} بنویس.`,
        qualityScore: 70 + i,
        categoryIds: ["cat-email"],
      }),
    );
  }
  return list;
}

function toSummary(p: FakePrompt): PromptSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    tier: p.tier,
    outputType: p.outputType,
    models: p.models,
    qualityScore: p.qualityScore,
    lastTestedAt: p.lastTestedAt,
    priceToman: p.priceToman,
    priceStars: p.priceStars,
  };
}

function toDetail(p: FakePrompt): PromptDetail {
  const { body: _body, ...detail } = p;
  return detail;
}

function paginate<T>(items: T[], page = 1, pageSize = 10): Page<T> {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

export interface FakeState {
  prompts: FakePrompt[];
  users: Map<string, User>;
  entitlements: Set<string>;
  subscriptions: Map<string, { plan: Plan; expiresAt: Date | null }>;
  credits: Map<string, number>;
  orders: Map<string, Order>;
  tickets: Map<string, { ticket: Ticket; messages: TicketMessage[] }>;
  events: { event: AnalyticsEvent; userId: string | null; props?: Record<string, unknown> }[];
  settings: Map<string, unknown>;
  reviewQueue: { id: string; draft: PromptDraft; createdAt: Date }[];
  created: { draft: PromptDraft; publish: boolean }[];
  searches: string[];
}

export const PLANS: Plan[] = [
  {
    id: "plan-monthly",
    code: "pro_monthly",
    title: "Pro ماهانه",
    monthlyCredits: 200,
    durationDays: 30,
    priceToman: 199000,
    priceStars: 500,
  },
];
export const PACKS: CreditPack[] = [
  { id: "pack-100", title: "۱۰۰ اعتبار", credits: 100, priceToman: 99000, priceStars: 200 },
];

export function createFakeServices(opts: { adminPlatformIds?: string[] } = {}) {
  const state: FakeState = {
    prompts: seedPrompts(),
    users: new Map(),
    entitlements: new Set(),
    subscriptions: new Map(),
    credits: new Map(),
    orders: new Map(),
    tickets: new Map(),
    events: [],
    settings: new Map(),
    reviewQueue: [],
    created: [],
    searches: [],
  };
  const adminIds = new Set(opts.adminPlatformIds ?? []);
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;
  const find = (pid: string) => state.prompts.find((p) => p.id === pid);
  const categories: Category[] = [
    { id: "cat-marketing", slug: "marketing", name: "بازاریابی", emoji: "📣", promptCount: 2 },
    { id: "cat-email", slug: "email", name: "ایمیل", emoji: "✉️", promptCount: 12 },
  ];

  const services: Required<BotServices> = {
    catalog: {
      async listCategories() {
        return categories;
      },
      async search(query, _l, o = {}) {
        state.searches.push(query);
        const q = query.trim();
        const hits = state.prompts.filter((p) => p.title.includes(q) || p.summary.includes(q));
        return paginate(hits.map(toSummary), o.page, o.pageSize);
      },
      async listByCategory(cid, _l, o = {}) {
        const hits = state.prompts.filter((p) => p.categoryIds.includes(cid));
        return paginate(hits.map(toSummary), o.page, o.pageSize);
      },
      async listTrending(_l, limit) {
        return state.prompts.slice(0, limit).map(toSummary);
      },
      async getPrompt(pid) {
        const p = find(pid);
        return p ? toDetail(p) : null;
      },
      async getPromptBody(pid) {
        return find(pid)?.body ?? null;
      },
      async promptOfTheDay() {
        const p = state.prompts[0];
        return p ? toDetail(p) : null;
      },
      async createFromDraft(draft, publish) {
        state.created.push({ draft, publish });
        return id("prompt");
      },
      async coverageGap() {
        return 50;
      },
    },
    users: {
      async upsert(profile: PlatformProfile, referralCode?: string | null) {
        const existing = [...state.users.values()].find(
          (u) => u.platform === profile.platform && u.platformUserId === profile.platformUserId,
        );
        if (existing) {
          existing.lastSeenAt = new Date();
          return { user: existing, created: false };
        }
        const referrer = referralCode
          ? [...state.users.values()].find((u) => u.referralCode === referralCode)
          : undefined;
        const lc = (profile.languageCode ?? "").slice(0, 2);
        const user: User = {
          id: id("user"),
          platform: profile.platform,
          platformUserId: profile.platformUserId,
          username: profile.username,
          firstName: profile.firstName,
          locale: lc === "ar" ? "ar" : lc === "en" ? "en" : "fa",
          referralCode: `R${profile.platformUserId}`,
          referredByUserId: referrer?.id ?? null,
          isAdmin: false,
          isBanned: false,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        };
        state.users.set(user.id, user);
        return { user, created: true };
      },
      async getById(uid) {
        return state.users.get(uid) ?? null;
      },
      async getByPlatformId(platform: Platform, pid: string) {
        return (
          [...state.users.values()].find((u) => u.platform === platform && u.platformUserId === pid) ??
          null
        );
      },
      async getByReferralCode(code) {
        return [...state.users.values()].find((u) => u.referralCode === code) ?? null;
      },
      async setLocale(uid, locale: Locale) {
        const u = state.users.get(uid);
        if (u) u.locale = locale;
      },
      async setBanned(uid, banned) {
        const u = state.users.get(uid);
        if (u) u.isBanned = banned;
      },
      isAdmin(user) {
        return user.isAdmin || adminIds.has(user.platformUserId);
      },
      async *iterateAudience() {
        yield [...state.users.values()];
      },
      async count() {
        return state.users.size;
      },
    },
    entitlements: {
      async canAccess(uid, pid) {
        return state.entitlements.has(`${uid}:${pid}`) || state.subscriptions.has(uid);
      },
      async library(uid, _l, page = 1) {
        const owned = state.prompts.filter((p) => state.entitlements.has(`${uid}:${p.id}`));
        return paginate(owned.map(toSummary), page, 5);
      },
      async activeSubscription(uid) {
        return state.subscriptions.get(uid) ?? null;
      },
      async grantForOrder(order) {
        for (const it of order.items) {
          if (it.kind === "prompt") state.entitlements.add(`${order.userId}:${it.refId}`);
          if (it.kind === "plan") {
            const plan = PLANS.find((p) => p.id === it.refId);
            if (plan) state.subscriptions.set(order.userId, { plan, expiresAt: null });
          }
        }
      },
      async revokeForOrder(order) {
        for (const it of order.items) state.entitlements.delete(`${order.userId}:${it.refId}`);
      },
    },
    credits: {
      async balance(uid) {
        return state.credits.get(uid) ?? 0;
      },
      async grant(uid, amount) {
        const b = (state.credits.get(uid) ?? 0) + amount;
        state.credits.set(uid, b);
        return b;
      },
      async spend(uid, amount) {
        const b = state.credits.get(uid) ?? 0;
        if (b < amount) throw new DomainError("insufficient_credits");
        state.credits.set(uid, b - amount);
        return b - amount;
      },
    },
    products: {
      async listPlans() {
        return PLANS;
      },
      async listCreditPacks() {
        return PACKS;
      },
      async quote(kind, refId, currency): Promise<OrderItem> {
        const pick = (toman: number, stars: number) => (currency === "XTR" ? stars : toman * 10);
        if (kind === "prompt") {
          const p = find(refId);
          if (!p?.priceToman || !p.priceStars) throw new DomainError("not_found");
          return { kind, refId, title: p.title, amount: pick(p.priceToman, p.priceStars) };
        }
        if (kind === "plan") {
          const p = PLANS.find((x) => x.id === refId);
          if (!p) throw new DomainError("not_found");
          return { kind, refId, title: p.title, amount: pick(p.priceToman, p.priceStars) };
        }
        if (kind === "credit_pack") {
          const p = PACKS.find((x) => x.id === refId);
          if (!p) throw new DomainError("not_found");
          return { kind, refId, title: p.title, amount: pick(p.priceToman, p.priceStars) };
        }
        if (refId === "marketing") return { kind, refId, title: "باندل مارکتینگ", amount: pick(390000, 900) };
        throw new DomainError("not_found");
      },
    },
    orders: {
      async create(input) {
        const order: Order = {
          id: id("order"),
          ...input,
          total: input.items.reduce((s, i) => s + i.amount, 0),
          status: "pending",
          providerChargeId: null,
          createdAt: new Date(),
          paidAt: null,
        };
        state.orders.set(order.id, order);
        return order;
      },
      async get(oid) {
        return state.orders.get(oid) ?? null;
      },
      async markPaid(oid, chargeId) {
        const order = state.orders.get(oid);
        if (!order) throw new DomainError("not_found");
        if (order.providerChargeId === chargeId) return { order, firstTime: false };
        order.status = "paid";
        order.providerChargeId = chargeId;
        order.paidAt = new Date();
        return { order, firstTime: true };
      },
      async markRefunded(oid) {
        const order = state.orders.get(oid);
        if (!order) throw new DomainError("not_found");
        order.status = "refunded";
        return order;
      },
      async expireStale() {
        return 0;
      },
      async listPendingOlderThan() {
        return [];
      },
      async listForUser(uid, limit) {
        return [...state.orders.values()].filter((o) => o.userId === uid).slice(0, limit);
      },
      async markFulfilled(oid) {
        const order = state.orders.get(oid);
        if (!order) throw new DomainError("not_found");
        order.status = "fulfilled";
        return order;
      },
    },
    referrals: {
      async onFirstPurchase() {},
      async stats(uid) {
        const invited = [...state.users.values()].filter((u) => u.referredByUserId === uid).length;
        return { invited, converted: 0, creditsEarned: 0 };
      },
    },
    tickets: {
      async open(uid, subject, firstMessage) {
        const now = new Date();
        const ticket: Ticket = { id: id("tk"), userId: uid, status: "open", subject, createdAt: now, updatedAt: now };
        state.tickets.set(ticket.id, {
          ticket,
          messages: [{ id: id("tm"), ticketId: ticket.id, from: "user", text: firstMessage, createdAt: now }],
        });
        return ticket;
      },
      async addMessage(tid, from, text) {
        const t = state.tickets.get(tid);
        if (!t) throw new DomainError("not_found");
        const m: TicketMessage = { id: id("tm"), ticketId: tid, from, text, createdAt: new Date() };
        t.messages.push(m);
        return m;
      },
      async setStatus(tid, status) {
        const t = state.tickets.get(tid);
        if (t) t.ticket.status = status;
      },
      async get(tid) {
        return state.tickets.get(tid) ?? null;
      },
      async activeForUser(uid) {
        return (
          [...state.tickets.values()].find((t) => t.ticket.userId === uid && t.ticket.status !== "closed")
            ?.ticket ?? null
        );
      },
      async listOpen(limit) {
        return [...state.tickets.values()]
          .filter((t) => t.ticket.status !== "closed")
          .slice(0, limit)
          .map((t) => t.ticket);
      },
    },
    analytics: {
      async track(event, userId, props) {
        state.events.push({ event, userId, ...(props ? { props } : {}) });
      },
      async dailyStats(date): Promise<DailyStats> {
        return {
          date: date.toISOString().slice(0, 10),
          newUsers: 3,
          activeUsers: 10,
          searches: 20,
          zeroResultSearches: 2,
          ordersPaid: 1,
          revenueToman: 149000,
          revenueStars: 250,
          openTickets: 1,
          topQueries: [{ query: "کپشن", count: 5 }],
          zeroResultQueries: [{ query: "ویدیو", count: 2 }],
        };
      },
    },
    settings: {
      async get<T>(key: string, fallback: T): Promise<T> {
        return state.settings.has(key) ? (state.settings.get(key) as T) : fallback;
      },
      async set<T>(key: string, value: T) {
        state.settings.set(key, value);
      },
    },
    intel: {
      async saveSignals() {
        return 0;
      },
      async recentSignals() {
        return [];
      },
      async upsertTopic() {
        throw new Error("not used");
      },
      async topTopics() {
        return [];
      },
      async setTopicStatus() {},
      async saveDraft() {
        return id("draft");
      },
      async reviewQueue(limit) {
        return state.reviewQueue.slice(0, limit);
      },
      async resolveDraft(did) {
        const i = state.reviewQueue.findIndex((d) => d.id === did);
        if (i < 0) return null;
        const [d] = state.reviewQueue.splice(i, 1);
        return d?.draft ?? null;
      },
    },
  };
  return { services, state };
}

export type FakeAi = AssistantAgents & {
  calls: { method: string; args: unknown[] }[];
  conciergeResult: ConciergeResult | Error;
  supportResult: { answer: string; escalate: boolean } | Error;
  moderationAllowed: boolean;
  runError: Error | null;
};

export function createFakeAi(): FakeAi {
  const ai: FakeAi = {
    calls: [],
    conciergeResult: { intent: "search", query: null, locale: "fa", reply: null },
    supportResult: { answer: "پاسخ هوشمند", escalate: false },
    moderationAllowed: true,
    runError: null,
    async concierge(text, locale) {
      ai.calls.push({ method: "concierge", args: [text, locale] });
      if (ai.conciergeResult instanceof Error) throw ai.conciergeResult;
      return ai.conciergeResult;
    },
    async buildPrompt(idea, locale) {
      ai.calls.push({ method: "buildPrompt", args: [idea, locale] });
      return {
        title: "پرامپت ساخته‌شده",
        prompt: `You are an expert. Task: ${idea}. Audience: {{audience}}`,
        variables: ["audience"],
        tips: ["مخاطب را دقیق مشخص کنید"],
      };
    },
    async runPrompt(prompt, locale) {
      ai.calls.push({ method: "runPrompt", args: [prompt, locale] });
      if (ai.runError) throw ai.runError;
      return { text: "AI-RUN-OUTPUT", provider: "fake", model: "fake-1", inputTokens: 1, outputTokens: 1, costUsd: 0 };
    },
    async support(input) {
      ai.calls.push({ method: "support", args: [input] });
      if (ai.supportResult instanceof Error) throw ai.supportResult;
      return ai.supportResult;
    },
    async moderate(text) {
      ai.calls.push({ method: "moderate", args: [text] });
      return { allowed: ai.moderationAllowed, category: ai.moderationAllowed ? null : "unsafe" };
    },
    async writeChannelPost() {
      return "";
    },
    async writeDailyReport() {
      return "";
    },
  };
  return ai;
}

/** Fake PaymentService mirroring @rasa/payments semantics (XTR on Telegram, IRR on Bale). */
export function createFakePayments(
  services: Required<BotServices>,
  opts: { baleToken?: string } = {},
): PaymentService & { isAvailable(p: Platform): boolean } {
  const baleToken = opts.baleToken ?? "wallet-token";
  return {
    isAvailable: (p) => p === "telegram" || baleToken !== "",
    async createInvoice({ user, platform, items }) {
      const currency = platform === "telegram" ? "XTR" : "IRR";
      const quoted = await Promise.all(
        items.map((i) => services.products.quote(i.kind, i.refId, currency, user.locale)),
      );
      const order = await services.orders.create({
        userId: user.id,
        platform,
        provider: platform === "telegram" ? "telegram_stars" : "bale_wallet",
        currency,
        items: quoted,
      });
      const invoice: InvoiceSpec = {
        title: quoted[0]?.title ?? "order",
        description: `خرید ${quoted[0]?.title ?? ""}`,
        payload: order.id,
        currency,
        amount: order.total,
        providerToken: platform === "telegram" ? "" : baleToken,
      };
      return { order, invoice };
    },
    async validatePreCheckout(payload, currency, total) {
      const order = await services.orders.get(payload);
      if (!order || order.status !== "pending") return { ok: false, error: "order_not_found" };
      if (order.currency !== currency || order.total !== total) return { ok: false, error: "amount_mismatch" };
      return { ok: true };
    },
    async fulfill({ payload, chargeId, totalAmount }) {
      const res = await services.orders.markPaid(payload, chargeId, totalAmount);
      if (res.firstTime) {
        await services.entitlements.grantForOrder(res.order);
        for (const it of res.order.items) {
          const pack = PACKS.find((p) => p.id === it.refId);
          if (it.kind === "credit_pack" && pack) await services.credits.grant(res.order.userId, pack.credits, "pack");
        }
      }
      return res;
    },
    async refund(orderId) {
      return services.orders.markRefunded(orderId);
    },
    webCheckoutUrl(orderId) {
      return `https://rasa-prompt.ir/checkout/${orderId}`;
    },
  };
}

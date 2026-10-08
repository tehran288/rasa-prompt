import {
  type AnalyticsEvent,
  type AnalyticsService,
  type CreditPack,
  type CreditService,
  type DailyStats,
  DomainError,
  type EntitlementService,
  type Locale,
  type Logger,
  type Order,
  type OrderItem,
  type OrderService,
  type Plan,
  type Platform,
  type ProductService,
  type ReferralService,
  type User,
  type UserService,
} from "@rasa/shared";

/** In-memory fakes of the db services, just enough for payment tests. */
export function createFakes(clock: { now: Date }) {
  const usersById = new Map<string, User>();
  const ordersById = new Map<string, Order>();
  const balances = new Map<string, number>();
  const creditLog: { userId: string; delta: number; reason: string; refId?: string }[] = [];
  const grants: string[] = [];
  const revokes: string[] = [];
  const referralCalls: string[] = [];
  const events: { event: AnalyticsEvent; userId: string | null; props?: unknown }[] = [];
  let seq = 0;

  const plans: Plan[] = [
    {
      id: "plan-pro-m",
      code: "pro_monthly",
      title: "Pro monthly",
      monthlyCredits: 200,
      durationDays: 30,
      priceToman: 199_000,
      priceStars: 499,
    },
  ];
  const packs: CreditPack[] = [
    { id: "pack-100", title: "100 credits", credits: 100, priceToman: 49_000, priceStars: 99 },
  ];
  const prompts: Record<string, { title: string; toman: number; stars: number }> = {
    "p-1": { title: "پرامپت حرفه‌ای تولید محتوای اینستاگرام", toman: 49_000, stars: 99 },
    "p-2": { title: "Premium n8n automation agent", toman: 149_000, stars: 299 },
  };

  const users: UserService = {
    async upsert() {
      throw new Error("not used");
    },
    async getById(id) {
      return usersById.get(id) ?? null;
    },
    async getByPlatformId(platform, platformUserId) {
      for (const u of usersById.values())
        if (u.platform === platform && u.platformUserId === platformUserId) return u;
      return null;
    },
    async getByReferralCode() {
      return null;
    },
    async setLocale(id, locale) {
      const u = usersById.get(id);
      if (u) u.locale = locale;
    },
    async setBanned(id, banned) {
      const u = usersById.get(id);
      if (u) u.isBanned = banned;
    },
    isAdmin: (u) => u.isAdmin,
    async *iterateAudience() {},
    async count() {
      return usersById.size;
    },
  };

  const products: ProductService = {
    async listPlans() {
      return plans;
    },
    async listCreditPacks() {
      return packs;
    },
    async quote(kind, refId, currency): Promise<OrderItem> {
      const pick = (title: string, toman: number, stars: number): OrderItem => ({
        kind,
        refId,
        title,
        amount: currency === "XTR" ? stars : toman * 10,
      });
      if (kind === "plan") {
        const p = plans.find((x) => x.id === refId);
        if (p) return pick(p.title, p.priceToman, p.priceStars);
      } else if (kind === "credit_pack") {
        const p = packs.find((x) => x.id === refId);
        if (p) return pick(p.title, p.priceToman, p.priceStars);
      } else {
        const p = prompts[refId];
        if (p) return pick(p.title, p.toman, p.stars);
      }
      throw new DomainError("not_found");
    },
  };

  const orders: OrderService = {
    async create(input) {
      seq += 1;
      const order: Order = {
        id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
        ...input,
        total: input.items.reduce((s, i) => s + i.amount, 0),
        status: "pending",
        providerChargeId: null,
        createdAt: new Date(clock.now),
        paidAt: null,
      };
      ordersById.set(order.id, order);
      return { ...order };
    },
    async get(id) {
      const o = ordersById.get(id);
      return o ? { ...o } : null;
    },
    async markPaid(orderId, chargeId, paidAmount) {
      const o = ordersById.get(orderId);
      if (!o) throw new DomainError("not_found");
      if (o.providerChargeId === chargeId) return { order: { ...o }, firstTime: false };
      if (o.providerChargeId) throw new DomainError("invalid_state");
      if (paidAmount !== o.total) throw new DomainError("amount_mismatch");
      o.status = "paid";
      o.providerChargeId = chargeId;
      o.paidAt = new Date(clock.now);
      return { order: { ...o }, firstTime: true };
    },
    async markRefunded(orderId) {
      const o = ordersById.get(orderId);
      if (!o) throw new DomainError("not_found");
      o.status = "refunded";
      return { ...o };
    },
    async expireStale() {
      return 0;
    },
    async listPendingOlderThan() {
      return [];
    },
  };

  const entitlements: EntitlementService = {
    async canAccess() {
      return false;
    },
    async library(_u, _l: Locale) {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    },
    async activeSubscription() {
      return null;
    },
    async grantForOrder(order) {
      grants.push(order.id);
    },
    async revokeForOrder(order) {
      revokes.push(order.id);
    },
  };

  const credits: CreditService = {
    async balance(userId) {
      return balances.get(userId) ?? 0;
    },
    async grant(userId, amount, reason, refId) {
      const b = (balances.get(userId) ?? 0) + amount;
      balances.set(userId, b);
      creditLog.push({ userId, delta: amount, reason, refId });
      return b;
    },
    async spend(userId, amount, reason, refId) {
      const b = balances.get(userId) ?? 0;
      if (b < amount) throw new DomainError("insufficient_credits");
      balances.set(userId, b - amount);
      creditLog.push({ userId, delta: -amount, reason, refId });
      return b - amount;
    },
  };

  const referrals: ReferralService = {
    async onFirstPurchase(userId) {
      referralCalls.push(userId);
    },
    async stats() {
      return { invited: 0, converted: 0, creditsEarned: 0 };
    },
  };

  const analytics: AnalyticsService = {
    async track(event, userId, props) {
      events.push({ event, userId, props });
    },
    async dailyStats(): Promise<DailyStats> {
      throw new Error("not used");
    },
  };

  const noop = () => {};
  const logger = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
  } as unknown as Logger;

  function addUser(platform: Platform, platformUserId: string, patch: Partial<User> = {}): User {
    const u: User = {
      id: `user-${platform}-${platformUserId}`,
      platform,
      platformUserId,
      username: null,
      firstName: null,
      locale: "fa",
      referralCode: `ref${platformUserId}`,
      referredByUserId: null,
      isAdmin: false,
      isBanned: false,
      createdAt: new Date(clock.now),
      lastSeenAt: new Date(clock.now),
      ...patch,
    };
    usersById.set(u.id, u);
    return u;
  }

  return {
    services: { users, products, orders, entitlements, credits, referrals, analytics, logger },
    state: { ordersById, balances, creditLog, grants, revokes, referralCalls, events },
    addUser,
  };
}

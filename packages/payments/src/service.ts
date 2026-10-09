import {
  type AnalyticsService,
  type Config,
  type CreditService,
  DEFAULT_LOCALE,
  DomainError,
  type EntitlementService,
  type InvoiceSpec,
  type Locale,
  type Logger,
  type Order,
  type OrderItem,
  type OrderService,
  type PaymentProvider,
  type PaymentService,
  type Platform,
  type ProductService,
  type ReferralService,
  type UserService,
} from "@rasa/shared";
import { type MessageKey, t, truncate } from "./i18n";

/** Pending orders older than this are rejected at pre-checkout. */
export const ORDER_TTL_MINUTES = 30;
/** Telegram requires an answer to pre_checkout_query within 10 s; we give up a bit earlier. */
export const PRE_CHECKOUT_TIMEOUT_MS = 8_000;
export const INVOICE_TITLE_MAX = 32;
export const INVOICE_DESCRIPTION_MAX = 255;
export const INVOICE_PAYLOAD_MAX_BYTES = 128;

export type PaymentConfig = Pick<Config, "BALE_WALLET_PROVIDER_TOKEN" | "WEB_BASE_URL">;

export interface PaymentDeps {
  orders: OrderService;
  products: ProductService;
  entitlements: EntitlementService;
  credits: CreditService;
  referrals: ReferralService;
  users: UserService;
  analytics: AnalyticsService;
  logger: Logger;
  /**
   * Telegram `refundStarPayment`. Called with the payer's **Telegram user id**
   * (User.platformUserId, what the Bot API expects) and telegram_payment_charge_id.
   */
  refundStars?: (userId: string, chargeId: string) => Promise<void>;
  /** Clock override for tests. */
  now?: () => Date;
  /** Override of PRE_CHECKOUT_TIMEOUT_MS (tests). */
  preCheckoutTimeoutMs?: number;
}

export type RefundResult = Order & {
  /** "automatic" = money returned via the platform API; "manual" = ops must return it. */
  refundMode: "automatic" | "manual";
  /** Operator note (manual refunds), null otherwise. */
  note: string | null;
  /** Credits removed from the user's balance as part of the refund. */
  creditsClawedBack: number;
};

export interface RasaPaymentService extends PaymentService {
  refund(orderId: string): Promise<RefundResult>;
  /** Whether in-messenger payment is available on the platform (Bale needs a wallet token). */
  isAvailable(platform: Platform): boolean;
}

const CURRENCY: Record<Platform, "XTR" | "IRR"> = { telegram: "XTR", bale: "IRR" };
const PROVIDER: Record<Platform, PaymentProvider> = {
  telegram: "telegram_stars",
  bale: "bale_wallet",
};

export function createPaymentService(config: PaymentConfig, deps: PaymentDeps): RasaPaymentService {
  const { orders, products, entitlements, credits, referrals, users, analytics, logger } = deps;
  const now = deps.now ?? (() => new Date());
  const baleToken = config.BALE_WALLET_PROVIDER_TOKEN.trim();

  const isAvailable = (platform: Platform) => platform === "telegram" || baleToken !== "";

  function providerToken(platform: Platform): string {
    return platform === "telegram" ? "" : baleToken;
  }

  function buildInvoiceText(
    items: OrderItem[],
    locale: Locale,
  ): { title: string; description: string } {
    const first = items[0];
    if (items.length === 1 && first) {
      return {
        title: truncate(first.title, INVOICE_TITLE_MAX),
        description: truncate(
          `${t("invoiceDescPrefix", locale)} — ${first.title}`,
          INVOICE_DESCRIPTION_MAX,
        ),
      };
    }
    const sep = locale === "en" ? ", " : "، ";
    const list = items.map((i) => i.title).join(sep);
    return {
      title: truncate(t("invoiceTitleMulti", locale), INVOICE_TITLE_MAX),
      description: truncate(
        `${t("itemsCount", locale, { n: items.length })}: ${list}`,
        INVOICE_DESCRIPTION_MAX,
      ),
    };
  }

  /** Credits granted when this order is fulfilled (plans: first month; packs: pack size). */
  async function creditsForOrder(order: Order, locale: Locale): Promise<number> {
    const planIds = order.items.filter((i) => i.kind === "plan").map((i) => i.refId);
    const packIds = order.items.filter((i) => i.kind === "credit_pack").map((i) => i.refId);
    let total = 0;
    if (planIds.length) {
      const plans = await products.listPlans(locale);
      for (const id of planIds) total += plans.find((p) => p.id === id)?.monthlyCredits ?? 0;
    }
    if (packIds.length) {
      const packs = await products.listCreditPacks(locale);
      for (const id of packIds) total += packs.find((p) => p.id === id)?.credits ?? 0;
    }
    return total;
  }

  function isExpired(order: Order): boolean {
    if (order.status === "expired") return true;
    return now().getTime() - order.createdAt.getTime() > ORDER_TTL_MINUTES * 60_000;
  }

  async function localeOf(userId: string): Promise<Locale> {
    try {
      return (await users.getById(userId))?.locale ?? DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }

  async function preCheckoutCore(
    payload: string,
    currency: string,
    totalAmount: number,
    platformUserId: string,
  ): Promise<{ ok: true } | { ok: false; error: string; reason: string; locale: Locale }> {
    const fail = (key: MessageKey, locale: Locale, reason: string) => ({
      ok: false as const,
      error: t(key, locale),
      reason,
      locale,
    });
    const order = payload ? await orders.get(payload) : null;
    if (!order) return fail("errNotFound", DEFAULT_LOCALE, "order_not_found");

    const payer = await users.getByPlatformId(order.platform, platformUserId);
    const locale = payer?.locale ?? (await localeOf(order.userId));
    if (!payer || payer.id !== order.userId) return fail("errUser", locale, "wrong_user");
    if (payer.isBanned) return fail("errBanned", locale, "banned");
    if (isExpired(order)) return fail("errExpired", locale, "expired");
    if (order.status !== "pending") return fail("errState", locale, `status_${order.status}`);
    if (currency !== order.currency || totalAmount !== order.total) {
      return fail("errAmount", locale, "amount_mismatch");
    }
    return { ok: true };
  }

  return {
    isAvailable,

    async createInvoice({ user, platform, items }) {
      if (user.isBanned) throw new DomainError("banned");
      if (user.platform !== platform) {
        throw new DomainError("forbidden", "user does not belong to this platform");
      }
      if (!isAvailable(platform)) {
        throw new DomainError(
          "invalid_state",
          `in-messenger payment not configured for ${platform}; use webCheckoutUrl`,
        );
      }
      if (items.length === 0) throw new DomainError("invalid_state", "no items");

      const currency = CURRENCY[platform];
      const quoted: OrderItem[] = [];
      for (const item of items) {
        const q = await products.quote(item.kind, item.refId, currency, user.locale);
        if (!Number.isInteger(q.amount) || q.amount <= 0) {
          throw new DomainError("invalid_state", `item ${item.kind}:${item.refId} has no price`);
        }
        quoted.push(q);
      }

      const order = await orders.create({
        userId: user.id,
        platform,
        provider: PROVIDER[platform],
        currency,
        items: quoted,
      });
      if (Buffer.byteLength(order.id, "utf8") > INVOICE_PAYLOAD_MAX_BYTES) {
        throw new DomainError("invalid_state", "order id too long for invoice payload");
      }

      const { title, description } = buildInvoiceText(quoted, user.locale);
      const invoice: InvoiceSpec = {
        title,
        description,
        payload: order.id,
        currency,
        amount: order.total,
        providerToken: providerToken(platform),
      };

      await analytics
        .track("checkout_started", user.id, {
          orderId: order.id,
          platform,
          currency,
          total: order.total,
          kinds: quoted.map((q) => q.kind),
        })
        .catch((err) => logger.warn({ err }, "analytics checkout_started failed"));

      return { order, invoice };
    },

    async validatePreCheckout(payload, currency, totalAmount, platformUserId) {
      const timeoutMs = deps.preCheckoutTimeoutMs ?? PRE_CHECKOUT_TIMEOUT_MS;
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
      });
      try {
        const res = await Promise.race([
          preCheckoutCore(payload, currency, totalAmount, platformUserId),
          timeout,
        ]);
        if (res === "timeout") {
          logger.error({ orderId: payload }, "pre-checkout validation timed out");
          return { ok: false, error: t("errGeneric", DEFAULT_LOCALE) };
        }
        if (!res.ok) {
          logger.info({ orderId: payload, reason: res.reason }, "pre-checkout rejected");
          return { ok: false, error: res.error };
        }
        return { ok: true };
      } catch (err) {
        logger.error({ err, orderId: payload }, "pre-checkout validation failed");
        return { ok: false, error: t("errGeneric", DEFAULT_LOCALE) };
      } finally {
        clearTimeout(timer);
      }
    },

    async fulfill({ payload, chargeId, currency, totalAmount }) {
      const existing = await orders.get(payload);
      if (!existing) {
        logger.error({ orderId: payload, chargeId }, "successful_payment for unknown order");
        await analytics
          .track("payment_failed", null, { orderId: payload, chargeId, reason: "order_not_found" })
          .catch(() => {});
        throw new DomainError("not_found", `order ${payload} not found`);
      }
      if (currency !== existing.currency || totalAmount !== existing.total) {
        logger.error(
          {
            orderId: existing.id,
            chargeId,
            expected: { currency: existing.currency, total: existing.total },
            got: { currency, totalAmount },
          },
          "successful_payment amount mismatch — needs manual review",
        );
        await analytics
          .track("payment_failed", existing.userId, {
            orderId: existing.id,
            chargeId,
            reason: "amount_mismatch",
            currency,
            totalAmount,
          })
          .catch(() => {});
        throw new DomainError("amount_mismatch");
      }

      const paid = await orders.markPaid(existing.id, chargeId, totalAmount);
      const order = paid.order;
      // A retry of an order left in "paid" (grant failed last time) resumes fulfillment;
      // anything already fulfilled is a true duplicate.
      if (!paid.firstTime && order.status !== "paid") {
        logger.info({ orderId: order.id, chargeId }, "duplicate successful_payment ignored");
        return { order, firstTime: false };
      }
      if (!paid.firstTime) logger.warn({ orderId: order.id }, "resuming interrupted fulfillment");
      const firstTime = true;

      await entitlements.grantForOrder(order);
      const locale = await localeOf(order.userId);
      const credit = await creditsForOrder(order, locale);
      if (credit > 0) await credits.grant(order.userId, credit, "purchase", order.id);
      try {
        await referrals.onFirstPurchase(order.userId);
      } catch (err) {
        logger.warn({ err, orderId: order.id }, "referral reward failed");
      }
      await analytics
        .track("payment_succeeded", order.userId, {
          orderId: order.id,
          provider: order.provider,
          currency: order.currency,
          total: order.total,
          kinds: order.items.map((i) => i.kind),
          credits: credit,
        })
        .catch((err) => logger.warn({ err }, "analytics payment_succeeded failed"));
      const fulfilled = await orders.markFulfilled(order.id);
      logger.info({ orderId: order.id, provider: order.provider }, "order fulfilled");
      return { order: fulfilled, firstTime };
    },

    async refund(orderId) {
      const order = await orders.get(orderId);
      if (!order) throw new DomainError("not_found", `order ${orderId} not found`);
      const manual = order.provider !== "telegram_stars";
      if (order.status === "refunded") {
        return {
          ...order,
          refundMode: manual ? "manual" : "automatic",
          note: null,
          creditsClawedBack: 0,
        };
      }
      if (order.status !== "paid" && order.status !== "fulfilled") {
        throw new DomainError("invalid_state", `cannot refund order in status ${order.status}`);
      }

      const user = await users.getById(order.userId);
      if (!manual) {
        if (!deps.refundStars) {
          throw new DomainError("invalid_state", "refundStars dependency not provided");
        }
        if (!order.providerChargeId || !user) {
          throw new DomainError("invalid_state", "missing charge id or user for Stars refund");
        }
        await deps.refundStars(user.platformUserId, order.providerChargeId);
      }

      const refunded = await orders.markRefunded(order.id);
      await entitlements.revokeForOrder(refunded);

      const granted = await creditsForOrder(refunded, user?.locale ?? DEFAULT_LOCALE);
      let clawed = 0;
      if (granted > 0) {
        const balance = await credits.balance(refunded.userId);
        clawed = Math.max(0, Math.min(granted, balance));
        if (clawed > 0) await credits.spend(refunded.userId, clawed, "refund_clawback", order.id);
      }

      const note = manual ? t("manualRefundNote", "en") : null;
      logger.warn(
        {
          orderId: order.id,
          provider: order.provider,
          total: order.total,
          currency: order.currency,
          creditsClawedBack: clawed,
          manual,
        },
        manual ? "order refunded — MANUAL money return required" : "order refunded via Stars",
      );
      return {
        ...refunded,
        refundMode: manual ? "manual" : "automatic",
        note,
        creditsClawedBack: clawed,
      };
    },

    webCheckoutUrl(orderId) {
      const base = config.WEB_BASE_URL.replace(/\/+$/, "");
      return `${base}/checkout/${encodeURIComponent(orderId)}`;
    },
  };
}

/** Exposed for the bot: localized "manual refund" note for admins. */
export function manualRefundNote(locale: Locale): string {
  return t("manualRefundNote", locale);
}

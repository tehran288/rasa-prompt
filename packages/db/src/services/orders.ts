import { DomainError, type Order, type OrderService } from "@rasa/shared";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import type { Db } from "../db";
import { orders } from "../schema";
import { isUniqueViolation, isUuid } from "../util";

type OrderRow = typeof orders.$inferSelect;

export function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    userId: r.userId,
    platform: r.platform,
    provider: r.provider,
    currency: r.currency,
    items: r.items,
    total: r.total,
    status: r.status,
    providerChargeId: r.providerChargeId,
    createdAt: r.createdAt,
    paidAt: r.paidAt,
  };
}

const minutesAgo = (m: number) => sql`now() - make_interval(mins => ${Math.max(0, Math.floor(m))})`;

export function createOrderService(db: Db): OrderService {
  return {
    async create(input) {
      if (input.items.length === 0) throw new DomainError("invalid_state", "empty order");
      for (const it of input.items) {
        if (!Number.isInteger(it.amount) || it.amount < 0) {
          throw new DomainError("invalid_state", "invalid item amount");
        }
      }
      const total = input.items.reduce((s, it) => s + it.amount, 0);
      const [r] = await db
        .insert(orders)
        .values({ ...input, total, status: "pending" })
        .returning();
      return toOrder(r as OrderRow);
    },

    async get(id) {
      if (!isUuid(id)) return null;
      const [r] = await db.select().from(orders).where(eq(orders.id, id));
      return r ? toOrder(r) : null;
    },

    async markPaid(orderId, providerChargeId, paidAmount) {
      if (!isUuid(orderId)) throw new DomainError("not_found", "order");
      try {
        return await db.transaction(async (tx) => {
          const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
          if (!o) throw new DomainError("not_found", "order");
          if (o.status === "paid" || o.status === "fulfilled" || o.status === "refunded") {
            if (o.providerChargeId === providerChargeId) return { order: toOrder(o), firstTime: false };
            throw new DomainError("invalid_state", `order already ${o.status} with another charge`);
          }
          // pending, or expired/cancelled but the provider still charged the user → accept.
          if (paidAmount !== o.total) {
            throw new DomainError("amount_mismatch", `paid ${paidAmount} != total ${o.total}`);
          }
          const [u] = await tx
            .update(orders)
            .set({ status: "paid", providerChargeId, paidAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
          return { order: toOrder(u as OrderRow), firstTime: true };
        });
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new DomainError("invalid_state", "charge id already used by another order");
        }
        throw e;
      }
    },

    async markRefunded(orderId) {
      if (!isUuid(orderId)) throw new DomainError("not_found", "order");
      return db.transaction(async (tx) => {
        const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
        if (!o) throw new DomainError("not_found", "order");
        if (o.status === "refunded") return toOrder(o);
        if (o.status !== "paid" && o.status !== "fulfilled") {
          throw new DomainError("invalid_state", `cannot refund a ${o.status} order`);
        }
        const [u] = await tx
          .update(orders)
          .set({ status: "refunded", refundedAt: new Date() })
          .where(eq(orders.id, orderId))
          .returning();
        return toOrder(u as OrderRow);
      });
    },

    async expireStale(olderThanMinutes) {
      const rows = await db
        .update(orders)
        .set({ status: "expired" })
        .where(and(eq(orders.status, "pending"), lt(orders.createdAt, minutesAgo(olderThanMinutes))))
        .returning({ id: orders.id });
      return rows.length;
    },

    async listPendingOlderThan(minutes) {
      const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.status, "pending"), lt(orders.createdAt, minutesAgo(minutes))))
        .orderBy(asc(orders.createdAt))
        .limit(500);
      return rows.map(toOrder);
    },
  };
}

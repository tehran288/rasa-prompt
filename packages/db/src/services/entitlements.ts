import { DomainError, type EntitlementService, type Order } from "@rasa/shared";
import { and, desc, eq, gt, isNull, or, type SQL, sql } from "drizzle-orm";
import type { Db } from "../db";
import { bundlePrompts, entitlements, orders, plans, prompts } from "../schema";
import { clampPage, isUuid, toSummary } from "../util";
import { findPlan, toPlan } from "./products";

const DAY_MS = 86_400_000;

function active(userId: string): SQL {
  return and(
    eq(entitlements.userId, userId),
    isNull(entitlements.revokedAt),
    or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, sql`now()`)),
  ) as SQL;
}

/** Prompt ids the user owns explicitly (prompt or bundle entitlements). */
function ownedPromptIds(userId: string): SQL {
  return sql`(
    select ${entitlements.refId} from ${entitlements}
      where ${active(userId)} and ${entitlements.kind} = 'prompt'
    union
    select ${bundlePrompts.promptId} from ${bundlePrompts}
      join ${entitlements} on ${entitlements.refId} = ${bundlePrompts.bundleId}
      where ${active(userId)} and ${entitlements.kind} = 'bundle'
  )`;
}

export function createEntitlementService(db: Db): EntitlementService {
  return {
    async canAccess(userId, promptId) {
      if (!isUuid(promptId) || !isUuid(userId)) return false;
      const [p] = await db
        .select({ tier: prompts.tier })
        .from(prompts)
        .where(eq(prompts.id, promptId));
      if (!p) return false;
      if (p.tier === "free") return true;
      const [r] = await db
        .select({ ok: sql<boolean>`true` })
        .from(entitlements)
        .where(
          and(
            active(userId),
            or(
              and(eq(entitlements.kind, "prompt"), eq(entitlements.refId, promptId)),
              and(
                eq(entitlements.kind, "bundle"),
                sql`${entitlements.refId} in (select ${bundlePrompts.bundleId} from ${bundlePrompts} where ${bundlePrompts.promptId} = ${promptId})`,
              ),
              eq(entitlements.kind, "all_premium"),
              p.tier === "pro" ? eq(entitlements.kind, "all_pro") : sql`false`,
            ),
          ),
        )
        .limit(1);
      return Boolean(r?.ok);
    },

    async library(userId, locale, page) {
      const { page: p, pageSize } = clampPage(page, 10);
      const where = sql`${prompts.id} in ${ownedPromptIds(userId)}`;
      const [c] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(prompts)
        .where(where);
      const rows = await db
        .select()
        .from(prompts)
        .where(where)
        .orderBy(desc(prompts.qualityScore), prompts.id)
        .limit(pageSize)
        .offset((p - 1) * pageSize);
      return { items: rows.map((r) => toSummary(r, locale)), total: c?.n ?? 0, page: p, pageSize };
    },

    async activeSubscription(userId) {
      const [r] = await db
        .select({ plan: plans, expiresAt: entitlements.expiresAt })
        .from(entitlements)
        .innerJoin(plans, eq(plans.id, entitlements.planId))
        .where(and(active(userId), eq(entitlements.kind, "all_pro")))
        .orderBy(sql`${entitlements.expiresAt} desc nulls first`)
        .limit(1);
      return r ? { plan: toPlan(r.plan, "fa"), expiresAt: r.expiresAt } : null;
    },

    async grantForOrder(order: Order) {
      await db.transaction(async (tx) => {
        const [o] = await tx.select().from(orders).where(eq(orders.id, order.id)).for("update");
        if (!o) throw new DomainError("not_found", "order");
        if (o.status !== "paid" && o.status !== "fulfilled") {
          throw new DomainError("invalid_state", `order is ${o.status}`);
        }
        const base = { userId: o.userId, orderId: o.id, source: "order" } as const;
        for (const item of o.items) {
          switch (item.kind) {
            case "prompt":
            case "bundle":
              await tx
                .insert(entitlements)
                .values({ ...base, kind: item.kind, refId: item.refId })
                .onConflictDoNothing();
              break;
            case "plan": {
              const plan = await findPlan(tx, item.refId);
              if (!plan) throw new DomainError("not_found", "plan");
              let expiresAt: Date | null = null;
              if (plan.durationDays != null) {
                // Stack on top of the current subscription if it is still running.
                const [cur] = await tx
                  .select({ e: sql<Date | null>`max(${entitlements.expiresAt})` })
                  .from(entitlements)
                  .where(
                    and(
                      active(o.userId),
                      eq(entitlements.kind, "all_pro"),
                      sql`${entitlements.orderId} is distinct from ${o.id}`,
                    ),
                  );
                const curEnd = cur?.e ? new Date(cur.e).getTime() : 0;
                const start = Math.max(Date.now(), curEnd);
                expiresAt = new Date(start + plan.durationDays * DAY_MS);
              }
              const ent = { ...base, refId: plan.id, planId: plan.id, expiresAt };
              await tx
                .insert(entitlements)
                .values({ ...ent, kind: "all_pro" })
                .onConflictDoNothing();
              if (plan.includesPremium) {
                await tx
                  .insert(entitlements)
                  .values({ ...ent, kind: "all_premium" })
                  .onConflictDoNothing();
              }
              break;
            }
            case "credit_pack":
              // Credits are granted by the payments package (CreditService.grant), not here.
              break;
          }
        }
      });
    },

    /** Revokes access granted by the order. Credits are clawed back by the payments package. */
    async revokeForOrder(order: Order) {
      await db
        .update(entitlements)
        .set({ revokedAt: new Date() })
        .where(and(eq(entitlements.orderId, order.id), isNull(entitlements.revokedAt)));
    },
  };
}

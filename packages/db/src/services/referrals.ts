import type { ReferralService } from "@rasa/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db";
import { orders, referrals } from "../schema";
import { grantTx } from "./credits";

export function createReferralService(db: Db, rewardCredits = 50): ReferralService {
  return {
    async onFirstPurchase(userId) {
      await db.transaction(async (tx) => {
        const [ref] = await tx
          .select()
          .from(referrals)
          .where(and(eq(referrals.referredUserId, userId), isNull(referrals.rewardedAt)))
          .for("update");
        if (!ref) return; // not referred, or already rewarded
        const [paid] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(orders)
          .where(and(eq(orders.userId, userId), sql`${orders.status} in ('paid','fulfilled')`));
        if (!paid?.n) return;
        await tx
          .update(referrals)
          .set({ rewardedAt: new Date(), rewardCredits })
          .where(eq(referrals.id, ref.id));
        if (rewardCredits > 0) {
          await grantTx(tx, ref.referrerUserId, rewardCredits, "referral", ref.id);
          await grantTx(tx, ref.referredUserId, rewardCredits, "referral", ref.id);
        }
      });
    },

    async stats(userId) {
      const [r] = await db
        .select({
          invited: sql<number>`count(*)::int`,
          converted: sql<number>`count(${referrals.rewardedAt})::int`,
          earned: sql<number>`coalesce(sum(${referrals.rewardCredits}), 0)::int`,
        })
        .from(referrals)
        .where(eq(referrals.referrerUserId, userId));
      return { invited: r?.invited ?? 0, converted: r?.converted ?? 0, creditsEarned: r?.earned ?? 0 };
    },
  };
}

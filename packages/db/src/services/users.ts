import type { Platform, User, UserService } from "@rasa/shared";
import { and, asc, eq, gt, type SQL, sql } from "drizzle-orm";
import type { Db } from "../db";
import { entitlements, orders, referrals, users } from "../schema";
import { generateReferralCode, guessLocale, isUniqueViolation } from "../util";

type UserRow = typeof users.$inferSelect;

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    platform: r.platform,
    platformUserId: r.platformUserId,
    username: r.username,
    firstName: r.firstName,
    locale: r.locale,
    referralCode: r.referralCode,
    referredByUserId: r.referredByUserId,
    isAdmin: r.isAdmin,
    isBanned: r.isBanned,
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt,
  };
}

export interface UserServiceOptions {
  /** Platform user ids that are admins (from env TELEGRAM_ADMIN_IDS / BALE_ADMIN_IDS). */
  adminIds?: Partial<Record<Platform, string[]>>;
}

const PAID = sql`('paid','fulfilled')`;

export function createUserService(db: Db, opts: UserServiceOptions = {}): UserService {
  async function one(where: SQL): Promise<User | null> {
    const [r] = await db.select().from(users).where(where).limit(1);
    return r ? toUser(r) : null;
  }

  function audienceWhere(filter: {
    platform?: Platform;
    locale?: User["locale"];
    segment?: "all" | "buyers" | "non_buyers" | "subscribers";
  }): SQL[] {
    const w: SQL[] = [eq(users.isBanned, false)];
    if (filter.platform) w.push(eq(users.platform, filter.platform));
    if (filter.locale) w.push(eq(users.locale, filter.locale));
    const buyer = sql`exists (select 1 from ${orders} where ${orders.userId} = ${users.id} and ${orders.status} in ${PAID})`;
    switch (filter.segment) {
      case "buyers":
        w.push(buyer);
        break;
      case "non_buyers":
        w.push(sql`not ${buyer}`);
        break;
      case "subscribers":
        w.push(
          sql`exists (select 1 from ${entitlements} where ${entitlements.userId} = ${users.id}
            and ${entitlements.kind} = 'all_pro' and ${entitlements.revokedAt} is null
            and (${entitlements.expiresAt} is null or ${entitlements.expiresAt} > now()))`,
        );
        break;
      default:
        break;
    }
    return w;
  }

  return {
    async upsert(profile, referralCode) {
      const existing = await one(
        and(
          eq(users.platform, profile.platform),
          eq(users.platformUserId, profile.platformUserId),
        ) as SQL,
      );
      if (existing) {
        const [r] = await db
          .update(users)
          .set({
            lastSeenAt: new Date(),
            username: profile.username,
            firstName: profile.firstName,
          })
          .where(eq(users.id, existing.id))
          .returning();
        return { user: toUser(r as UserRow), created: false };
      }

      let referrerId: string | null = null;
      if (referralCode) {
        const ref = await one(eq(users.referralCode, referralCode.trim().toUpperCase()));
        if (ref) referrerId = ref.id;
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const [r] = await db
            .insert(users)
            .values({
              platform: profile.platform,
              platformUserId: profile.platformUserId,
              username: profile.username,
              firstName: profile.firstName,
              locale: guessLocale(profile.languageCode),
              referralCode: generateReferralCode(),
              referredByUserId: referrerId,
            })
            .onConflictDoNothing({ target: [users.platform, users.platformUserId] })
            .returning();
          if (!r) {
            // Lost a race with a concurrent first update for the same user.
            const again = await one(
              and(
                eq(users.platform, profile.platform),
                eq(users.platformUserId, profile.platformUserId),
              ) as SQL,
            );
            if (!again) throw new Error("user upsert race");
            return { user: again, created: false };
          }
          if (referrerId) {
            await db
              .insert(referrals)
              .values({ referrerUserId: referrerId, referredUserId: r.id })
              .onConflictDoNothing();
          }
          return { user: toUser(r), created: true };
        } catch (e) {
          // Referral code collision (unique) → retry with a new code.
          if (isUniqueViolation(e, "users_referral_code_unique")) continue;
          throw e;
        }
      }
      throw new Error("could not allocate a unique referral code");
    },

    getById: (id) => one(eq(users.id, id)),
    getByPlatformId: (platform, platformUserId) =>
      one(and(eq(users.platform, platform), eq(users.platformUserId, platformUserId)) as SQL),
    getByReferralCode: (code) => one(eq(users.referralCode, code.trim().toUpperCase())),

    async setLocale(userId, locale) {
      await db.update(users).set({ locale }).where(eq(users.id, userId));
    },

    async setBanned(userId, banned) {
      await db.update(users).set({ isBanned: banned }).where(eq(users.id, userId));
    },

    isAdmin(user) {
      return user.isAdmin || (opts.adminIds?.[user.platform] ?? []).includes(user.platformUserId);
    },

    async *iterateAudience(filter, batchSize) {
      const size = Math.max(1, Math.floor(batchSize));
      const base = audienceWhere(filter);
      let cursor: string | null = null;
      while (true) {
        const where: SQL[] = cursor ? [...base, gt(users.id, cursor)] : base;
        const rows: UserRow[] = await db
          .select()
          .from(users)
          .where(and(...where))
          .orderBy(asc(users.id))
          .limit(size);
        if (rows.length === 0) return;
        yield rows.map(toUser);
        if (rows.length < size) return;
        cursor = rows[rows.length - 1]?.id ?? null;
      }
    },

    async count(filter) {
      const w: SQL[] = [];
      if (filter?.platform) w.push(eq(users.platform, filter.platform));
      if (filter?.locale) w.push(eq(users.locale, filter.locale));
      const [r] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(w.length ? and(...w) : undefined);
      return r?.n ?? 0;
    },
  };
}

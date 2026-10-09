import type { AnalyticsService, DailyStats } from "@rasa/shared";
import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { Db } from "../db";
import { analyticsEvents, orders, searchLogs, tickets, users } from "../schema";
import { isUuid } from "../util";

function utcDay(date: Date): { start: Date; end: Date; key: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return {
    start,
    end: new Date(start.getTime() + 86_400_000),
    key: start.toISOString().slice(0, 10),
  };
}

export function createAnalyticsService(db: Db): AnalyticsService {
  return {
    async track(event, userId, props) {
      await db.insert(analyticsEvents).values({
        event,
        userId: userId && isUuid(userId) ? userId : null,
        props: props ?? {},
      });
    },

    async dailyStats(date): Promise<DailyStats> {
      const { start, end, key } = utcDay(date);
      const inDay = (col: PgColumn) => and(gte(col, start), lt(col, end));

      const [newUsers] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(inDay(users.createdAt));

      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const [active] = await db.execute<{ n: number }>(sql`
        select count(*)::int as n from (
          select ${analyticsEvents.userId} as u from ${analyticsEvents}
            where ${analyticsEvents.createdAt} >= ${startIso}::timestamptz and ${analyticsEvents.createdAt} < ${endIso}::timestamptz
              and ${analyticsEvents.userId} is not null
          union
          select ${searchLogs.userId} from ${searchLogs}
            where ${searchLogs.createdAt} >= ${startIso}::timestamptz and ${searchLogs.createdAt} < ${endIso}::timestamptz
              and ${searchLogs.userId} is not null
          union
          select ${users.id} from ${users}
            where ${users.lastSeenAt} >= ${startIso}::timestamptz and ${users.lastSeenAt} < ${endIso}::timestamptz
        ) a`);

      const [s] = await db
        .select({
          searches: sql<number>`count(*)::int`,
          zero: sql<number>`count(*) filter (where ${searchLogs.resultsCount} = 0)::int`,
        })
        .from(searchLogs)
        .where(inDay(searchLogs.createdAt));

      const [o] = await db
        .select({
          paid: sql<number>`count(*)::int`,
          toman: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.currency} = 'IRR'), 0)::bigint / 10`,
          stars: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.currency} = 'XTR'), 0)::bigint`,
        })
        .from(orders)
        .where(and(inDay(orders.paidAt), inArray(orders.status, ["paid", "fulfilled"])));

      const [t] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(tickets)
        .where(ne(tickets.status, "closed"));

      const topQ = (zeroOnly: boolean) =>
        db
          .select({
            query: searchLogs.normalizedQuery,
            count: sql<number>`count(*)::int`,
          })
          .from(searchLogs)
          .where(
            and(
              inDay(searchLogs.createdAt),
              ne(searchLogs.normalizedQuery, ""),
              zeroOnly ? eq(searchLogs.resultsCount, 0) : undefined,
            ),
          )
          .groupBy(searchLogs.normalizedQuery)
          .orderBy(desc(sql`count(*)`), searchLogs.normalizedQuery)
          .limit(10);

      return {
        date: key,
        newUsers: newUsers?.n ?? 0,
        activeUsers: Number(active?.n ?? 0),
        searches: s?.searches ?? 0,
        zeroResultSearches: s?.zero ?? 0,
        ordersPaid: o?.paid ?? 0,
        revenueToman: Number(o?.toman ?? 0),
        revenueStars: Number(o?.stars ?? 0),
        openTickets: t?.n ?? 0,
        topQueries: await topQ(false),
        zeroResultQueries: await topQ(true),
      };
    },
  };
}

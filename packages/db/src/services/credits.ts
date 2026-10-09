import { type CreditService, DomainError } from "@rasa/shared";
import { eq, sql } from "drizzle-orm";
import type { Db, Executor, Tx } from "../db";
import { creditLedger } from "../schema";

/** Serializes all ledger writes for one user for the rest of the transaction. */
export async function lockCredits(tx: Tx, userId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`credits:${userId}`}, 0))`);
}

export async function balanceOf(ex: Executor, userId: string): Promise<number> {
  const [r] = await ex
    .select({ n: sql<number>`coalesce(sum(${creditLedger.delta}), 0)::int` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return r?.n ?? 0;
}

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new DomainError("invalid_state", `credit amount must be a positive integer: ${amount}`);
  }
}

/**
 * Adds credits inside an open transaction. With a refId the grant is idempotent per
 * (user, reason, refId) — a repeated grant is a no-op that returns the current balance.
 */
export async function grantTx(
  tx: Tx,
  userId: string,
  amount: number,
  reason: string,
  refId?: string | null,
): Promise<number> {
  assertAmount(amount);
  await lockCredits(tx, userId);
  const current = await balanceOf(tx, userId);
  const inserted = await tx
    .insert(creditLedger)
    .values({ userId, delta: amount, reason, refId: refId ?? null, balanceAfter: current + amount })
    .onConflictDoNothing()
    .returning({ id: creditLedger.id });
  return inserted.length > 0 ? current + amount : current;
}

/** Removes credits inside an open transaction; never lets the balance go negative. */
export async function spendTx(
  tx: Tx,
  userId: string,
  amount: number,
  reason: string,
  refId?: string | null,
): Promise<number> {
  assertAmount(amount);
  await lockCredits(tx, userId);
  const current = await balanceOf(tx, userId);
  if (current < amount) {
    throw new DomainError("insufficient_credits", `balance ${current} < ${amount}`);
  }
  await tx.insert(creditLedger).values({
    userId,
    delta: -amount,
    reason,
    refId: refId ?? null,
    balanceAfter: current - amount,
  });
  return current - amount;
}

export function createCreditService(db: Db): CreditService {
  return {
    balance: (userId) => balanceOf(db, userId),
    grant: (userId, amount, reason, refId) =>
      db.transaction((tx) => grantTx(tx, userId, amount, reason, refId)),
    spend: (userId, amount, reason, refId) =>
      db.transaction((tx) => spendTx(tx, userId, amount, reason, refId)),
  };
}

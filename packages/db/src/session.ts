import { eq } from "drizzle-orm";
import type { Db } from "./db";
import { botSessions } from "./schema";

/** Structurally identical to grammY's `StorageAdapter<T>` (no grammy import needed here). */
export interface SessionStorageAdapter<T> {
  read(key: string): Promise<T | undefined>;
  write(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

/** grammY session storage backed by the bot_sessions table. Use a key prefix per platform. */
export function createSessionStorage<T>(db: Db, prefix = ""): SessionStorageAdapter<T> {
  const k = (key: string) => `${prefix}${key}`;
  return {
    async read(key) {
      const [r] = await db
        .select()
        .from(botSessions)
        .where(eq(botSessions.key, k(key)));
      return r ? (r.value as T) : undefined;
    },
    async write(key, value) {
      await db
        .insert(botSessions)
        .values({ key: k(key), value })
        .onConflictDoUpdate({ target: botSessions.key, set: { value, updatedAt: new Date() } });
    },
    async delete(key) {
      await db.delete(botSessions).where(eq(botSessions.key, k(key)));
    },
  };
}

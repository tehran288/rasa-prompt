import type { SettingsService } from "@rasa/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { settings } from "../schema";

export function createSettingsService(db: Db): SettingsService {
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const [r] = await db.select().from(settings).where(eq(settings.key, key));
      return r ? (r.value as T) : fallback;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    },
  };
}

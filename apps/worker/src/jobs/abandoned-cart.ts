/**
 * `abandoned-cart` — every 30 min.
 * 1. Orders pending > 60 min (and < 24 h) get exactly one localized reminder.
 *    Dedupe: settings key `cart_reminder:<orderId>` written after the attempt (also on 403, so a
 *    blocked user is not retried forever).
 * 2. `orders.expireStale(24h)` marks older pending orders as expired.
 * Safe to re-run any time.
 */
import type { Config, Logger, OrderService, SettingsService, UserService } from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import { msg } from "../i18n";
import { classifySendError, deepLink, sendWithRetry } from "../messenger";
import { errInfo } from "../util";

export interface AbandonedCartDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  orders: OrderService;
  users: UserService;
  settings: SettingsService;
}

export const REMIND_AFTER_MINUTES = 60;
export const EXPIRE_AFTER_MINUTES = 24 * 60;

export async function runAbandonedCart(deps: AbandonedCartDeps) {
  const log = deps.logger.child({ job: "abandoned-cart" });
  const pending = await deps.orders.listPendingOlderThan(REMIND_AFTER_MINUTES);
  const now = deps.clock.now().getTime();
  let reminded = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of pending) {
    const key = `cart_reminder:${order.id}`;
    try {
      if (now - order.createdAt.getTime() > EXPIRE_AFTER_MINUTES * 60_000) {
        skipped++;
        continue; // about to expire — don't nag
      }
      if (await deps.settings.get<string | null>(key, null)) {
        skipped++;
        continue;
      }
      const m = deps.messengers[order.platform];
      const user = await deps.users.getById(order.userId);
      if (!m || !user || user.isBanned) {
        skipped++;
        continue;
      }
      const items = order.items.map((i) => i.title).join("، ");
      const promptItem = order.items.find((i) => i.kind === "prompt");
      const buttons = promptItem
        ? [
            [
              {
                text: msg("cartButton", user.locale),
                url: deepLink(order.platform, await m.botUsername(), `p_${promptItem.refId}`),
              },
            ],
          ]
        : undefined;
      try {
        await sendWithRetry(
          m,
          deps.clock,
          user.platformUserId,
          msg("cartReminder", user.locale, { items }),
          { buttons },
        );
        reminded++;
      } catch (err) {
        if (classifySendError(err).kind !== "blocked") throw err;
        skipped++;
      }
      await deps.settings.set(key, new Date(now).toISOString());
    } catch (err) {
      failed++;
      log.warn({ err: errInfo(err), orderId: order.id }, "cart reminder failed");
    }
  }

  const expired = await deps.orders.expireStale(EXPIRE_AFTER_MINUTES);
  const result = { pending: pending.length, reminded, skipped, failed, expired };
  log.info(result, "abandoned-cart done");
  return result;
}

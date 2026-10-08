import type { Order, OrderService, UserService } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { runAbandonedCart } from "../src/jobs/abandoned-cart";
import {
  apiError,
  FakeClock,
  FakeMessenger,
  logger,
  MemorySettings,
  makeUser,
  testConfig,
} from "./fakes";

function order(
  id: string,
  userIdx: number,
  minutesAgo: number,
  clock: FakeClock,
  platform: Order["platform"] = "telegram",
): Order {
  return {
    id,
    userId: `u${userIdx}`,
    platform,
    provider: platform === "telegram" ? "telegram_stars" : "bale_wallet",
    currency: platform === "telegram" ? "XTR" : "IRR",
    items: [{ kind: "prompt", refId: `prompt-${id}`, title: `پرامپت ${id}`, amount: 50 }],
    total: 50,
    status: "pending",
    providerChargeId: null,
    createdAt: new Date(clock.t - minutesAgo * 60_000),
    paidAt: null,
  };
}

function setup() {
  const clock = new FakeClock();
  const tg = new FakeMessenger("telegram", clock);
  const bale = new FakeMessenger("bale", clock);
  const settings = new MemorySettings();
  const users = [
    makeUser(1, "telegram", "fa"),
    makeUser(2, "telegram", "en"),
    makeUser(3, "bale", "ar"),
    makeUser(4),
  ];
  const pending = [
    order("o1", 1, 90, clock),
    order("o2", 2, 120, clock),
    order("o3", 3, 61, clock, "bale"),
    order("o4", 4, 26 * 60, clock), // older than 24h → about to expire, no reminder
  ];
  const orders = {
    listPendingOlderThan: vi.fn(async () => pending),
    expireStale: vi.fn(async () => 1),
  } as unknown as OrderService;
  const usersSvc = {
    getById: vi.fn(async (id: string) => users.find((u) => u.id === id) ?? null),
  } as unknown as UserService;
  const deps = {
    config: testConfig(),
    logger,
    clock,
    messengers: { telegram: tg, bale },
    orders,
    users: usersSvc,
    settings,
  };
  return { deps, tg, bale, orders, settings };
}

describe("abandoned-cart", () => {
  it("sends exactly one localized reminder per order across runs, then expires stale orders", async () => {
    const { deps, tg, bale, orders, settings } = setup();
    const first = await runAbandonedCart(deps);
    expect(first).toMatchObject({ pending: 4, reminded: 3, expired: 1 });
    expect(orders.listPendingOlderThan).toHaveBeenCalledWith(60);
    expect(orders.expireStale).toHaveBeenCalledWith(24 * 60);

    expect(tg.to("1001")[0]?.text).toContain("خریدت نیمه‌کاره");
    expect(tg.to("1002")[0]?.text).toContain("isn't finished");
    expect(bale.to("1003")[0]?.text).toContain("لم تكتمل");
    expect(tg.to("1001")[0]?.opts?.buttons?.[0]?.[0]?.url).toBe(
      "https://t.me/RasaPromptBot?start=p_prompt-o1",
    );
    expect(bale.to("1003")[0]?.opts?.buttons?.[0]?.[0]?.url).toBe(
      "https://ble.ir/rasa_prompt_bot?start=p_prompt-o3",
    );
    expect(tg.to("1004")).toHaveLength(0);
    expect(settings.map.has("cart_reminder:o1")).toBe(true);

    const second = await runAbandonedCart(deps);
    expect(second.reminded).toBe(0);
    expect(tg.sent).toHaveLength(2);
    expect(bale.sent).toHaveLength(1);
  });

  it("marks blocked users as reminded (no retry loop) and isolates other failures", async () => {
    const { deps, tg, settings } = setup();
    tg.failures.set("1001", [apiError(403, "Forbidden: bot was blocked by the user")]);
    tg.failures.set("1002", [apiError(500, "Internal error")]);
    const res = await runAbandonedCart(deps);
    expect(res.failed).toBe(1);
    expect(settings.map.has("cart_reminder:o1")).toBe(true); // blocked → don't retry
    expect(settings.map.has("cart_reminder:o2")).toBe(false); // transient → retry next run
    const again = await runAbandonedCart(deps);
    expect(again.reminded).toBe(1);
    expect(tg.to("1002")).toHaveLength(1);
  });
});

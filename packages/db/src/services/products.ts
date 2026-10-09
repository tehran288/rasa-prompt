import {
  type CreditPack,
  DomainError,
  type Locale,
  type OrderItem,
  type Plan,
  type ProductService,
} from "@rasa/shared";
import { and, asc, eq } from "drizzle-orm";
import type { Db, Executor } from "../db";
import { bundles, creditPacks, plans, prompts } from "../schema";
import { isUuid, loc } from "../util";

export type PlanRow = typeof plans.$inferSelect;

export function toPlan(r: PlanRow, locale: Locale): Plan {
  return {
    id: r.id,
    code: r.code,
    title: loc(r.title, locale),
    monthlyCredits: r.monthlyCredits,
    durationDays: r.durationDays,
    priceToman: r.priceToman,
    priceStars: r.priceStars,
  };
}

/** Plan by id or by code. */
export async function findPlan(ex: Executor, ref: string): Promise<PlanRow | null> {
  const [r] = await ex
    .select()
    .from(plans)
    .where(isUuid(ref) ? eq(plans.id, ref) : eq(plans.code, ref as PlanRow["code"]))
    .limit(1);
  return r ?? null;
}

export async function findPack(ex: Executor, ref: string) {
  const [r] = await ex
    .select()
    .from(creditPacks)
    .where(isUuid(ref) ? eq(creditPacks.id, ref) : eq(creditPacks.code, ref))
    .limit(1);
  return r ?? null;
}

/** IRR (rial) = toman × 10; XTR = stars. */
function amountFor(currency: "XTR" | "IRR", toman: number, stars: number): number {
  return currency === "XTR" ? stars : toman * 10;
}

export function createProductService(db: Db): ProductService {
  return {
    async listPlans(locale) {
      const rows = await db
        .select()
        .from(plans)
        .where(eq(plans.active, true))
        .orderBy(asc(plans.sort), asc(plans.priceToman));
      return rows.map((r) => toPlan(r, locale));
    },

    async listCreditPacks(locale) {
      const rows = await db
        .select()
        .from(creditPacks)
        .where(eq(creditPacks.active, true))
        .orderBy(asc(creditPacks.sort), asc(creditPacks.credits));
      return rows.map(
        (r): CreditPack => ({
          id: r.id,
          title: loc(r.title, locale),
          credits: r.credits,
          priceToman: r.priceToman,
          priceStars: r.priceStars,
        }),
      );
    },

    async quote(kind, refId, currency, locale): Promise<OrderItem> {
      switch (kind) {
        case "prompt": {
          if (!isUuid(refId)) throw new DomainError("not_found", "prompt");
          const [p] = await db
            .select()
            .from(prompts)
            .where(and(eq(prompts.id, refId), eq(prompts.status, "published")));
          if (!p) throw new DomainError("not_found", "prompt");
          if (p.tier === "free" || p.priceToman == null || p.priceStars == null) {
            throw new DomainError("invalid_state", "prompt is not sold individually");
          }
          return {
            kind,
            refId: p.id,
            title: loc(p.title, locale),
            amount: amountFor(currency, p.priceToman, p.priceStars),
          };
        }
        case "bundle": {
          const [b] = await db
            .select()
            .from(bundles)
            .where(
              and(
                isUuid(refId) ? eq(bundles.id, refId) : eq(bundles.slug, refId),
                eq(bundles.active, true),
              ),
            );
          if (!b) throw new DomainError("not_found", "bundle");
          return {
            kind,
            refId: b.id,
            title: loc(b.title, locale),
            amount: amountFor(currency, b.priceToman, b.priceStars),
          };
        }
        case "plan": {
          const p = await findPlan(db, refId);
          if (!p?.active) throw new DomainError("not_found", "plan");
          return {
            kind,
            refId: p.id,
            title: loc(p.title, locale),
            amount: amountFor(currency, p.priceToman, p.priceStars),
          };
        }
        case "credit_pack": {
          const c = await findPack(db, refId);
          if (!c?.active) throw new DomainError("not_found", "credit_pack");
          return {
            kind,
            refId: c.id,
            title: loc(c.title, locale),
            amount: amountFor(currency, c.priceToman, c.priceStars),
          };
        }
        default:
          throw new DomainError("not_found", `unknown product kind ${String(kind)}`);
      }
    },
  };
}

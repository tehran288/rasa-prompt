/** Plan prices (contract: Plan.priceToman / Plan.priceStars). Bale invoices use IRR = toman × 10. */
export const PLAN_PRICES = {
  pro_monthly: { toman: 199000, stars: 250 },
  pro_yearly: { toman: 1490000, stars: 1800 },
  lifetime: { toman: 3900000, stars: 4500 },
} as const;
export type PlanCode = keyof typeof PLAN_PRICES;

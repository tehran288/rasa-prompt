"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { formatNumber, type Loc } from "@/lib/format";
import { PLAN_PRICES } from "@/lib/plans";
import { TELEGRAM_URL } from "@/lib/site";
import { Segmented } from "./segmented";

export interface PlanCopy {
  code: "pro_monthly" | "pro_yearly" | "lifetime";
  name: string;
  per: string;
  features: string[];
  cta: string;
}

export function PricingPlans({
  plans,
  locale,
  labels,
}: {
  plans: PlanCopy[];
  locale: Loc;
  labels: { toman: string; stars: string; currency: string; featured: string };
}) {
  const [cur, setCur] = useState<"toman" | "stars">("toman");
  return (
    <>
      <div className="ptools">
        <Segmented
          value={cur}
          onChange={setCur}
          label={labels.currency}
          options={[
            { value: "toman", label: labels.toman },
            { value: "stars", label: `⭐ ${labels.stars}` },
          ]}
        />
      </div>
      <div className="plans">
        {plans.map((p) => {
          const feat = p.code === "pro_yearly";
          const price = PLAN_PRICES[p.code];
          return (
            <div key={p.code} className={feat ? "plan featured" : "plan"} data-reveal="">
              {feat ? <span className="badge-top">{labels.featured}</span> : null}
              <h3>{p.name}</h3>
              <div>
                <div className="amt num" aria-live="polite">
                  <span key={cur} className="amt-swap">
                    {cur === "stars"
                      ? `⭐ ${formatNumber(price.stars, locale)}`
                      : formatNumber(price.toman, locale)}
                  </span>
                  {cur === "toman" ? <small>{labels.toman}</small> : null}
                </div>
                <div className="per">{p.per}</div>
              </div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                className={feat ? "btn primary" : "btn ghost"}
                href={`${TELEGRAM_URL}?start=plan_${p.code}`}
                target="_blank"
                rel="noopener"
              >
                {p.cta}
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}

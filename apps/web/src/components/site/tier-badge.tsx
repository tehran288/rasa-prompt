import type { PromptTier } from "@rasa/shared";
import { Gem, Gift, Star } from "lucide-react";

export function TierBadge({ tier, label }: { tier: PromptTier; label: string }) {
  const Icon = tier === "free" ? Gift : tier === "pro" ? Star : Gem;
  return (
    <span className={`tier ${tier}`}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

import { Link } from "@/i18n/navigation";
import type { PromptCardView } from "@/lib/catalog-types";
import { formatDate, formatNumber, type Loc } from "@/lib/format";
import { QuickViewButton } from "./quick-view-button";
import { ScoreRing } from "./score-ring";
import { TierBadge } from "./tier-badge";

export interface CardLabels {
  tiers: Record<string, string>;
  types: Record<string, string>;
  tested: string;
  toman: string;
  quickView: string;
  score: string;
}

type Tr = (key: string) => string;

/** Build card labels from `common` and `types` translators (server or client). */
export function cardLabels(tc: Tr, tt: Tr): CardLabels {
  return {
    tiers: { free: tc("free"), pro: tc("pro"), premium: tc("premium") },
    types: Object.fromEntries(
      ["text", "image", "video", "audio", "code", "automation"].map((k) => [k, tt(k)]),
    ),
    tested: tc("tested"),
    toman: tc("toman"),
    quickView: tc("quickView"),
    score: tc("score"),
  };
}

/** A prompt card. The title link stretches over the card; quick-view sits above it. */
export function PromptCard({
  p,
  locale,
  labels,
  currency = "toman",
  reveal = true,
}: {
  p: PromptCardView;
  locale: Loc;
  labels: CardLabels;
  currency?: "toman" | "stars";
  reveal?: boolean;
}) {
  return (
    <article className={`pcard spot ${p.tier}`} data-reveal={reveal ? "" : undefined}>
      <div className="top">
        <TierBadge tier={p.tier} label={labels.tiers[p.tier] ?? p.tier} />
        <span className="chip">{labels.types[p.type] ?? p.type}</span>
        <QuickViewButton slug={p.slug} label={`${labels.quickView}: ${p.title}`} />
      </div>
      <h3>
        <Link href={`/p/${p.slug}`}>{p.title}</Link>
      </h3>
      <p>{p.summary}</p>
      <div className="ms">
        {p.models.map((m) => (
          <span key={m} className="chip">
            {m}
          </span>
        ))}
      </div>
      <div className="bot">
        <ScoreRing score={p.score} locale={locale} label={`${labels.score} ${p.score}`} />
        <span className="dimmed text-xs leading-snug">
          {labels.tested}
          <br />
          {formatDate(p.testedAt, locale, "short")}
        </span>
        <span className="price num">
          {p.tier === "free" || p.priceToman == null ? (
            <span style={{ color: "var(--ok)" }}>{labels.tiers.free}</span>
          ) : currency === "stars" ? (
            <>⭐ {formatNumber(p.priceStars ?? 0, locale)}</>
          ) : (
            <>
              {formatNumber(p.priceToman, locale)}{" "}
              <small className="dimmed font-medium">{labels.toman}</small>
            </>
          )}
        </span>
      </div>
    </article>
  );
}

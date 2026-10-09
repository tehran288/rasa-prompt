import { Link } from "@/i18n/navigation";
import type { TrendView } from "@/lib/catalog-types";
import { digits, formatPercent, type Loc } from "@/lib/format";
import { Sparkline } from "./sparkline";

export function TrendCard({
  trend,
  rank,
  locale,
  growthLabel,
  linked,
}: {
  trend: TrendView;
  rank: number;
  locale: Loc;
  growthLabel: string;
  linked?: { slug: string; title: string }[];
}) {
  return (
    <article className="trend spot" data-reveal="">
      <div className="meta">
        <span className="rank">#{digits(rank, locale)}</span>
        <span className="sp" />
        <span className="heat num" title={growthLabel}>
          {formatPercent(trend.growth, locale)}
        </span>
      </div>
      <h3>{trend.title}</h3>
      <Sparkline data={trend.series} id={`tg-${trend.key}`} delay={rank * 0.12} />
      {linked?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {linked.map((l) => (
            <Link key={l.slug} href={`/p/${l.slug}`} className="chip lapis relative z-[2]">
              {l.title}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="src" dir="auto">
        {trend.sources.join(" • ")}
      </div>
    </article>
  );
}

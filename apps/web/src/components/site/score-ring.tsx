import { digits, type Loc } from "@/lib/format";

export function ScoreRing({
  score,
  locale,
  label,
}: {
  score: number;
  locale: Loc;
  label?: string;
}) {
  const c = 2 * Math.PI * 13;
  return (
    <svg className="score-ring" viewBox="0 0 34 34" role="img" aria-label={label ?? String(score)}>
      <circle cx="17" cy="17" r="13" fill="none" stroke="var(--line2)" strokeWidth="3" />
      <circle
        cx="17"
        cy="17"
        r="13"
        fill="none"
        stroke="var(--ok)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        transform="rotate(-90 17 17)"
      />
      <text
        x="17"
        y="21"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="var(--fg)"
        fontFamily={locale === "en" ? "JetBrains Mono, monospace" : "inherit"}
      >
        {digits(score, locale)}
      </text>
    </svg>
  );
}

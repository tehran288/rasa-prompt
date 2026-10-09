/** Area sparkline that "draws" itself when its card enters the viewport. */
export function Sparkline({ data, id, delay = 0 }: { data: number[]; id: string; delay?: number }) {
  const w = 280;
  const h = 70;
  const m = Math.max(...data, 1);
  const pts = data.map(
    (v, j) => [(j / Math.max(1, data.length - 1)) * w, h - 6 - (v / m) * (h - 14)] as const,
  );
  const path = pts.map((p, j) => `${j ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1] ?? [w, h];
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path
        className="line"
        d={path}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{ "--d": `${delay}s` } as React.CSSProperties}
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--gold)" />
    </svg>
  );
}

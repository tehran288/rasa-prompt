export function BrandMark({ id = "bm", className = "mark" }: { id?: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold2)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth="2.4">
        <rect x="9" y="9" width="22" height="22" rx="3" />
        <rect x="9" y="9" width="22" height="22" rx="3" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r="4.2" fill="var(--lapis)" />
    </svg>
  );
}

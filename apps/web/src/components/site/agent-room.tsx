"use client";

import { Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { digits, type Loc } from "@/lib/format";

type LogLine = [string, string, string];

const W = 760;
const H = 430;
const STEP_MAP = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** SVG agent graph with a flowing pulse + terminal log, replayable. */
export function AgentRoom({
  stages,
  log,
  locale,
  labels,
  autoplay = true,
}: {
  stages: string[];
  log: LogLine[];
  locale: Loc;
  labels: { run: string; note: string; flow: string; graph: string };
  autoplay?: boolean;
}) {
  const rtl = locale !== "en";
  const [live, setLive] = useState(-1);
  const [done, setDone] = useState(stages.length - 1);
  const [lines, setLines] = useState(log.length);
  const [pulse, setPulse] = useState<{ x: number; y: number } | null>(null);
  const edgesRef = useRef<(SVGPathElement | null)[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const played = useRef(false);

  const pos = useMemo(
    () =>
      stages.map((_, i) => {
        const row = i < 5 ? 0 : 1;
        const col = row === 0 ? i : 9 - i;
        let x = 70 + col * 155;
        if (rtl) x = W - x;
        return [x, row === 0 ? 130 : 320] as const;
      }),
    [stages, rtl],
  );
  const edges = useMemo(
    () =>
      pos.slice(0, -1).map((p, i) => {
        const q = pos[i + 1] ?? p;
        if (i === 4) {
          const cx = rtl ? 30 : W - 30;
          return `M${p[0]} ${p[1] + 34} C ${cx} ${p[1] + 80}, ${cx} ${q[1] - 80}, ${q[0]} ${q[1] - 34}`;
        }
        const dir = q[0] > p[0] ? 1 : -1;
        return `M${p[0] + 62 * dir} ${p[1]} L ${q[0] - 62 * dir} ${q[1]}`;
      }),
    [pos, rtl],
  );

  const run = () => {
    window.clearInterval(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    let cur = -1;
    setLive(-1);
    setDone(-1);
    setLines(0);
    timer.current = window.setInterval(
      () => {
        const node = STEP_MAP[i] ?? 9;
        if (node !== cur) {
          setDone(cur);
          cur = node;
          setLive(node);
          const e = edgesRef.current[node - 1];
          if (e && !reduced) {
            const len = e.getTotalLength();
            const s = performance.now();
            const tick = (n: number) => {
              const p = Math.min(1, (n - s) / 500);
              const pt = e.getPointAtLength(len * (1 - (1 - p) ** 3));
              setPulse({ x: pt.x, y: pt.y });
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
        i += 1;
        setLines(i);
        if (i >= log.length) {
          window.clearInterval(timer.current);
          window.setTimeout(() => {
            setDone(stages.length - 1);
            setLive(-1);
            setPulse(null);
          }, 700);
        }
      },
      reduced ? 60 : 620,
    );
  };

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (!autoplay) return;
    const el = rootRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !played.current) {
          played.current = true;
          run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  return (
    <div className="room" ref={rootRef}>
      <div className="graph spot" data-reveal="">
        <div className="graph-scroll">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.graph}>
            <text
              x={W / 2}
              y="44"
              textAnchor="middle"
              fill="var(--dim)"
              fontSize="12"
              fontFamily="var(--f-b)"
              direction={rtl ? "rtl" : "ltr"}
            >
              {labels.flow}
            </text>
            {edges.map((d, i) => (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed graph
                key={i}
                ref={(el) => {
                  edgesRef.current[i] = el;
                }}
                className="edge"
                d={d}
              />
            ))}
            {pos.map((p, i) => (
              <g
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed graph
                key={i}
                className={i === live ? "node live" : i <= done ? "node done" : "node"}
                transform={`translate(${p[0] - 62} ${p[1] - 34})`}
              >
                <rect width="124" height="68" rx="14" />
                <text x="62" y="22" textAnchor="middle" className="s">
                  {digits(String(i + 1).padStart(2, "0"), locale)}
                </text>
                <text x="62" y="43" textAnchor="middle">
                  {stages[i]}
                </text>
                <text x="62" y="59" textAnchor="middle" className="s">
                  {i <= done ? "✓" : i === live ? "…" : ""}
                </text>
              </g>
            ))}
            {pulse ? <circle className="pulse" r="5" cx={pulse.x} cy={pulse.y} /> : null}
          </svg>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="term" data-reveal="">
          <div className="wbar">
            <div className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="chip" style={{ fontFamily: "var(--f-m)" }} dir="ltr">
              intel • run
            </span>
            <span className="sp" />
            <button type="button" className="mini" onClick={run}>
              <Play size={13} aria-hidden="true" /> {labels.run}
            </button>
          </div>
          <div className="log" ref={logRef} role="log" aria-live="polite">
            {log.slice(0, lines).map(([c, a, b], i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
              <div key={i}>
                <span className={c}>{a}</span>
                {b}
              </div>
            ))}
          </div>
        </div>
        <div className="note">{labels.note}</div>
      </div>
    </div>
  );
}

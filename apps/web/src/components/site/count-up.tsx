"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, type Loc } from "@/lib/format";

/** Counts up once when visible. Server/no-JS render shows the final value. */
export function CountUp({ to, locale }: { to: number; locale: Loc }) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const s = performance.now();
      const tick = (n: number) => {
        const p = Math.min(1, (n - s) / 1400);
        setV(Math.round(to * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setV(0);
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <strong ref={ref} className="num">
      {formatNumber(v, locale)}
    </strong>
  );
}

"use client";

import { useEffect, useRef } from "react";

/** Drifting girih lattice on canvas + aurora blobs. Pauses when hidden or off-screen. */
export function Sky({ short = false }: { short?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let t0 = 0;
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
    };
    const star = (cx: number, cy: number, r: number, rot: number) => {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = rot + (i * Math.PI) / 8;
        const rr = i % 2 ? r * 0.62 : r;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.stroke();
    };
    const draw = (n: number) => {
      if (!running) return;
      const tt = (n - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const gold =
        getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#e8bb57";
      ctx.strokeStyle = gold;
      ctx.lineWidth = 0.7;
      const g = 96;
      const off = (tt * 6) % g;
      for (let yy = -g; yy < h + g; yy += g) {
        for (let xx = -g; xx < w + g; xx += g) {
          const d = Math.hypot(xx - w / 2, yy - 260);
          const a = Math.max(0, 1 - d / 700);
          if (a <= 0) continue;
          ctx.globalAlpha = a * 0.55;
          star(xx + off, yy + off * 0.5, 30, tt * 0.05 + (xx + yy) * 0.002);
          ctx.globalAlpha = a * 0.25;
          ctx.strokeRect(xx + off - 12, yy + off * 0.5 - 12, 24, 24);
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    size();
    const ro = new ResizeObserver(() => {
      size();
      if (reduced) draw(performance.now());
    });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      const vis = !!e?.isIntersecting && !document.hidden;
      if (vis && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!vis) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(c);
    const onVis = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running && !reduced) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame((n) => {
      t0 = n;
      draw(n);
    });
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className={short ? "sky short" : "sky"} aria-hidden="true">
      <div className="blob a" />
      <div className="blob b" />
      <canvas ref={ref} />
    </div>
  );
}

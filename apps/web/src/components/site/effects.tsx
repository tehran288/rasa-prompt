"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Global progressive-enhancement effects:
 *  - marks <html> with .js so [data-reveal] elements may start hidden,
 *  - reveals [data-reveal] / [data-io] elements when they enter the viewport (adds .in-view),
 *  - spotlight-follow hover for .spot surfaces (sets --mx/--my).
 */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("js");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = document.querySelectorAll<HTMLElement>(
      "[data-reveal]:not(.in-view),[data-io]:not(.in-view)",
    );
    if (reduced || !("IntersectionObserver" in window)) {
      for (const el of els) el.classList.add("in-view");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const s = target?.closest?.<HTMLElement>(".spot");
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty("--mx", `${e.clientX - r.left}px`);
      s.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}

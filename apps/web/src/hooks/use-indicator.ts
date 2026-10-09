"use client";

import { type RefObject, useCallback, useLayoutEffect, useState } from "react";

export interface IndicatorStyle {
  width: number;
  transform: string;
  opacity: number;
}

/**
 * Measures the active child of a segmented control and returns a style for a sliding
 * indicator positioned from the inline-start edge (works in RTL and LTR).
 */
export function useIndicator(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  deps: unknown[],
): IndicatorStyle {
  const [style, setStyle] = useState<IndicatorStyle>({ width: 0, transform: "none", opacity: 0 });

  const measure = useCallback(() => {
    const box = containerRef.current;
    if (!box) return;
    const el = box.querySelector<HTMLElement>(selector);
    if (!el) {
      setStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const rtl = getComputedStyle(box).direction === "rtl";
    const offset = rtl ? box.clientWidth - (el.offsetLeft + el.offsetWidth) : el.offsetLeft;
    const x = rtl ? -offset + box.scrollLeft : offset - box.scrollLeft;
    setStyle({ width: el.offsetWidth, transform: `translateX(${x}px)`, opacity: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, selector]);

  useLayoutEffect(() => {
    measure();
    const box = containerRef.current;
    if (!box) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    box.addEventListener("scroll", measure, { passive: true });
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      box.removeEventListener("scroll", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  return style;
}

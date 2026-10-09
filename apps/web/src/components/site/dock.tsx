"use client";

import { LayoutGrid, MessageCircle, Network, Search, Star, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useUi } from "./ui-state";

const ITEMS = [
  ["/prompts", "library", LayoutGrid],
  ["/trends", "trends", TrendingUp],
  ["/agents", "agentsShort", Network],
  ["/bots", "bots", MessageCircle],
  ["/pricing", "pricing", Star],
] as const;

/** macOS-style magnifying dock; appears after scrolling (always on small screens). */
export function Dock() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { openPalette } = useUi();
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 900px)");
    const on = () => setShow(small.matches || window.scrollY > 600);
    on();
    window.addEventListener("scroll", on, { passive: true });
    small.addEventListener("change", on);
    return () => {
      window.removeEventListener("scroll", on);
      small.removeEventListener("change", on);
    };
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    for (const a of ref.current?.querySelectorAll<HTMLElement>(".di") ?? []) {
      const r = a.getBoundingClientRect();
      const dist = Math.abs(e.clientX - (r.left + r.width / 2));
      const s = 44 + 20 * Math.max(0, 1 - dist / 130);
      a.style.width = `${s}px`;
      a.style.height = `${s}px`;
    }
  };
  const onLeave = () => {
    for (const a of ref.current?.querySelectorAll<HTMLElement>(".di") ?? []) {
      a.style.width = "";
      a.style.height = "";
    }
  };

  return (
    <nav
      ref={ref}
      className={show ? "dock show" : "dock"}
      aria-label={t("dock")}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      inert={!show}
    >
      {ITEMS.map(([href, key, Icon]) => (
        <Link
          key={href}
          href={href}
          className="di"
          aria-label={t(key)}
          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
        >
          <Icon aria-hidden="true" strokeWidth={1.8} />
          <span className="tip" aria-hidden="true">
            {t(key)}
          </span>
        </Link>
      ))}
      <button type="button" className="di" aria-label={t("search")} onClick={openPalette}>
        <Search aria-hidden="true" strokeWidth={1.8} />
        <span className="tip" aria-hidden="true">
          {t("search")}
        </span>
      </button>
    </nav>
  );
}

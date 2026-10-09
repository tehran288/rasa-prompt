"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useIndicator } from "@/hooks/use-indicator";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "./brand-mark";
import { useUi } from "./ui-state";

const LINKS = [
  ["/prompts", "library"],
  ["/trends", "trends"],
  ["/agents", "agents"],
  ["/bots", "bots"],
  ["/pricing", "pricing"],
] as const;

const LANGS = [
  ["fa", "فا", "فارسی"],
  ["ar", "ع", "العربية"],
  ["en", "EN", "English"],
] as const;

export function SiteNav() {
  const t = useTranslations("nav");
  const tm = useTranslations("meta");
  const locale = useLocale();
  const pathname = usePathname();
  const { openPalette } = useUi();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // hover highlight pill
  const linksRef = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const onOver = (e: React.PointerEvent | React.FocusEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const box = linksRef.current;
    if (!a || !box) return;
    const rtl = getComputedStyle(box).direction === "rtl";
    const x = rtl ? -(box.clientWidth - (a.offsetLeft + a.offsetWidth)) : a.offsetLeft;
    setHl({ x, w: a.offsetWidth, on: true });
  };

  const segRef = useRef<HTMLDivElement>(null);
  const ind = useIndicator(segRef, '[aria-current="true"]', [locale]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="navwrap">
      <nav className="pill" aria-label={t("main")}>
        <Link className="brand" href="/" aria-label={tm("siteName")}>
          <BrandMark id="nav-mark" />
          <b>{tm("siteName")}</b>
        </Link>
        <div
          className="links"
          ref={linksRef}
          onPointerOver={onOver}
          onFocus={onOver}
          onPointerLeave={() => setHl((h) => ({ ...h, on: false }))}
          onBlur={() => setHl((h) => ({ ...h, on: false }))}
        >
          <span
            className="hl"
            aria-hidden="true"
            style={{ transform: `translateX(${hl.x}px)`, width: hl.w, opacity: hl.on ? 1 : 0 }}
          />
          {LINKS.map(([href, key]) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>
              {key === "agents" ? t("agentsShort") : t(key)}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="kbtn"
          onClick={openPalette}
          aria-label={t("search")}
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search size={15} aria-hidden="true" />
          <span>{t("search")}</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="seg" ref={segRef} role="group" aria-label={t("language")}>
          <span className="ind" aria-hidden="true" style={ind} />
          {LANGS.map(([l, short, name]) => (
            <Link
              key={l}
              href={pathname}
              locale={l}
              hrefLang={l}
              lang={l}
              aria-label={name}
              aria-current={l === locale ? "true" : undefined}
              scroll={false}
            >
              {short}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="round"
          aria-label={t("theme")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "light" ? (
            <Sun size={16} aria-hidden="true" />
          ) : (
            <Moon size={16} aria-hidden="true" />
          )}
        </button>
      </nav>
    </div>
  );
}

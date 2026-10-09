"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { usePathname, useRouter } from "@/i18n/navigation";
import { matchesQuery } from "@/lib/normalize";
import type { PaletteEntry } from "./ui-state";

interface Item {
  group: "prompts" | "pages" | "actions";
  label: string;
  sub?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  index,
  onQuickView,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: PaletteEntry[];
  onQuickView: (slug: string) => void;
}) {
  const t = useTranslations("cmdk");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Global shortcuts: ⌘K / Ctrl+K toggles, "/" opens when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(
        (document.activeElement as HTMLElement | null)?.tagName ?? "",
      );
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const close = () => onOpenChange(false);
    const prompts: Item[] = index
      .filter((p) => matchesQuery(`${p.title} ${p.keywords}`, q))
      .slice(0, 6)
      .map((p) => ({
        group: "prompts",
        label: p.title,
        sub: tc(p.tier),
        run: () => {
          close();
          router.push(`/p/${p.slug}`);
        },
      }));
    const pages: Item[] = (
      [
        ["/prompts", "library"],
        ["/trends", "trends"],
        ["/agents", "agents"],
        ["/bots", "bots"],
        ["/pricing", "pricing"],
        ["/about", "about"],
      ] as const
    )
      .filter(([, k]) => matchesQuery(tn(k), q))
      .map(([href, k]) => ({
        group: "pages",
        label: tn(k),
        sub: "↗",
        run: () => {
          close();
          router.push(href);
        },
      }));
    const langs: [string, string][] = [
      ["fa", "فارسی"],
      ["ar", "العربية"],
      ["en", "English"],
    ];
    const actions: Item[] = [
      ...langs
        .filter(([l]) => l !== locale)
        .map(([l, name]) => ({
          group: "actions" as const,
          label: `${t("lang")} → ${name}`,
          run: () => {
            close();
            router.replace(pathname, { locale: l });
          },
        })),
      {
        group: "actions" as const,
        label: t("theme"),
        run: () => {
          close();
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
        },
      },
    ].filter((a) => matchesQuery(a.label, q));
    return [...prompts, ...pages, ...actions];
  }, [index, q, locale, pathname, resolvedTheme, router, setTheme, t, tn, tc, onOpenChange]);

  useEffect(() => {
    if (sel >= items.length) setSel(0);
  }, [items.length, sel]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[sel]?.run();
    }
  };

  let lastGroup = "";
  // Keep quick view reachable from the palette with Shift+Enter on a prompt.
  void onQuickView;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="scrim" />
        <DialogPrimitive.Popup className="pal" aria-label={tn("search")}>
          <DialogPrimitive.Title className="sr-only">{tn("search")}</DialogPrimitive.Title>
          <div className="in">
            <Search size={18} aria-hidden="true" className="dimmed" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              role="combobox"
              aria-expanded="true"
              aria-controls="pal-list"
              aria-activedescendant={items.length ? `pal-${sel}` : undefined}
              autoComplete="off"
            />
            <kbd>esc</kbd>
          </div>
          <ul id="pal-list" role="listbox" ref={listRef}>
            {items.length === 0 && <li className="g">{t("empty")}</li>}
            {items.map((it, i) => {
              const head = it.group !== lastGroup;
              lastGroup = it.group;
              return [
                head ? (
                  <li key={`g-${it.group}`} className="g" role="presentation">
                    {t(it.group)}
                  </li>
                ) : null,
                // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by the combobox input
                <li
                  key={`${it.group}-${it.label}`}
                  id={`pal-${i}`}
                  className="it"
                  role="option"
                  data-i={i}
                  aria-selected={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onClick={it.run}
                >
                  {it.label}
                  {it.sub ? <small>{it.sub}</small> : null}
                </li>,
              ];
            })}
          </ul>
          <div className="ft">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> {t("nav")}
            </span>
            <span>
              <kbd>↵</kbd> {t("open")}
            </span>
            <span>
              <kbd>esc</kbd> {t("close")}
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

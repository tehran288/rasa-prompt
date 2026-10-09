"use client";

import { Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { CategoryView, ModelView, PromptCardView } from "@/lib/catalog-types";
import { digits, type Loc } from "@/lib/format";
import { matchesQuery, normalizeSearch, slugify } from "@/lib/normalize";
import { cardLabels, PromptCard } from "./prompt-card";
import { Segmented } from "./segmented";

const PAGE_SIZE = 12;
const TIERS = ["all", "free", "pro", "premium"] as const;
const TYPES = ["all", "text", "image", "video", "code", "automation"] as const;
const SORTS = ["popular", "score", "newest", "price"] as const;
type Sort = (typeof SORTS)[number];

export interface LibraryFilters {
  q: string;
  tier: string;
  type: string;
  model: string;
  cat: string;
  sort: Sort;
  page: number;
}

export function readFilters(sp: URLSearchParams | null): LibraryFilters {
  const g = (k: string) => sp?.get(k) ?? "";
  const sort = (SORTS as readonly string[]).includes(g("sort")) ? (g("sort") as Sort) : "popular";
  return {
    q: g("q"),
    tier: (TIERS as readonly string[]).includes(g("tier")) ? g("tier") : "all",
    type: (TYPES as readonly string[]).includes(g("type")) ? g("type") : "all",
    model: g("model"),
    cat: g("cat"),
    sort,
    page: Math.max(1, Number.parseInt(g("page"), 10) || 1),
  };
}

export function filterPrompts(all: PromptCardView[], f: LibraryFilters): PromptCardView[] {
  const list = all.filter(
    (p) =>
      (f.tier === "all" || p.tier === f.tier) &&
      (f.type === "all" || p.type === f.type) &&
      (!f.model || p.models.some((m) => slugify(m) === f.model)) &&
      (!f.cat || p.category === f.cat) &&
      matchesQuery(
        `${p.title} ${p.summary} ${p.models.join(" ")} ${p.type} ${p.slug.replace(/-/g, " ")}`,
        f.q,
      ),
  );
  const by: Record<Sort, (a: PromptCardView, b: PromptCardView) => number> = {
    popular: (a, b) => b.popularity - a.popularity,
    score: (a, b) => b.score - a.score,
    newest: (a, b) => (b.testedAt ?? "").localeCompare(a.testedAt ?? ""),
    price: (a, b) => (a.priceToman ?? 0) - (b.priceToman ?? 0),
  };
  return list.sort(by[f.sort]);
}

export function LibraryBrowser({
  prompts,
  categories,
  models,
}: {
  prompts: PromptCardView[];
  categories: CategoryView[];
  models: ModelView[];
}) {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const locale = useLocale() as Loc;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = readFilters(sp);
  const [q, setQ] = useState(f.q);
  const labels = useMemo(() => cardLabels(tc, tt), [tc, tt]);
  const logged = useRef(new Set<string>());
  const gridRef = useRef<HTMLDivElement>(null);

  const push = (patch: Partial<LibraryFilters>, resetPage = true) => {
    const next = { ...f, ...patch, ...(resetPage && !("page" in patch) ? { page: 1 } : {}) };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.tier !== "all") params.set("tier", next.tier);
    if (next.type !== "all") params.set("type", next.type);
    if (next.model) params.set("model", next.model);
    if (next.cat) params.set("cat", next.cat);
    if (next.sort !== "popular") params.set("sort", next.sort);
    if (next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce the search box into the URL.
  useEffect(() => {
    if (q === f.q) return;
    const id = window.setTimeout(() => push({ q }), 220);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  // Keep the input in sync with back/forward navigation.
  useEffect(() => {
    setQ(f.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.q]);

  const list = useMemo(() => filterPrompts(prompts, f), [prompts, f]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered =
    f.q || f.tier !== "all" || f.type !== "all" || f.model || f.cat || f.sort !== "popular";

  // Zero-result searches become demand signals for the agents.
  useEffect(() => {
    const nq = normalizeSearch(f.q);
    if (list.length || nq.length < 2 || logged.current.has(nq)) return;
    logged.current.add(nq);
    fetch("/api/search-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: f.q, locale }),
    }).catch(() => {});
  }, [list.length, f.q, locale]);

  const goPage = (n: number) => {
    push({ page: n }, false);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <div className="toolbar" role="search">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPh")}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        <Segmented
          variant="tabs"
          label={t("tier")}
          value={f.tier}
          onChange={(v) => push({ tier: v })}
          options={TIERS.map((x) => ({ value: x, label: x === "all" ? tc("all") : tc(x) }))}
        />
        <div className="types" role="group" aria-label={t("type")}>
          {TYPES.map((x) => (
            <button
              key={x}
              type="button"
              className="tchip"
              aria-pressed={f.type === x}
              onClick={() => push({ type: x })}
            >
              {x === "all" ? tc("all") : tt(x)}
            </button>
          ))}
        </div>
      </div>
      <div className="filters2">
        <label className="sel">
          {t("model")}
          <select value={f.model} onChange={(e) => push({ model: e.target.value })}>
            <option value="">{t("any")}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name} ({digits(m.count, locale)})
              </option>
            ))}
          </select>
        </label>
        <label className="sel">
          {t("category")}
          <select value={f.cat} onChange={(e) => push({ cat: e.target.value })}>
            <option value="">{t("any")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sel">
          {t("sort")}
          <select value={f.sort} onChange={(e) => push({ sort: e.target.value as Sort })}>
            <option value="popular">{t("sortPopular")}</option>
            <option value="score">{t("sortScore")}</option>
            <option value="newest">{t("sortNewest")}</option>
            <option value="price">{t("sortPrice")}</option>
          </select>
        </label>
        {filtered ? (
          <button
            type="button"
            className="chip"
            onClick={() => {
              setQ("");
              router.replace(pathname, { scroll: false });
            }}
          >
            <X size={12} aria-hidden="true" /> {t("clear")}
          </button>
        ) : null}
      </div>
      <div className="count num" aria-live="polite" ref={gridRef} style={{ scrollMarginTop: 160 }}>
        {tc("results", { count: list.length })}
      </div>
      <div className="cards">
        {shown.length ? (
          shown.map((p) => (
            <PromptCard key={p.slug} p={p} locale={locale} labels={labels} reveal={false} />
          ))
        ) : (
          <div className="empty">
            <SearchX size={32} aria-hidden="true" />
            <h3>{t("emptyTitle")}</h3>
            <p className="m-0 max-w-[52ch]">{t("empty")}</p>
          </div>
        )}
      </div>
      {pages > 1 ? (
        <nav className="pager" aria-label={t("page", { page, total: pages })}>
          <button
            type="button"
            className="chip"
            aria-disabled={page <= 1}
            onClick={() => page > 1 && goPage(page - 1)}
          >
            {t("prev")}
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
            n === page ? (
              <span key={n} aria-current="page">
                {digits(n, locale)}
              </span>
            ) : (
              <a
                key={n}
                href={`?${new URLSearchParams({ ...Object.fromEntries(sp?.entries() ?? []), page: String(n) })}`}
                onClick={(e) => {
                  e.preventDefault();
                  goPage(n);
                }}
              >
                {digits(n, locale)}
              </a>
            ),
          )}
          <button
            type="button"
            className="chip"
            aria-disabled={page >= pages}
            onClick={() => page < pages && goPage(page + 1)}
          >
            {t("next")}
          </button>
        </nav>
      ) : null}
    </div>
  );
}

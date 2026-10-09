"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { useIndicator } from "@/hooks/use-indicator";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Link } from "@/i18n/navigation";
import { digits, formatVersion, type Loc } from "@/lib/format";
import { fill, segLength, segments, truncate } from "@/lib/template";
import { PromptText } from "./prompt-text";

export interface StudioTab {
  slug: string;
  label: string;
  version: string;
  score: number;
  models: [string, number][];
  demo: boolean;
  vars: { name: string; label: string; default?: string; options?: string[] }[];
  tpl: string;
}

const CIRC = 2 * Math.PI * 50;

export function PromptStudio({ tabs, locale }: { tabs: StudioTab[]; locale: Loc }) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const copy = useCopy();
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const tab = tabs[idx] ?? tabs[0];
  const initial = (tb: StudioTab | undefined) =>
    Object.fromEntries((tb?.vars ?? []).map((v) => [v.name, v.default ?? v.options?.[0] ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(() => initial(tab));
  const [flash, setFlash] = useState<string | null>(null);
  const [typed, setTyped] = useState<number | null>(null);
  const [done, setDone] = useState(-1);
  const [gauge, setGauge] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const ind = useIndicator(tabsRef, '[aria-selected="true"]', [idx, locale]);

  const segs = useMemo(() => (tab ? segments(tab.tpl, values) : []), [tab, values]);

  // Typewriter on tab change (skipped for reduced motion and first paint).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current || reduced) {
      firstRun.current = false;
      setTyped(null);
      return;
    }
    const total = segLength(segments(tab?.tpl ?? "", initial(tab)));
    const step = Math.max(3, Math.ceil(total / 60));
    let n = 0;
    setTyped(0);
    const id = window.setInterval(() => {
      n += step;
      if (n >= total) {
        window.clearInterval(id);
        setTyped(null);
      } else setTyped(n);
    }, 16);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, reduced]);

  // Sequential model tests, then the gauge fills and counts up.
  useEffect(() => {
    if (!tab) return;
    setDone(-1);
    setGauge(0);
    const timers: number[] = [];
    const base = reduced ? 0 : 350;
    const gap = reduced ? 0 : 420;
    tab.models.forEach((_, i) => {
      timers.push(window.setTimeout(() => setDone(i), base + i * gap));
    });
    const gStart = base + tab.models.length * gap;
    if (reduced) {
      timers.push(window.setTimeout(() => setGauge(tab.score), 0));
    } else {
      timers.push(
        window.setTimeout(() => {
          const s = performance.now();
          const tick = (n: number) => {
            const p = Math.min(1, (n - s) / 1200);
            setGauge(Math.round(tab.score * (1 - (1 - p) ** 3)));
            if (p < 1) timers.push(requestAnimationFrame(tick));
          };
          timers.push(requestAnimationFrame(tick));
        }, gStart),
      );
    }
    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
        cancelAnimationFrame(id);
      }
    };
  }, [tab, reduced]);

  if (!tab) return null;

  const select = (i: number) => {
    if (i === idx) return;
    setIdx(i);
    setValues(initial(tabs[i]));
  };
  const onTabKey = (e: React.KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (next) {
      e.preventDefault();
      const i = (idx + next + tabs.length) % tabs.length;
      select(i);
      tabsRef.current?.querySelectorAll<HTMLButtonElement>("button")[i]?.focus();
    }
  };
  const setVar = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setTyped(null);
    setFlash(k);
    window.setTimeout(() => setFlash((f) => (f === k ? null : f)), 380);
  };

  const shown = typed === null ? segs : truncate(segs, typed);
  const scoreShown = gauge;

  return (
    <div className="studio" aria-label={t("label")} role="region" data-reveal="">
      <div className="wbar">
        <div className="dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div
          className="tabs"
          role="tablist"
          ref={tabsRef}
          onKeyDown={onTabKey}
          aria-label={t("label")}
        >
          <span className="ind" aria-hidden="true" style={ind} />
          {tabs.map((tb, i) => (
            <button
              key={tb.slug}
              type="button"
              role="tab"
              id={`st-tab-${i}`}
              aria-selected={i === idx}
              aria-controls="st-panel"
              tabIndex={i === idx ? 0 : -1}
              onClick={() => select(i)}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <span className="sp" />
        <span className="chip ok tested-chip">
          <Check size={12} aria-hidden="true" /> {tc("tested")} •{" "}
          {tab.models.map((m) => m[0]).join(" • ")}
        </span>
      </div>
      <div className="wbody" id="st-panel" role="tabpanel" aria-labelledby={`st-tab-${idx}`}>
        <div className="side">
          <span className="sr-only">{t("variables")}</span>
          {tab.vars.map((v) => (
            <label key={`${tab.slug}-${v.name}`} className="field">
              {v.label}
              {v.options?.length ? (
                <select
                  value={values[v.name] ?? ""}
                  onChange={(e) => setVar(v.name, e.target.value)}
                >
                  {v.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={values[v.name] ?? ""}
                  onChange={(e) => setVar(v.name, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
        <pre className="prompt" aria-live="polite" aria-busy={typed !== null}>
          <PromptText segs={shown} flash={flash} caret={typed !== null} />
        </pre>
        <div className="panel">
          <div className="gauge">
            <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
              <defs>
                <linearGradient id="studio-g">
                  <stop offset="0" stopColor="var(--gold)" />
                  <stop offset="1" stopColor="var(--gold2)" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                className="arc"
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#studio-g)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - gauge / 100)}
              />
            </svg>
            <div className="v">
              <div>
                <strong className="num">{digits(scoreShown, locale)}</strong>
                <br />
                <span>{t("scoreLabel")}</span>
              </div>
            </div>
          </div>
          <div className="tests" aria-label={t("tests")}>
            {tab.models.map(([m, s], i) => (
              <div key={`${tab.slug}-${m}`} className={i <= done ? "test done" : "test"}>
                <span>{m}</span>
                <span className="bar">
                  <i style={{ width: i <= done ? `${s}%` : 0 }} />
                </span>
                <b className="num">{digits(s, locale)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="wfoot">
        <span className="chip lapis">{t("varsNote")}</span>
        <span className="sp" />
        {tab.demo ? <span className="chip gold">{t("demoNote")}</span> : null}
        <Link href={`/p/${tab.slug}`} className="chip">
          {tc("version")} {formatVersion(tab.version, locale)}
        </Link>
        <button type="button" className="mini" onClick={() => copy(fill(tab.tpl, values))}>
          <Copy size={14} aria-hidden="true" /> {tc("copy")}
        </button>
      </div>
    </div>
  );
}

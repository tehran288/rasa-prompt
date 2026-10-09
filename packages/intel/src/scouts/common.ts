import type { ContentLicense, Locale, Region, SourceKind, TrendSignal } from "@rasa/shared";
import { decodeEntities, detectLocale, stripHtml, truncate } from "../text";

export const SNIPPET_MAX = 400;
export const TITLE_MAX = 200;

export function signal(input: {
  source: SourceKind;
  externalId: string;
  url: string;
  title: string;
  snippet?: string;
  locale?: Locale | "other";
  region?: Region;
  metric?: number;
  metricName: string;
  observedAt: Date;
  license?: ContentLicense;
  tags?: string[];
}): TrendSignal {
  const title = truncate(stripHtml(input.title), TITLE_MAX);
  const snippet = truncate(stripHtml(input.snippet ?? ""), SNIPPET_MAX);
  return {
    source: input.source,
    externalId: input.externalId,
    url: input.url,
    title,
    snippet,
    locale: input.locale ?? detectLocale(`${title} ${snippet}`),
    region: input.region ?? "GLOBAL",
    metric: Number.isFinite(input.metric) ? Number(input.metric) : 0,
    metricName: input.metricName,
    observedAt: input.observedAt,
    license: input.license ?? "unknown",
    tags: [...new Set((input.tags ?? []).map((t) => t.toLowerCase()).filter(Boolean))].slice(0, 12),
  };
}

/** Keeps the highest-metric copy of each (source, externalId). */
export function dedupeSignals(signals: TrendSignal[]): TrendSignal[] {
  const map = new Map<string, TrendSignal>();
  for (const s of signals) {
    const k = `${s.source}\u0000${s.externalId}`;
    const prev = map.get(k);
    if (!prev || s.metric > prev.metric) map.set(k, s);
  }
  return [...map.values()];
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function hoursAgo(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 3600_000);
}

/** Tiny tolerant XML reader for RSS 2.0 / Atom / arXiv feeds (no external parser needed). */
export function xmlBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

export function xmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] ? decodeEntities(m[1]).trim() : "";
}

export function xmlAttr(xml: string, tag: string, attr: string, where?: RegExp): string {
  const re = new RegExp(`<${tag}\\b([^>]*)/?>`, "gi");
  for (const m of xml.matchAll(re)) {
    const attrs = m[1] ?? "";
    if (where && !where.test(attrs)) continue;
    const a = attrs.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i"));
    if (a?.[1]) return decodeEntities(a[1]);
  }
  return "";
}

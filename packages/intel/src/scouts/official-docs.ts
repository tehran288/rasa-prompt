import type { TrendSignal } from "@rasa/shared";
import { createRobotsChecker } from "../http";
import { DEFAULT_ARXIV_QUERY, DEFAULT_OFFICIAL_GUIDES } from "../sources";
import { decodeEntities, sha1, stripHtml } from "../text";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, signal, xmlAttr, xmlBlocks, xmlText } from "./common";

/**
 * Official prompting guides (Anthropic, OpenAI, Google, Microsoft, Mistral, Meta, Midjourney).
 * We only read <title>/<meta description> plus a content hash so a *changed* guide produces a
 * new signal ("vendor X updated its prompting advice"). License is always "proprietary":
 * techniques may inspire our prompts, text is never copied. robots.txt is honoured.
 */
export function createOfficialDocsScout(ctx: ScoutContext): Scout {
  const guides = ctx.options.officialGuides ?? DEFAULT_OFFICIAL_GUIDES;
  const robots = createRobotsChecker(ctx.http);
  return {
    kind: "official_docs",
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const out: TrendSignal[] = [];
      for (const g of guides) {
        try {
          if (!(await robots.allowed(g.url))) {
            ctx.logger.info({ url: g.url }, "official_docs: disallowed by robots.txt");
            continue;
          }
          const { text, headers } = await ctx.http.text(g.url, { bucket: "official_docs" });
          const title = decodeEntities(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
          const desc = text.match(
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
          )?.[1];
          const version =
            headers.get("etag") ??
            headers.get("last-modified") ??
            sha1(stripHtml(text)).slice(0, 16);
          out.push(
            signal({
              source: "official_docs",
              externalId: `${g.url}@${version}`,
              url: g.url,
              title: `${g.vendor}: ${title.trim() || g.title}`,
              snippet: decodeEntities(desc ?? ""),
              locale: "en",
              region: "GLOBAL",
              metric: 1,
              metricName: "guide_revision",
              observedAt: now,
              license: "proprietary",
              tags: [`vendor:${g.vendor}`, "technique"],
            }),
          );
        } catch (err) {
          ctx.logger.warn({ url: g.url, err: String(err) }, "official_docs: fetch failed");
        }
      }
      return dedupeSignals(out);
    },
  };
}

/** arXiv API (Atom). Newest prompting-technique papers; abstract excerpt only, "proprietary". */
export function createArxivScout(ctx: ScoutContext): Scout {
  const query = ctx.options.arxivQuery ?? DEFAULT_ARXIV_QUERY;
  return {
    kind: "arxiv",
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const { text } = await ctx.http.text(
        `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}` +
          `&sortBy=submittedDate&sortOrder=descending&start=0&max_results=40`,
        { bucket: "arxiv", timeoutMs: 30_000 },
      );
      const cutoff = now.getTime() - 14 * 24 * 3600_000;
      const out: TrendSignal[] = [];
      for (const entry of xmlBlocks(text, "entry")) {
        const id = xmlText(entry, "id");
        const published = new Date(xmlText(entry, "published"));
        if (!id || (Number.isFinite(published.getTime()) && published.getTime() < cutoff)) continue;
        const absId = id.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
        const categories = [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(
          (m) => m[1] ?? "",
        );
        out.push(
          signal({
            source: "arxiv",
            externalId: absId,
            url:
              xmlAttr(entry, "link", "href", /rel="alternate"/) || `https://arxiv.org/abs/${absId}`,
            title: xmlText(entry, "title"),
            snippet: xmlText(entry, "summary"),
            locale: "en",
            region: "GLOBAL",
            metric: 1,
            metricName: "paper",
            observedAt: now,
            license: "proprietary",
            tags: ["technique", ...categories.slice(0, 4)],
          }),
        );
      }
      return dedupeSignals(out);
    },
  };
}

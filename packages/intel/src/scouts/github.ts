import type { TrendSignal } from "@rasa/shared";
import { HttpError } from "../http";
import { normalizeLicense } from "../licenses";
import { DEFAULT_GITHUB_TOPICS } from "../sources";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, hoursAgo, isoDay, signal } from "./common";

interface RepoItem {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  topics?: string[];
  language?: string | null;
  license?: { key?: string; spdx_id?: string | null } | null;
  created_at?: string;
  pushed_at?: string;
  archived?: boolean;
  fork?: boolean;
}

/**
 * GitHub REST search API. Repos tagged with prompt topics that were created or pushed
 * recently, sorted by stars. The license comes from the API (search payload, or
 * GET /repos/{repo}/license when the search payload has none) — never guessed.
 */
export function createGithubScout(ctx: ScoutContext): Scout {
  const topics = ctx.options.githubTopics ?? DEFAULT_GITHUB_TOPICS;
  return {
    kind: "github",
    // Search works unauthenticated (10 req/min); a token raises it to 30 req/min.
    enabled: () => true,
    async collect() {
      const now = ctx.now();
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (ctx.config.GITHUB_TOKEN) headers.Authorization = `Bearer ${ctx.config.GITHUB_TOKEN}`;
      const pushedSince = isoDay(hoursAgo(now, 24 * 7));
      const createdSince = isoDay(hoursAgo(now, 24 * 30));
      const repos = new Map<string, RepoItem>();
      for (const topic of topics) {
        for (const q of [
          `topic:${topic} pushed:>=${pushedSince} stars:>=20 archived:false`,
          `topic:${topic} created:>=${createdSince}`,
        ]) {
          try {
            const res = await ctx.http.json<{ items?: RepoItem[] }>(
              `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`,
              { bucket: "github", headers },
            );
            for (const r of res.items ?? []) {
              if (r.full_name && !r.fork && !r.archived) repos.set(r.full_name, r);
            }
          } catch (err) {
            ctx.logger.warn({ q, err: String(err) }, "github: search failed");
          }
        }
      }

      const out: TrendSignal[] = [];
      for (const r of repos.values()) {
        const name = r.full_name as string;
        let rawLicense: string | null | undefined = r.license?.spdx_id;
        if (!rawLicense || rawLicense === "NOASSERTION") {
          rawLicense = await fetchLicense(ctx, name, headers);
        }
        out.push(
          signal({
            source: "github",
            externalId: name,
            url: r.html_url ?? `https://github.com/${name}`,
            title: name,
            snippet: r.description ?? "",
            locale: "en",
            region: "GLOBAL",
            metric: r.stargazers_count ?? 0,
            metricName: "stars",
            observedAt: now,
            license: normalizeLicense(rawLicense),
            tags: [...(r.topics ?? []).slice(0, 8), rawLicense ? `license:${rawLicense}` : ""],
          }),
        );
      }
      return dedupeSignals(out);
    },
  };
}

async function fetchLicense(
  ctx: ScoutContext,
  fullName: string,
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await ctx.http.json<{ license?: { spdx_id?: string | null } | null }>(
      `https://api.github.com/repos/${fullName}/license`,
      { bucket: "github", headers, retries: 0 },
    );
    const id = res.license?.spdx_id;
    return id && id !== "NOASSERTION" ? id : null;
  } catch (err) {
    if (!(err instanceof HttpError && err.status === 404)) {
      ctx.logger.debug({ repo: fullName, err: String(err) }, "github: license lookup failed");
    }
    return null;
  }
}

import type { Scout, ScoutContext } from "../types";
import { createGithubScout } from "./github";
import { createGoogleTrendsScout } from "./google-trends";
import { createHackerNewsScout } from "./hackernews";
import { createHuggingFaceScout } from "./huggingface";
import { createInternalSearchScout } from "./internal-search";
import { createArxivScout, createOfficialDocsScout } from "./official-docs";
import { createProductHuntScout } from "./producthunt";
import { createRedditScout } from "./reddit";
import { createRssScout } from "./rss";
import { createWebSearchScout } from "./web-search";
import { createYoutubeScout } from "./youtube";

export { dedupeSignals } from "./common";
export {
  createArxivScout,
  createGithubScout,
  createGoogleTrendsScout,
  createHackerNewsScout,
  createHuggingFaceScout,
  createInternalSearchScout,
  createOfficialDocsScout,
  createProductHuntScout,
  createRedditScout,
  createRssScout,
  createWebSearchScout,
  createYoutubeScout,
};

/** All scouts in run order (cheap public APIs first, paid/LLM ones last). */
export function createScouts(ctx: ScoutContext): Scout[] {
  const all = [
    createInternalSearchScout(ctx),
    createHackerNewsScout(ctx),
    createRedditScout(ctx),
    createGithubScout(ctx),
    createHuggingFaceScout(ctx),
    createArxivScout(ctx),
    createOfficialDocsScout(ctx),
    createRssScout(ctx),
    createProductHuntScout(ctx),
    createYoutubeScout(ctx),
    createGoogleTrendsScout(ctx),
    createWebSearchScout(ctx),
  ];
  const allow = ctx.options.sources;
  return allow ? all.filter((s) => allow.includes(s.kind)) : all;
}

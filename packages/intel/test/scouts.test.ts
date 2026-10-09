import { describe, expect, it } from "vitest";
import { createHttpClient, USER_AGENT } from "../src/http";
import { isAllowedLicense, normalizeLicense } from "../src/licenses";
import {
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
  createScouts,
  createWebSearchScout,
  createYoutubeScout,
  dedupeSignals,
} from "../src/scouts";
import type { IntelOptions, ScoutContext } from "../src/types";
import {
  type AiHandler,
  fakeAi,
  fakeFetch,
  has,
  json,
  type Route,
  silentLogger,
  testConfig,
  text,
} from "./helpers";

const NOW = new Date();

function ctxFor(
  routes: Route[],
  env: Record<string, string> = {},
  options: IntelOptions = {},
  ai: Partial<Record<string, AiHandler>> = {},
) {
  const f = fakeFetch(routes);
  const logger = silentLogger();
  const ctx: ScoutContext = {
    config: testConfig(env),
    http: createHttpClient({ fetch: f.fetch, logger, sleep: async () => {} }),
    ai: fakeAi(ai).ai,
    logger,
    options,
    now: () => NOW,
  };
  return { ctx, calls: f.calls };
}

describe("licenses", () => {
  it("normalizes SPDX ids and HF card values", () => {
    expect(normalizeLicense("mit")).toBe("MIT");
    expect(normalizeLicense("MIT")).toBe("MIT");
    expect(normalizeLicense("cc0-1.0")).toBe("CC0-1.0");
    expect(normalizeLicense("apache-2.0")).toBe("Apache-2.0");
    expect(normalizeLicense("CC-BY-4.0")).toBe("CC-BY-4.0");
    expect(normalizeLicense("Unlicense")).toBe("Unlicense");
    expect(normalizeLicense("cc-by-sa-4.0")).toBe("proprietary");
    expect(normalizeLicense("cc-by-nc-4.0")).toBe("proprietary");
    expect(normalizeLicense("GPL-3.0")).toBe("proprietary");
    expect(normalizeLicense("NOASSERTION")).toBe("unknown");
    expect(normalizeLicense("other")).toBe("unknown");
    expect(normalizeLicense(null)).toBe("unknown");
    expect(normalizeLicense(["mit", "apache-2.0"])).toBe("MIT");
    expect(normalizeLicense(["mit", "cc-by-nc-4.0"])).toBe("proprietary");
    expect(isAllowedLicense("MIT")).toBe(true);
    expect(isAllowedLicense("proprietary")).toBe(false);
    expect(isAllowedLicense("unknown")).toBe(false);
  });
});

describe("reddit scout", () => {
  const listing = (posts: object[]) => json({ data: { children: posts.map((d) => ({ kind: "t3", data: d })) } });
  const post = {
    id: "abc",
    name: "t3_abc",
    title: "I built a prompt that writes Instagram captions",
    selftext: "Here is how it works...",
    permalink: "/r/ChatGPT/comments/abc/x/",
    score: 950,
    subreddit: "ChatGPT",
    link_flair_text: "Prompt engineering",
    created_utc: NOW.getTime() / 1000,
  };

  it("is skipped without credentials", () => {
    const { ctx } = ctxFor([]);
    expect(createRedditScout(ctx).enabled(ctx.config)).toBe(false);
  });

  it("authenticates, parses, filters NSFW/stickied and dedupes top+hot", async () => {
    const { ctx, calls } = ctxFor(
      [
        { match: has("reddit.com/api/v1/access_token"), reply: () => json({ access_token: "tok" }) },
        {
          match: has("oauth.reddit.com/r/ChatGPT/top"),
          reply: () =>
            listing([post, { ...post, id: "nsfw", name: "t3_nsfw", over_18: true }, { ...post, id: "s", name: "t3_s", stickied: true }]),
        },
        { match: has("oauth.reddit.com/r/ChatGPT/hot"), reply: () => listing([{ ...post, score: 990 }]) },
      ],
      { REDDIT_CLIENT_ID: "id", REDDIT_CLIENT_SECRET: "secret" },
      { subreddits: ["ChatGPT"] },
    );
    const scout = createRedditScout(ctx);
    expect(scout.enabled(ctx.config)).toBe(true);
    const out = await scout.collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      source: "reddit",
      externalId: "t3_abc",
      metric: 990,
      metricName: "score",
      license: "unknown",
      locale: "en",
      url: "https://www.reddit.com/r/ChatGPT/comments/abc/x/",
    });
    expect(out[0]?.tags).toContain("r/chatgpt");
    const tokenCall = calls[0];
    expect(tokenCall?.init?.method).toBe("POST");
    const headers = tokenCall?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(headers["User-Agent"]).toBe(USER_AGENT);
    const listHeaders = calls[1]?.init?.headers as Record<string, string>;
    expect(listHeaders.Authorization).toBe("Bearer tok");
  });
});

describe("hackernews scout", () => {
  it("parses Algolia hits and dedupes across queries", async () => {
    const hits = {
      hits: [
        { objectID: "41", title: "Show HN: Prompt testing harness", url: "https://x.dev", points: 210, created_at_i: 1 },
        { objectID: "42", title: null, points: 5 },
      ],
    };
    const { ctx, calls } = ctxFor([{ match: has("hn.algolia.com"), reply: () => json(hits) }], {}, {
      hnQueries: ["prompt", "LLM"],
    });
    const out = await createHackerNewsScout(ctx).collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      externalId: "41",
      metric: 210,
      metricName: "points",
      url: "https://news.ycombinator.com/item?id=41",
    });
    expect(calls).toHaveLength(2);
    expect(decodeURIComponent(calls[0]?.url ?? "")).toContain("created_at_i>");
  });
});

describe("github scout", () => {
  it("reads license from search payload, falls back to the license endpoint", async () => {
    const items = {
      items: [
        {
          full_name: "f/awesome-chatgpt-prompts",
          html_url: "https://github.com/f/awesome-chatgpt-prompts",
          description: "Curated prompts",
          stargazers_count: 120000,
          topics: ["prompts", "chatgpt"],
          license: { key: "cc0-1.0", spdx_id: "CC0-1.0" },
        },
        {
          full_name: "acme/prompt-kit",
          description: "Prompt kit",
          stargazers_count: 300,
          topics: ["prompt-engineering"],
          license: { key: "other", spdx_id: "NOASSERTION" },
        },
        {
          full_name: "acme/no-license",
          stargazers_count: 50,
          license: null,
        },
        { full_name: "acme/fork", fork: true, stargazers_count: 9999 },
      ],
    };
    const { ctx, calls } = ctxFor(
      [
        { match: has("api.github.com/search/repositories"), reply: () => json(items) },
        {
          match: has("api.github.com/repos/acme/prompt-kit/license"),
          reply: () => json({ license: { spdx_id: "Apache-2.0" } }),
        },
        { match: has("api.github.com/repos/acme/no-license/license"), reply: () => json({ message: "Not Found" }, 404) },
      ],
      { GITHUB_TOKEN: "ghp_x" },
      { githubTopics: ["prompts"] },
    );
    const out = await createGithubScout(ctx).collect();
    const byId = Object.fromEntries(out.map((s) => [s.externalId, s]));
    expect(Object.keys(byId).sort()).toEqual(["acme/no-license", "acme/prompt-kit", "f/awesome-chatgpt-prompts"]);
    expect(byId["f/awesome-chatgpt-prompts"]?.license).toBe("CC0-1.0");
    expect(byId["acme/prompt-kit"]?.license).toBe("Apache-2.0");
    expect(byId["acme/no-license"]?.license).toBe("unknown");
    expect(byId["f/awesome-chatgpt-prompts"]?.metric).toBe(120000);
    const h = calls[0]?.init?.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer ghp_x");
  });
});

describe("huggingface scout", () => {
  it("reads cardData.license and tag fallback", async () => {
    const list = [
      { id: "fka/awesome-chatgpt-prompts", likes: 9000, cardData: { license: "cc0-1.0" }, tags: [] },
      { id: "x/nc-prompts", likes: 10, cardData: { license: "cc-by-nc-4.0" } },
      { id: "y/tagged", likes: 3, tags: ["license:mit", "language:fa"] },
      { id: "z/private", private: true },
    ];
    const { ctx } = ctxFor([{ match: has("huggingface.co/api/datasets"), reply: () => json(list) }]);
    const out = await createHuggingFaceScout(ctx).collect();
    const lic = Object.fromEntries(out.map((s) => [s.externalId, s.license]));
    expect(lic).toEqual({
      "fka/awesome-chatgpt-prompts": "CC0-1.0",
      "x/nc-prompts": "proprietary",
      "y/tagged": "MIT",
    });
  });
});

describe("producthunt scout", () => {
  it("needs a token and parses GraphQL posts", async () => {
    const payload = {
      data: {
        posts: {
          edges: [
            {
              node: {
                id: "p1",
                name: "SlideGenie",
                tagline: "AI decks from a brief",
                description: "Generate pitch decks",
                url: "https://www.producthunt.com/posts/slidegenie",
                votesCount: 480,
                topics: { edges: [{ node: { slug: "artificial-intelligence" } }] },
              },
            },
          ],
        },
      },
    };
    const none = ctxFor([]);
    expect(createProductHuntScout(none.ctx).enabled(none.ctx.config)).toBe(false);
    const { ctx, calls } = ctxFor(
      [{ match: has("api.producthunt.com"), reply: () => json(payload) }],
      { PRODUCTHUNT_TOKEN: "ph" },
    );
    const out = await createProductHuntScout(ctx).collect();
    expect(out[0]).toMatchObject({ externalId: "p1", metric: 480, metricName: "votes" });
    expect(String(calls[0]?.init?.body)).toContain("artificial-intelligence");
  });
});

describe("youtube scout", () => {
  it("searches per region and joins view counts", async () => {
    const { ctx } = ctxFor(
      [
        {
          match: has("youtube/v3/search"),
          reply: () =>
            json({ items: [{ id: { videoId: "v1" }, snippet: { title: "آموزش ساخت عکس محصول با هوش مصنوعی", channelTitle: "AI فارسی" } }] }),
        },
        { match: has("youtube/v3/videos"), reply: () => json({ items: [{ id: "v1", statistics: { viewCount: "52000" } }] }) },
      ],
      { YOUTUBE_API_KEY: "yt" },
      { youtubeQueries: [{ q: "آموزش هوش مصنوعی", regionCode: "IR", relevanceLanguage: "fa" }] },
    );
    const out = await createYoutubeScout(ctx).collect();
    expect(out[0]).toMatchObject({ externalId: "v1", metric: 52000, region: "IR", locale: "fa" });
  });
});

describe("google trends scout (SerpApi)", () => {
  it("turns rising related queries into signals, breakout → 5000", async () => {
    const { ctx, calls } = ctxFor(
      [
        {
          match: has("serpapi.com", "engine=google_trends"),
          reply: () =>
            json({
              related_queries: {
                rising: [
                  { query: "پرامپت عکس محصول", value: "Breakout", extracted_value: 0 },
                  { query: "پرامپت نویسی", value: "+250%", extracted_value: 250 },
                ],
              },
            }),
        },
      ],
      { SERPAPI_KEY: "serp" },
      { trendSeeds: [{ query: "پرامپت", geos: ["IR"] }] },
    );
    const out = await createGoogleTrendsScout(ctx).collect();
    expect(out.map((s) => s.metric).sort((a, b) => a - b)).toEqual([250, 5000]);
    expect(out[0]).toMatchObject({ region: "IR", locale: "fa", metricName: "rising_pct" });
    expect(calls[0]?.url).toContain("geo=IR");
  });
  it("is skipped without SERPAPI_KEY", () => {
    const { ctx } = ctxFor([]);
    expect(createGoogleTrendsScout(ctx).enabled(ctx.config)).toBe(false);
  });
});

describe("arxiv + official docs", () => {
  it("parses arXiv Atom entries as proprietary technique signals", async () => {
    const recent = new Date(NOW.getTime() - 2 * 86400_000).toISOString();
    const old = new Date(NOW.getTime() - 60 * 86400_000).toISOString();
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><id>http://arxiv.org/abs/2610.01234v2</id><published>${recent}</published>
<title>Self-Refine Prompting for &amp; Multilingual Tasks</title><summary>We study prompting...</summary>
<link href="http://arxiv.org/abs/2610.01234v2" rel="alternate" type="text/html"/><category term="cs.CL"/></entry>
<entry><id>http://arxiv.org/abs/2601.00001v1</id><published>${old}</published><title>Old</title><summary>x</summary></entry>
</feed>`;
    const { ctx } = ctxFor([{ match: has("export.arxiv.org"), reply: () => text(atom) }]);
    const out = await createArxivScout(ctx).collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      source: "arxiv",
      externalId: "2610.01234",
      license: "proprietary",
      title: "Self-Refine Prompting for & Multilingual Tasks",
    });
  });

  it("official docs: title/description only, versioned id, robots respected", async () => {
    const { ctx, calls } = ctxFor(
      [
        { match: has("docs.example.com/robots.txt"), reply: () => text("User-agent: *\nDisallow: /private") },
        {
          match: has("docs.example.com/guide"),
          reply: () =>
            text(`<html><head><title>Prompting guide</title><meta name="description" content="Be clear and direct"></head><body>long text</body></html>`, 200, {
              etag: '"v7"',
            }),
        },
      ],
      {},
      {
        officialGuides: [
          { vendor: "Example", title: "Guide", url: "https://docs.example.com/guide" },
          { vendor: "Example", title: "Private", url: "https://docs.example.com/private/x" },
        ],
      },
    );
    const out = await createOfficialDocsScout(ctx).collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      externalId: 'https://docs.example.com/guide@"v7"',
      license: "proprietary",
      snippet: "Be clear and direct",
      title: "Example: Prompting guide",
    });
    expect(calls.some((c) => c.url.includes("/private/x"))).toBe(false);
  });
});

describe("rss scout", () => {
  it("reads RSS 2.0 and Atom, drops old items", async () => {
    const fresh = NOW.toUTCString();
    const stale = new Date(NOW.getTime() - 10 * 86400_000).toUTCString();
    const rss = `<rss><channel><item><title><![CDATA[Agents are eating SaaS]]></title><link>https://blog.example.com/a</link><guid>a1</guid><pubDate>${fresh}</pubDate><description>Short</description></item>
<item><title>Old post</title><link>https://blog.example.com/old</link><pubDate>${stale}</pubDate></item></channel></rss>`;
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Prompt caching tips</title><link rel="alternate" href="https://atom.example.com/p"/><id>tag:atom,1</id><updated>${NOW.toISOString()}</updated><summary>Tips</summary></entry></feed>`;
    const { ctx } = ctxFor(
      [
        { match: has("blog.example.com/feed"), reply: () => text(rss) },
        { match: has("atom.example.com/feed"), reply: () => text(atom) },
      ],
      {},
      {
        rssFeeds: [
          { url: "https://blog.example.com/feed", title: "Blog" },
          { url: "https://atom.example.com/feed", title: "Atom", locale: "en" },
        ],
      },
    );
    const out = await createRssScout(ctx).collect();
    expect(out.map((s) => s.title).sort()).toEqual(["Agents are eating SaaS", "Prompt caching tips"]);
    expect(out.find((s) => s.title === "Prompt caching tips")?.url).toBe("https://atom.example.com/p");
  });
});

describe("internal search scout", () => {
  it("skips without the dependency and maps zero-result queries", async () => {
    const { ctx } = ctxFor([]);
    expect(createInternalSearchScout(ctx).enabled(ctx.config)).toBe(false);
    const withDep: ScoutContext = {
      ...ctx,
      zeroResultQueries: async () => [
        { query: "پرامپت  رزومه", count: 14, locale: "fa" },
        { query: "پرامپت رزومه", count: 3, locale: "fa" },
        { query: "x", count: 1 },
      ],
    };
    const out = await createInternalSearchScout(withDep).collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ metric: 14, region: "IR", source: "internal_search" });
  });
});

describe("web_search researcher-scout", () => {
  it("keeps only trends whose URL was actually cited, never marketplaces", async () => {
    const answer = {
      trends: [
        { title: "AI resume builder", summary: "Job seekers", keywords: ["رزومه"], useCases: ["CV"], momentum: 70, sourceUrls: ["https://news.example.com/cv?utm_source=x"] },
        { title: "Hallucinated", summary: "", keywords: [], useCases: [], momentum: 90, sourceUrls: ["https://made-up.example.com/"] },
        { title: "Marketplace", summary: "", keywords: [], useCases: [], momentum: 90, sourceUrls: ["https://promptbase.com/x"] },
      ],
    };
    const handler: AiHandler = (req) => {
      expect(req.webResearch?.maxSearches).toBe(8);
      expect(req.webResearch?.blockedDomains).toContain("promptbase.com");
      return {
        text: `Here you go\n\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``,
        citations: [
          { url: "https://news.example.com/cv", title: "CV news" },
          { url: "https://promptbase.com/x", title: "PB" },
        ],
      };
    };
    const { ctx } = ctxFor([], {}, { webResearchTargets: [{ locale: "fa", regions: ["IR"], label: "Iran" }] }, {
      intel_research: handler,
    });
    const out = await createWebSearchScout(ctx).collect();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: "AI resume builder", locale: "fa", region: "IR", metric: 70 });
  });
});

describe("scout registry", () => {
  it("dedupes by source+externalId keeping the highest metric", () => {
    const base = {
      source: "reddit" as const,
      url: "u",
      title: "t",
      snippet: "",
      locale: "en" as const,
      region: "GLOBAL" as const,
      metricName: "score",
      observedAt: NOW,
      license: "unknown" as const,
      tags: [],
    };
    const out = dedupeSignals([
      { ...base, externalId: "1", metric: 5 },
      { ...base, externalId: "1", metric: 9 },
      { ...base, source: "hackernews", externalId: "1", metric: 1 },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((s) => s.source === "reddit")?.metric).toBe(9);
  });

  it("honours the sources allow-list", () => {
    const { ctx } = ctxFor([], {}, { sources: ["hackernews", "rss"] });
    expect(createScouts(ctx).map((s) => s.kind)).toEqual(["hackernews", "rss"]);
  });
});

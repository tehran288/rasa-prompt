import type { TrendSignal } from "@rasa/shared";
import type { Scout, ScoutContext } from "../types";
import { dedupeSignals, hoursAgo, signal } from "./common";

const QUERY = `query RasaAiLaunches($after: DateTime!) {
  posts(first: 30, order: VOTES, topic: "artificial-intelligence", postedAfter: $after) {
    edges { node {
      id name tagline description url votesCount createdAt
      topics(first: 5) { edges { node { slug } } }
    } }
  }
}`;

interface PhResponse {
  data?: {
    posts?: {
      edges?: {
        node?: {
          id?: string;
          name?: string;
          tagline?: string;
          description?: string | null;
          url?: string;
          votesCount?: number;
          topics?: { edges?: { node?: { slug?: string } }[] };
        };
      }[];
    };
  };
  errors?: { message?: string }[];
}

/** Product Hunt API v2 (GraphQL, developer token). New AI launches → emerging use-cases. */
export function createProductHuntScout(ctx: ScoutContext): Scout {
  return {
    kind: "producthunt",
    enabled: (c) => Boolean(c.PRODUCTHUNT_TOKEN),
    async collect() {
      const now = ctx.now();
      const res = await ctx.http.json<PhResponse>("https://api.producthunt.com/v2/api/graphql", {
        bucket: "producthunt",
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.config.PRODUCTHUNT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { after: hoursAgo(now, 72).toISOString() },
        }),
      });
      if (res.errors?.length) {
        throw new Error(`producthunt: ${res.errors.map((e) => e.message).join("; ")}`);
      }
      const out: TrendSignal[] = [];
      for (const e of res.data?.posts?.edges ?? []) {
        const n = e.node;
        if (!n?.id || !n.name) continue;
        out.push(
          signal({
            source: "producthunt",
            externalId: n.id,
            url: n.url ?? `https://www.producthunt.com/posts/${n.id}`,
            title: `${n.name} — ${n.tagline ?? ""}`,
            snippet: n.description ?? n.tagline ?? "",
            locale: "en",
            region: "GLOBAL",
            metric: n.votesCount ?? 0,
            metricName: "votes",
            observedAt: now,
            license: "unknown",
            tags: (n.topics?.edges ?? []).map((t) => t.node?.slug ?? ""),
          }),
        );
      }
      return dedupeSignals(out);
    },
  };
}

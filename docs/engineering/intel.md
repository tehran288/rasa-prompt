# Trend intelligence (`packages/intel`)

The agent team that finds what people want, writes **original** premium prompts for it, tests,
localizes and prices them, and publishes them (or queues them for an admin).

```
scouts ─▶ IntelStore.saveSignals ─▶ analyst (pre-cluster + LLM + scores) ─▶ upsertTopic
   └─ per topic (concurrency 2, isolated):
      researcher ─▶ engineer ⇄ critic (≤2 rounds) ─▶ tester+judge ─▶ localizer ─▶ compliance
      ─▶ pricer ─▶ publisher (PUBLISH_GATES) ─▶ catalog.createFromDraft | review queue | rejected
```

## Public API

```ts
import { createIntelPipeline, type IntelRunReport } from "@rasa/intel";

const intel = createIntelPipeline(config, {
  ai, store: services.intel, catalog: services.catalog, logger,
  fetch,                          // optional, defaults to global fetch
  zeroResultQueries,              // optional: () => Promise<{query,count,locale?}[]>
  options,                        // optional IntelOptions (source lists, weights, concurrency…)
});
await intel.scout();              // → # new signals
await intel.analyze();            // → TrendTopic[] upserted
await intel.produce(5);           // → { published: promptIds, queued: draftIds, rejected }
const report: IntelRunReport = await intel.runAll();
// { startedAt, finishedAt, signalsCollected, newSignals, topics, published, queued,
//   rejected, costUsd?, errors: {stage, ref?, message}[] }
```

Also exported (for the worker/admin tools/tests): every scout factory, `createAnalyst`,
`preCluster`, `computeVelocity/Volume/TrendScore`, `createResearcher`, `createEngineer`,
`createCritic`, `refineWithCritic`, `createJudge`, `aggregateGrades`, `createCompliance`,
`originalityScore`, `licenseCheck`, `createLocalizer`, `suggestPrice`, `createPublisher`,
`evaluateGates`, `normalizeLicense`, the system prompts and `intelSources` (curated lists).

## Agent roster

| Agent | Module | AI task | Input → output |
|---|---|---|---|
| Scouts (12) | `src/scouts/*` | — (web_search: `intel_research`) | public APIs → `TrendSignal[]` (deduped by source+externalId) |
| Analyst | `analyst.ts` | `intel_analyze` (json) | recent signals (72h) → deterministic keyword pre-clusters (≤40) → LLM merges into sellable topics → scores → `upsertTopic` |
| Researcher | `researcher.ts` | `intel_research` + `webResearch{maxSearches:6, blockedDomains}` | topic → `ResearchNote[]` (best_practice / pain_point / use_case / model_tip), only URLs the provider actually cited |
| Prompt engineer | `engineer.ts` | `intel_engineer` (json) | topic + notes + signal titles → original prompt (Role → Context → Task → {{Variables}} → Constraints → Output format → Example → Stop criteria), labelled variables, models, categories, tier, 2–3 sample inputs |
| Critic / red team | `critic.ts` | `intel_critic` (json) | prompt → verdict + issues (ambiguity, missing constraints, format, variables, safety, language, originality); engineer revises, max 2 rounds |
| Tester + judge | `judge.ts` | `run_prompt` + `intel_judge` (json) | runs the prompt on each sample input, grades 5 criteria 0–10 → score 0–100, pass = mean ≥ 7.5, no criterion < 6, safety ≥ 8 |
| Localizer | `localizer.ts` | `intel_localize` (json) | source locale → the other two, market-adapted (currency, occasions, platforms, names); `{{variables}}` set must match exactly, else repair retry (×2) |
| Compliance | `compliance.ts` | `intel_compliance` (json) + deterministic checks | originality, licenseOk, policyOk (see below) |
| Pricer | `pricer.ts` | — | complexity (vars, length, output type) + trend score → tier and price |
| Publisher | `publisher.ts` | — | `PUBLISH_GATES` → publish / review / reject, topic status update |

Source locale: `fa`, except topics whose regions are all Arabic markets (SA, AE, EG, IQ) → `ar`.
A draft whose judge score is < 50 is rejected before localization, so no money is wasted on it.
Topics below `minTrendScoreToProduce` (default 40) are not produced at all.

### Scores
- `volume` = 100·(1 − e^(−Σp/3)), p = metric percentile **within its own source** (stars vs upvotes are comparable).
- `velocity` = share of signal strength observed in the last 24h; when Google Trends rising % or
  researcher momentum exist: 0.6·share + 0.4·growth (Trends: log₁₀(1+v)/log₁₀(5001), breakout = 5000).
- `commercialIntent`, `fit` from the analyst LLM; `gap` = `catalog.coverageGap(keywords, locale)`.
- `trendScore` = Σ wᵢ·scoreᵢ / Σ wᵢ with `DEFAULT_TREND_WEIGHTS` (override via `options.weights`).

### Compliance
- **originality** = 100 − max overlap (%) over every (body locale × source) pair, word 5-grams on
  normalized text (fa/ar letter variants, digits, ZWNJ, punctuation, `{{vars}}` removed). Overlap
  = max(Jaccard, containment |A∩B|/min(|A|,|B|)). Containment is **stricter than plain Jaccard**:
  a short snippet pasted into a long body can't hide behind a large union. Sources = contributing
  signals' title+snippet and research notes. All localized bodies are checked, so a translated copy of
  an English source is caught in the `en` body.
- **licenseOk** = false when a source whose license is not in `ALLOWED_CONTENT_LICENSES` overlaps
  ≥ 10% with any body.
- **policyOk** = LLM policy check (jailbreak, deception, adult, political propaganda, impersonation,
  hate, self-harm, illegal, privacy) AND no deterministic red flag (e.g. "ignore previous instructions").

### Publishing
Gates: judge present, passed and ≥ `minJudgeScore` (80); originality ≥ 85; licenseOk; policyOk;
topic trendScore ≥ 55; fa title/body present.
- policyOk false → `saveDraft(…, "rejected")`, topic `rejected`. Never published.
- `INTEL_AUTO_PUBLISH=true` and no failed gate → `catalog.createFromDraft(draft, true)`,
  `saveDraft(…, "published", id)`, topic `published`. If the catalog call fails, the draft goes to review.
- Otherwise → `saveDraft(…, "review")`, topic `drafted`.
- An unexpected error while producing a topic is logged in `report.errors` and the topic goes back to `new`.

### Pricing
| Tier | Toman | Stars |
|---|---|---|
| pro | 49,000 – 99,000 | 60 – 120 |
| premium | 149,000 – 290,000 | 180 – 350 |

complexity = 0.4·min(1, vars/8) + 0.4·min(1, words/900) + 0.2·outputWeight (automation 1, code/video
0.8, image/audio 0.6, text 0.5). premium if complexity ≥ 0.6 (or ≥ 0.45 and the engineer said premium).
Position in band = 0.5·complexity + 0.3·trend/100 + 0.2·outputWeight. Toman is rounded to the nearest
…9,000 (79,000, 149,000, 289,000); Stars to the nearest 10; both are clamped to the band.

## Source catalog

| Source | API | Key env var | What we take | License handling | Rate limit (ours) | Cost |
|---|---|---|---|---|---|---|
| reddit | OAuth2 client_credentials → `oauth.reddit.com/r/{sub}/top?t=day`, `/hot` (8 subs) | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | title, ≤400-char excerpt, score, permalink, flair; skips NSFW/stickied | `unknown` (user content, never imported) | ≥700 ms between calls (API: 100 QPM) | free (non-commercial tier; check Reddit Data API terms for commercial use) |
| hackernews | `hn.algolia.com/api/v1/search` stories, last 72h, points > 15 | — | title, points, item URL | `unknown` | 400 ms | free |
| github | `api.github.com/search/repositories` (topics prompt-engineering, prompts, awesome-prompts; pushed ≤7d / created ≤30d; sort stars) + `/repos/{r}/license` fallback | `GITHUB_TOKEN` (optional) | repo name, description, stars, topics | SPDX id from API → `normalizeLicense` (MIT/Apache/CC0/CC-BY-4.0/Unlicense allowed; others `proprietary`; none `unknown`) | 2.5 s (search: 30/min with token, 10 without) | free |
| huggingface | `huggingface.co/api/datasets?search=prompts&sort=trendingScore&full=true` | — | dataset id, likes, description | `cardData.license` (fallback `license:` tag); lists must be all-allowed | 500 ms | free |
| producthunt | GraphQL v2, AI topic posts of the last 72h by votes | `PRODUCTHUNT_TOKEN` | name, tagline, votes, topics | `unknown` | 1 s | free; PH API terms restrict commercial use — ask PH before production |
| youtube | Data API v3 `search.list` (fa/IR, ar/SA+AE, en/US, last 7d, by views) + `videos.list` | `YOUTUBE_API_KEY` | title, description excerpt, views | `proprietary` | 500 ms; ~606 quota units/run (10k/day) | free quota |
| google_trends | SerpApi `engine=google_trends&data_type=RELATED_QUERIES`, rising, `now 7-d`; seeds هوش مصنوعی, پرامپت (IR), الذكاء الاصطناعي (SA/AE/EG), ai prompt, chatgpt, midjourney | `SERPAPI_KEY` | rising query, % growth (breakout = 5000) | `unknown` | 1 s; 10 searches/run | 1 SerpApi credit per search |
| official_docs | page fetch of 7 vendor prompting guides (robots.txt honoured) | — | `<title>`, meta description, ETag/hash → "guide changed" | always `proprietary` (techniques only) | 2 s | free |
| arxiv | `export.arxiv.org/api/query`, prompting papers ≤14d | — | title, abstract excerpt | `proprietary` | 3.1 s (arXiv asks 1 req/3 s) | free |
| rss | 8 curated AI newsletters/blogs (`options.rssFeeds`), robots.txt honoured | — | title, link, excerpt, last 72h | `proprietary` | 1 s | free |
| internal_search | `deps.zeroResultQueries()` (our bots/site) | — | query, count | `unknown` | — | free |
| web_search | LLM researcher-scout: `ai.complete({task:"intel_research", webResearch:{maxSearches:8}})` for fa/IR, ar/Gulf+EG, en/global | AI provider keys | trend title, summary, keywords, momentum — **only URLs the provider cited**; marketplaces blocked | `unknown` | — | ~3 calls × 8 searches per run |

All HTTP goes through `createHttpClient`: User-Agent `RasaPromptBot/1.0 (+https://rasa-prompt.ir/bot)`,
15 s timeout, per-source minimum interval, one retry on 429/5xx (honours `Retry-After` up to 30 s),
API keys redacted from errors. Scouts without keys are skipped (`enabled(config)` false) and are never called.
One failing scout never stops the others; one failing query/feed never stops its scout.

Blocked as text sources (research, web_search): promptbase.com, laprompt.com, godofprompt.ai,
aiprm.com, flowgpt.com, prompthero.com, promptrr.io, snackprompt.com, chatx.ai, etsy.com, gumroad.com,
creativefabrica.com (`intelSources.BLOCKED_TEXT_DOMAINS`).

## Schedule (suggestion for `apps/worker`)
- `scout()` every 6 h (03:10, 09:10, 15:10, 21:10 Tehran). Cheap; the analyst's velocity score needs repeated observations.
- `runAll()` once a day at 04:30 Tehran (scout → analyze → produce `INTEL_DAILY_DRAFTS`), then post the
  `IntelRunReport` to the admin chat along with the review queue size.
- Weekly: refresh `rssFeeds` / `officialGuides` lists, look at the rejected reasons and the judge calibration (plan doc 04, P2).
- Budget: one premium draft is about $0.13 plus research and test runs. `AI_DAILY_BUDGET_USD` in the router is the hard stop;
  the run report carries `costUsd` (the change in `spentTodayUsd()`).

## Legal rules (non-negotiable, enforced in code)
1. Signals only: titles, short (≤400 chars) snippets, metrics, URLs. Official APIs; robots.txt for page/feeds; clear User-Agent; per-source rate limits.
2. No paid-prompt text: marketplaces are blocked in web research and filtered from notes/signals. Licenses come from the API. Anything not in
   `ALLOWED_CONTENT_LICENSES` can never contribute text (`licenseOk`).
3. Every draft passes the 5-gram originality check on **all** locales before publishing (gate 85).
4. Provider choice is the router's job (task → provider via config); this package never picks providers or regions.
5. Research notes are paraphrased claims with citations. Admins see them; buyers never do.

## How to add a source
1. Add `SourceKind` to `SOURCE_KINDS` in `@rasa/shared` (contract change, so ask the lead) or reuse an existing kind.
2. Create `src/scouts/<name>.ts` exporting `create<Name>Scout(ctx: ScoutContext): Scout`:
   `enabled(config)` returns false when the key is missing; `collect()` uses `ctx.http.json/text` with `bucket: "<name>"`,
   builds signals with `signal({...})` (it truncates and detects locale), and sets `license` from the source or `unknown`.
   Catch per-query errors and log them; throw only when the whole source is unusable.
3. Add a min interval to `DEFAULT_MIN_INTERVAL_MS` in `http.ts`, and add defaults to `sources.ts`.
4. Register it in `createScouts` (`src/scouts/index.ts`).
5. Add a test in `test/scouts.test.ts` with a realistic payload via `fakeFetch`, and add a row to the table above.

## Run / test
```
npx vitest run packages/intel     # 53 tests, no network (fake fetch + fake AiRouter + in-memory store)
npx biome check packages/intel
npx tsc -p tsconfig.json
```
Env: `REDDIT_CLIENT_ID/SECRET`, `GITHUB_TOKEN`, `YOUTUBE_API_KEY`, `PRODUCTHUNT_TOKEN`, `SERPAPI_KEY`,
`INTEL_DAILY_DRAFTS` (10), `INTEL_AUTO_PUBLISH` (false).

## Known limits
- `PromptDraft.variables[].options` is not localized (the contract has `string[]`), so select options stay in the source language.
- Localized example outputs are dropped (the contract has a single `exampleOutput`).
- A topic that throws during production goes back to `new` and is retried on the next run with no retry cap (needs a counter in the store).
- Judge runs use the router's `run_prompt` model only, not each target model (image prompts are graded as text).
- `upsertTopic` is called with the existing `id` when the key is already known. The analyst reads all statuses via `topTopics(status, 500)` to find them.

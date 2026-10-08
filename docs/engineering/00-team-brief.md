# Engineering team brief — Rasa Prompt bots + trend intelligence

Read this fully before writing code. It is the shared agreement between all specialist agents.

## Product in one paragraph
Rasa Prompt (rasa-prompt.ir) sells tested, always-updated professional AI prompts in Persian (fa, primary),
Arabic (ar) and English (en). The **Telegram bot** and the **Bale bot** (Iranian messenger, Telegram-compatible
Bot API at `https://tapi.bale.ai/bot<token>/<method>`) are the first storefronts; the website comes later and will
share the same database. A **trend-intelligence agent team** continuously finds what people want (web signals),
writes *original* premium prompts for those trends, tests them, localizes them and publishes them to the catalog.

Business docs: `docs/plan/*.md` (Persian). Most relevant: 04 (automation pipelines), 05 (pricing), 08 (KPIs), 09 (risks).

## Monorepo layout and ownership
| Path | Owner agent | Purpose |
|---|---|---|
| `packages/shared` | lead (frozen contract) | domain types, service interfaces, config, logger. **Do not change without telling the lead** — if you need a contract change, write it in your final report instead. You MAY add new files (e.g. i18n, normalize) only if your brief says so. |
| `packages/db` | db agent | Drizzle schema, SQL migrations, all service implementations from `contracts.ts` except AI/payments/intel pipeline, seed data |
| `packages/ai` | ai agent | `AiRouter` (Anthropic + OpenAI-compatible providers), `AssistantAgents` |
| `packages/payments` | payments agent | `PaymentService` for Telegram Stars + Bale wallet + web checkout link |
| `packages/intel` | intel agent | scouts, analyst, researcher, engineer, critic, judge, compliance, localizer, pricer, publisher |
| `apps/bot` | bot agent | grammY bot, one codebase for both platforms; i18n fa/ar/en; webhook server |
| `apps/worker` | ops agent | pg-boss scheduled jobs, broadcasts, reports, channel posting, intel schedule; Docker, CI, runbooks |

Only edit files inside your own path (plus your own docs file under `docs/engineering/`). Never edit another agent's
package; depend on the interfaces in `@rasa/shared` instead and construct implementations via factory functions that
the owning package exports (listed below).

## Factory functions each package must export (names are fixed)
- `@rasa/db`: `createDb(url: string)` → `{ db, sql, close() }`; `createServices(db)` → `{ catalog, users, entitlements, credits, products, orders, referrals, tickets, analytics, settings, intel }` implementing the `contracts.ts` interfaces (`intel` = `IntelStore`); `runMigrations(url)`; `seed(db)`.
- `@rasa/ai`: `createAiRouter(config, deps: { settings: SettingsService; logger })` → `AiRouter`; `createAssistantAgents(router, deps: { catalog, orders, entitlements, credits, tickets, logger })` → `AssistantAgents`; `createFakeAiRouter(responses)` for tests.
- `@rasa/payments`: `createPaymentService(config, deps: { orders, products, entitlements, credits, referrals, users, analytics, logger, refundStars?: (userId: string, chargeId: string) => Promise<void> })` → `PaymentService`.
- `@rasa/intel`: `createIntelPipeline(config, deps: { ai: AiRouter; store: IntelStore; catalog: CatalogService; logger; fetch?: typeof fetch })` → `{ scout(): Promise<number>; analyze(): Promise<TrendTopic[]>; produce(limit: number): Promise<{ published: string[]; queued: string[]; rejected: number }>; runAll(): Promise<IntelRunReport> }`.
- `apps/bot`: `createBot(platform, config, services, ai, payments)` → grammY `Bot`.

## Conventions
- TypeScript strict, ESM, Node 22. Packages export TS source (`main: src/index.ts`); apps are bundled with tsup.
- Lint/format: Biome (`pnpm lint`, `pnpm format`). Typecheck: `pnpm typecheck`. Tests: Vitest (`pnpm test`), files in `<pkg>/test/*.test.ts`.
- **Dependencies are already installed** (grammy, @grammyjs/*, hono, drizzle-orm, postgres, pg-boss, @anthropic-ai/sdk, zod v4, pino). Do NOT run `pnpm add`/`pnpm install` (parallel agents would corrupt the lockfile). If you truly need another dependency, say so in your final report.
- Database for tests: real Postgres is running locally — `TEST_DATABASE_URL=postgres://rasa:rasa@localhost:5432/rasa_test` (superuser, pg_trgm available). Each test file must create/clean its own data (use a unique schema or truncate).
- No network in tests. Telegram/Bale/Anthropic/web are **not reachable** from this sandbox: mock `fetch`, use grammY API transformers to capture outgoing calls, use `createFakeAiRouter`.
- Money: Toman for display; Bale invoices use **IRR (rial = toman × 10)**; Telegram digital goods use **Stars (`XTR`, provider_token "")** — Telegram policy for digital goods.
- Paid prompt bodies are never sent unless `EntitlementService.canAccess` is true. When delivering a paid body, embed an invisible watermark (helper in `@rasa/shared` is not provided — the bot agent implements `watermark.ts` in apps/bot).
- All user-facing text goes through i18n (fa/ar/en). Persian is the source language; Arabic must be natural Modern Standard Arabic; English natural.
- Secrets only from env (`packages/shared/src/config.ts`). Never log tokens.
- Errors: throw `DomainError` for business rule failures; everything else bubbles to a top-level handler that logs and replies with a friendly localized message.

## Legal / compliance rules for trend intelligence (non-negotiable)
1. Collect **signals** (topics, keywords, metrics, URLs, short snippets) from public sources via official APIs or permitted fetching; respect robots.txt and rate limits; identify with a clear User-Agent.
2. Never copy the text of other sellers' paid prompts (PromptBase, etc.). Prompt text may only be imported from sources whose license is in `ALLOWED_CONTENT_LICENSES`, with attribution kept.
3. Every generated prompt passes an originality check against the source snippets (n-gram overlap) before publishing.
4. AI providers are chosen per task via config; the code must not attempt to bypass any provider's regional availability.

## Definition of done for every agent
- `pnpm lint`, `pnpm typecheck`, and your package's tests pass.
- A short doc `docs/engineering/<area>.md` explaining design, env vars, how to run/test, known limits.
- Final report to the lead: what you built, public API, files, test results, open issues/contract-change requests.

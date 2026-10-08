# Ops: worker, schedules, Docker, CI

Owner: ops agent. Code: `apps/worker`, `infra/`, `.github/workflows/`. Founder runbook (Persian):
[`runbook-fa.md`](./runbook-fa.md). Deployment topology: [`infra/deploy.md`](../../infra/deploy.md).

## Worker design

- `src/main.ts` — loads config, builds the container, starts **pg-boss 12** (`schema: "pgboss"`,
  same `DATABASE_URL`), registers jobs, serves `GET /healthz` on `PORT`, graceful stop on SIGTERM.
- `src/container.ts` — `runMigrations` → `createDb` → `createServices` → `createAiRouter` →
  `createAssistantAgents` → `createIntelPipeline`; grammY `new Api(token, { apiRoot })` per platform
  (Telegram: `TELEGRAM_API_ROOT`, Bale: `BALE_API_ROOT`; a platform with an empty token is skipped).
- `src/jobs/*.ts` — each job is a plain async function over an explicit deps object (no globals),
  unit-tested with fakes. `src/handlers.ts` binds them to queues; `src/schedule.ts` owns the job
  table and wraps every handler with structured logging (`queue`, `jobId`, `ms`, result summary) and
  error isolation (a throw fails only that pg-boss job, which pg-boss retries per queue policy).
- `src/messenger.ts` — `Messenger` abstraction over grammY `Api`, `deepLink()`
  (`https://t.me/<bot>?start=p_<id>`, `https://ble.ir/<bot>?start=p_<id>`), error classifier
  (403 → blocked, 429 → retry_after), pacing rate limiter.
- `src/public.ts` — importable by the bot as `@rasa/worker/public`: `QUEUES`, payload types,
  `enqueueBroadcast(boss, payload)`, `enqueuePromptUpdated(boss, payload)`.

Cron queues use policy `stately` (≤1 queued + ≤1 active → no pile-ups after downtime; pg-boss
`missed: "skip"` default means missed runs are not replayed).

## Job table

All crons are UTC (`tz: "UTC"`). Tehran = UTC+03:30 all year (Iran dropped DST in 2022).

| Queue | Tehran | Cron (UTC) | What | Failure handling / idempotency |
|---|---|---|---|---|
| `intel-scout` | every 6h: 03:30, 09:30, 15:30, 21:30 | `0 */6 * * *` | `intel.scout()` — collect signals | retry 2× w/ backoff; signals dedupe by source+externalId |
| `intel-analyze` | 02:30 | `0 23 * * *` | `intel.analyze()` — cluster/score topics | retry 2×; topics upsert by key |
| `intel-produce` | 03:00 | `30 23 * * *` | `intel.produce(INTEL_DAILY_DRAFTS)`, then review-queue summary → admin chats | skipped (with admin notice) when AI spend ≥ budget; retry 1× |
| `channel-post` | 10:00 | `30 6 * * *` | prompt of the day: Telegram channel fa+ar (HTML), Bale channel fa (plain), deep link `?start=p_<id>` + URL button | AI failure → template; paid-body guard; invalid HTML → plain resend; per platform/locale dedupe key `channel_post:<p>:<l>:<date>` |
| `daily-report` | 08:00 | `30 4 * * *` | `analytics.dailyStats(yesterday)` + AI spend + review queue + open tickets → `writeDailyReport` → admin chats | each input isolated; AI failure → Persian template; `daily_report:<date>` dedupe |
| `abandoned-cart` | every 30 min | `*/30 * * * *` | 1 localized reminder per order pending 60 min–24 h; then `orders.expireStale(1440)` | `cart_reminder:<orderId>` dedupe (set also on 403); per-order error isolation |
| `health-watch` | every 5 min | `*/5 * * * *` | DB ping, `getMe` per bot, AI budget (ok / ≥80% / exceeded) | alerts **only on state change** (memory + `health:last` setting survives restarts); no retries |
| `cleanup` | 04:15 | `45 0 * * *` | delete `search_logs` (created_at) and `bot_sessions` (updated_at) older than 90 days, and the worker's own dedupe keys in `settings` | missing table → skipped; per-table isolation |
| `broadcast` | on demand | — | payload `{segment, locale?, platform?, text, html?, buttons?}` → `users.iterateAudience` batches of 500; ≤25 msg/s Telegram, ≤10 msg/s Bale; progress every 2000 + final summary → admins; `analytics.track("broadcast_sent")` | 429 → sleep retry_after (≤3×); 403/"chat not found" → counted as blocked; checkpoint `broadcast:<jobId>` per batch → retry resumes, completed job never re-sends (≤1 batch may repeat after a mid-batch crash) |
| `prompt-updated-notify` | on demand | — | payload `{promptId, version}` → owners (`buyers` segment ∩ `entitlements.canAccess`) get a localized message + deep link | same fan-out/checkpoint as broadcast, key `prompt_update:<id>@<version>` |

Admin chats = `TELEGRAM_ADMIN_CHAT_ID` and/or `BALE_ADMIN_CHAT_ID`. Admin text is Persian;
user-facing text (cart reminder, prompt update) is fa/ar/en (`src/i18n.ts`).

### Enqueue from the bot

```ts
import { enqueueBroadcast, enqueuePromptUpdated } from "@rasa/worker/public";
await enqueueBroadcast(boss, { segment: "buyers", locale: "fa", text: "…", html: true,
  buttons: [[{ text: "مشاهده", url: "https://t.me/…?start=p_…" }]] });
```

(Or `boss.send("broadcast", payload, { retryLimit: 1 })` — the bot needs a pg-boss client with
`schema: "pgboss"`; `start()` is not required just to `send`, but the bot must call `boss.start()`
once if it wants pg-boss to create/verify the schema.)

## Env vars used by the worker

`DATABASE_URL`, `LOG_LEVEL`, `PORT` (health), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_ROOT`,
`BALE_BOT_TOKEN`, `BALE_API_ROOT`, `TELEGRAM_ADMIN_CHAT_ID`, `BALE_ADMIN_CHAT_ID`,
`TELEGRAM_CHANNEL_ID`, `BALE_CHANNEL_ID`, `AI_DAILY_BUDGET_USD`, `INTEL_DAILY_DRAFTS`, plus
whatever `@rasa/ai` and `@rasa/intel` read (AI keys/routes, scout keys).

## Run / test

```bash
pnpm dev:worker                       # tsx watch, needs Postgres (docker compose … up postgres)
npx vitest run apps/worker            # unit tests with fakes, no network/DB
pnpm --filter @rasa/worker build      # tsup (config in apps/worker/tsup.config.ts)
```

## Docker / CI

- `infra/Dockerfile` — targets `worker` and `bot`; pnpm via corepack; tsup bundles; runtime =
  node:22 slim + hoisted prod `node_modules`, non-root `node`, tini, `HEALTHCHECK /healthz`;
  Drizzle migrations copied to `apps/<app>/drizzle` (where `@rasa/db` resolves them from the bundle).
- `infra/docker-compose.yml` — postgres 16 (+pg_trgm init), worker, bot-telegram, bot-bale,
  optional `caddy` (profile `proxy`) and `backup` (profile `backup`).
- `.github/workflows/ci.yml` — PR/push: frozen install, `biome ci`, `tsc`, vitest with postgres:16
  service (`TEST_DATABASE_URL`), build, and a no-push Docker build of both targets.
- `.github/workflows/docker.yml` — on `v*` tags: build & push `ghcr.io/<owner>/rasa-{bot,worker}`
  (amd64+arm64) with `GITHUB_TOKEN`.

## Known limits / open issues

1. **No "mark unreachable" in `UserService`** — 403s are counted, not persisted; blocked users stay
   in every broadcast audience. Requested: `users.markUnreachable(userId)` / filter in `iterateAudience`.
2. **No owners query** — `prompt-updated-notify` scans the `buyers` segment and calls `canAccess`
   per user. Requested: `entitlements.listOwners(promptId)` (async iterable).
3. **AI spend for yesterday** — `AiRouter.spentTodayUsd()` only; the 08:00 report shows today's
   spend so far. Requested: `spentOnDate(date)`.
4. The bot must expose `GET /healthz` on `PORT` (Dockerfile/compose health checks assume it).
5. The admin review command is assumed to be `/review` in the bot (text in intel-produce summary).
6. Broadcast resume assumes `iterateAudience` yields users in a stable order (e.g. by id).

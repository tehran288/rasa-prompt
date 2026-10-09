# @rasa/db — database & domain services

Postgres 16 + Drizzle ORM 0.45 (postgres.js driver). Implements every DB-backed interface in
`packages/shared/src/contracts.ts`, plus the grammY session store and the seed catalog.

## Public API (`packages/db/src/index.ts`)

| Export | Purpose |
|---|---|
| `createDb(url, { max? })` → `{ db, sql, close() }` | Pooled connection (postgres.js, default 10). |
| `createServices(db, { referralRewardCredits?, adminIds? })` | `{ catalog, users, entitlements, credits, products, orders, referrals, tickets, analytics, settings, intel }`. Pass `referralRewardCredits: config.REFERRAL_REWARD_CREDITS` (default 50) and `adminIds: { telegram: config.TELEGRAM_ADMIN_IDS, bale: config.BALE_ADMIN_IDS }`. |
| `runMigrations(url)` | Applies `packages/db/drizzle/*.sql` with the drizzle migrator (single connection, idempotent). |
| `seed(db)` | Idempotent upsert of categories, plans, credit packs, 40 prompts, 2 bundles. Never touches users/orders. |
| `createSessionStorage<T>(db, prefix?)` | grammY `StorageAdapter` shape `{ read, write, delete }` on `bot_sessions`. Use a per-platform prefix (`"tg:"`, `"bale:"`). |
| `normalizeText`, `normalizeForSearch`, `searchTokens` | fa/ar/en text normalization (see below). |
| `guessLocale`, `generateReferralCode`, `REFERRAL_ALPHABET` | Helpers used by `users.upsert`. |
| `schema` | Drizzle table objects, for admin tooling/tests. Types `Db`, `Tx`, `Executor`. |

## Schema summary

All ids are `uuid` (`gen_random_uuid()`) except append-only logs (`bigserial`). Timestamps are `timestamptz`.
Localized fields are `jsonb` `{ fa, ar?, en? }` (fa always present; readers fall back to fa).

- **users** — unique `(platform, platform_user_id)`, unique `referral_code` (8 chars, alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`), `referred_by_user_id`, `locale`, `is_admin`, `is_banned`.
- **categories** — `slug` unique, `name` jsonb, `emoji`, `sort`.
- **prompts** — localized `title/summary/description/body/example_output`, `variables` jsonb (labels localized), `version`, `tier`, `output_type`, `models text[]`, `quality_score`, `status`, `price_toman`, `price_stars` (null ⇒ not sold individually), `last_tested_at`, `published_at`, `trending_score`, `source/license/attribution/source_url`, and search columns `search_text` (GIN `gin_trgm_ops`), `search_fa/ar/en`.
- **prompt_categories**, **prompt_versions** (unique `(prompt_id, semver)`, body/variables/changelog), **bundles** + **bundle_prompts**.
- **plans** (`code` unique, `duration_days` null ⇒ lifetime, `includes_premium`), **credit_packs** (`code` unique).
- **orders** — `items` jsonb, `currency` XTR|IRR, `total` (stars or rial), `status`, `provider_charge_id` **UNIQUE** (idempotency), `paid_at`, `refunded_at`.
- **entitlements** — the only source of access control: `kind` prompt|bundle|all_pro|all_premium, `ref_id`, `order_id`, `plan_id`, `expires_at` (null = forever), `revoked_at`. Partial unique `(order_id, kind, ref_id)` makes grants idempotent.
- **credit_ledger** — append-only, `delta`, `reason`, `ref_id`, informational `balance_after`. **Balance = SUM(delta); there is no balance column.** Partial unique `(user_id, reason, ref_id) WHERE delta > 0 AND ref_id IS NOT NULL` makes grants with a refId idempotent.
- **referrals** (unique `referred_user_id`, `rewarded_at`, `reward_credits`), **tickets**, **ticket_messages**, **analytics_events**, **search_logs**, **settings** (kv jsonb), **bot_sessions**.
- **intel_signals** (unique `(source, external_id)`), **intel_topics** (unique `key`), **intel_drafts** (`state` review|published|rejected|approved).

Migrations: `0000_extensions.sql` (`CREATE EXTENSION IF NOT EXISTS pg_trgm`, hand-written custom migration) and `0001_init.sql` (generated). After changing `src/schema.ts` run `pnpm db:generate` and commit the new SQL + `drizzle/meta`.

## Business rules (where they live)

- **Search** (`search.ts`, `services/catalog.ts`): query and stored text both go through `normalizeForSearch`. A prompt matches if the whole phrase matches `search_text` (ILIKE substring or `word_similarity ≥ 0.5`) **or** every token does. Rank = 2·word_similarity(all) + exact-phrase bonus + similarity on the user's locale column + locale phrase bonus + quality/200. Sorts: relevance (default) | quality | newest | trending. Every `search()` writes a `search_logs` row with `results_count = total`. `coverageGap` uses the same predicate (restricted to prompts that have text in the locale): gap = 100·(1 − mean(min(1, matches/3))).
- **Normalization** (`normalize.ts`): NFKC; ي/ى/ئ→ی, ك→ک; أ/إ/آ/ٱ→ا; ة/ۀ→ه; ؤ→و; Persian & Arabic-Indic digits→0-9; strip harakat/tatweel; ZWNJ/ZWJ/bidi marks/NBSP→space; collapse whitespace; lowercase.
- **Users**: locale guessed from `language_code` prefix (ar/en, else fa); set only at creation. Referral code on signup creates a `referrals` row (unknown codes ignored, existing users never re-attributed). Concurrent first contact is safe (`ON CONFLICT DO NOTHING`).
- **Entitlements**: prompt → that prompt; bundle → its prompts (dynamic via `bundle_prompts`); plan → `all_pro` (+ `all_premium` when `includes_premium`, i.e. yearly/lifetime) until `expires_at`; renewals stack onto a running period; credit_pack → nothing here. `grantForOrder` requires the order to be paid/fulfilled and **does not grant credits** (the payments package grants plan monthly credits and packs via `CreditService.grant(..., "purchase", order.id)` and claws back on refund). `revokeForOrder` only revokes entitlements. Free prompts are always accessible. `library()` lists explicitly owned prompts (prompt + bundle entitlements), not the whole subscription catalog.
- **Orders**: `markPaid` locks the row (`FOR UPDATE`); same chargeId on a paid/fulfilled/refunded order → `{ firstTime: false }`; different chargeId → `DomainError("invalid_state")`; amount ≠ total → `amount_mismatch`; a chargeId already used by another order → `invalid_state` (unique constraint). Pending/expired/cancelled orders can be paid (the provider already charged). `markFulfilled`: paid → fulfilled, idempotent; other states → `invalid_state`. `markRefunded` idempotent from paid/fulfilled. `listForUser` newest first (max 100).
- **Credits**: grant/spend run in a transaction holding `pg_advisory_xact_lock(hashtextextended('credits:'||user))`; spend throws `insufficient_credits` and the balance can never go negative (tested with 15 concurrent spends). Amounts must be positive integers.
- **Referrals**: `onFirstPurchase` rewards both sides once (`SELECT … FOR UPDATE` on the referral row + `rewarded_at`), only if the referred user has a paid/fulfilled order. Ledger reason `referral`, refId = referral id.
- **promptOfTheDay**: pool = published prompts with quality ≥ 80 (if ≥ 7 exist, else all published), ordered by a stable FNV hash of the id; index = UTC day number mod pool size ⇒ deterministic per date, no repeats until the pool is exhausted.
- **createFromDraft**: one transaction — creates missing categories by slug, prompt (status published|review, quality = judge score, trending = topic score when `topicId` is a topic uuid), version `1.0.0`, category links. Slug from English title (suffix added on collision).
- **iterateAudience**: keyset pagination by id, skips banned users; segments `buyers` (paid/fulfilled order), `non_buyers`, `subscribers` (active `all_pro`).
- **dailyStats**: UTC day; active users = distinct users in analytics_events ∪ search_logs ∪ last_seen_at; revenue from paid/fulfilled orders by `paid_at` (IRR/10 → toman, XTR → stars); top/zero-result queries by normalized query.
- **Tickets**: new tickets are `open`; user message → `waiting_admin` (re-opens closed), admin → `waiting_user`.
- **Intel**: `saveSignals` dedups on `(source, external_id)` and returns # new; `upsertTopic` by id or key, merges `signal_ids`, keeps `first_seen_at`, never downgrades researching/drafted/published/rejected back to `new`; `resolveDraft` only acts on `review` drafts (approve → state `approved`; the caller then calls `catalog.createFromDraft`).

## Env / scripts

- `DATABASE_URL` (default `postgres://rasa:rasa@localhost:5432/rasa`).
- `pnpm db:generate` (drizzle-kit generate), `pnpm db:migrate` (`tsx src/scripts/migrate.ts`), `pnpm db:seed` (`tsx src/scripts/seed.ts`).

## Tests

`npx vitest run packages/db` — 4 files, 48 tests, real Postgres. Each DB test file creates its own
database `rasa_test_db_<file>` (DROP … WITH (FORCE) / CREATE via `postgres://rasa:rasa@localhost:5432/postgres`,
override with `TEST_ADMIN_DATABASE_URL`), migrates and seeds, so files can run in parallel.

## Known limits

- Variable `options` are plain strings (not localized) — contract `PromptVariable.options: string[]`.
- Subscription monthly credits beyond the first month (yearly/lifetime) need a monthly worker job calling `credits.grant(user, n, "subscription_grant", "<orderId>:<YYYY-MM>")` (idempotent per refId). Credit expiry is not modelled.
- Trigram predicates use `word_similarity()` functions (seq scan over published prompts) — fine for thousands of prompts; switch to the `<%` operator to use the GIN index at larger scale.
- `promptOfTheDay` uses the UTC date.
- `activeSubscription` returns the plan title in fa (contract has no locale parameter).

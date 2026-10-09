# Bot (Telegram + Bale) — `apps/bot`

A single grammY codebase serves both messengers. Each process runs one platform (`PLATFORM=telegram|bale`).
Platform differences are handled by a **capability map** (`src/capabilities.ts`), not by `if (platform)`
branches scattered through handlers.

## Architecture

```
src/
  main.ts          entrypoint: config → container → createBot → commands → polling|webhook, graceful shutdown
  container.ts     production wiring: @rasa/db, @rasa/ai, @rasa/payments, pg-boss producer (+ enqueueBroadcast)
  bot.ts           createBot(platform, config, services, ai, payments, options) + registerCommands
  server.ts        Hono: GET /healthz, GET /readyz, POST /webhook/<platform>/<secret>
  capabilities.ts  Telegram vs Bale feature map; runtime feature-detection ("method not found" → off)
  callbacks.ts     compact callback_data scheme (≤ 64 bytes, asserted)
  flow.ts          credits costs, AI timeouts/error mapping, access rule (loadAccessibleBody), analytics
  ui.ts            HTML/plain rendering, send/show(edit), keyboards, pagination, deep links
  watermark.ts     invisible watermark for paid bodies (encode/apply/decode/strip)
  i18n/            fa.ts (source of truth, typed keys) · ar.ts · en.ts · index.ts (t, tPlain, formatters)
  handlers/        menu · browse · prompt (card/full/wizard/run) · builder · account · payments · support · admin · inline · text
```

Middleware order (bot.ts): error boundary → user resolution (`users.upsert`, `ref_` applied on /start) →
session → callback auto-answer → **payments** (before ban/rate limit: an authorised payment is always honoured)
→ ban filter → rate limiter → feature composers → free-text router. Outgoing API: `@grammyjs/auto-retry` +
`@grammyjs/transformer-throttler`. `bot.catch` is the last resort.

Session (`SessionData`) is per user (`<platform>:<userId>`), storage injected (`createSessionStorage` from
`@rasa/db` in prod, memory in tests). A `step` field is the state machine: `idle | await_search | wizard |
builder | support | admin_reply | admin_broadcast`. Reply-keyboard taps always escape any flow.

## Screen map

```
/start [ref_<code> | p_<promptId> | b_<bundleId>]
 └─ first time: language picker (fa / ar / en) → welcome (+ reply keyboard) → deep-link target or Home
Home (inline + persistent reply keyboard)
 ├─ 🔎 Search ─ ask → results (paginated, 5/page) → Prompt card
 ├─ 📚 Categories (8/page) → Category list (paginated) → Prompt card
 ├─ 🔥 Trending (paginated) → Prompt card
 ├─ ✨ AI Prompt Builder ─ idea → moderation → quota/credits → built prompt [⚡ Run] [✨ Again]
 ├─ 🗂 My library (paginated) → Prompt card
 ├─ 💎 Plan & credits ─ status + balance → Plans (buy) · Credit packs (buy) · Library
 ├─ 🎁 Invite friends ─ personal deep link + stats [📤 Share (Telegram)]
 ├─ 🆘 Support ─ AI answer ⇄ [🙋 Talk to a human] → ticket → admin chat ⇄ relayed replies · [✅ Solved]
 └─ 🌐 Language
Prompt card: badge · summary · models · ✓ tested · date · quality · version · price · preview · example
 ├─ free / entitled: [📋 Full prompt] [🧩 Fill variables → wizard → final prompt] [⚡ Run with AI]
 └─ paid & not entitled: [💳 Buy · ⭐/Toman] [💎 Included in Pro] → invoice | web checkout link
Every screen: 🔙 Back (where meaningful) + 🏠 Home.
Free text (idle) → ai.concierge → search | builder | support | account | reply; plain search if AI fails.
```

## Commands

User: `/start /search [q] /build [idea] /library /account /invite /support /language /help /menu /cancel`
Admin (`users.isAdmin`): `/admin` (panel) · `/stats` · `/broadcast` · `/review` · `/tickets` (alias `/ticket`) ·
`/reply <ticketId> <text>` · `/close <ticketId>` · `/ban <platformUserId>` · `/unban <platformUserId>`.
Admins can also **reply to a forwarded ticket message** (it carries the tag `#T<ticketId>`) or tap ✍️ Reply.
Non-admins get a localized "admins only" refusal.

## Deep links

| Payload | Effect |
|---|---|
| `ref_<referralCode>` | passed to `users.upsert(profile, code)` on first sight; `referral_joined` tracked |
| `p_<promptId>` | opens the prompt card |
| `b_<bundleId>` | bundle screen (`products.quote("bundle", …)`) with buy button |
| `inline` | from the inline-mode "Open Rasa Prompt" button |

Link builder: `https://t.me/<bot>?start=…` (Telegram), `https://ble.ir/<bot>?start=…` (Bale); override via
`options.deepLinkBase` / env `BOT_DEEP_LINK_BASE`.

## Callback data scheme (≤ 64 bytes)

`m:<screen>` · `l:<locale>` · `s:<page>` (query in session) · `cs:<page>` · `c:<catId>:<page>` · `tr:<page>` ·
`lib:<page>` · `p:<id>` · `pf:<id>` · `w:<id>` · `wo:<optIdx>` · `ws` · `r:<id>` · `rs` ·
`b:<p|b|l|k>:<refId>` (prompt/bundle/plan/credit pack) · `sup:h|x` · `sup:c:<ticket>` · `sup:d:<ticket>` ·
`a:panel|st|bc|rv|tk` · `a:ap|rj:<draftId>` · `a:rp|cl:<ticketId>` · `bc:s:<seg>` · `bc:l:<locale|all>` ·
`bc:ok|x` · `noop`. Free text never goes into callback data. `cb.*` builders throw if > 64 bytes.

## Capability matrix

| Capability | Telegram | Bale | Degradation |
|---|---|---|---|
| Inline mode | ✅ | ❌ | handler is a no-op |
| Stars (XTR) invoices | ✅ | ❌ | — |
| Wallet invoices (IRR, `BALE_WALLET_PROVIDER_TOKEN`) | ❌ | ✅ (if token set & `payments.isAvailable`) | web checkout link (`payments.webCheckoutUrl`) |
| parse_mode HTML | ✅ | ❌ (assumed) | tags stripped → plain text |
| setMyCommands | ✅ | feature-detected | disabled on "method not found" |
| editMessageText | ✅ | ✅ | falls back to a new message |
| refundStarPayment | ✅ | ❌ | manual (payments) |
| Webhook secret header | ✅ | ❌ | path secret only |
| link_preview_options | ✅ | ❌ | omitted |
| Share URL (t.me/share) | ✅ | ❌ | link shown only |

Any `sendInvoice` failure also falls back to the web checkout link.

## Money, credits, AI

- Prices: Telegram shows/sells Stars (`⭐ ۲۵۰`); Bale shows toman (`۱۴۹٬۰۰۰ تومان`), invoices IRR (×10).
  Invoices are built by `@rasa/payments` (one LabeledPrice with the total; title ≤ 32, description ≤ 255).
- `pre_checkout_query` is answered within 8 s (`validatePreCheckout`, timeout → reject). `successful_payment` →
  `payments.fulfill` (idempotent; duplicate deliveries ignored) → thank-you + immediate delivery
  (watermarked body / plan active / new balance / bundle in library) + Pro upsell. Fulfilment errors: user is
  told not to pay again and admins are alerted. Payment analytics are tracked by `@rasa/payments`.
- Run with AI: text 2, code/automation 3 credits (image/video/audio not runnable in-bot). AI builder:
  `FREE_AI_BUILDS_PER_DAY` free per user per UTC day (counter in `SettingsService`
  `bot:ai_builds:<userId>:<YYYY-MM-DD>`), then 2 credits. Moderation (`ai.moderate`) runs before any charge.
  Credits are spent before the AI call and refunded on any failure. `AiRefusalError` → "can't help" copy;
  `DomainError("rate_limited")` (AI budget) → "AI is busy" copy.
- Paid bodies are only sent when `entitlements.canAccess` is true (checked again at every step) and carry an
  invisible watermark of the user id (U+2061/U+2062 bits framed by U+2063, with checksum, inserted 3×;
  ZWNJ/ZWJ are never used). Trace a leak with `decodeWatermark(text)`.

## Env vars used

`PLATFORM`, `TELEGRAM_BOT_TOKEN`, `BALE_BOT_TOKEN`, `TELEGRAM_API_ROOT`, `BALE_API_ROOT`, `BOT_MODE`,
`WEBHOOK_PUBLIC_URL`, `WEBHOOK_SECRET`, `PORT`, `TELEGRAM_ADMIN_IDS`, `BALE_ADMIN_IDS`,
`TELEGRAM_ADMIN_CHAT_ID`, `BALE_ADMIN_CHAT_ID`, `BALE_WALLET_PROVIDER_TOKEN`, `WEB_BASE_URL`,
`FREE_AI_BUILDS_PER_DAY`, `REFERRAL_REWARD_CREDITS`, `DATABASE_URL`, AI vars (see `.env.example`),
`LOG_LEVEL`. Optional, not in the shared config: `BOT_DEEP_LINK_BASE`.

## Run / test

```bash
pnpm dev:bot:telegram          # polling; /healthz on PORT
pnpm dev:bot:bale
pnpm --filter @rasa/bot build  # tsup (tsup.config.ts) → dist/main.js
npx vitest run apps/bot        # no network: API calls captured by a grammY transformer
```

Production: `BOT_MODE=webhook`; the process calls `setWebhook(<WEBHOOK_PUBLIC_URL>/webhook/<platform>/<WEBHOOK_SECRET>)`
(with `secret_token` on Telegram). `/healthz` is served in both modes; `/readyz` pings the database.

## BotFather setup / راه‌اندازی در BotFather

### Telegram
1. `@BotFather` → `/newbot` → name «Rasa Prompt | رسا پرامپت», username e.g. `RasaPromptBot` → token → `TELEGRAM_BOT_TOKEN`.
2. `/setinline` → enable, placeholder «جستجوی پرامپت…»; `/setinlinefeedback` optional.
3. `/setdescription`, `/setabouttext`, `/setuserpic` (brand assets). Commands are set automatically at startup.
4. Payments: Stars need no provider — nothing to configure. Make sure the bot is not restricted from payments.
5. `/setjoingroups` → enable only to add the bot to the admin group; put the group id in `TELEGRAM_ADMIN_CHAT_ID`
   and your numeric ids in `TELEGRAM_ADMIN_IDS`. `/setprivacy` → enabled (bot only needs replies to its own messages).

### Bale
1. در بله به `@BotFather` پیام دهید → `/newbot` → نام و شناسه ربات → توکن را در `BALE_BOT_TOKEN` بگذارید.
2. برای پرداخت کیف پول: در BotFather بخش پرداخت/کیف پول را فعال کنید و توکن ارائه‌دهنده را در
   `BALE_WALLET_PROVIDER_TOKEN` قرار دهید. بدون این توکن، ربات خودکار لینک پرداخت سایت را نشان می‌دهد.
3. ربات را به گروه مدیران اضافه کنید و شناسه گروه را در `BALE_ADMIN_CHAT_ID` و شناسه عددی مدیران را در
   `BALE_ADMIN_IDS` بگذارید.
4. حالت inline و Stars در بله وجود ندارد و ربات به‌طور خودکار آن‌ها را غیرفعال می‌کند.

### خلاصه فارسی
- تلگرام: ساخت ربات با `/newbot`، فعال‌سازی inline با `/setinline`، پرداخت با Stars (بدون تنظیم اضافه)،
  افزودن ربات به گروه مدیران و تنظیم `TELEGRAM_ADMIN_CHAT_ID` و `TELEGRAM_ADMIN_IDS`.
- در محیط عملیاتی `BOT_MODE=webhook`، `WEBHOOK_PUBLIC_URL` و `WEBHOOK_SECRET` (رشته تصادفی) را تنظیم کنید؛
  ربات خودش وب‌هوک را ثبت می‌کند. سلامت سرویس: `GET /healthz`.

## Known limits
- Bale HTML/parse-mode parity is assumed absent (plain text); flip `capabilities.html` if verified.
- No bundle-detail contract: `b_` deep links show title/price only (via `products.quote`).
- Broadcast fan-out is the worker's job; without a queue the bot refuses to broadcast.
- Rate limiter is in-memory per process (8 updates / 3 s / user).

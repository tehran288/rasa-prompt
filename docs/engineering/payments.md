# Payments (`@rasa/payments`)

Owner: payments agent. Implements `PaymentService` (see `packages/shared/src/contracts.ts`) for
**Telegram Stars**, **Bale wallet** and the future **web checkout** link.

```ts
import { createPaymentService } from "@rasa/payments";

const payments = createPaymentService(config, {
  orders, products, entitlements, credits, referrals, users, analytics, logger,
  refundStars: (tgUserId, chargeId) => bot.api.refundStarPayment(Number(tgUserId), chargeId),
});
```

## Public API

| Export | Purpose |
|---|---|
| `createPaymentService(config, deps)` → `RasaPaymentService` | `PaymentService` + `isAvailable(platform)`; `refund()` returns `RefundResult` (an `Order` plus `refundMode`, `note`, `creditsClawedBack`) |
| `PaymentConfig`, `PaymentDeps`, `RasaPaymentService`, `RefundResult` | types |
| `ORDER_TTL_MINUTES` (30), `PRE_CHECKOUT_TIMEOUT_MS` (8000), `INVOICE_TITLE_MAX` (32), `INVOICE_DESCRIPTION_MAX` (255), `INVOICE_PAYLOAD_MAX_BYTES` (128) | constants |
| `manualRefundNote(locale)` | localized "refund manually" text for admin messages |
| `tomanToRial`, `rialToToman`, `roundPsychToman`, `roundPsychUsd`, `roundStars`, `tomanToStars`, `formatToman`, `RIAL_PER_TOMAN` | pricing helpers (`src/pricing.ts`) |

Optional deps beyond the brief: `now?: () => Date` (clock) and `preCheckoutTimeoutMs?` — tests only.

**`refundStars` is called with the payer's Telegram user id (`User.platformUserId`)**, not our internal
user id, because that is what `refundStarPayment(user_id, …)` needs.

## Flows

### Telegram Stars (digital goods)
1. Bot calls `createInvoice({ user, platform: "telegram", items })`.
   - Banned user → `DomainError("banned")`; user from another platform → `"forbidden"`; no items or an
     item without a positive integer price → `"invalid_state"`.
   - Each item is quoted with `products.quote(kind, refId, "XTR", user.locale)`.
   - `orders.create` with provider `telegram_stars`, currency `XTR`.
   - Returns `InvoiceSpec { title ≤32, description ≤255, payload = order.id, currency "XTR", amount = order.total, providerToken "" }`.
   - Tracks `checkout_started`.
2. Bot sends `sendInvoice(chat, title, description, payload, currency="XTR", prices=[{ label: title, amount }])`
   with `provider_token: ""` — **exactly one `LabeledPrice`** (Stars requirement).
3. Telegram → `pre_checkout_query`. Bot calls `validatePreCheckout(payload, currency, total_amount, String(from.id))`
   and answers `answerPreCheckoutQuery(id, ok, { error_message })` **within 10 s**. Checks, in order:
   order exists → payer (`getByPlatformId(order.platform, id)`) is the order owner → not banned → not
   expired (`status=expired` or older than 30 min) → status `pending` → currency and amount equal.
   The error text is short and in the payer's locale (fa/ar/en). Validation is raced against an 8 s
   budget; on timeout or unexpected error a generic "try again" text is returned.
4. Telegram → `message.successful_payment`. Bot calls
   `fulfill({ payload: invoice_payload, chargeId: telegram_payment_charge_id, currency, totalAmount: total_amount })`.
   - Unknown order → `payment_failed` + `DomainError("not_found")`.
   - Currency/amount mismatch → error log, `payment_failed` + `DomainError("amount_mismatch")` (order stays pending — needs ops review).
   - `orders.markPaid(orderId, chargeId, amount)` (idempotent on chargeId). If `firstTime`:
     `entitlements.grantForOrder` → `credits.grant(sum of plan.monthlyCredits + pack.credits, "purchase", order.id)`
     → `referrals.onFirstPurchase(userId)` (failure only logged) → `payment_succeeded`.
   - Duplicate delivery → returns `{ firstTime: false }` with no side effects.

### Bale wallet
Same as Telegram, with:
- currency `IRR` (amounts quoted in **rial** = toman × 10), provider `bale_wallet`,
  `providerToken = BALE_WALLET_PROVIDER_TOKEN`;
- the bot sends **one** `LabeledPrice` with the total (we do not rely on multi-line invoices);
- if the wallet token is empty `isAvailable("bale")` is false and `createInvoice` throws
  `DomainError("invalid_state")` **before** creating an order. The bot should then show
  `webCheckoutUrl(orderId)`/a "coming soon on the website" message.

### Web checkout (future)
`webCheckoutUrl(orderId)` → `${WEB_BASE_URL}/checkout/${orderId}` (trailing slashes trimmed, id URL-encoded).
Provider `web_zarinpal` is not implemented here yet.

### Refund
`refund(orderId)`:
1. Order must be `paid` or `fulfilled` (else `invalid_state`); already `refunded` → returned unchanged (idempotent).
2. **Stars**: `deps.refundStars(platformUserId, providerChargeId)` first; if it throws nothing else changes.
   Missing `refundStars` dep / charge id → `invalid_state`.
3. `orders.markRefunded` → `entitlements.revokeForOrder`.
4. Credit clawback: credits the order granted (plan first-month credits + packs) are removed with
   `credits.spend(min(granted, balance), "refund_clawback", orderId)` — the balance never goes below zero.
   (Credits already spent cannot be recovered; this is accepted loss.)
5. **Bale**: result has `refundMode: "manual"` and a `note`; a `warn` log line "MANUAL money return required" is emitted.

## Refund ops procedure
- **Telegram Stars**: admin triggers refund → automatic. Stars return to the user's balance. Telegram
  rejects refunds for already-refunded charges; repeated calls on our side are no-ops.
- **Bale wallet** (no refund API known to us):
  1. Run `refund(orderId)` (bot admin command) — access and unspent credits are removed immediately.
  2. Look up `order.total` (IRR) and the user's Bale id / username.
  3. Return the money from the merchant wallet manually (Bale wallet transfer or via Bale support) and
     record the transfer reference in the support ticket.
  4. Search logs for `MANUAL money return required` daily to make sure none are missed.
- 7-day guarantee (plan doc 05 §6) is a policy decision made by admins/support; this package does not
  enforce a window.

## Environment
| Var | Used for |
|---|---|
| `BALE_WALLET_PROVIDER_TOKEN` | Bale `provider_token` from Bale @BotFather (wallet). Empty → Bale in-messenger payment disabled. Never logged (pino redacts `*.providerToken`). |
| `WEB_BASE_URL` | base for `webCheckoutUrl` |
| (`TELEGRAM_BOT_TOKEN`) | not used here; the bot wires `refundStars` with its own API client |

## Assumptions to verify with Bale support
1. `amount` in `LabeledPrice` is in **rial** (IRR smallest unit), not toman.
2. Whether multiple `LabeledPrice` lines are summed; we always send a single total line.
3. `invoice_payload` max length (we assume Telegram's 128 bytes; order ids are UUIDs, 36 bytes).
4. Whether `pre_checkout_query` must be answered within 10 s like Telegram, and that `total_amount`/`currency` are echoed back exactly.
5. Uniqueness and format of the charge id in `successful_payment` (we use `telegram_payment_charge_id`, falling back to `provider_payment_charge_id` is the bot's job if Bale fills only that one).
6. Min/max invoice amount for wallet payments.
7. Whether any refund/reverse-transfer API exists for wallet payments.

## Pricing helpers (`src/pricing.ts`)
- `tomanToRial` / `rialToToman` (×10 / ÷10, whole numbers).
- `roundPsychToman`: nearest price ending in 9,000 (149,000; 289,000); < 10,000 → ceil to 1,000.
- `roundPsychUsd`: nearest x.99 (min 0.99).
- `roundStars`: < 25 → ceil; < 100 → nearest 5; ≥ 100 → nearest 50 − 1 (149, 199, 299).
- `tomanToStars(toman, tomanPerStar)` = `roundStars(toman / rate)` — the rate is a business setting.

## Testing
`npx vitest run packages/payments` — uses in-memory fakes of the db services in
`packages/payments/test/fakes.ts` (no DB, no network). Covers Stars and Bale happy paths, plan/pack
credits, wrong amount/currency, wrong user, expired/unknown/already-paid orders, pre-checkout timeout,
banned users, double fulfill, Stars refund with clawback, Bale manual refund, missing Bale token.

## Known limits / open issues
- **Partial fulfillment**: if `grantForOrder`/`credits.grant` throws after `markPaid` succeeded, a retry
  gets `firstTime: false` and won't re-grant. Needs `OrderService.markFulfilled` (status `fulfilled`) so
  fulfillment can resume for orders still `paid` — contract change requested.
- Plan credits after month 1 (yearly/lifetime monthly credits) are the worker's job, not granted here.
- No `payment_refunded` analytics event in the contract; refunds are only logged.
- Amount-mismatch on `successful_payment` means money was captured but the order stays pending — ops
  must review (log line `successful_payment amount mismatch`).

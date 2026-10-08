# AI package (`@rasa/ai`)

Owner: AI platform agent. Scope: `packages/ai/**`.

## What it provides

| Export | Purpose |
|---|---|
| `createAiRouter(config, { settings, logger })` | `AiRouter` (+ `completeWithTools`, `routeFor`) — task-based routing over Anthropic and an OpenAI-compatible endpoint, daily budget, cost tracking, JSON retry |
| `createAssistantAgents(router, { catalog, orders, entitlements, credits, tickets, logger })` | `AssistantAgents` — concierge, buildPrompt, runPrompt, support (tool-using), moderate, writeChannelPost, writeDailyReport |
| `createFakeAiRouter(responses)` | Deterministic router for other packages' tests (records calls, zero cost, no network) |
| `zodJson(schema)` | `{ jsonSchema, parse }` from one zod schema, for `router.json({...zodJson(S)})` |
| `AiRefusalError`, `AiProviderError`, `AiJsonError` | Error types (see below) |
| `sanitizeTelegramHtml`, `toPlainText`, `extractVariables`, `FAQ`, `PRICES`, `DEFAULT_ROUTES` | Helpers / tables |

Optional extra deps on `createAiRouter` (test seams): `anthropicClientFactory`, `fetch`, `sleep`, `now`.

## Routing

Each call names an `AiTask`; the router maps it to `provider:model`. Defaults:

| Task | Default route | Effort | Default max_tokens |
|---|---|---|---|
| concierge, moderate | `anthropic:claude-haiku-5-5` | low | 4 000 |
| intel_judge | `anthropic:claude-haiku-5-5` | low | 8 000 |
| intel_analyze | `anthropic:claude-haiku-5-5` | medium | 16 000 |
| write_post, report | `anthropic:claude-sonnet-5-5` | low | 8 000 |
| intel_localize | `anthropic:claude-sonnet-5-5` | medium | 16 000 |
| intel_compliance | `anthropic:claude-sonnet-5-5` | medium | 8 000 |
| build_prompt, run_prompt | `anthropic:claude-opus-5-5` | medium | 16 000 |
| support | `anthropic:claude-opus-5-5` | medium | 8 000 |
| intel_research, intel_engineer | `anthropic:claude-opus-5-5` | high | 32 000 |
| intel_critic | `anthropic:claude-opus-5-5` | high | 16 000 |

- **Override** any subset with `AI_ROUTES`, e.g. `{"report":"openai_compat:qwen3-72b","concierge":"anthropic:claude-sonnet-5-5"}`. `openai_compat` without a model uses `OPENAI_COMPAT_MODEL`. Malformed JSON / unknown provider → `AiProviderError` at startup; unknown task keys are logged and ignored.
- **Fallback**: if the route's provider isn't configured, the other configured provider is used (Anthropic → `OPENAI_COMPAT_MODEL`; openai_compat → the task's default Anthropic model). Logged once per task. If none is configured, `AiProviderError` with an actionable message.
- `webResearch` requests only route to Anthropic (the compat provider has no web tools).
- Thinking is always on for the 5.5 models; we never send `thinking` and control depth with `output_config.effort`. `tool_choice` is never forced (forced `any`/`tool` is a 400 on Opus/Sonnet 5.5); tools use `strict: true`.
- Requests with `max_tokens > 16 000` or any tools use `messages.stream(...).finalMessage()`.

## Providers

**anthropic** — official `@anthropic-ai/sdk` (`maxRetries: 4`, 10-minute timeout; the SDK backs off on 408/409/429/5xx and honours `retry-after`).
- `jsonSchema` → `output_config.format: { type: "json_schema", schema }` after `toStrictSchema` (adds `additionalProperties:false`, strips unsupported constraints such as `minLength`/`maximum`; callers still validate with `parse`).
- `webResearch` → server tools `web_search_20260209` + `web_fetch_20260209` (`max_uses = maxSearches`, `allowed_domains` *or* `blocked_domains` — the API rejects both together; allowed wins). `pause_turn` is resumed up to 5 times. Citations = URLs cited in text blocks + pages fetched by `web_fetch`; if nothing was cited, the search results. Because structured outputs are incompatible with citations, `jsonSchema + webResearch` puts the schema in the system prompt and parses leniently.
- `stop_reason: "refusal"` → `AiRefusalError(category)` (`stop_details.category`: cyber, bio, …); spend is still recorded. `max_tokens` truncation is logged (json() then retries).

**openai_compat** — `fetch POST ${OPENAI_COMPAT_BASE_URL}/chat/completions` (vLLM, llama.cpp, Ollama, TGI or another permitted provider). JSON via `response_format: { type: "json_schema", json_schema: { strict: true, schema } }`. Tool calling via OpenAI function calling. 3 retries with exponential backoff (500 ms × 2ⁿ, `Retry-After` respected, max 20 s) on 429/5xx/network errors. `finish_reason: "content_filter"` → `AiRefusalError`.

## `json<T>()`

Calls `complete` with the schema, extracts JSON (tolerates fences/prose), runs `req.parse`. On failure it retries **once**, appending the bad reply as an assistant turn and the validation error as a user turn (no prefill; web tools dropped on the retry so the schema is enforced natively). Second failure → `AiJsonError` (has `.raw`).

## Budget & cost

Cost is computed per response from the price table (USD / MTok):

| Model | Input | Output | Cache read |
|---|---|---|---|
| claude-opus-5-5 | 4.00 | 20.00 | 0.20 |
| claude-sonnet-5-5 | 2.00 | 10.00 | 0.20 |
| claude-haiku-5-5 (≤100K prompt) | 0.10 | 0.50 | 0.01 |
| claude-haiku-5-5 (>100K prompt) | 0.50 | 2.50 | 0.05 |

Cache writes bill at 1.25× input; web search adds $0.01 per search. Unknown Anthropic models are priced as Opus 5.5 (safe side); unknown openai_compat models cost 0 (self-hosted) unless added to `PRICES`.

Spend accumulates in `SettingsService` key `ai_spend:<YYYY-MM-DD>` (UTC). Before every model call (including each turn of a tool loop) the router throws `DomainError("rate_limited")` if `spent >= AI_DAILY_BUDGET_USD`. `AI_DAILY_BUDGET_USD=0` is a kill switch. The counter is serialized within one process; across processes it is approximate (last write wins) — fine for a soft guard.

## Agents

All system prompts live in `src/agents/prompts.ts` (brand voice «حرفه‌ای، صمیمی، دقیق», fa/ar/en). User text is wrapped in tags and the prompts tell the model to treat it as data.

- **concierge** (Haiku, structured): intent ∈ search/build_prompt/support/buy/account/smalltalk/unsafe/other, a cleaned `query` only for search, `locale` detection (incl. Finglish → fa), short `reply` for smalltalk/other/unsafe. Obvious jailbreak phrases are classified `unsafe` without a model call; model refusals also map to `unsafe`.
- **buildPrompt** (Opus): Role → Context → Task → Variables `{{snake_case}}` → Constraints → Output format → Example → Stop criteria, localized headings. `variables` are re-derived from the prompt's placeholders. Unsafe ideas → `AiRefusalError("unsafe_request", explanation)`.
- **runPrompt** (Opus): executes the prompt with a safety system prompt that overrides the user prompt. Refusal → `AiRefusalError` — **the bot should not charge credits in that case.**
- **support** (Opus, client tools, manual agentic loop): `get_my_orders`, `get_my_library`, `get_credit_balance`, `get_faq`, `escalate_to_human`. Tools are closures over the authenticated `userId` and accept no user id; `get_my_orders(order_id)` hides orders of other users as "not found". `escalate=true` when the model calls `escalate_to_human`, when the message matches refund/dispute keywords (fa/ar/en, enforced in code), on refusal, or on an empty answer. If the router isn't tool-capable (foreign `AiRouter`), falls back to one structured call with the FAQ inline.
- **moderate** (Haiku, structured): `{ allowed, category }`, categories in `MODERATION_CATEGORIES`; refusal → blocked with the refusal category.
- **writeChannelPost** (Sonnet): receives only public fields (title, summary, description, preview ≤400 chars, example ≤400 chars, models, price for the platform's currency) — never the paid body. Telegram output is sanitized to HTML-parse-mode tags (`b i u s code pre blockquote tg-spoiler`, unbalanced → escaped plain text); Bale output is plain text. Always ends with `{{DEEPLINK}}` (a localized CTA is appended if the model omitted it).
- **writeDailyReport** (Sonnet): Persian plain-text report from `DailyStats` + `extra` (e.g. previous day, intel results, AI spend).

## Env vars

| Var | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Enables the anthropic provider |
| `OPENAI_COMPAT_BASE_URL` | e.g. `http://vllm:8000/v1`; with `OPENAI_COMPAT_MODEL` enables openai_compat |
| `OPENAI_COMPAT_API_KEY` | Optional bearer token |
| `OPENAI_COMPAT_MODEL` | Default compat model (fallback target) |
| `AI_ROUTES` | JSON task → `provider:model` overrides |
| `AI_DAILY_BUDGET_USD` | Daily USD cap (default 10; 0 = AI off) |

## Compliance

Provider choice must follow each provider's **supported regions and terms of service**. Route tasks only to providers that are permitted for the deployment and its users; the code never attempts to bypass regional availability (no proxies, no geo-spoofing, no key sharing) and must not be changed to do so. If a provider is unavailable for a deployment, configure a permitted alternative via `OPENAI_COMPAT_*` / `AI_ROUTES` instead. Web research only runs through the provider's official server tools and respects `allowedDomains`/`blockedDomains`.

## Testing

`npx vitest run packages/ai` — no network: the Anthropic SDK client is injected via `anthropicClientFactory`, `fetch` is mocked for openai_compat. Other packages should use `createFakeAiRouter`:

```ts
const ai = createFakeAiRouter({
  concierge: { intent: "search", query: "سئو", locale: "fa", reply: null }, // JSON reply
  write_post: ["first post", "second post"],                              // sequence
  intel_research: { $text: "notes", citations: [{ url, title }] },         // text + citations
  run_prompt: new AiRefusalError("cyber"),                                 // thrown
  support: { toolCalls: [{ name: "get_credit_balance", input: {} }], text: (out) => out[0] ?? "" },
});
ai.calls; ai.callsFor("concierge"); ai.toolCalls;
```

## Known limits / follow-ups

- `OrderService` has no "list orders for user" method; `get_my_orders` without an id uses an optional `orders.listForUser(userId, limit)` if the db implementation provides it, otherwise asks the user for the order id.
- Spend counter is per-process serialized only (see Budget).
- Haiku 5.5 cache-read price (0.01 $/MTok) is an assumption (0.1× input); adjust `PRICES` if billing differs.

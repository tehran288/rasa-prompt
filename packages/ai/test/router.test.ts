import { DomainError } from "@rasa/shared";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AiJsonError,
  AiProviderError,
  AiRefusalError,
  computeCostUsd,
  createAiRouter,
  toStrictSchema,
  zodJson,
} from "../src";
import {
  baseConfig,
  jsonResponse,
  memorySettings,
  mockAnthropic,
  msg,
  silentLogger,
  text,
} from "./helpers";

const NOW = new Date("2026-10-08T12:00:00Z");
const SPEND_KEY = "ai_spend:2026-10-08";

function setup(
  opts: {
    config?: Parameters<typeof baseConfig>[0];
    replies?: Parameters<typeof mockAnthropic>[0];
    fetch?: typeof fetch;
    spent?: number;
  } = {},
) {
  const { settings, store } = memorySettings(opts.spent ? { [SPEND_KEY]: opts.spent } : {});
  const anthropic = mockAnthropic(opts.replies ?? [msg([text("hello")])]);
  const logger = silentLogger();
  const router = createAiRouter(baseConfig(opts.config), {
    settings,
    logger,
    anthropicClientFactory: anthropic.factory,
    now: () => NOW,
    sleep: async () => {},
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
  });
  return { router, anthropic, store, logger };
}

const user = (content: string) => [{ role: "user" as const, content }];

describe("routing", () => {
  it("uses the default task → model map with per-task effort", async () => {
    const { router, anthropic } = setup();
    expect(router.routeFor("concierge")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-5-5",
    });
    expect(router.routeFor("write_post")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
    });
    expect(router.routeFor("intel_research")).toEqual({
      provider: "anthropic",
      model: "claude-opus-5-5",
    });

    const res = await router.complete({ task: "concierge", system: "sys", messages: user("hi") });
    expect(res).toMatchObject({ text: "hello", provider: "anthropic", model: "claude-haiku-5-5" });
    const p = anthropic.calls[0]?.params;
    expect(p?.model).toBe("claude-haiku-5-5");
    expect(p?.output_config?.effort).toBe("low");
    expect(p?.system).toBe("sys");
    expect(p).not.toHaveProperty("thinking"); // thinking can't be disabled on 5.5 — never send it
    expect(p).not.toHaveProperty("tool_choice");
    expect(anthropic.apiKeys).toEqual(["sk-ant-test"]);
  });

  it("AI_ROUTES overrides selected tasks", () => {
    const { router } = setup({
      config: {
        AI_ROUTES: JSON.stringify({
          concierge: "anthropic:claude-sonnet-5-5",
          report: "openai_compat:qwen3-72b",
        }),
        OPENAI_COMPAT_BASE_URL: "http://llm.local/v1",
        OPENAI_COMPAT_MODEL: "llama-4",
      },
    });
    expect(router.routeFor("concierge")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
    });
    expect(router.routeFor("report")).toEqual({ provider: "openai_compat", model: "qwen3-72b" });
    expect(router.routeFor("moderate")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-5-5",
    });
  });

  it("rejects malformed AI_ROUTES with a clear error", () => {
    expect(() => setup({ config: { AI_ROUTES: "{nope" } })).toThrow(AiProviderError);
    expect(() => setup({ config: { AI_ROUTES: '{"concierge":"gemini:x"}' } })).toThrow(
      /unknown provider/,
    );
  });

  it("falls back to openai_compat when Anthropic has no key", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "سلام" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );
    const { router } = setup({
      config: {
        ANTHROPIC_API_KEY: "",
        OPENAI_COMPAT_BASE_URL: "http://llm.local/v1/",
        OPENAI_COMPAT_MODEL: "llama-4",
      },
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(router.routeFor("support")).toEqual({ provider: "openai_compat", model: "llama-4" });
    const res = await router.complete({ task: "concierge", system: "s", messages: user("hi") });
    expect(res).toMatchObject({
      text: "سلام",
      provider: "openai_compat",
      model: "llama-4",
      inputTokens: 10,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://llm.local/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });
  });

  it("falls back to anthropic when an openai_compat route is not configured", () => {
    const { router } = setup({ config: { AI_ROUTES: '{"report":"openai_compat:qwen"}' } });
    expect(router.routeFor("report")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
    });
  });

  it("throws a clear error when no provider is configured", async () => {
    const { router } = setup({ config: { ANTHROPIC_API_KEY: "" } });
    await expect(
      router.complete({ task: "concierge", system: "s", messages: user("x") }),
    ).rejects.toThrow(/No AI provider available for task "concierge".*ANTHROPIC_API_KEY/);
  });

  it("web research never routes to openai_compat", async () => {
    const { router } = setup({
      config: {
        ANTHROPIC_API_KEY: "",
        OPENAI_COMPAT_BASE_URL: "http://x",
        OPENAI_COMPAT_MODEL: "m",
      },
    });
    await expect(
      router.complete({
        task: "intel_research",
        system: "s",
        messages: user("x"),
        webResearch: { maxSearches: 3 },
      }),
    ).rejects.toThrow(AiProviderError);
  });
});

describe("budget & cost", () => {
  it("computes cost from the price table", () => {
    expect(
      computeCostUsd("anthropic", "claude-opus-5-5", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(24);
    expect(
      computeCostUsd("anthropic", "claude-sonnet-5-5", { inputTokens: 1000, outputTokens: 500 }),
    ).toBe(0.007);
    expect(
      computeCostUsd("anthropic", "claude-haiku-5-5", { inputTokens: 1000, outputTokens: 1000 }),
    ).toBe(0.0006);
    // Haiku long-context tier above 100K prompt tokens
    expect(
      computeCostUsd("anthropic", "claude-haiku-5-5", { inputTokens: 200_000, outputTokens: 0 }),
    ).toBe(0.1);
    expect(
      computeCostUsd("anthropic", "claude-opus-5-5", {
        inputTokens: 0,
        outputTokens: 0,
        webSearches: 3,
      }),
    ).toBe(0.03);
    expect(
      computeCostUsd("openai_compat", "self-hosted", { inputTokens: 1e6, outputTokens: 1e6 }),
    ).toBe(0);
  });

  it("accumulates daily spend in settings under ai_spend:<date>", async () => {
    const { router, store } = setup({ replies: [msg([text("ok")], { input: 1000, output: 500 })] });
    await router.complete({ task: "write_post", system: "s", messages: user("x") }); // sonnet: 0.002 + 0.005
    await router.complete({ task: "write_post", system: "s", messages: user("x") });
    expect(store.get(SPEND_KEY)).toBeCloseTo(0.014, 6);
    expect(await router.spentTodayUsd()).toBeCloseTo(0.014, 6);
  });

  it("refuses with DomainError(rate_limited) when over budget", async () => {
    const { router, anthropic } = setup({ spent: 10.5 });
    const err = await router
      .complete({ task: "concierge", system: "s", messages: user("x") })
      .catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe("rate_limited");
    expect(anthropic.calls).toHaveLength(0);
  });

  it("stops a tool loop mid-way once the budget is exhausted", async () => {
    const toolUse = msg(
      [{ type: "tool_use", id: "tu_1", name: "noop", input: {} }],
      { stop_reason: "tool_use", input: 1_000_000, output: 0 }, // $4 per call on opus
    );
    const { router } = setup({ config: { AI_DAILY_BUDGET_USD: 5 }, replies: [toolUse] });
    const err = await router
      .completeWithTools({
        task: "support",
        system: "s",
        messages: user("x"),
        tools: [
          {
            name: "noop",
            description: "n",
            inputSchema: { type: "object", properties: {} },
            run: async () => "ok",
          },
        ],
      })
      .catch((e) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect(await router.spentTodayUsd()).toBe(8);
  });
});

describe("anthropic provider", () => {
  it("sends structured output via output_config.format with a strict schema", async () => {
    const { router, anthropic } = setup({ replies: [msg([text('{"a":"x","n":3}')])] });
    const schema = z.object({ a: z.string().min(1), n: z.number().int().max(10) });
    const out = await router.json({
      task: "moderate",
      system: "s",
      messages: user("x"),
      ...zodJson(schema),
    });
    expect(out).toEqual({ a: "x", n: 3 });
    const format = anthropic.calls[0]?.params.output_config?.format;
    expect(format?.type).toBe("json_schema");
    expect(format?.schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(JSON.stringify(format?.schema)).not.toMatch(/minLength|maximum|\$schema/);
  });

  it("json() retries once with the validation error appended", async () => {
    const { router, anthropic } = setup({
      replies: [msg([text('{"a": 5}')]), msg([text('{"a":"fixed"}')])],
    });
    const out = await router.json({
      task: "concierge",
      system: "s",
      messages: user("x"),
      ...zodJson(z.object({ a: z.string() })),
    });
    expect(out).toEqual({ a: "fixed" });
    expect(anthropic.calls).toHaveLength(2);
    const retryMsgs = anthropic.calls[1]?.params.messages ?? [];
    expect(retryMsgs).toHaveLength(3);
    expect(retryMsgs[1]).toEqual({ role: "assistant", content: '{"a": 5}' });
    expect(String(retryMsgs[2]?.content)).toMatch(/failed validation/);
    expect(retryMsgs[2]?.role).toBe("user"); // never ends on an assistant prefill
  });

  it("json() gives up after the second invalid output", async () => {
    const { router } = setup({ replies: [msg([text("not json")])] });
    await expect(
      router.json({
        task: "concierge",
        system: "s",
        messages: user("x"),
        parse: (r) => z.object({ a: z.string() }).parse(r),
      }),
    ).rejects.toBeInstanceOf(AiJsonError);
  });

  it("throws AiRefusalError on stop_reason refusal and still records spend", async () => {
    const { router, store } = setup({
      replies: [
        msg([], {
          stop_reason: "refusal",
          stop_details: { type: "refusal", category: "cyber", explanation: "nope" },
          input: 1000,
          output: 0,
        }),
      ],
    });
    const err = await router
      .complete({ task: "run_prompt", system: "s", messages: user("x") })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AiRefusalError);
    expect((err as AiRefusalError).category).toBe("cyber");
    expect(store.get(SPEND_KEY)).toBeCloseTo(0.004, 6);
  });

  it("web research: server tools, domain filters, pause_turn resume, citations, search cost", async () => {
    const searchResult = {
      type: "web_search_tool_result",
      tool_use_id: "srv_1",
      content: [
        {
          type: "web_search_result",
          url: "https://a.example/x",
          title: "A",
          encrypted_content: "e",
          page_age: null,
        },
        {
          type: "web_search_result",
          url: "https://b.example/y",
          title: "B",
          encrypted_content: "e",
          page_age: null,
        },
      ],
    };
    const paused = msg(
      [
        text("Let me search."),
        { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "q" } },
        searchResult,
      ],
      { stop_reason: "pause_turn", webSearches: 1 },
    );
    const final = msg(
      [
        {
          type: "server_tool_use",
          id: "srv_2",
          name: "web_fetch",
          input: { url: "https://c.example/z" },
        },
        {
          type: "web_fetch_tool_result",
          tool_use_id: "srv_2",
          content: {
            type: "web_fetch_result",
            url: "https://c.example/z",
            retrieved_at: null,
            content: {
              type: "document",
              title: "C doc",
              citations: null,
              source: { type: "text", media_type: "text/plain", data: "..." },
            },
          },
        },
        text('{"claims":['),
        text('"AI photo prompts are trending"', [
          {
            type: "web_search_result_location",
            url: "https://a.example/x",
            title: "A",
            cited_text: "…",
            encrypted_index: "i",
          },
        ]),
        text("]}"),
      ],
      { webSearches: 2 },
    );
    const { router, anthropic, store } = setup({ replies: [paused, final] });
    const res = await router.complete({
      task: "intel_research",
      system: "research",
      messages: user("trends?"),
      jsonSchema: {
        type: "object",
        properties: { claims: { type: "array", items: { type: "string" } } },
        required: ["claims"],
      },
      webResearch: { maxSearches: 4, allowedDomains: ["a.example"], blockedDomains: ["z.example"] },
    });

    expect(anthropic.calls).toHaveLength(2);
    const first = anthropic.calls[0];
    expect(first?.streamed).toBe(true);
    expect(first?.params.tools).toEqual([
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 4,
        allowed_domains: ["a.example"],
      },
      {
        type: "web_fetch_20260209",
        name: "web_fetch",
        max_uses: 4,
        allowed_domains: ["a.example"],
      },
    ]);
    // Structured outputs are incompatible with citations → schema goes into the system prompt instead.
    expect(first?.params.output_config?.format).toBeUndefined();
    expect(String(first?.params.system)).toContain('"claims"');
    // pause_turn: the paused assistant turn is sent back as-is, without an extra user message.
    const resumed = anthropic.calls[1]?.params.messages ?? [];
    expect(resumed).toHaveLength(2);
    expect(resumed[1]?.role).toBe("assistant");

    expect(res.text).toBe('{"claims":["AI photo prompts are trending"]}');
    expect(res.citations).toEqual([
      { url: "https://c.example/z", title: "C doc" },
      { url: "https://a.example/x", title: "A" },
    ]);
    expect(res.inputTokens).toBe(2000);
    // opus: 2 × (1000×4 + 500×20)/1e6 = 0.028, plus 3 searches × $0.01
    expect(res.costUsd).toBeCloseTo(0.058, 6);
    expect(store.get(SPEND_KEY)).toBeCloseTo(0.058, 6);
  });

  it("falls back to search results as citations when nothing was cited", async () => {
    const { router } = setup({
      replies: [
        msg([
          {
            type: "web_search_tool_result",
            tool_use_id: "s",
            content: [
              {
                type: "web_search_result",
                url: "https://r.example",
                title: "R",
                encrypted_content: "e",
                page_age: null,
              },
            ],
          },
          text("summary"),
        ]),
      ],
    });
    const res = await router.complete({
      task: "intel_research",
      system: "s",
      messages: user("x"),
      webResearch: { maxSearches: 1 },
    });
    expect(res.citations).toEqual([{ url: "https://r.example", title: "R" }]);
    expect(res.text).toBe("summary");
  });

  it("streams when maxTokens is large and uses create() otherwise", async () => {
    const { router, anthropic } = setup();
    await router.complete({ task: "report", system: "s", messages: user("x"), maxTokens: 64_000 });
    await router.complete({ task: "report", system: "s", messages: user("x"), maxTokens: 2_000 });
    expect(anthropic.calls.map((c) => c.streamed)).toEqual([true, false]);
    expect(anthropic.calls[0]?.params.max_tokens).toBe(64_000);
  });
});

describe("openai_compat provider", () => {
  const cfg = {
    ANTHROPIC_API_KEY: "",
    OPENAI_COMPAT_BASE_URL: "http://llm.local/v1",
    OPENAI_COMPAT_API_KEY: "k",
    OPENAI_COMPAT_MODEL: "llama-4",
  };

  it("retries on 429/5xx and sends response_format json_schema", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 429, { "retry-after": "1" }))
      .mockResolvedValueOnce(jsonResponse({ error: "oops" }, 503))
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }),
      );
    const { router } = setup({ config: cfg, fetch: fetchMock as unknown as typeof fetch });
    const out = await router.json({
      task: "moderate",
      system: "s",
      messages: user("x"),
      ...zodJson(z.object({ ok: z.boolean() })),
    });
    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const init = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer k");
    const body = JSON.parse(String(init.body));
    expect(body.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
  });

  it("does not retry 4xx client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, 400));
    const { router } = setup({ config: cfg, fetch: fetchMock as unknown as typeof fetch });
    await expect(
      router.complete({ task: "report", system: "s", messages: user("x") }),
    ).rejects.toThrow(/HTTP 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps content_filter to AiRefusalError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: "" }, finish_reason: "content_filter" }] }),
      );
    const { router } = setup({ config: cfg, fetch: fetchMock as unknown as typeof fetch });
    await expect(
      router.complete({ task: "report", system: "s", messages: user("x") }),
    ).rejects.toBeInstanceOf(AiRefusalError);
  });
});

describe("toStrictSchema", () => {
  it("adds additionalProperties:false recursively and strips unsupported keywords", () => {
    const s = toStrictSchema({
      type: "object",
      properties: {
        list: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "object", properties: { x: { type: "number", minimum: 0 } } },
        },
      },
    });
    expect(s).toEqual({
      type: "object",
      properties: {
        list: {
          type: "array",
          items: {
            type: "object",
            properties: { x: { type: "number" } },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    });
  });
});

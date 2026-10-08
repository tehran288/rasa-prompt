import type Anthropic from "@anthropic-ai/sdk";
import type { SettingsService } from "@rasa/shared";
import type { AiLogger, AiRouterConfig, AnthropicClientFactory } from "../src";

export function memorySettings(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const settings: SettingsService = {
    async get<T>(key: string, fallback: T): Promise<T> {
      return (store.has(key) ? store.get(key) : fallback) as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
  };
  return { settings, store };
}

export function silentLogger(): AiLogger & { warnings: string[] } {
  const warnings: string[] = [];
  return {
    warnings,
    debug() {},
    info() {},
    warn(_obj, msg) {
      warnings.push(msg ?? "");
    },
    error() {},
  };
}

export function baseConfig(over: Partial<AiRouterConfig> = {}): AiRouterConfig {
  return {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OPENAI_COMPAT_BASE_URL: "",
    OPENAI_COMPAT_API_KEY: "",
    OPENAI_COMPAT_MODEL: "",
    AI_ROUTES: "",
    AI_DAILY_BUDGET_USD: 10,
    ...over,
  };
}

type Block = Record<string, unknown>;

export function text(t: string, citations: Block[] | null = null): Block {
  return { type: "text", text: t, citations };
}

export function msg(
  content: Block[],
  opts: {
    stop_reason?: Anthropic.StopReason;
    input?: number;
    output?: number;
    webSearches?: number;
    stop_details?: Block | null;
    model?: string;
  } = {},
): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: opts.model ?? "claude-test",
    content,
    stop_reason: opts.stop_reason ?? "end_turn",
    stop_sequence: null,
    stop_details: opts.stop_details ?? null,
    usage: {
      input_tokens: opts.input ?? 1000,
      output_tokens: opts.output ?? 500,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: opts.webSearches
        ? { web_search_requests: opts.webSearches, web_fetch_requests: 0 }
        : null,
    },
  } as unknown as Anthropic.Message;
}

type Reply =
  | Anthropic.Message
  | ((params: Anthropic.MessageCreateParamsNonStreaming) => Anthropic.Message);

/** Fake Anthropic SDK client: replies are consumed in order (last one repeats). */
export function mockAnthropic(replies: Reply[]) {
  const calls: { params: Anthropic.MessageCreateParamsNonStreaming; streamed: boolean }[] = [];
  let i = 0;
  const next = (p: Anthropic.MessageCreateParamsNonStreaming) => {
    const r = replies[Math.min(i++, replies.length - 1)];
    if (!r) throw new Error("mockAnthropic: no replies");
    return typeof r === "function" ? r(p) : r;
  };
  const apiKeys: string[] = [];
  const factory: AnthropicClientFactory = ({ apiKey }) => {
    apiKeys.push(apiKey);
    return {
      messages: {
        async create(p) {
          calls.push({ params: structuredClone(p), streamed: false });
          return next(p);
        },
        stream(p) {
          calls.push({ params: structuredClone(p), streamed: true });
          return { finalMessage: async () => next(p) };
        },
      },
    };
  };
  return { factory, calls, apiKeys };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

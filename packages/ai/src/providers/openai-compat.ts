import { toStrictSchema } from "../json";
import { computeCostUsd } from "../pricing";
import { TASK_MAX_TOKENS } from "../routing";
import {
  type AiLogger,
  AiProviderError,
  AiRefusalError,
  type CompleteRequest,
  type CompleteResult,
  type LoopHooks,
  type ProviderImpl,
  type ToolCallRecord,
  type ToolChatRequest,
  type ToolChatResult,
} from "../types";

/** OpenAI Chat Completions wire types (only the fields we use). */
interface ChatToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ChatToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
interface ChatResponse {
  model?: string;
  choices?: {
    message?: { content?: string | null; tool_calls?: ChatToolCall[] };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const MAX_RETRIES = 3;

/**
 * Any server speaking the OpenAI `/chat/completions` dialect (vLLM, llama.cpp server, Ollama,
 * TGI, or another hosted provider that is permitted for your users). No web research.
 */
export function createOpenAiCompatProvider(opts: {
  baseUrl: string;
  apiKey: string;
  logger: AiLogger;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): ProviderImpl {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const url = `${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  async function post(body: Record<string, unknown>, task: string): Promise<ChatResponse> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const retryAfter = (lastErr as { retryAfterMs?: number } | undefined)?.retryAfterMs;
        await sleep(Math.min(retryAfter ?? 500 * 2 ** (attempt - 1), 20_000));
      }
      let res: Response;
      try {
        res = await doFetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      } catch (e) {
        lastErr = e; // network error → retry
        opts.logger.warn(
          { task, attempt, err: (e as Error).message },
          "openai_compat network error",
        );
        continue;
      }
      if (res.ok) return (await res.json()) as ChatResponse;
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const err = new AiProviderError(`openai_compat HTTP ${res.status}: ${detail}`, res.status);
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        lastErr = Object.assign(
          err,
          Number.isFinite(ra) && ra > 0 ? { retryAfterMs: ra * 1000 } : {},
        );
        opts.logger.warn({ task, attempt, status: res.status }, "openai_compat retryable error");
        continue;
      }
      throw err;
    }
    throw lastErr instanceof Error ? lastErr : new AiProviderError("openai_compat request failed");
  }

  function firstChoice(res: ChatResponse) {
    const choice = res.choices?.[0];
    if (!choice) throw new AiProviderError("openai_compat: response has no choices");
    if (choice.finish_reason === "content_filter") throw new AiRefusalError("content_filter");
    return choice;
  }

  function usage(res: ChatResponse, model: string) {
    const inputTokens = res.usage?.prompt_tokens ?? 0;
    const outputTokens = res.usage?.completion_tokens ?? 0;
    return {
      inputTokens,
      outputTokens,
      costUsd: computeCostUsd("openai_compat", model, { inputTokens, outputTokens }),
    };
  }

  return {
    name: "openai_compat",
    supportsWebResearch: false,

    async complete(model: string, req: CompleteRequest): Promise<CompleteResult> {
      const body: Record<string, unknown> = {
        model,
        max_tokens: req.maxTokens ?? TASK_MAX_TOKENS[req.task],
        messages: [
          { role: "system", content: req.system },
          ...req.messages,
        ] satisfies ChatMessage[],
      };
      if (req.jsonSchema) {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: "output", strict: true, schema: toStrictSchema(req.jsonSchema) },
        };
      }
      const res = await post(body, req.task);
      const choice = firstChoice(res);
      return {
        text: (choice.message?.content ?? "").trim(),
        provider: "openai_compat",
        model,
        ...usage(res, model),
      };
    },

    async completeWithTools(
      model: string,
      req: ToolChatRequest,
      hooks: LoopHooks,
    ): Promise<ToolChatResult> {
      const defs = new Map(req.tools.map((t) => [t.name, t]));
      const tools = req.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: toStrictSchema(t.inputSchema),
        },
      }));
      const messages: ChatMessage[] = [{ role: "system", content: req.system }, ...req.messages];
      const toolCalls: ToolCallRecord[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;
      let lastText = "";

      for (let i = 0; i < (req.maxIterations ?? 6); i++) {
        await hooks.beforeCall();
        const res = await post(
          { model, max_tokens: req.maxTokens ?? TASK_MAX_TOKENS[req.task], messages, tools },
          req.task,
        );
        const u = usage(res, model);
        inputTokens += u.inputTokens;
        outputTokens += u.outputTokens;
        costUsd += u.costUsd;
        await hooks.afterCall(u.costUsd);
        const choice = firstChoice(res);
        lastText = (choice.message?.content ?? "").trim();
        const calls = choice.message?.tool_calls ?? [];
        if (calls.length === 0) break;

        messages.push({
          role: "assistant",
          content: choice.message?.content ?? null,
          tool_calls: calls,
        });
        for (const call of calls) {
          let input: Record<string, unknown> = {};
          let output: string;
          let isError = false;
          const def = defs.get(call.function.name);
          try {
            const parsed: unknown = JSON.parse(call.function.arguments || "{}");
            if (parsed && typeof parsed === "object") input = parsed as Record<string, unknown>;
            if (!def) throw new Error(`Unknown tool "${call.function.name}".`);
            output = await def.run(input);
          } catch (e) {
            output = `Tool failed: ${(e as Error).message}`;
            isError = true;
          }
          toolCalls.push({ name: call.function.name, input, output, isError });
          messages.push({ role: "tool", tool_call_id: call.id, content: output });
        }
      }

      return {
        text: lastText,
        provider: "openai_compat",
        model,
        inputTokens,
        outputTokens,
        costUsd,
        toolCalls,
      };
    },
  };
}

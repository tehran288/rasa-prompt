import Anthropic from "@anthropic-ai/sdk";
import { toStrictSchema } from "../json";
import { computeCostUsd } from "../pricing";
import { STREAM_THRESHOLD, TASK_EFFORT, TASK_MAX_TOKENS } from "../routing";
import {
  type AiLogger,
  AiRefusalError,
  type Citation,
  type CompleteRequest,
  type CompleteResult,
  type LoopHooks,
  type ProviderImpl,
  type ToolCallRecord,
  type ToolChatRequest,
  type ToolChatResult,
} from "../types";

type Params = Anthropic.MessageCreateParamsNonStreaming;

/**
 * The subset of the SDK client we use. The real `Anthropic` instance satisfies it; tests
 * inject a fake via `anthropicClientFactory`.
 */
export interface AnthropicClientLike {
  messages: {
    create(params: Params): PromiseLike<Anthropic.Message>;
    stream(params: Params): { finalMessage(): Promise<Anthropic.Message> };
  };
}

export type AnthropicClientFactory = (opts: { apiKey: string }) => AnthropicClientLike;

export const defaultAnthropicClientFactory: AnthropicClientFactory = ({ apiKey }) =>
  // SDK retries 408/409/429/5xx with exponential backoff + Retry-After.
  new Anthropic({ apiKey, maxRetries: 4, timeout: 10 * 60 * 1000 });

/** Max server-side `pause_turn` continuations for web research. */
const MAX_CONTINUATIONS = 5;

export function createAnthropicProvider(opts: {
  apiKey: string;
  logger: AiLogger;
  clientFactory?: AnthropicClientFactory;
}): ProviderImpl {
  const client = (opts.clientFactory ?? defaultAnthropicClientFactory)({ apiKey: opts.apiKey });
  const { logger } = opts;

  async function call(params: Params): Promise<Anthropic.Message> {
    // Large outputs (and long server-tool turns) must stream to avoid HTTP timeouts.
    const mustStream = params.max_tokens > STREAM_THRESHOLD || !!params.tools?.length;
    return mustStream
      ? client.messages.stream(params).finalMessage()
      : client.messages.create(params);
  }

  /** `unbilledUsd`: cost the router has not yet recorded (attached to refusals so it still counts). */
  function checkStop(msg: Anthropic.Message, task: string, unbilledUsd: number): void {
    if (msg.stop_reason === "refusal") {
      const err = new AiRefusalError(
        msg.stop_details?.category ?? null,
        msg.stop_details?.explanation ?? undefined,
      );
      err.costUsd = unbilledUsd;
      throw err;
    }
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "model_context_window_exceeded") {
      logger.warn({ task, stopReason: msg.stop_reason, model: msg.model }, "ai output truncated");
    }
  }

  return {
    name: "anthropic",
    supportsWebResearch: true,

    async complete(model: string, req: CompleteRequest): Promise<CompleteResult> {
      const maxTokens = req.maxTokens ?? TASK_MAX_TOKENS[req.task];
      let system = req.system;
      const params: Params = {
        model,
        max_tokens: maxTokens,
        system,
        cache_control: { type: "ephemeral" },
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: { effort: TASK_EFFORT[req.task] },
      };

      if (req.jsonSchema) {
        const schema = toStrictSchema(req.jsonSchema);
        if (req.webResearch) {
          // Structured outputs are incompatible with citations → instruct instead, parse leniently.
          system += `\n\n# Output\nAfter your research, reply with ONLY one JSON object (no prose, no code fences) that validates against this JSON Schema:\n${JSON.stringify(schema)}`;
          params.system = system;
        } else {
          params.output_config = {
            ...params.output_config,
            format: { type: "json_schema", schema },
          };
        }
      }

      if (req.webResearch) {
        const { maxSearches, allowedDomains, blockedDomains } = req.webResearch;
        // allowed_domains and blocked_domains are mutually exclusive in the API.
        const filter = allowedDomains?.length
          ? { allowed_domains: allowedDomains }
          : blockedDomains?.length
            ? { blocked_domains: blockedDomains }
            : {};
        params.tools = [
          { type: "web_search_20260209", name: "web_search", max_uses: maxSearches, ...filter },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: maxSearches, ...filter },
        ];
      }

      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;
      let msg: Anthropic.Message | null = null;
      const content: Anthropic.ContentBlock[] = [];

      for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
        msg = await call(params);
        const u = usageOf(msg);
        inputTokens += u.inputTokens;
        outputTokens += u.outputTokens;
        costUsd += computeCostUsd("anthropic", model, u.cost);
        content.push(...msg.content);
        checkStop(msg, req.task, costUsd);
        if (msg.stop_reason !== "pause_turn") break;
        // Server-side loop paused: re-send with the assistant turn so it resumes.
        params.messages = [...params.messages, { role: "assistant", content: msg.content }];
      }

      const result: CompleteResult = {
        text: finalText(content, !!req.webResearch),
        provider: "anthropic",
        model,
        inputTokens,
        outputTokens,
        costUsd,
      };
      if (req.webResearch) result.citations = extractCitations(content);
      return result;
    },

    async completeWithTools(
      model: string,
      req: ToolChatRequest,
      hooks: LoopHooks,
    ): Promise<ToolChatResult> {
      const defs = new Map(req.tools.map((t) => [t.name, t]));
      const tools: Anthropic.Tool[] = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: toStrictSchema(t.inputSchema) as Anthropic.Tool.InputSchema,
        strict: true,
      }));
      const messages: Anthropic.MessageParam[] = req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const maxIterations = req.maxIterations ?? 6;
      const toolCalls: ToolCallRecord[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;
      let lastText = "";

      for (let i = 0; i < maxIterations; i++) {
        await hooks.beforeCall();
        const msg = await call({
          model,
          max_tokens: req.maxTokens ?? TASK_MAX_TOKENS[req.task],
          system: req.system,
          cache_control: { type: "ephemeral" },
          tools,
          // tool_choice stays "auto": forced any/tool returns 400 on Opus/Sonnet 5.5.
          messages,
          output_config: { effort: TASK_EFFORT[req.task] },
        });
        const u = usageOf(msg);
        const cost = computeCostUsd("anthropic", model, u.cost);
        inputTokens += u.inputTokens;
        outputTokens += u.outputTokens;
        costUsd += cost;
        await hooks.afterCall(cost);
        // A refusal can cut a tool_use off mid-input — never run that turn's tools.
        checkStop(msg, req.task, 0);
        lastText = finalText(msg.content, false);

        if (msg.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: msg.content });
          continue;
        }
        const uses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        if (msg.stop_reason !== "tool_use" || uses.length === 0) break;

        messages.push({ role: "assistant", content: msg.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of uses) {
          const input = (use.input && typeof use.input === "object" ? use.input : {}) as Record<
            string,
            unknown
          >;
          const def = defs.get(use.name);
          let output: string;
          let isError = false;
          if (!def) {
            output = `Unknown tool "${use.name}".`;
            isError = true;
          } else {
            try {
              output = await def.run(input);
            } catch (e) {
              output = `Tool failed: ${(e as Error).message}`;
              isError = true;
            }
          }
          toolCalls.push({ name: use.name, input, output, isError });
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: output,
            is_error: isError,
          });
        }
        messages.push({ role: "user", content: results });
      }

      return {
        text: lastText,
        provider: "anthropic",
        model,
        inputTokens,
        outputTokens,
        costUsd,
        toolCalls,
      };
    },
  };
}

function usageOf(msg: Anthropic.Message) {
  const u = msg.usage;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  return {
    inputTokens: u.input_tokens + cacheWrite + cacheRead,
    outputTokens: u.output_tokens,
    cost: {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheWriteTokens: cacheWrite,
      cacheReadTokens: cacheRead,
      webSearches: u.server_tool_use?.web_search_requests ?? 0,
    },
  };
}

/**
 * Joins text blocks. With server tools, only the text after the last tool block is the
 * answer (earlier text is narration like "Let me search…").
 */
export function finalText(content: Anthropic.ContentBlock[], afterLastTool: boolean): string {
  let start = 0;
  if (afterLastTool) {
    for (let i = content.length - 1; i >= 0; i--) {
      const t = content[i]?.type;
      if (t !== "text" && t !== "thinking" && t !== "redacted_thinking") {
        start = i + 1;
        break;
      }
    }
  }
  const text = content
    .slice(start)
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (text.trim() || start === 0) return text.trim();
  return finalText(content, false);
}

/**
 * Citations actually used in the answer (text-block citations) plus pages fetched with
 * web_fetch; if the model cited nothing, falls back to the search results it saw.
 */
export function extractCitations(content: Anthropic.ContentBlock[]): Citation[] {
  const seen = new Map<string, Citation>();
  const add = (url: string | null | undefined, title: string | null | undefined) => {
    if (!url || seen.has(url)) return;
    seen.set(url, { url, title: title?.trim() || url });
  };
  for (const b of content) {
    if (b.type === "text") {
      for (const c of b.citations ?? []) {
        if (c.type === "web_search_result_location") add(c.url, c.title);
      }
    } else if (b.type === "web_fetch_tool_result" && b.content.type === "web_fetch_result") {
      add(b.content.url, b.content.content.title);
    }
  }
  if (seen.size === 0) {
    for (const b of content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) add(r.url, r.title);
      }
    }
  }
  return [...seen.values()];
}

import type { AiMessage, AiTask } from "@rasa/shared";
import { extractJson } from "./json";
import type {
  Citation,
  CompleteRequest,
  CompleteResult,
  RasaAiRouter,
  ToolCallRecord,
  ToolChatRequest,
  ToolChatResult,
} from "./types";

/** A scripted tool-using turn for `completeWithTools` (e.g. the support agent). */
export interface FakeToolTurn {
  toolCalls: { name: string; input: Record<string, unknown> }[];
  /** Final answer; may depend on the tool outputs. */
  text: string | ((outputs: string[]) => string);
}

/**
 * One canned reply:
 * - string → returned as text (json() parses it)
 * - Error → thrown (e.g. `new AiRefusalError("cyber")`, `new DomainError("rate_limited")`)
 * - `{ $text, citations? }` → text with citations
 * - `{ toolCalls, text }` → FakeToolTurn
 * - any other object → JSON (returned as stringified text by complete(), as-is by json())
 */
export type FakeReply =
  | string
  | Error
  | FakeToolTurn
  | { $text: string; citations?: Citation[] }
  | Record<string, unknown>;

export interface FakeCall {
  kind: "complete" | "json" | "tools";
  task: AiTask;
  system: string;
  messages: AiMessage[];
  jsonSchema?: Record<string, unknown>;
  webResearch?: CompleteRequest["webResearch"];
  tools?: string[];
}

export type FakeResponder = (call: FakeCall) => FakeReply | Promise<FakeReply>;

/**
 * Per task: a reply, an array of replies (consumed in order; the last one repeats), or a
 * function. Or a single function for every task. Note: to return a JSON array, use a string
 * or a function — a bare array means "sequence of replies".
 */
export type FakeResponses =
  | FakeResponder
  | Partial<Record<AiTask, FakeReply | FakeReply[] | FakeResponder>>;

export interface FakeAiRouter extends RasaAiRouter {
  readonly calls: FakeCall[];
  /** Tool calls executed by completeWithTools (with real outputs from your tool closures). */
  readonly toolCalls: ToolCallRecord[];
  callsFor(task: AiTask): FakeCall[];
  reset(): void;
}

/** Deterministic AiRouter for other packages' tests. No network, zero cost. */
export function createFakeAiRouter(responses: FakeResponses = {}): FakeAiRouter {
  const calls: FakeCall[] = [];
  const toolCalls: ToolCallRecord[] = [];
  const cursor = new Map<AiTask, number>();

  async function next(call: FakeCall): Promise<Exclude<FakeReply, Error>> {
    calls.push(call);
    let reply: FakeReply | FakeReply[] | FakeResponder | undefined;
    if (typeof responses === "function") reply = responses;
    else reply = responses[call.task];
    if (reply === undefined)
      throw new Error(`FakeAiRouter: no response configured for task "${call.task}"`);
    if (typeof reply === "function") reply = await reply(call);
    if (Array.isArray(reply)) {
      const i = cursor.get(call.task) ?? 0;
      cursor.set(call.task, i + 1);
      reply = reply[Math.min(i, reply.length - 1)] as FakeReply;
    }
    if (reply instanceof Error) throw reply;
    return reply;
  }

  function toResult(text: string, citations?: Citation[]): CompleteResult {
    return {
      text,
      provider: "fake",
      model: "fake",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      ...(citations ? { citations } : {}),
    };
  }

  function textOf(reply: Exclude<FakeReply, Error>): { text: string; citations?: Citation[] } {
    if (typeof reply === "string") return { text: reply };
    if ("$text" in reply && typeof reply.$text === "string") {
      return {
        text: reply.$text,
        ...(reply.citations ? { citations: reply.citations as Citation[] } : {}),
      };
    }
    if ("toolCalls" in reply && typeof reply.text === "string") return { text: reply.text };
    return { text: JSON.stringify(reply) };
  }

  function callOf(kind: FakeCall["kind"], req: CompleteRequest): FakeCall {
    return {
      kind,
      task: req.task,
      system: req.system,
      messages: req.messages,
      ...(req.jsonSchema ? { jsonSchema: req.jsonSchema } : {}),
      ...(req.webResearch ? { webResearch: req.webResearch } : {}),
    };
  }

  return {
    calls,
    toolCalls,
    callsFor: (task) => calls.filter((c) => c.task === task),
    reset() {
      calls.length = 0;
      toolCalls.length = 0;
      cursor.clear();
    },

    async complete(req) {
      const { text, citations } = textOf(await next(callOf("complete", req)));
      return toResult(text, citations);
    },

    async json<T>(req: CompleteRequest & { parse: (raw: unknown) => T }): Promise<T> {
      const { parse, ...rest } = req;
      const attempt = async (): Promise<T> => {
        const reply = await next(callOf("json", rest));
        const raw =
          typeof reply === "string" || "$text" in reply
            ? extractJson(textOf(reply).text)
            : structuredClone(reply);
        return parse(raw);
      };
      try {
        return await attempt();
      } catch {
        return attempt(); // mirrors the real router's single corrective retry
      }
    },

    async completeWithTools(req: ToolChatRequest): Promise<ToolChatResult> {
      const reply = await next({
        kind: "tools",
        task: req.task,
        system: req.system,
        messages: req.messages,
        tools: req.tools.map((t) => t.name),
      });
      const executed: ToolCallRecord[] = [];
      let text: string;
      if (typeof reply === "object" && "toolCalls" in reply && Array.isArray(reply.toolCalls)) {
        const turn = reply as FakeToolTurn;
        for (const call of turn.toolCalls) {
          const def = req.tools.find((t) => t.name === call.name);
          let output: string;
          let isError = false;
          try {
            if (!def) throw new Error(`Unknown tool "${call.name}".`);
            output = await def.run(call.input);
          } catch (e) {
            output = `Tool failed: ${(e as Error).message}`;
            isError = true;
          }
          executed.push({ name: call.name, input: call.input, output, isError });
        }
        toolCalls.push(...executed);
        text =
          typeof turn.text === "function" ? turn.text(executed.map((c) => c.output)) : turn.text;
      } else {
        text = textOf(reply).text;
      }
      return { ...toResult(text), toolCalls: executed };
    },

    async spentTodayUsd() {
      return 0;
    },

    routeFor() {
      return { provider: "fake", model: "fake" };
    },
  };
}

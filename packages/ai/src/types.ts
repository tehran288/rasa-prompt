import type { AiMessage, AiProvider, AiRouter, AiTask, AiTextResult } from "@rasa/shared";

/** Request shape of the frozen `AiProvider.complete` contract. */
export type CompleteRequest = Parameters<AiProvider["complete"]>[0];
export type CompleteResult = Awaited<ReturnType<AiProvider["complete"]>>;
export type Citation = { url: string; title: string };

/** Minimal structural logger (pino's Logger satisfies it). */
export interface AiLogger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export const PROVIDER_NAMES = ["anthropic", "openai_compat"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export interface Route {
  provider: ProviderName;
  model: string;
}

/**
 * A client-side tool the model may call. `run` is executed by our code; the closure
 * holds any scoping (e.g. the authenticated userId) so the model can never supply it.
 */
export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema for the input object (must set additionalProperties: false). */
  inputSchema: Record<string, unknown>;
  run(input: Record<string, unknown>): Promise<string>;
}

export interface ToolChatRequest {
  task: AiTask;
  system: string;
  messages: AiMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  /** Max model turns in the agentic loop (default 6). */
  maxIterations?: number;
}

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  output: string;
  isError: boolean;
}

export interface ToolChatResult extends AiTextResult {
  toolCalls: ToolCallRecord[];
}

/**
 * The router returned by `createAiRouter` / `createFakeAiRouter`. It is a superset of the
 * frozen `AiRouter` contract: `completeWithTools` powers the support agent.
 */
export interface RasaAiRouter extends AiRouter {
  completeWithTools(req: ToolChatRequest): Promise<ToolChatResult>;
  /** Resolved provider/model for a task after fallback (for diagnostics / admin). */
  routeFor(task: AiTask): { provider: string; model: string };
}

export function isToolCapable(router: AiRouter): router is RasaAiRouter {
  return typeof (router as Partial<RasaAiRouter>).completeWithTools === "function";
}

/** Thrown when the model declines (Anthropic `stop_reason: "refusal"`, OpenAI `content_filter`). */
export class AiRefusalError extends Error {
  readonly code = "refusal" as const;
  /** Spend incurred by the refused call that the router still has to record. */
  costUsd = 0;
  constructor(
    public readonly category: string | null,
    message?: string,
  ) {
    super(message ?? `model refused${category ? ` (${category})` : ""}`);
    this.name = "AiRefusalError";
  }
}

/** Configuration / provider-level failure (no provider configured, bad AI_ROUTES, HTTP error…). */
export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** json() could not get schema-valid output even after one corrective retry. */
export class AiJsonError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "AiJsonError";
  }
}

/** Internal provider: like AiProvider but model-explicit and tool-capable. */
export interface ProviderImpl {
  readonly name: ProviderName;
  readonly supportsWebResearch: boolean;
  complete(model: string, req: CompleteRequest): Promise<CompleteResult>;
  completeWithTools(model: string, req: ToolChatRequest, hooks: LoopHooks): Promise<ToolChatResult>;
}

/** Called around every model call inside an agentic loop (budget check + spend accounting). */
export interface LoopHooks {
  beforeCall(): Promise<void>;
  afterCall(costUsd: number): Promise<void>;
}

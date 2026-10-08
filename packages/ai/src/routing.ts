import type { AiTask } from "@rasa/shared";
import { AiProviderError, PROVIDER_NAMES, type ProviderName, type Route } from "./types";

export const AI_TASKS = [
  "concierge",
  "build_prompt",
  "run_prompt",
  "support",
  "moderate",
  "write_post",
  "report",
  "intel_analyze",
  "intel_research",
  "intel_engineer",
  "intel_critic",
  "intel_judge",
  "intel_localize",
  "intel_compliance",
] as const satisfies readonly AiTask[];

const HAIKU = "anthropic:claude-haiku-5-5";
const SONNET = "anthropic:claude-sonnet-5-5";
const OPUS = "anthropic:claude-opus-5-5";

/** Default task → "provider:model". Override any subset with AI_ROUTES (JSON). */
export const DEFAULT_ROUTES: Record<AiTask, string> = {
  concierge: HAIKU,
  moderate: HAIKU,
  intel_analyze: HAIKU,
  intel_judge: HAIKU,
  write_post: SONNET,
  report: SONNET,
  intel_localize: SONNET,
  intel_compliance: SONNET,
  build_prompt: OPUS,
  run_prompt: OPUS,
  support: OPUS,
  intel_research: OPUS,
  intel_engineer: OPUS,
  intel_critic: OPUS,
};

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Thinking is always on for the 5.5 family — effort is the depth/cost dial. */
export const TASK_EFFORT: Record<AiTask, Effort> = {
  concierge: "low",
  moderate: "low",
  intel_judge: "low",
  write_post: "low",
  report: "low",
  intel_analyze: "medium",
  intel_localize: "medium",
  intel_compliance: "medium",
  build_prompt: "medium",
  run_prompt: "medium",
  support: "medium",
  intel_research: "high",
  intel_engineer: "high",
  intel_critic: "high",
};

/** Default max_tokens (includes thinking tokens). Above STREAM_THRESHOLD we stream. */
export const TASK_MAX_TOKENS: Record<AiTask, number> = {
  concierge: 4_000,
  moderate: 4_000,
  intel_judge: 8_000,
  intel_analyze: 16_000,
  write_post: 8_000,
  report: 8_000,
  intel_localize: 16_000,
  intel_compliance: 8_000,
  build_prompt: 16_000,
  run_prompt: 16_000,
  support: 8_000,
  intel_research: 32_000,
  intel_engineer: 32_000,
  intel_critic: 16_000,
};

export const STREAM_THRESHOLD = 16_000;

export function parseRoute(spec: string, defaultCompatModel: string): Route {
  const idx = spec.indexOf(":");
  const provider = (idx === -1 ? spec : spec.slice(0, idx)).trim();
  const model = idx === -1 ? "" : spec.slice(idx + 1).trim();
  if (!(PROVIDER_NAMES as readonly string[]).includes(provider)) {
    throw new AiProviderError(
      `AI route "${spec}": unknown provider "${provider}" (expected ${PROVIDER_NAMES.join(" | ")})`,
    );
  }
  const p = provider as ProviderName;
  const m = model || (p === "openai_compat" ? defaultCompatModel : "");
  if (!m) throw new AiProviderError(`AI route "${spec}": model is missing`);
  return { provider: p, model: m };
}

/** Merges DEFAULT_ROUTES with the AI_ROUTES JSON. Throws a clear error on malformed config. */
export function buildRouteTable(
  aiRoutesJson: string,
  defaultCompatModel: string,
  onUnknownTask: (task: string) => void = () => {},
): Record<AiTask, Route> {
  let overrides: Record<string, unknown> = {};
  if (aiRoutesJson.trim()) {
    try {
      const parsed: unknown = JSON.parse(aiRoutesJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("not an object");
      overrides = parsed as Record<string, unknown>;
    } catch (e) {
      throw new AiProviderError(
        `AI_ROUTES must be a JSON object of task → "provider:model": ${(e as Error).message}`,
      );
    }
  }
  const table = {} as Record<AiTask, Route>;
  for (const task of AI_TASKS) table[task] = parseRoute(DEFAULT_ROUTES[task], defaultCompatModel);
  for (const [task, spec] of Object.entries(overrides)) {
    if (!(AI_TASKS as readonly string[]).includes(task)) {
      onUnknownTask(task);
      continue;
    }
    if (typeof spec !== "string") throw new AiProviderError(`AI_ROUTES.${task} must be a string`);
    table[task as AiTask] = parseRoute(spec, defaultCompatModel);
  }
  return table;
}

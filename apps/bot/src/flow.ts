import {
  type AnalyticsEvent,
  DomainError,
  type OutputType,
  type PromptDetail,
  type PromptTier,
} from "@rasa/shared";
import type { MessageKey } from "./i18n";
import type { AppDeps, BotContext, FlowStep } from "./types";

/** Credits per AI run of a catalog/built prompt, by output type. */
export const RUN_COST: Record<OutputType, number> = {
  text: 2,
  code: 3,
  automation: 3,
  image: 0, // not runnable in-bot
  video: 0,
  audio: 0,
};
export const RUNNABLE_OUTPUTS: readonly OutputType[] = ["text", "code", "automation"];
/** Credits per AI build once the daily free quota is used. */
export const AI_BUILD_COST = 2;
/** Cost of running a filled / AI-built prompt (text). */
export const SESSION_RUN_COST = RUN_COST.text;

export function isRunnable(outputType: OutputType): boolean {
  return RUNNABLE_OUTPUTS.includes(outputType);
}

export function runCost(outputType: OutputType): number {
  return RUN_COST[outputType] || RUN_COST.text;
}

export function isPaidTier(tier: PromptTier): boolean {
  return tier !== "free";
}

export const IDLE: FlowStep = { kind: "idle" };

export function resetStep(ctx: BotContext): void {
  ctx.session.step = { kind: "idle" };
}

/** Fire-and-forget analytics: never breaks the user flow. */
export function track(
  app: AppDeps,
  event: AnalyticsEvent,
  userId: string | null,
  props?: Record<string, unknown>,
): void {
  try {
    app.services.analytics
      .track(event, userId, { platform: app.platform, ...props })
      .catch((err: unknown) => app.logger.warn({ err, event }, "analytics.track failed"));
  } catch (err) {
    app.logger.warn({ err, event }, "analytics.track threw");
  }
}

export class TimeoutError extends Error {
  constructor(label: string) {
    super(`timeout: ${label}`);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function aiTimeout(app: AppDeps): number {
  return app.options.aiTimeoutMs ?? 25_000;
}

/** UTC date key YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Access rule (non-negotiable): paid bodies only when EntitlementService.canAccess is true.
 * Returns the body (unwatermarked) or null if the user may not see it.
 */
export async function loadAccessibleBody(
  app: AppDeps,
  ctx: BotContext,
  prompt: PromptDetail,
): Promise<{ body: string; paid: boolean } | null> {
  const paid = isPaidTier(prompt.tier);
  if (paid && !(await app.services.entitlements.canAccess(ctx.user.id, prompt.id))) return null;
  const body = await app.services.catalog.getPromptBody(prompt.id, ctx.locale);
  if (body === null) return null;
  return { body, paid };
}

/** Replaces {{name}} / {{ name }} placeholders. Unfilled optional vars are removed. */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (m, name: string) =>
    name in values ? (values[name] ?? "") : m,
  );
}

/** Works across duplicated module instances (checks the name, not only the prototype). */
export function isDomainError(err: unknown, code?: DomainError["code"]): err is DomainError {
  const isDomain =
    err instanceof DomainError ||
    (err instanceof Error && err.name === "DomainError" && "code" in err);
  return isDomain && (code === undefined || (err as DomainError).code === code);
}

/**
 * Maps AI failures to a user-facing message key:
 *  - AiRefusalError (code "refusal", from @rasa/ai) → "ai.refused"
 *  - DomainError("rate_limited") (daily AI budget exhausted) → "ai.busy"
 * Anything else → null (generic failure copy).
 */
export function aiErrorKey(err: unknown): MessageKey | null {
  if (err && typeof err === "object" && (err as { code?: unknown }).code === "refusal") {
    return "ai.refused";
  }
  if (isDomainError(err, "rate_limited")) return "ai.busy";
  return null;
}

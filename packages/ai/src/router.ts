import { type AiTask, type Config, DomainError, type SettingsService } from "@rasa/shared";
import { extractJson } from "./json";
import { round6 } from "./pricing";
import { type AnthropicClientFactory, createAnthropicProvider } from "./providers/anthropic";
import { createOpenAiCompatProvider } from "./providers/openai-compat";
import { buildRouteTable, DEFAULT_ROUTES, parseRoute } from "./routing";
import {
  AiJsonError,
  type AiLogger,
  AiProviderError,
  AiRefusalError,
  type CompleteRequest,
  type CompleteResult,
  type ProviderImpl,
  type ProviderName,
  type RasaAiRouter,
  type Route,
  type ToolChatRequest,
  type ToolChatResult,
} from "./types";

export type AiRouterConfig = Pick<
  Config,
  | "ANTHROPIC_API_KEY"
  | "OPENAI_COMPAT_BASE_URL"
  | "OPENAI_COMPAT_API_KEY"
  | "OPENAI_COMPAT_MODEL"
  | "AI_ROUTES"
  | "AI_DAILY_BUDGET_USD"
>;

export interface AiRouterDeps {
  settings: SettingsService;
  logger: AiLogger;
  /** Test seam: build the Anthropic SDK client (default: real `new Anthropic(...)`). */
  anthropicClientFactory?: AnthropicClientFactory;
  /** Test seam for the OpenAI-compatible provider. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

export const SPEND_KEY_PREFIX = "ai_spend:";

/**
 * Task-based model router. Picks provider+model per AiTask (DEFAULT_ROUTES overridden by
 * AI_ROUTES), falls back to the other configured provider, enforces the daily USD budget and
 * records spend in SettingsService under `ai_spend:<YYYY-MM-DD>` (UTC).
 */
export function createAiRouter(config: AiRouterConfig, deps: AiRouterDeps): RasaAiRouter {
  const { settings, logger } = deps;
  const now = deps.now ?? (() => new Date());
  const compatModel = config.OPENAI_COMPAT_MODEL.trim();

  const table = buildRouteTable(config.AI_ROUTES, compatModel, (task) =>
    logger.warn({ task }, "AI_ROUTES: ignoring unknown task"),
  );

  const providers = new Map<ProviderName, ProviderImpl>();
  if (config.ANTHROPIC_API_KEY) {
    providers.set(
      "anthropic",
      createAnthropicProvider({
        apiKey: config.ANTHROPIC_API_KEY,
        logger,
        ...(deps.anthropicClientFactory ? { clientFactory: deps.anthropicClientFactory } : {}),
      }),
    );
  }
  // Self-hosted endpoints often need no key, so base URL + model is what makes it "configured".
  if (config.OPENAI_COMPAT_BASE_URL && compatModel) {
    providers.set(
      "openai_compat",
      createOpenAiCompatProvider({
        baseUrl: config.OPENAI_COMPAT_BASE_URL,
        apiKey: config.OPENAI_COMPAT_API_KEY,
        logger,
        ...(deps.fetch ? { fetch: deps.fetch } : {}),
        ...(deps.sleep ? { sleep: deps.sleep } : {}),
      }),
    );
  }

  const warnedFallback = new Set<string>();

  function resolve(task: AiTask, needsWeb: boolean): { route: Route; provider: ProviderImpl } {
    const primary = table[task];
    const candidates: Route[] = [primary];
    if (primary.provider === "anthropic") {
      if (compatModel) candidates.push({ provider: "openai_compat", model: compatModel });
    } else {
      candidates.push(parseRoute(DEFAULT_ROUTES[task], compatModel));
    }
    for (const route of candidates) {
      const provider = providers.get(route.provider);
      if (!provider || (needsWeb && !provider.supportsWebResearch)) continue;
      if (route !== primary) {
        const key = `${task}:${route.provider}`;
        if (!warnedFallback.has(key)) {
          warnedFallback.add(key);
          logger.warn(
            {
              task,
              wanted: `${primary.provider}:${primary.model}`,
              using: `${route.provider}:${route.model}`,
            },
            "AI route fallback: primary provider not configured or lacks a required feature",
          );
        }
      }
      return { route, provider };
    }
    const configured = [...providers.keys()].join(", ") || "none";
    throw new AiProviderError(
      `No AI provider available for task "${task}" (route ${primary.provider}:${primary.model}` +
        `${needsWeb ? ", needs web research → anthropic" : ""}; configured: ${configured}). ` +
        "Set ANTHROPIC_API_KEY and/or OPENAI_COMPAT_BASE_URL + OPENAI_COMPAT_MODEL.",
    );
  }

  // ── budget ──────────────────────────────────────────────────────────────
  const budget = config.AI_DAILY_BUDGET_USD;
  const dayKey = () => `${SPEND_KEY_PREFIX}${now().toISOString().slice(0, 10)}`;

  async function spentTodayUsd(): Promise<number> {
    const v = Number(await settings.get<number>(dayKey(), 0));
    return Number.isFinite(v) ? v : 0;
  }

  async function ensureBudget(task: AiTask): Promise<void> {
    const spent = await spentTodayUsd();
    // budget <= 0 acts as a kill switch.
    if (spent >= budget) {
      logger.warn({ task, spent, budget }, "AI daily budget exhausted");
      throw new DomainError(
        "rate_limited",
        `AI daily budget reached ($${spent.toFixed(2)} / $${budget})`,
      );
    }
  }

  // Serialize read-modify-write of the spend counter within this process.
  let spendChain: Promise<void> = Promise.resolve();
  function recordSpend(costUsd: number): Promise<void> {
    if (!(costUsd > 0)) return spendChain;
    spendChain = spendChain
      .then(async () => {
        const key = dayKey();
        const cur = Number(await settings.get<number>(key, 0)) || 0;
        await settings.set(key, round6(cur + costUsd));
      })
      .catch((e: unknown) =>
        logger.error({ err: (e as Error).message }, "failed to record AI spend"),
      );
    return spendChain;
  }

  // ── public API ──────────────────────────────────────────────────────────
  async function complete(req: CompleteRequest): Promise<CompleteResult> {
    const { route, provider } = resolve(req.task, !!req.webResearch);
    await ensureBudget(req.task);
    const started = Date.now();
    try {
      const res = await provider.complete(route.model, req);
      await recordSpend(res.costUsd);
      logger.info(
        {
          task: req.task,
          provider: res.provider,
          model: res.model,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          costUsd: res.costUsd,
          ms: Date.now() - started,
          citations: res.citations?.length,
        },
        "ai complete",
      );
      return res;
    } catch (e) {
      if (e instanceof AiRefusalError) {
        await recordSpend(e.costUsd);
        logger.warn({ task: req.task, model: route.model, category: e.category }, "ai refusal");
      }
      throw e;
    }
  }

  async function json<T>(req: CompleteRequest & { parse: (raw: unknown) => T }): Promise<T> {
    const { parse, ...base } = req;
    const first = await complete(base);
    try {
      return parse(extractJson(first.text));
    } catch (e) {
      const reason = describeError(e);
      logger.warn({ task: req.task, reason }, "ai json invalid, retrying once");
      // Retry without web research: research is already in the transcript, and dropping the
      // server tools lets the provider enforce the JSON schema natively.
      const { webResearch: _drop, ...retryBase } = base;
      const second = await complete({
        ...retryBase,
        messages: [
          ...base.messages,
          { role: "assistant", content: first.text || "(empty response)" },
          {
            role: "user",
            content: `Your previous reply could not be used because it failed validation:\n${reason}\n\nReply again with ONLY the corrected JSON object that satisfies the required schema. No prose, no code fences.`,
          },
        ],
      });
      try {
        return parse(extractJson(second.text));
      } catch (e2) {
        throw new AiJsonError(
          `AI output for task "${req.task}" failed validation twice: ${describeError(e2)}`,
          second.text,
        );
      }
    }
  }

  async function completeWithTools(req: ToolChatRequest): Promise<ToolChatResult> {
    const { route, provider } = resolve(req.task, false);
    const started = Date.now();
    const res = await provider.completeWithTools(route.model, req, {
      beforeCall: () => ensureBudget(req.task),
      afterCall: (cost) => recordSpend(cost),
    });
    logger.info(
      {
        task: req.task,
        provider: res.provider,
        model: res.model,
        inputTokens: res.inputTokens,
        outputTokens: res.outputTokens,
        costUsd: res.costUsd,
        tools: res.toolCalls.map((t) => t.name),
        ms: Date.now() - started,
      },
      "ai tool loop",
    );
    return res;
  }

  return {
    complete,
    json,
    spentTodayUsd,
    completeWithTools,
    routeFor: (task) => resolve(task, false).route,
  };
}

function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.length > 1500 ? `${msg.slice(0, 1500)}…` : msg;
}

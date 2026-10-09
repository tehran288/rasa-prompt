import type { AiMessage, AiRouter, AiTask } from "@rasa/shared";
import { z } from "zod";
import { errorMessage } from "./text";

export interface AskJsonRequest<S extends z.ZodType> {
  task: AiTask;
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  /** Extra semantic validation; return an error string to trigger a repair round. */
  validate?: (value: z.infer<S>) => string | null;
  /** Repair rounds after the first attempt (default 1). */
  retries?: number;
}

const schemaCache = new WeakMap<z.ZodType, Record<string, unknown>>();

export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  let js = schemaCache.get(schema);
  if (!js) {
    js = z.toJSONSchema(schema) as Record<string, unknown>;
    delete js.$schema;
    schemaCache.set(schema, js);
  }
  return js;
}

/**
 * Structured call through the router: JSON Schema derived from the zod schema, response
 * parsed with zod, plus optional semantic validation with feedback-driven repair rounds.
 */
export async function askJson<S extends z.ZodType>(
  ai: AiRouter,
  req: AskJsonRequest<S>,
): Promise<z.infer<S>> {
  const messages: AiMessage[] = [{ role: "user", content: req.user }];
  const retries = req.retries ?? 1;
  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    let value: z.infer<S>;
    try {
      value = await ai.json({
        task: req.task,
        system: req.system,
        messages: [...messages],
        maxTokens: req.maxTokens,
        jsonSchema: jsonSchemaOf(req.schema),
        parse: (raw) => req.schema.parse(raw) as z.infer<S>,
      });
    } catch (err) {
      if (!(err instanceof z.ZodError)) throw err;
      lastError = `Your JSON did not match the schema: ${z.prettifyError(err)}`;
      messages.push({ role: "user", content: `${lastError}\nReturn corrected JSON only.` });
      continue;
    }
    const problem = req.validate?.(value) ?? null;
    if (!problem) return value;
    lastError = problem;
    messages.push(
      { role: "assistant", content: JSON.stringify(value) },
      {
        role: "user",
        content: `The JSON is invalid for this reason: ${problem}\nFix it and return the full corrected JSON only.`,
      },
    );
  }
  throw new Error(
    `${req.task}: output failed validation after ${retries + 1} attempts — ${lastError}`,
  );
}

/** Extracts the first JSON object/array from free text (web-research answers are plain text). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.search(/[[{]/);
    if (start < 0) continue;
    const open = c[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        try {
          return JSON.parse(c.slice(start, i + 1));
        } catch (err) {
          throw new Error(`invalid JSON in model answer: ${errorMessage(err)}`);
        }
      }
    }
  }
  throw new Error("no JSON found in model answer");
}

export interface WebResearchResult<T> {
  value: T;
  citations: { url: string; title: string }[];
  costUsd: number;
}

/**
 * Provider-side web research (search + fetch tools) with a JSON answer in plain text.
 * Structured-output mode is not combined with server tools on every provider, so we ask for
 * a fenced JSON block and validate it with zod ourselves.
 */
export async function webResearchJson<S extends z.ZodType>(
  ai: AiRouter,
  req: {
    system: string;
    user: string;
    schema: S;
    maxSearches: number;
    blockedDomains?: string[];
    maxTokens?: number;
  },
): Promise<WebResearchResult<z.infer<S>>> {
  const res = await ai.complete({
    task: "intel_research",
    system: req.system,
    messages: [{ role: "user", content: req.user }],
    maxTokens: req.maxTokens ?? 4000,
    webResearch: {
      maxSearches: req.maxSearches,
      ...(req.blockedDomains?.length ? { blockedDomains: req.blockedDomains } : {}),
    },
  });
  const value = req.schema.parse(extractJson(res.text)) as z.infer<S>;
  return { value, citations: res.citations ?? [], costUsd: res.costUsd };
}

/** URL identity for matching model-reported URLs against provider citations. */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const p of [...u.searchParams.keys()]) if (p.startsWith("utm_")) u.searchParams.delete(p);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

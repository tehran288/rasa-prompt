import { z } from "zod";

/**
 * Extracts a JSON value from model text: tolerates ```json fences and prose around the
 * object (needed when web research is on and structured output can't be enforced).
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  const starts = [trimmed.indexOf("{"), trimmed.indexOf("[")].filter((i) => i >= 0);
  if (starts.length) {
    const start = Math.min(...starts);
    const close = trimmed[start] === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(close);
    if (end > start) return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new SyntaxError("no JSON value found in model output");
}

const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);

/**
 * Makes a JSON Schema acceptable for strict structured outputs / strict tools:
 * every object gets `additionalProperties: false`; numeric/string/array constraints the API
 * does not support are stripped (callers still validate client-side via `parse`).
 */
export function toStrictSchema(schema: unknown): Record<string, unknown> {
  return strictify(schema) as Record<string, unknown>;
}

function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (UNSUPPORTED_KEYWORDS.has(k)) continue;
    if (k === "minItems" && typeof v === "number" && v > 1) continue;
    if (k === "properties" && v && typeof v === "object") {
      out[k] = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, strictify(pv)]));
      continue;
    }
    out[k] = strictify(v);
  }
  const type = out.type;
  const isObject = type === "object" || (Array.isArray(type) && type.includes("object"));
  if (isObject || "properties" in out) out.additionalProperties = false;
  return out;
}

/**
 * Helper for callers of `router.json`: derive both the JSON Schema and the parser from one
 * zod schema. Usage: `router.json({ task, system, messages, ...zodJson(MySchema) })`.
 */
export function zodJson<S extends z.ZodType>(
  schema: S,
): { jsonSchema: Record<string, unknown>; parse: (raw: unknown) => z.output<S> } {
  return {
    jsonSchema: toStrictSchema(z.toJSONSchema(schema, { io: "output" })),
    parse: (raw: unknown) => schema.parse(raw),
  };
}

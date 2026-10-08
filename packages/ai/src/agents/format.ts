/** Tags Telegram accepts in `parse_mode: "HTML"` that we allow in generated posts. */
const TELEGRAM_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "code",
  "pre",
  "blockquote",
  "tg-spoiler",
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^<>]*>/g;

function escapeText(s: string): string {
  return s
    .replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * Makes model output safe for Telegram `parse_mode: "HTML"`: keeps only supported tags (without
 * attributes), escapes stray `& < >`, and degrades to escaped plain text if tags are unbalanced
 * (Telegram rejects the whole message otherwise).
 */
export function sanitizeTelegramHtml(input: string): string {
  let out = "";
  let last = 0;
  const stack: string[] = [];
  let balanced = true;
  for (const m of input.matchAll(TAG_RE)) {
    const index = m.index ?? 0;
    out += escapeText(input.slice(last, index));
    last = index + m[0].length;
    const name = (m[1] ?? "").toLowerCase();
    if (name === "br") {
      out += "\n";
      continue;
    }
    if (!TELEGRAM_TAGS.has(name)) continue;
    if (m[0].startsWith("</")) {
      if (stack.pop() !== name) balanced = false;
      out += `</${name}>`;
    } else {
      stack.push(name);
      out += `<${name}>`;
    }
  }
  out += escapeText(input.slice(last));
  if (!balanced || stack.length > 0) return escapeText(toPlainText(input));
  return out.trim();
}

/** Plain text for Bale (or any client without a reliable rich-text mode). */
export function toPlainText(input: string): string {
  return decodeEntities(input.replace(/<br\s*\/?>/gi, "\n").replace(TAG_RE, ""))
    .replace(/\*\*|__|~~/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

/** `{{name}}` placeholders in order of first appearance. */
export function extractVariables(prompt: string): string[] {
  const names: string[] = [];
  for (const m of prompt.matchAll(/\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g)) {
    const name = m[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

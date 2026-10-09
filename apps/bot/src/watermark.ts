/**
 * Invisible watermark for delivered paid prompts (leak tracing).
 *
 * The owner id is UTF-8 encoded, followed by a 1-byte checksum, and written as
 * bits using invisible "math operator" code points:
 *   U+2063 INVISIBLE SEPARATOR  — frame marker (start and end)
 *   U+2061 FUNCTION APPLICATION — bit 0
 *   U+2062 INVISIBLE TIMES      — bit 1
 *
 * We deliberately avoid U+200C (ZWNJ) and U+200D (ZWJ): they are part of normal
 * Persian/Arabic orthography and emoji sequences, so using them would both corrupt
 * rendering and produce false positives when decoding.
 *
 * The mark is embedded several times (after the first line, in the middle, at the end)
 * so a partial copy-paste still carries at least one intact copy.
 */

const MARK = "⁣";
const ZERO = "⁡";
const ONE = "⁢";
const ALL_INVISIBLE = /[⁡⁢⁣]/g;
const FRAME = new RegExp(`${MARK}([${ZERO}${ONE}]+)${MARK}`, "g");

function checksum(bytes: Uint8Array): number {
  let sum = 0x5a;
  for (const b of bytes) sum = (sum * 31 + b) & 0xff;
  return sum;
}

/** Encodes `ownerId` as an invisible string (no visible characters). */
export function encodeWatermark(ownerId: string): string {
  const bytes = new TextEncoder().encode(ownerId);
  const all = new Uint8Array(bytes.length + 1);
  all.set(bytes);
  all[bytes.length] = checksum(bytes);
  let bits = "";
  for (const b of all) {
    for (let i = 7; i >= 0; i--) bits += (b >> i) & 1 ? ONE : ZERO;
  }
  return `${MARK}${bits}${MARK}`;
}

function decodeFrame(bits: string): string | null {
  if (bits.length % 8 !== 0 || bits.length < 16) return null;
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] === ONE ? 1 : 0);
    bytes[i] = b;
  }
  const payload = bytes.subarray(0, bytes.length - 1);
  if (checksum(payload) !== bytes[bytes.length - 1]) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(payload);
  } catch {
    return null;
  }
}

/** Inserts the watermark into `text` at several positions. Visible text is unchanged. */
export function applyWatermark(text: string, ownerId: string): string {
  const mark = encodeWatermark(ownerId);
  const clean = stripWatermark(text);
  const firstBreak = clean.indexOf("\n");
  const firstPos = firstBreak > 0 ? firstBreak : Math.min(clean.length, 1);
  // middle: the space nearest to the center, so we never split a grapheme cluster
  const center = Math.floor(clean.length / 2);
  const space = clean.indexOf(" ", center);
  const midPos = space > firstPos ? space : -1;
  let out = clean.slice(0, firstPos) + mark;
  if (midPos > 0) out += clean.slice(firstPos, midPos) + mark + clean.slice(midPos);
  else out += clean.slice(firstPos);
  return out + mark;
}

/** Returns the owner id found in `text`, or null if no intact watermark is present. */
export function decodeWatermark(text: string): string | null {
  for (const m of text.matchAll(FRAME)) {
    const id = decodeFrame(m[1] ?? "");
    if (id !== null) return id;
  }
  return null;
}

/** Every distinct owner id found in `text` (to detect merged leaks). */
export function decodeAllWatermarks(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(FRAME)) {
    const id = decodeFrame(m[1] ?? "");
    if (id !== null) ids.add(id);
  }
  return [...ids];
}

/** Removes every watermark character. */
export function stripWatermark(text: string): string {
  return text.replace(ALL_INVISIBLE, "");
}

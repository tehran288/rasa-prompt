import { ALLOWED_CONTENT_LICENSES, type ContentLicense } from "@rasa/shared";

const ALIASES: Record<string, (typeof ALLOWED_CONTENT_LICENSES)[number]> = {
  "cc0-1.0": "CC0-1.0",
  cc0: "CC0-1.0",
  "cc0 1.0": "CC0-1.0",
  "cc0-1.0-universal": "CC0-1.0",
  mit: "MIT",
  "apache-2.0": "Apache-2.0",
  "apache 2.0": "Apache-2.0",
  apache2: "Apache-2.0",
  "apache license 2.0": "Apache-2.0",
  "cc-by-4.0": "CC-BY-4.0",
  "cc by 4.0": "CC-BY-4.0",
  unlicense: "Unlicense",
  "the unlicense": "Unlicense",
};

/** Values that mean "the source did not say". */
const UNKNOWN = new Set(["", "other", "unknown", "noassertion", "none", "null", "see license"]);

/**
 * Maps a source-native license string (SPDX id, HF card value, GitHub `spdx_id`) to our
 * ContentLicense. Anything recognised but not in ALLOWED_CONTENT_LICENSES (GPL, CC-BY-SA,
 * CC-BY-NC, OpenRAIL…) becomes "proprietary" — i.e. usable as a signal, never as text.
 * For a list (dual / multi licensing) we are conservative: every entry must be allowed.
 */
export function normalizeLicense(raw: unknown): ContentLicense {
  if (Array.isArray(raw)) {
    const all = raw.map(normalizeLicense);
    if (all.length === 0) return "unknown";
    if (all.includes("proprietary")) return "proprietary";
    if (all.includes("unknown")) return "unknown";
    return all[0] ?? "unknown";
  }
  if (typeof raw !== "string") return "unknown";
  const key = raw.trim().toLowerCase();
  if (UNKNOWN.has(key)) return "unknown";
  const hit = ALIASES[key];
  if (hit) return hit;
  return "proprietary";
}

export function isAllowedLicense(license: ContentLicense): boolean {
  return (ALLOWED_CONTENT_LICENSES as readonly string[]).includes(license);
}

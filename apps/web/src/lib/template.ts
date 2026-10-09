/** Prompt template helpers: {{variable}} slots + "Section:" highlighting. */
export type Seg = { kind: "text" | "sec" | "slot"; text: string; key?: string };

const SEC_RE = /^([^\s\-\d:][^:\n]{0,24}):/;

export function segments(tpl: string, values: Record<string, string>): Seg[] {
  const out: Seg[] = [];
  const lines = tpl.split("\n");
  lines.forEach((line, li) => {
    let rest = line;
    const m = SEC_RE.exec(rest);
    if (m && !m[1]?.includes("{{")) {
      out.push({ kind: "sec", text: `${m[1]}:` });
      rest = rest.slice(m[0].length);
    }
    const parts = rest.split(/(\{\{\w+\}\})/g);
    for (const part of parts) {
      if (!part) continue;
      const v = /^\{\{(\w+)\}\}$/.exec(part);
      if (v?.[1]) out.push({ kind: "slot", key: v[1], text: values[v[1]]?.trim() || "…" });
      else out.push({ kind: "text", text: part });
    }
    if (li < lines.length - 1) out.push({ kind: "text", text: "\n" });
  });
  return out;
}

export function fill(tpl: string, values: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => values[k]?.trim() || `{{${k}}}`);
}

/** Truncate a segment list to the first n characters (for the typewriter). */
export function truncate(segs: Seg[], n: number): Seg[] {
  const out: Seg[] = [];
  let left = n;
  for (const s of segs) {
    if (left <= 0) break;
    if (s.text.length <= left) {
      out.push(s);
      left -= s.text.length;
    } else {
      out.push({ ...s, text: s.text.slice(0, left) });
      left = 0;
    }
  }
  return out;
}

export const segLength = (segs: Seg[]) => segs.reduce((a, s) => a + s.text.length, 0);

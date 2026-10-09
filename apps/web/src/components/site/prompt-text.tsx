import type { Seg } from "@/lib/template";

export function PromptText({
  segs,
  flash,
  caret,
}: {
  segs: Seg[];
  flash?: string | null;
  caret?: boolean;
}) {
  return (
    <>
      {segs.map((s, i) =>
        s.kind === "sec" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static order
          <span key={i} className="sec">
            {s.text}
          </span>
        ) : s.kind === "slot" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static order
          <span key={i} className={s.key === flash ? "slot flash" : "slot"}>
            {s.text}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static order
          <span key={i}>{s.text}</span>
        ),
      )}
      {caret ? <span className="caret" aria-hidden="true" /> : null}
    </>
  );
}

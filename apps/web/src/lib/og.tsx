import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Brand OpenGraph card. Rendered with Latin text only: Satori cannot shape Persian/Arabic
 * script reliably and Google Fonts are unreachable at build time, so localized pages share
 * an English card (title from the `en` catalog entry) — see docs/engineering/web.md.
 */
export function ogCard({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(900px 500px at 15% 0%, rgba(91,124,255,.35), transparent), radial-gradient(700px 400px at 100% 40%, rgba(232,187,87,.22), transparent), #060a17",
        color: "#eef1fb",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="64" height="64" viewBox="0 0 40 40">
          <g fill="none" stroke="#e8bb57" strokeWidth="2.4">
            <rect x="9" y="9" width="22" height="22" rx="3" />
            <rect x="9" y="9" width="22" height="22" rx="3" transform="rotate(45 20 20)" />
          </g>
          <circle cx="20" cy="20" r="4.2" fill="#7b95ff" />
        </svg>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>Rasa Prompt</div>
        <div style={{ marginLeft: "auto", fontSize: 24, color: "#9aa3c4" }}>rasa-prompt.ir</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{ fontSize: 26, color: "#e8bb57", letterSpacing: 4, textTransform: "uppercase" }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontSize: title.length > 40 ? 64 : 78,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#9aa3c4" }}
      >
        <div
          style={{
            display: "flex",
            padding: "6px 18px",
            borderRadius: 999,
            border: "1px solid rgba(79,214,154,.5)",
            color: "#4fd69a",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#4fd69a",
              marginRight: 10,
            }}
          />
          Tested
        </div>
        <div style={{ display: "flex" }}>{meta ?? "Persian • Arabic • English"}</div>
      </div>
    </div>,
    OG_SIZE,
  );
}

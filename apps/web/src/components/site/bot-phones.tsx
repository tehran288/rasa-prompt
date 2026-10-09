"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BALE_URL, TELEGRAM_URL } from "@/lib/site";

type Msg = [string, string, string[]?];

function Bubble({ m }: { m: Msg }) {
  const [who, text, kb] = m;
  if (who === "inv") {
    return (
      <div className="msg bot inv">
        <b>🧾</b> {text}
      </div>
    );
  }
  return (
    <div className={`msg ${who}`}>
      {text}
      {kb ? (
        <div className="kb">
          {kb.map((x) => {
            const [a, f] = x.split("|");
            return (
              <span key={x} className={f ? "full" : undefined}>
                {a}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Phone({
  kind,
  title,
  subtitle,
  seq,
  shown,
  typing,
  compose,
}: {
  kind: "tg" | "bale";
  title: string;
  subtitle: string;
  seq: Msg[];
  shown: number;
  typing: boolean;
  compose: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [shown, typing]);
  return (
    <figure className="phone m-0" data-reveal="">
      <div className="scr">
        <div className={`notch cbar ${kind}`} style={{ padding: 0 }}>
          <i />
        </div>
        <div className={`cbar ${kind}`}>
          <div className="av" aria-hidden="true">
            {kind === "tg" ? "R" : "ر"}
          </div>
          <div>
            <b>{title}</b>
            <small>{subtitle}</small>
          </div>
        </div>
        <div className="chat" ref={ref} aria-hidden="true">
          {seq.slice(0, shown).map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: scripted conversation
            <Bubble key={i} m={m} />
          ))}
          {typing ? (
            <div className="msg bot typing">
              <i />
              <i />
              <i />
            </div>
          ) : null}
        </div>
        <div className="compose" aria-hidden="true">
          <div>{compose}</div>
        </div>
      </div>
      <figcaption className="sr-only">
        {title} — {subtitle}
      </figcaption>
    </figure>
  );
}

/** Two phone mockups replaying a scripted bot conversation with typing indicators. */
export function BotPhones({
  tg,
  bale,
  labels,
  brand,
}: {
  tg: Msg[];
  bale: Msg[];
  labels: {
    tg: string;
    bale: string;
    compose: string;
    replay: string;
    openTg: string;
    openBale: string;
  };
  brand: string;
}) {
  const [state, setState] = useState({
    tg: tg.length,
    bale: bale.length,
    tgTyping: false,
    baleTyping: false,
  });
  const timers = useRef<number[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  const play = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState({ tg: tg.length, bale: bale.length, tgTyping: false, baleTyping: false });
      return;
    }
    setState({ tg: 0, bale: 0, tgTyping: false, baleTyping: false });
    for (const [key, seq] of [
      ["tg", tg],
      ["bale", bale],
    ] as const) {
      let at = 250;
      seq.forEach((m, i) => {
        if (m[0] !== "me") {
          timers.current.push(
            window.setTimeout(() => setState((s) => ({ ...s, [`${key}Typing`]: true })), at),
          );
          at += 700;
        }
        timers.current.push(
          window.setTimeout(
            () => setState((s) => ({ ...s, [key]: i + 1, [`${key}Typing`]: false })),
            at,
          ),
        );
        at += m[0] === "me" ? 650 : 450;
      });
    }
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !played.current) {
          played.current = true;
          play();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      for (const id of timers.current) window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root}>
      <div className="phones">
        <Phone
          kind="tg"
          title="Rasa Prompt"
          subtitle={labels.tg}
          seq={tg}
          shown={state.tg}
          typing={state.tgTyping}
          compose={labels.compose}
        />
        <Phone
          kind="bale"
          title={brand}
          subtitle={labels.bale}
          seq={bale}
          shown={state.bale}
          typing={state.baleTyping}
          compose={labels.compose}
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a className="btn tg" href={TELEGRAM_URL} target="_blank" rel="noopener">
          {labels.openTg}
        </a>
        <a className="btn bale" href={BALE_URL} target="_blank" rel="noopener">
          {labels.openBale}
        </a>
        <button type="button" className="btn ghost" onClick={play}>
          <RotateCcw size={16} aria-hidden="true" /> {labels.replay}
        </button>
      </div>
    </div>
  );
}

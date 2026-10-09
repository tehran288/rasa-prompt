"use client";

import { useEffect, useState } from "react";

export function MorphWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || words.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % words.length), 2200);
    return () => window.clearInterval(id);
  }, [words.length]);
  const w = words[i] ?? "";
  const lang = /[a-z]/i.test(w) ? "en" : /[پچژگک]|ی/.test(w) ? "fa" : "ar";
  return (
    <div className="art morph" aria-hidden="true">
      <span key={w} lang={lang}>
        {w}
      </span>
    </div>
  );
}

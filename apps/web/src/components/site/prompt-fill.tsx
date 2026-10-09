"use client";

import { Copy, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import type { PromptVariableView } from "@/lib/catalog-types";
import { fill, segments } from "@/lib/template";
import { PromptText } from "./prompt-text";

/** Variables form + live final prompt for FREE prompts. */
export function PromptFill({ body, variables }: { body: string; variables: PromptVariableView[] }) {
  const t = useTranslations("prompt");
  const tc = useTranslations("common");
  const copy = useCopy();
  const init = () =>
    Object.fromEntries(variables.map((v) => [v.name, v.default ?? v.options?.[0] ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(init);
  const [flash, setFlash] = useState<string | null>(null);
  const segs = useMemo(() => segments(body, values), [body, values]);
  const set = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setFlash(k);
    window.setTimeout(() => setFlash((f) => (f === k ? null : f)), 380);
  };
  const long = (name: string) => /code|transcript|bullets|query|samples|policies/.test(name);

  return (
    <div className="studio" style={{ marginTop: 0 }}>
      <div className="wbar">
        <div className="dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <b className="text-sm">{t("fillTitle")}</b>
        <span className="sp" />
        <button type="button" className="chip" onClick={() => setValues(init())}>
          <RotateCcw size={12} aria-hidden="true" /> {t("reset")}
        </button>
      </div>
      <div className="wbody fill">
        <div className="side">
          {variables.map((v) => (
            <label key={v.name} className="field">
              {v.label}
              {v.options?.length ? (
                <select value={values[v.name] ?? ""} onChange={(e) => set(v.name, e.target.value)}>
                  {v.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : long(v.name) ? (
                <textarea
                  value={values[v.name] ?? ""}
                  onChange={(e) => set(v.name, e.target.value)}
                  dir="auto"
                />
              ) : (
                <input
                  value={values[v.name] ?? ""}
                  onChange={(e) => set(v.name, e.target.value)}
                  dir="auto"
                />
              )}
            </label>
          ))}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="sr-only">{t("finalPrompt")}</span>
          <pre className="prompt flex-1" aria-live="polite">
            <PromptText segs={segs} flash={flash} />
          </pre>
        </div>
      </div>
      <div className="wfoot">
        <span className="chip lapis">{t("finalPrompt")}</span>
        <span className="sp" />
        <button type="button" className="mini" onClick={() => copy(fill(body, values))}>
          <Copy size={14} aria-hidden="true" /> {tc("copy")}
        </button>
      </div>
    </div>
  );
}

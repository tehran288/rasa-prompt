"use client";

import { useRef } from "react";
import { useIndicator } from "@/hooks/use-indicator";

/** Segmented control with a spring-sliding indicator (role=radiogroup semantics via aria-pressed). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  variant = "seg",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  variant?: "seg" | "tabs";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ind = useIndicator(ref, '[aria-pressed="true"]', [value, options.length]);
  return (
    <div className={variant} ref={ref} role="group" aria-label={label}>
      <span className="ind" aria-hidden="true" style={ind} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

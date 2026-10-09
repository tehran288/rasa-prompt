"use client";

import { Eye } from "lucide-react";
import { useUi } from "./ui-state";

export function QuickViewButton({ slug, label }: { slug: string; label: string }) {
  const { openQuickView } = useUi();
  return (
    <button
      type="button"
      className="qv"
      aria-label={label}
      title={label}
      onClick={() => openQuickView(slug)}
    >
      <Eye size={16} aria-hidden="true" />
    </button>
  );
}

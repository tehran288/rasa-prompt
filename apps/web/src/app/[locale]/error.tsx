"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="wrap">
      <div className="phero c" style={{ paddingBlock: "96px 40px" }}>
        <TriangleAlert size={44} aria-hidden="true" style={{ color: "var(--gold)" }} />
        <h1>{t("title")}</h1>
        <p>{t("desc")}</p>
        {error.digest ? (
          <code className="dimmed text-xs" dir="ltr">
            {error.digest}
          </code>
        ) : null}
        <button type="button" className="btn primary" onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" /> {t("retry")}
        </button>
      </div>
    </div>
  );
}

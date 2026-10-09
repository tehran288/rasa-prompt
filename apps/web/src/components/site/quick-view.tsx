"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowRight, Check, Copy, Lock, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useCopy } from "@/hooks/use-copy";
import { Link } from "@/i18n/navigation";
import type { Loc, PromptView } from "@/lib/catalog-types";
import { digits, formatDate, formatNumber, formatVersion } from "@/lib/format";
import { baleBuyUrl, telegramBuyUrl } from "@/lib/site";
import { TierBadge } from "./tier-badge";

/** Side sheet on desktop, draggable bottom sheet on mobile (Base UI Dialog underneath). */
export function QuickViewSheet({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const locale = useLocale() as Loc;
  const t = useTranslations("prompt");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const copy = useCopy();
  const [data, setData] = useState<PromptView | null>(null);
  const [failed, setFailed] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setData(null);
    setFailed(false);
    fetch(`/api/quick/${locale}/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: PromptView) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [slug, locale]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y0: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y0);
    drag.current.dy = dy;
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    const el = sheetRef.current;
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
    if (dy > 110) onClose();
  };

  const p = data;
  return (
    <Sheet open={slug !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="scrim" />
        <DialogPrimitive.Popup ref={sheetRef} className="sheet" aria-busy={!p && !failed}>
          <div
            className="handle"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-hidden="true"
          >
            <i />
          </div>
          <header>
            {p ? <TierBadge tier={p.tier} label={tc(p.tier)} /> : <span className="chip">…</span>}
            {p?.testedAt ? (
              <span className="chip ok">
                <Check size={12} aria-hidden="true" /> {tc("tested")} •{" "}
                {formatDate(p.testedAt, locale)}
              </span>
            ) : null}
            <span className="sp" />
            <DialogPrimitive.Close className="round" aria-label={tc("close")}>
              <X size={16} aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>
          <div className="body">
            {!p && !failed && <QuickSkeleton />}
            {failed && <p className="muted">{tc("open")}…</p>}
            {p && (
              <>
                <DialogPrimitive.Title render={<h2 />}>{p.title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="muted" style={{ margin: 0 }}>
                  {p.summary}
                </DialogPrimitive.Description>
                <div className="score-row">
                  <div>
                    <b className="num">{digits(p.score, locale)}</b>
                    <span>{t("quality")}</span>
                  </div>
                  <div>
                    <b className="num">{formatVersion(p.version, locale)}</b>
                    <span>{tc("version")}</span>
                  </div>
                  <div>
                    <b className="num">{digits(p.models.length, locale)}</b>
                    <span>{tc("models")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip">{tt(p.type)}</span>
                  {p.models.map((m) => (
                    <span key={m} className="chip lapis">
                      {m}
                    </span>
                  ))}
                </div>
                {p.example ? (
                  <div>
                    <span className="kicker">{t("example")}</span>
                    <div className="example mt-2">{p.example}</div>
                  </div>
                ) : null}
                {p.tier === "free" && p.body ? (
                  <>
                    <pre className="prompt rounded-[14px] border border-line">{p.body}</pre>
                    <div className="buy">
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => copy(p.body ?? "")}
                      >
                        <Copy size={16} aria-hidden="true" /> {tc("copy")}
                      </button>
                      <Link className="btn ghost" href={`/p/${p.slug}`} onClick={onClose}>
                        {tc("openFull")}{" "}
                        <ArrowRight className="arrow" size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="locked">
                      <pre className="prompt" aria-hidden="true">
                        {p.preview}
                        {"\n\n"}
                        {p.preview}
                      </pre>
                      <div className="ov">
                        <div>
                          <b className="inline-flex items-center gap-2">
                            <Lock size={16} aria-hidden="true" /> {t("locked")}
                          </b>
                          {p.priceToman ? (
                            <div className="num mt-2 text-xl font-extrabold">
                              {formatNumber(p.priceToman, locale)} {tc("toman")} • ⭐{" "}
                              {formatNumber(p.priceStars ?? 0, locale)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="buy">
                      <a
                        className="btn tg"
                        href={telegramBuyUrl(p.id)}
                        target="_blank"
                        rel="noopener"
                      >
                        {t("buyTg")}
                      </a>
                      <a
                        className="btn bale"
                        href={baleBuyUrl(p.id)}
                        target="_blank"
                        rel="noopener"
                      >
                        {t("buyBale")}
                      </a>
                    </div>
                    <Link className="btn ghost" href={`/p/${p.slug}`} onClick={onClose}>
                      {tc("openFull")} <ArrowRight className="arrow" size={16} aria-hidden="true" />
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </Sheet>
  );
}

function QuickSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="h-7 w-3/4 animate-pulse rounded-lg bg-line" />
      <div className="h-4 w-full animate-pulse rounded bg-line" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-line" />
      <div className="mt-2 h-40 w-full animate-pulse rounded-2xl bg-line" />
    </div>
  );
}

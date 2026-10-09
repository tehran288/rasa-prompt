"use client";

import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { TELEGRAM_CHANNEL_URL } from "@/lib/site";

export function Newsletter() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error(t("invalid"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (!r.ok) throw new Error(String(r.status));
      toast.success(t("ok"));
      setEmail("");
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="news spot glow-border" data-reveal="">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-extrabold">{t("title")}</h2>
        <p className="muted m-0">{t("desc")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <form onSubmit={submit} noValidate>
          <label className="sr-only" htmlFor="nl-email">
            {t("label")}
          </label>
          <input
            id="nl-email"
            className="finput"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder={t("placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn primary sm" disabled={busy}>
            <Send size={15} aria-hidden="true" /> {t("cta")}
          </button>
        </form>
        <a
          className="dimmed text-sm underline-offset-4 hover:underline"
          href={TELEGRAM_CHANNEL_URL}
          target="_blank"
          rel="noopener"
        >
          {t("or")} ↗
        </a>
      </div>
    </div>
  );
}

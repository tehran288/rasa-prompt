import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { digits, type Loc } from "@/lib/format";
import { BALE_URL, TELEGRAM_CHANNEL_URL, TELEGRAM_URL } from "@/lib/site";
import { BrandMark } from "./brand-mark";

export async function Footer({ locale }: { locale: Loc }) {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tm = await getTranslations("meta");
  const tb = await getTranslations("bots");
  const year =
    locale === "fa"
      ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())
      : digits(new Date().getFullYear(), locale);
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="fgrid">
          <div className="flex flex-col gap-3">
            <Link href="/" className="brand" style={{ paddingInline: 0 }}>
              <BrandMark id="foot-mark" />
              <b style={{ color: "var(--fg)" }}>{tm("siteName")}</b>
            </Link>
            <p className="m-0 max-w-[38ch]">{tm("homeDescription")}</p>
            <p className="m-0 text-xs">{t("made")}</p>
          </div>
          <div>
            <h4>{t("product")}</h4>
            <ul>
              <li>
                <Link href="/prompts">{tn("library")}</Link>
              </li>
              <li>
                <Link href="/trends">{tn("trends")}</Link>
              </li>
              <li>
                <Link href="/agents">{tn("agents")}</Link>
              </li>
              <li>
                <Link href="/pricing">{tn("pricing")}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>{tn("bots")}</h4>
            <ul>
              <li>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener">
                  {tb("tg")}
                </a>
              </li>
              <li>
                <a href={BALE_URL} target="_blank" rel="noopener">
                  {tb("bale")}
                </a>
              </li>
              <li>
                <a href={TELEGRAM_CHANNEL_URL} target="_blank" rel="noopener">
                  Telegram • @RasaPrompt
                </a>
              </li>
              <li>
                <Link href="/bots">{tn("bots")}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>{t("legal")}</h4>
            <ul>
              <li>
                <Link href="/about">{t("about")}</Link>
              </li>
              <li>
                <Link href="/terms">{t("terms")}</Link>
              </li>
              <li>
                <Link href="/privacy">{t("privacy")}</Link>
              </li>
              <li>
                <Link href="/refund">{t("refund")}</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="fbottom">
          <span>{t("rights", { year })}</span>
          <span className="num" dir="ltr">
            rasa-prompt.ir • @RasaPromptBot
          </span>
        </div>
      </div>
    </footer>
  );
}

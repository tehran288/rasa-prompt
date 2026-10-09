import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Sky } from "@/components/site/sky";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <Sky short />
      <div className="wrap">
        <div className="phero c" style={{ paddingBlock: "96px 40px" }}>
          <span className="kicker">404</span>
          <SearchX size={44} aria-hidden="true" style={{ color: "var(--gold)" }} />
          <h1>{t("title")}</h1>
          <p>{t("desc")}</p>
          <div className="ctas">
            <Link className="btn primary" href="/">
              {t("home")}
            </Link>
            <Link className="btn ghost" href="/prompts">
              {t("library")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

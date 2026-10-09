import { Link } from "@/i18n/navigation";
import { localeUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export function Crumbs({
  items,
  locale,
  label,
}: {
  items: { href: string; label: string }[];
  locale: string;
  label: string;
}) {
  return (
    <>
      <nav aria-label={label} className="relative z-[1] pt-8">
        <ol className="crumbs">
          {items.map((it, i) => (
            <li key={it.href}>
              {i === items.length - 1 ? (
                <span aria-current="page">{it.label}</span>
              ) : (
                <Link href={it.href}>{it.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.label,
            item: localeUrl(locale, it.href),
          })),
        }}
      />
    </>
  );
}

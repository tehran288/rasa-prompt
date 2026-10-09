# Website — `apps/web` (Next.js 16, App Router)

The public storefront for rasa-prompt.ir: a trilingual (fa default · ar · en), RTL-first,
statically generated Next.js app that reads the same catalog as the bots and falls back
to a rich local fixture when no database is configured. The visual source of truth is
`docs/design/prototype.html` (v2, "night manuscript": lapis & gold, dark-first).

## Run / build / deploy

```bash
cd apps/web
npx tsc -p tsconfig.json --noEmit   # typecheck
npx next build                       # production build (fully static on fixtures)
npx next start -p 3000               # serve
npx next dev -p 3000                 # dev (or `pnpm dev:web` from the root)
```

Environment (all optional):

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | When set, the catalog is read from Postgres via `@rasa/db` (see *Data source*) |
| `RASA_WEB_FIXTURES=1` | — | Force fixtures even when `DATABASE_URL` is set |
| `NEXT_PUBLIC_SITE_URL` | `https://rasa-prompt.ir` | Canonicals, hreflang, sitemap, JSON-LD |
| `NEXT_PUBLIC_BOT_USERNAME` | `RasaPromptBot` | Telegram/Bale deep links |

Deploy: any Node 22 host (`next start`) or a container running `next build && next start`.
Pages are SSG with `revalidate = 3600` on catalog routes, so with a DB the catalog refreshes
hourly without a rebuild. Fonts load at runtime from Google Fonts (the build is offline-safe).

## Structure

```
src/
  app/
    layout.tsx                 # passes children through (html lives under [locale])
    globals.css                # Tailwind 4 + brand tokens + FarsiUI token mapping + all component CSS
    not-found.tsx              # global 404 for non-locale paths
    robots.ts, sitemap.ts, icon.svg
    api/quick/[locale]/[slug]  # quick-view JSON (SSG; never contains paid bodies)
    api/search-log             # zero-result searches → demand signal (DB: CatalogService.search logs it)
    api/newsletter             # validates + acknowledges (placeholder until an email provider exists)
    [locale]/
      layout.tsx               # <html lang dir>, fonts, providers, nav, footer, dock, effects
      page.tsx                 # home
      prompts/  p/[slug]/  c/[slug]/  m/[model]/  trends/  agents/  pricing/  bots/
      about/ terms/ privacy/ refund/   [...rest]/ (→ localized 404)   not-found.tsx   error.tsx
      opengraph-image.tsx, p/[slug]/opengraph-image.tsx
  components/
    ui/                        # FarsiUI (MIT) primitives, see FARSIUI-LICENSE.md
    site/                      # product components (below)
  data/fixtures.ts             # 29 prompts, 8 categories, 6 trends (fa/ar/en)
  data/studio.ts               # hero Prompt Studio demos
  hooks/                       # use-indicator (sliding segment), use-copy, use-reduced-motion, FarsiUI digits hook
  i18n/                        # next-intl routing, navigation, request config
  lib/                         # data.ts, db-entry.ts, format.ts, normalize.ts, template.ts, site.ts, plans.ts, og.tsx
  messages/{fa,ar,en}.json
  proxy.ts                     # next-intl locale detection/redirect (Next 16 "proxy" = middleware)
```

### Site components (`src/components/site`)
`site-nav` (floating glass pill, hover highlight pill, sliding language segment, theme toggle, ⌘K),
`sky` (canvas girih lattice + aurora blobs, paused off-screen), `prompt-studio` (tabs with sliding
indicator, typewriter, sequential model tests, animated gauge, copy), `prompt-card` (score ring,
gradient border for premium, stretched link + quick-view button), `quick-view` (side sheet on
desktop / draggable bottom sheet on mobile), `command-palette` (⌘K / Ctrl+K / "/"), `dock`
(magnifying), `library-browser` (sticky toolbar, URL-synced filters, pagination, empty state),
`prompt-fill` (variables → live prompt for free prompts), `agent-room` (SVG graph with flowing pulse
+ terminal log), `bot-phones` (Telegram/Bale mockups with typing indicators), `pricing-plans`
(Toman/Stars segment, conic border), `faq` (springy accordion), `trend-card` + `sparkline`,
`count-up`, `morph-word`, `newsletter`, `effects` (scroll reveal + spotlight), `crumbs` (+BreadcrumbList).

Client components are only the interactive ones; everything else is a server component.
Animations are CSS transitions/keyframes; JS only measures (indicators) or sequences (studio,
agents, chats). `prefers-reduced-motion` disables all animation (CSS) and skips sequences (JS).

## Routes

| Route | Notes |
|---|---|
| `/{locale}` | Hero + Prompt Studio, model marquee, bento, featured, categories, how-it-works, trends rail, agent room, bots, pricing, sample testimonials, FAQ, newsletter, final CTA |
| `/{locale}/prompts` | Library; `?q=&tier=&type=&model=&cat=&sort=&page=` (client filtering, SSR fallback grid) |
| `/{locale}/p/{slug}` | Prompt page; free → variables form + live prompt; paid → blurred preview + Telegram Stars `t.me/RasaPromptBot?start=p_<id>`, Bale `ble.ir/RasaPromptBot?start=p_<id>`, "pay on website — coming soon"; JSON-LD Product/Offer + BreadcrumbList |
| `/{locale}/c/{slug}` · `/{locale}/m/{model}` | Category / model landing pages |
| `/{locale}/trends` · `/agents` · `/pricing` · `/bots` | Trend cards with sources; 10-agent pipeline, sources, legal principles; plans + comparison + guarantee + FAQ; bots |
| `/{locale}/about` · `/terms` · `/privacy` · `/refund` | Short policy copy (7-day refund, commercial use allowed / resale prohibited, data minimization) |

Slugs are ASCII and identical across locales so hreflang alternates are 1:1 (the SEO plan allows
native-script slugs; switching later only needs a per-locale slug map in the data layer).

## i18n
- next-intl 4, `localePrefix: "always"`, default `fa`, cookie `rp-locale`; `src/proxy.ts` redirects `/` by `Accept-Language`.
- `<html lang dir>` per locale; FarsiUI `DirectionProvider` wraps the tree; layout uses logical properties only.
- Digits: fa → Persian (Intl `fa-IR`), ar → Arabic-Indic (`ar-EG`), en → Latin. Dates: fa → Jalali (`fa-IR-u-ca-persian`), ar/en → Gregorian. Helpers in `lib/format.ts`.
- Search normalization (`lib/normalize.ts`) mirrors `@rasa/db` normalizeForSearch (ي/ی, ك/ک, alef forms, ة, harakat, digits, ZWNJ).
- Fonts: fa Vazirmatn; ar Noto Naskh Arabic + Reem Kufi; en Inter Tight + Instrument Serif; prompts JetBrains Mono.

## Data source switch (`src/lib/data.ts`)
`getCatalog()` returns `{ listPrompts, getPrompt, listCategories, listTrends, listModels, logSearch }`
in locale-resolved view models (`lib/catalog-types.ts`).

1. `DATABASE_URL` set → dynamic import of `lib/db-entry.ts` (`createDb`, `createServices` from
   `@rasa/db`); prompts via `CatalogService.listTrending` (no search-log writes), details via
   `getPrompt` (+ `getPromptBody` **only for free tier**), trends via `IntelStore.topTopics("published")`
   (falls back to fixture trends if empty). Every call is wrapped: any DB error → fixtures.
2. Otherwise → `src/data/fixtures.ts`. Paid fixtures contain only `preview`; `toView()` and the
   quick-view route additionally null any paid body (defence in depth).

**Contract request for the db agent:** `@rasa/db`'s index re-exports `migrate.ts`, whose top-level
`new URL("../drizzle", import.meta.url)` (a directory) makes Turbopack fail. `db-entry.ts` therefore
imports `packages/db/src/db` and `.../services` directly. Please expose a migration-free entry
(e.g. `exports["./runtime"]`) so this can become `import("@rasa/db/runtime")`.

## SEO
Per-page `generateMetadata` (title template, description, canonical, hreflang fa/ar/en + x-default→en,
OpenGraph locale/alternateLocale, Twitter), `sitemap.xml` (every locale × static pages, prompts,
categories, models, each with alternates), `robots.txt`, JSON-LD (Organization, WebSite+SearchAction,
FAQPage, Product/Offer in IRR = toman×10, BreadcrumbList). OG images via `next/og` render a Latin-only
brand card (Satori can't shape Persian/Arabic and fonts can't be fetched at build), using the `en`
title for prompt pages.

## Design tokens (`globals.css`)
Brand: `--bg --bg2 --glass --card --line --line2 --fg --muted --dim --lapis --lapis2 --lapisglow
--gold --gold2 --goldglow --ok --code --grain --sh --spring`, light in `:root`, dark in `.dark`
(next-themes, `attribute="class"`, default **dark**). They are mapped onto the FarsiUI/shadcn
semantic tokens (`--background --foreground --card --primary --muted --accent --border --input --ring`)
and exposed to Tailwind (`bg-card`, `text-gold`, `border-line`…). Light gold is darkened
(`#8f6410`) for AA text contrast; dark-text badges use `--gold2`.

## Quality checks done
- `tsc --noEmit` and `next build` clean; 262 static pages.
- Playwright: screenshots in `docs/design/screens/web-*.png` (1280 light, 390 dark, plus palette,
  sheets, empty state, agents run); no console errors; no element overflows at 360px on 13 routes.
- Keyboard: skip link, visible gold focus ring, tabs with arrow keys, palette combobox with ↑↓↵/esc,
  dialogs/sheets via Base UI (focus trap, Esc, focus return).

## Known limits
- Newsletter endpoint only acknowledges (logs a hashed address) — needs a provider/table.
- Website checkout is shown as "coming soon"; purchases deep-link into the bots.
- Library filtering is client-side over the full list (fine to a few thousand prompts; move to
  server search via `CatalogService.search` beyond that).
- Fonts are not self-hosted (no `next/font` offline); add `public/fonts` + `next/font/local` for zero CLS.
- Testimonials are labelled sample copy; hero stats are computed from the live catalog.

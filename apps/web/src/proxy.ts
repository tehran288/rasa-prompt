import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, metadata files and static assets.
  matcher: ["/((?!api|_next|_vercel|robots.txt|sitemap.xml|icon.svg|favicon.ico|.*\\..*).*)"],
};

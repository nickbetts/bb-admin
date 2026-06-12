import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware:
 *   1) Sets a HttpOnly `share_report_token` cookie when the user lands on a
 *      public share-link page (/share/report/<token>). Subsequent client-side
 *      fetches to /api/* automatically send the cookie, allowing channel data
 *      routes to authenticate the unauthenticated browser via the share token.
 *   2) Hosts public LP pages with both legacy and canonical routing:
 *      - Legacy: `LP_DOMAIN/client/<client-slug>/<lp-slug>` → `/lp/<client-slug>/<lp-slug>`
 *      - Canonical: `<subdomain>.LP_BASE_DOMAIN/<lp-slug>` → `/lp/<subdomain>/<lp-slug>`
 *
 * The token validity itself is checked server-side in each API route via
 * `getShareTokenAuth` in src/lib/auth.ts. This middleware merely propagates
 * the URL token into a cookie so XHR fetches can use it.
 */

const LP_DOMAIN = (process.env.LP_DOMAIN?.trim() || "lp.bettsandburton.com").toLowerCase();
const LP_BASE_DOMAIN = (process.env.LP_BASE_DOMAIN?.trim() || "bettsandburton.com").toLowerCase();
const RESERVED_LP_SUBDOMAINS = new Set(["admin", "api", "lp", "www"]);
const LEGACY_PUBLIC_PATH_PREFIXES = [
  "/ad-traffic-protection",
  "/ai-analyst",
  "/budget-intelligence",
  "/client-dashboard",
  "/client-portal",
  "/content-strategy-feature",
  "/forecasting",
  "/keyword-planner-feature",
  "/llm-generator",
  "/reports-feature",
  "/signals",
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // Keep only login as the public entrypoint for legacy marketing pages.
  if (
    LEGACY_PUBLIC_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ── 2) LP domain routing ───────────────────────────────────────────────────
  // Skip Next internals + API + static so they always resolve normally.
  const isInternalPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/lp/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]{1,5}$/.test(pathname); // any obvious file extension

  if ((host === LP_DOMAIN || host === `www.${LP_DOMAIN}`) && pathname.startsWith("/client/")) {
    // /client/<slug>/<lpSlug> -> /lp/<slug>/<lpSlug>
    const match = pathname.match(/^\/client\/([^/]+)\/(.+)$/);
    if (match) {
      const [, clientSlug, lpSlug] = match;
      const url = request.nextUrl.clone();
      url.pathname = `/lp/${clientSlug}/${lpSlug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Canonical wildcard LP host routing:
  // <subdomain>.bettsandburton.com/<lpSlug> -> /lp/<subdomain>/<lpSlug>
  const baseSuffix = `.${LP_BASE_DOMAIN}`;
  if (!isInternalPath && host.endsWith(baseSuffix)) {
    const candidateSubdomain = host.slice(0, -baseSuffix.length);
    const isSingleLabel = candidateSubdomain.length > 0 && !candidateSubdomain.includes(".");

    if (
      isSingleLabel &&
      !RESERVED_LP_SUBDOMAINS.has(candidateSubdomain) &&
      pathname.startsWith("/")
    ) {
      const lpSlug = pathname.slice(1);
      if (lpSlug && !lpSlug.includes("/")) {
        const url = request.nextUrl.clone();
        url.pathname = `/lp/${candidateSubdomain}/${lpSlug}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // ── Pillar Insights mockup password gate ───────────────────────────────────
  if (pathname.startsWith("/pillar-insights")) {
    const isLogin =
      pathname === "/pillar-insights/login" || pathname.startsWith("/pillar-insights/login/");
    const isApiAuth = pathname === "/api/pillar-insights/auth";
    if (!isLogin && !isApiAuth) {
      const cookie = request.cookies.get("pillar_access")?.value;
      if (cookie !== "ok") {
        const url = request.nextUrl.clone();
        url.pathname = "/pillar-insights/login";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // ── Pillar Comms mockup password gate ──────────────────────────────────────
  if (pathname.startsWith("/pillar-comms")) {
    const isLogin =
      pathname === "/pillar-comms/login" || pathname.startsWith("/pillar-comms/login/");
    const isApiAuth = pathname === "/api/pillar-comms/auth";
    if (!isLogin && !isApiAuth) {
      const cookie = request.cookies.get("pillar_comms_access")?.value;
      if (cookie !== "ok") {
        const url = request.nextUrl.clone();
        url.pathname = "/pillar-comms/login";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // ── 1) /share/report/<token> cookie propagation ────────────────────────────
  const shareMatch = pathname.match(/^\/share\/report\/([^/]+)/);
  if (shareMatch) {
    const token = shareMatch[1];
    const response = NextResponse.next();
    response.cookies.set({
      name: "share_report_token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except static assets and Next internals so the
  // wildcard-host check has a chance to run on every public request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

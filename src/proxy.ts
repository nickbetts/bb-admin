import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware:
 *   1) Sets a HttpOnly `share_report_token` cookie when the user lands on a
 *      public share-link page (/share/report/<token>). Subsequent client-side
 *      fetches to /api/* automatically send the cookie, allowing channel data
 *      routes to authenticate the unauthenticated browser via the share token.
 *   2) Hosts the Clickr public marketing site on clickr.marketing. Requests to
 *      `clickr.marketing/<path>` are rewritten internally to `/clickr/<path>`
 *      so the URL stays clean (e.g. clickr.marketing/pricing → /clickr/pricing).
 *      Wildcard subdomains `<client-slug>.clickr.marketing/<lp-slug>` are
 *      rewritten to `/lp/<client-slug>/<lp-slug>` for published landing pages.
 *
 * The token validity itself is checked server-side in each API route via
 * `getShareTokenAuth` in src/lib/auth.ts. This middleware merely propagates
 * the URL token into a cookie so XHR fetches can use it.
 */

const LP_DOMAIN = (process.env.LP_DOMAIN?.trim() || "clickr.marketing").toLowerCase();

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // ── 2) clickr.marketing routing ────────────────────────────────────────────
  // Skip Next internals + API + static so they always resolve normally.
  const isInternal =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/lp/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]{1,5}$/.test(pathname); // any obvious file extension

  if ((host === LP_DOMAIN || host === `www.${LP_DOMAIN}`) && !isInternal) {
    // Route clickr.marketing pages to the /clickr/* tree.
    // /  → /clickr, /about → /clickr/about, /pricing → /clickr/pricing, etc.
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/clickr" : `/clickr${pathname}`;
    return NextResponse.rewrite(url);
  } else if (host.endsWith(`.${LP_DOMAIN}`) && !isInternal) {
    const sub = host.slice(0, -1 * (LP_DOMAIN.length + 1));
    // www is handled above; reject empty / multi-label subdomains for safety
    if (sub && sub !== "www" && !sub.includes(".")) {
      const lpPath = pathname === "/" ? "" : pathname;
      const url = request.nextUrl.clone();
      url.pathname = `/lp/${sub}${lpPath}`;
      // Hand off to the [slug]/[lpSlug] route handler
      return NextResponse.rewrite(url);
    }
  }

  // ── Pillar Insights mockup password gate ───────────────────────────────────
  if (pathname.startsWith("/pillar-insights")) {
    const isLogin =
      pathname === "/pillar-insights/login" ||
      pathname.startsWith("/pillar-insights/login/");
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
      pathname === "/pillar-comms/login" ||
      pathname.startsWith("/pillar-comms/login/");
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

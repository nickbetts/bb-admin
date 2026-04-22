import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware:
 *   1) Sets a HttpOnly `share_report_token` cookie when the user lands on a
 *      public share-link page (/share/report/<token>). Subsequent client-side
 *      fetches to /api/* automatically send the cookie, allowing channel data
 *      routes to authenticate the unauthenticated browser via the share token.
 *   2) Hosts published landing pages on clickr.marketing. Wildcard subdomains
 *      `<client-slug>.clickr.marketing/<lp-slug>` are rewritten internally to
 *      `/lp/<client-slug>/<lp-slug>` (URL stays clean). The apex
 *      `clickr.marketing` redirects to NEXT_PUBLIC_APP_URL.
 *
 * The token validity itself is checked server-side in each API route via
 * `getShareTokenAuth` in src/lib/auth.ts. This middleware merely propagates
 * the URL token into a cookie so XHR fetches can use it.
 */

const LP_DOMAIN = (process.env.LP_DOMAIN?.trim() || "clickr.marketing").toLowerCase();

export function proxy(request: NextRequest) {
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

  if (host === LP_DOMAIN && !isInternal) {
    // Apex → bounce to the main app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
      return NextResponse.redirect(appUrl, 308);
    }
    // No app URL configured — fall through to whatever exists at /
  } else if (host.endsWith(`.${LP_DOMAIN}`) && !isInternal) {
    const sub = host.slice(0, -1 * (LP_DOMAIN.length + 1));
    // Reject empty / "www" / multi-label subdomains for safety
    if (sub && sub !== "www" && !sub.includes(".")) {
      const lpPath = pathname === "/" ? "" : pathname;
      const url = request.nextUrl.clone();
      url.pathname = `/lp/${sub}${lpPath}`;
      // Hand off to the [slug]/[lpSlug] route handler
      return NextResponse.rewrite(url);
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

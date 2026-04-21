import { NextRequest, NextResponse } from "next/server";

/**
 * Sets a HttpOnly `share_report_token` cookie when the user lands on a public
 * share-link page (/share/report/<token>). Subsequent client-side fetches to
 * /api/* automatically send the cookie, allowing channel data routes to
 * authenticate the unauthenticated browser via the share token.
 *
 * The token validity itself is checked server-side in each API route via
 * `getShareTokenAuth` in src/lib/auth.ts. This middleware merely propagates
 * the URL token into a cookie so XHR fetches can use it.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/share/report/:path*"],
};

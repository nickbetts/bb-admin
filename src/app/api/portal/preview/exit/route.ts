import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("return") || "/clients";

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set("portal_session", "", { path: "/", maxAge: 0 });
  response.cookies.set("portal_preview", "", { path: "/", maxAge: 0 });
  return response;
}

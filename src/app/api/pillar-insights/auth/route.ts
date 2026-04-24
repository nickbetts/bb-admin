import { NextRequest, NextResponse } from "next/server";

const PILLAR_PASSWORD = "i3ganggang";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const url = new URL(request.url);

  if (password !== PILLAR_PASSWORD) {
    const redirect = NextResponse.redirect(
      new URL("/pillar-insights/login?error=1", url.origin),
      { status: 303 }
    );
    return redirect;
  }

  const response = NextResponse.redirect(
    new URL("/pillar-insights", url.origin),
    { status: 303 }
  );
  response.cookies.set({
    name: "pillar_access",
    value: "ok",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

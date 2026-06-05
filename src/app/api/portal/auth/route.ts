import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "bettsandburton-session-secret";

function createPortalToken(userId: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const nonce = Math.random().toString(36).slice(2);
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const signature = createHmac("sha256", PORTAL_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as { token: string };
    if (!data.token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const portalUser = await prisma.clientPortalUser.findUnique({
      where: { magicToken: data.token },
    });

    if (!portalUser) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (!portalUser.isActive) {
      return NextResponse.json({ error: "Portal access is disabled" }, { status: 403 });
    }

    if (portalUser.tokenExpiry && portalUser.tokenExpiry < new Date()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 401 });
    }

    // Clear token and update last login
    await prisma.clientPortalUser.update({
      where: { id: portalUser.id },
      data: {
        magicToken: null,
        tokenExpiry: null,
        lastLoginAt: new Date(),
      },
    });

    const sessionToken = createPortalToken(portalUser.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set("portal_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Portal auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

function createPortalToken(userId: string, ttlMs: number): string {
  const expiresAt = Date.now() + ttlMs;
  const nonce = Math.random().toString(36).slice(2);
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const signature = createHmac("sha256", PORTAL_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;
  const { searchParams } = new URL(request.url);
  const portalUserId = searchParams.get("userId");

  const portalUser = portalUserId
    ? await prisma.clientPortalUser.findFirst({ where: { id: portalUserId, clientId, isActive: true } })
    : await prisma.clientPortalUser.findFirst({
        where: { clientId, isActive: true },
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
      });

  if (!portalUser) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { slug: true } });
    const back = client ? `/clients/${client.slug}/settings` : "/clients";
    return NextResponse.redirect(new URL(`${back}?error=no-portal-user`, request.url));
  }

  // 1 hour preview session
  const ttlMs = 60 * 60 * 1000;
  const sessionToken = createPortalToken(portalUser.id, ttlMs);
  const previewMarker = JSON.stringify({
    agencyUserId: session.user.id,
    agencyEmail: session.user.email,
    portalUserId: portalUser.id,
    portalUserName: portalUser.name ?? portalUser.email,
    clientId,
    expiresAt: Date.now() + ttlMs,
  });

  const response = NextResponse.redirect(new URL("/portal/dashboard", request.url));
  response.cookies.set("portal_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ttlMs / 1000,
    path: "/",
  });
  response.cookies.set("portal_preview", previewMarker, {
    httpOnly: false, // readable by client banner
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ttlMs / 1000,
    path: "/",
  });
  return response;
}

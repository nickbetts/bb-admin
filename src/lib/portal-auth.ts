import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "bettsandburton-session-secret";

function verifyPortalToken(token: string): { valid: boolean; userId?: string } {
  const parts = token.split("|");
  if (parts.length !== 4) return { valid: false };
  const [expiresAt, userId, nonce, signature] = parts;
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const expected = createHmac("sha256", PORTAL_SECRET).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }
  if (Date.now() >= parseInt(expiresAt, 10)) return { valid: false };
  return { valid: true, userId };
}

export async function getPortalContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return null;

  const result = verifyPortalToken(token);
  if (!result.valid || !result.userId) return null;

  const portalUser = await prisma.clientPortalUser.findUnique({
    where: { id: result.userId },
  });
  if (!portalUser || !portalUser.isActive) return null;

  const permissions: string[] = JSON.parse(portalUser.permissions || "[]") as string[];
  return { portalUser, permissions };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

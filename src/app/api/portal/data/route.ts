import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = verifyPortalToken(token);
    if (!result.valid || !result.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portalUser = await prisma.clientPortalUser.findUnique({
      where: { id: result.userId },
    });

    if (!portalUser || !portalUser.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions: string[] = JSON.parse(portalUser.permissions || "[]") as string[];
    const clientId = portalUser.clientId;

    const [reports, goals, communications] = await Promise.all([
      permissions.includes("reports")
        ? prisma.report.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              periodStart: true,
              periodEnd: true,
              shareToken: true,
              createdAt: true,
              status: true,
            },
          })
        : [],
      permissions.includes("goals")
        ? prisma.clientGoal.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" },
          })
        : [],
      permissions.includes("communications")
        ? prisma.clientCommunication.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : [],
    ]);

    return NextResponse.json({ reports, goals, communications });
  } catch (error) {
    console.error("Portal data error:", error);
    return NextResponse.json({ error: "Failed to get portal data" }, { status: 500 });
  }
}

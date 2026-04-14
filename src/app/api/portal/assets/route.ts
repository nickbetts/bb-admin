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

// GET /api/portal/assets — shared/published assets for the authenticated portal user's client.
// Only returns items that are publicly accessible (shared or published).
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
    if (!permissions.includes("assets")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clientId = portalUser.clientId;

    // Only expose items that have been shared or published — never internal-only items
    const [reports, landingPages, contentStrategies, proposals] = await Promise.all([
      // Published reports with a share token
      prisma.report.findMany({
        where: { clientId, status: "published", shareToken: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, period: true, shareToken: true, createdAt: true },
      }),

      // Published landing pages with a share token
      prisma.landingPage.findMany({
        where: { clientId, status: "published", shareToken: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, title: true, shareToken: true, updatedAt: true },
      }),

      // Content strategies with a share token (already publicly shared)
      prisma.contentStrategy.findMany({
        where: { clientId, shareToken: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, period: true, shareToken: true, createdAt: true },
      }),

      // Proposals with a share token (sent to client)
      prisma.proposal.findMany({
        where: { clientId, shareToken: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, clientName: true, shareToken: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({ reports, landingPages, contentStrategies, proposals });
  } catch (error) {
    console.error("Portal assets error:", error);
    return NextResponse.json({ error: "Failed to get portal assets" }, { status: 500 });
  }
}

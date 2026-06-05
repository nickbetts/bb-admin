import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "bettsandburton-session-secret";

/**
 * Bet B — portal-user side of the two-way thread API. Mirrors the agency
 * route at /api/portal/threads but reads + writes only against the
 * authenticated portal user's own client.
 */

function verifyPortalToken(token: string): { valid: boolean; userId?: string } {
  const parts = token.split("|");
  if (parts.length !== 4) return { valid: false };
  const [expiresAt, userId, nonce, signature] = parts;
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const expected = createHmac("sha256", PORTAL_SECRET).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")))
      return { valid: false };
  } catch {
    return { valid: false };
  }
  if (Date.now() >= parseInt(expiresAt, 10)) return { valid: false };
  return { valid: true, userId };
}

async function getPortalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return null;
  const result = verifyPortalToken(token);
  if (!result.valid || !result.userId) return null;
  const user = await prisma.clientPortalUser.findUnique({
    where: { id: result.userId },
    select: { id: true, clientId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function GET() {
  try {
    const user = await getPortalUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const threads = await prisma.portalThread.findMany({
      where: { clientId: user.clientId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Portal-side threads list error:", error);
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getPortalUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { threadId?: string; subject?: string; body?: string };
    if (!body.body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    let threadId = body.threadId;
    if (!threadId) {
      if (!body.subject) {
        return NextResponse.json(
          { error: "subject is required for a new thread" },
          { status: 400 },
        );
      }
      const thread = await prisma.portalThread.create({
        data: { clientId: user.clientId, subject: body.subject },
      });
      threadId = thread.id;
    } else {
      // Verify the thread belongs to this portal user's client.
      const existing = await prisma.portalThread.findUnique({
        where: { id: threadId },
        select: { clientId: true },
      });
      if (!existing || existing.clientId !== user.clientId) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }
    }

    const message = await prisma.portalMessage.create({
      data: {
        threadId,
        authorType: "portal_user",
        authorId: user.id,
        body: body.body,
      },
    });
    await prisma.portalThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ threadId, message });
  } catch (error) {
    console.error("Portal-side threads create error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

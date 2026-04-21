import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET  /api/portal/threads?clientId=...   List threads for a client.
 * POST /api/portal/threads                Create a new thread (subject + first message).
 *
 * Bet B (Two-way Client Portal) — agency-side endpoint. The portal-user
 * counterpart route lives under /api/portal/* and reads via the magic-link
 * session. Permission boundary: agency users see all threads for a client;
 * portal users see only their own client's threads (enforced separately).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const threads = await prisma.portalThread.findMany({
      where: { clientId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Portal threads list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { clientId?: string; subject?: string; body?: string };
    const { clientId, subject, body: messageBody } = body;
    if (!clientId || !subject || !messageBody) {
      return NextResponse.json({ error: "clientId, subject and body are required" }, { status: 400 });
    }

    const thread = await prisma.portalThread.create({
      data: {
        clientId,
        subject,
        messages: {
          create: {
            authorType: "agency_user",
            authorId: session.user.id,
            body: messageBody,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Portal threads create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

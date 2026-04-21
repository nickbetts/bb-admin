import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/portal/threads/:id/reply  — agency user reply to a portal thread.
 * GET  /api/portal/threads/:id        — fetch a single thread with all messages.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as { body?: string };
    if (!body.body) return NextResponse.json({ error: "body is required" }, { status: 400 });

    const thread = await prisma.portalThread.findUnique({ where: { id }, select: { id: true } });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const message = await prisma.portalMessage.create({
      data: {
        threadId: id,
        authorType: "agency_user",
        authorId: session.user.id,
        body: body.body,
      },
    });
    await prisma.portalThread.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Agency thread reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const thread = await prisma.portalThread.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Agency thread fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

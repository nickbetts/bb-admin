import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(_request.url);
    // Default to 50 most-recent comms; client can request more via ?limit= and page via ?cursor=
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
    const cursor = searchParams.get("cursor");
    const comms = await prisma.clientCommunication.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to know if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = comms.length > limit;
    const items = hasMore ? comms.slice(0, limit) : comms;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (error) {
    console.error("Get communications error:", error);
    return NextResponse.json({ error: "Failed to get communications" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      type: string;
      subject: string;
      body?: string;
      direction?: string;
      status?: string;
      sentAt?: string;
      metadata?: string;
    };

    if (!data.type || !data.subject) {
      return NextResponse.json({ error: "type and subject are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const comm = await prisma.clientCommunication.create({
      data: {
        clientId: id,
        userId: session.user.id,
        type: data.type,
        subject: data.subject,
        body: data.body ?? null,
        direction: data.direction ?? "outbound",
        status: data.status ?? "logged",
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
        metadata: data.metadata ?? null,
      },
    });

    return NextResponse.json(comm, { status: 201 });
  } catch (error) {
    console.error("Create communication error:", error);
    return NextResponse.json({ error: "Failed to create communication" }, { status: 500 });
  }
}

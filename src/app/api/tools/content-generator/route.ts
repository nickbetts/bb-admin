import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/content-generator — list all sessions for the current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  try {
    const items = await prisma.contentGenerator.findMany({
      where: {
        userId: session.user.id,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        brief: true,
        contentTypes: true,
        status: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tools/content-generator — create a new session
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      clientId: string;
      title?: string;
      brief: string;
      contentTypes: string[];
      websiteUrl?: string;
    };

    if (!body.clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    if (!body.brief?.trim()) return NextResponse.json({ error: "brief is required" }, { status: 400 });
    if (!body.contentTypes?.length) return NextResponse.json({ error: "At least one content type is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { id: true, name: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const record = await prisma.contentGenerator.create({
      data: {
        clientId: body.clientId,
        userId: session.user.id,
        title: body.title?.trim() || `Content Pack — ${client.name}`,
        brief: body.brief.trim(),
        contentTypes: JSON.stringify(body.contentTypes),
        websiteUrl: body.websiteUrl?.trim() || null,
        status: "draft",
      },
    });

    return NextResponse.json({ id: record.id, title: record.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

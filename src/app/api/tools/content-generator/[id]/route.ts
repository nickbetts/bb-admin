import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/content-generator/[id] — fetch full record
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const record = await prisma.contentGenerator.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true, website: true } } },
    });

    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/tools/content-generator/[id] — update title or selected ideas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const record = await prisma.contentGenerator.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as {
      title?: string;
      selectedIdeasJson?: string;
      ideasJson?: string; // allow saving updated keyword approvals
    };

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.selectedIdeasJson !== undefined) data.selectedIdeasJson = body.selectedIdeasJson;
    if (body.ideasJson !== undefined) data.ideasJson = body.ideasJson;

    const updated = await prisma.contentGenerator.update({ where: { id }, data });

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator PATCH error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tools/content-generator/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const record = await prisma.contentGenerator.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.contentGenerator.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator DELETE error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

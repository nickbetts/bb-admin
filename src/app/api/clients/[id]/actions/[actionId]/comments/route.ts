import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const commentInclude = {
  user: { select: { id: true, name: true, email: true } },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const comments = await prisma.taskComment.findMany({
      where: { actionItemId: actionId },
      include: commentInclude,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error("List task comments error:", error);
    return NextResponse.json({ error: "Failed to list comments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const data = await request.json() as { body?: string };
    const body = (data.body ?? "").trim();
    if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const comment = await prisma.taskComment.create({
      data: { actionItemId: actionId, userId: session.user.id, body },
      include: commentInclude,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create task comment error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

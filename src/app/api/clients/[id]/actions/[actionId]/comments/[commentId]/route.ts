import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string; commentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId, commentId } = await params;
    const data = await request.json() as { body?: string };
    const body = (data.body ?? "").trim();
    if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

    const existing = await prisma.taskComment.findFirst({
      where: { id: commentId, actionItemId: actionId, actionItem: { clientId: id } },
    });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Cannot edit another user's comment" }, { status: 403 });
    }

    const updated = await prisma.taskComment.update({
      where: { id: commentId },
      data: { body },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task comment error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string; commentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId, commentId } = await params;
    const existing = await prisma.taskComment.findFirst({
      where: { id: commentId, actionItemId: actionId, actionItem: { clientId: id } },
    });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (existing.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Cannot delete another user's comment" }, { status: 403 });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task comment error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, commentId } = await params;
    const data = await request.json() as {
      content?: string;
      resolved?: boolean;
    };

    const existing = await prisma.reportComment.findFirst({ where: { id: commentId, reportId: id } });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const comment = await prisma.reportComment.update({
      where: { id: commentId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.resolved !== undefined && { resolved: data.resolved }),
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Update comment error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, commentId } = await params;
    const existing = await prisma.reportComment.findFirst({ where: { id: commentId, reportId: id } });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    await prisma.reportComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

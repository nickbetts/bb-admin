import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const data = await request.json() as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      outcome?: string;
    };

    const existing = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const completedAt =
      data.status === "completed" && existing.status !== "completed"
        ? new Date()
        : data.status && data.status !== "completed"
        ? null
        : undefined;

    const action = await prisma.actionItem.update({
      where: { id: actionId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.outcome !== undefined && { outcome: data.outcome }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error("Update action error:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const existing = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    await prisma.actionItem.delete({ where: { id: actionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete action error:", error);
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, goalId } = await params;
    const data = await request.json() as {
      title?: string;
      description?: string;
      metric?: string;
      channel?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      targetDate?: string;
      status?: string;
    };

    const existing = await prisma.clientGoal.findFirst({ where: { id: goalId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const goal = await prisma.clientGoal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.metric !== undefined && { metric: data.metric }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
        ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Update goal error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, goalId } = await params;
    const existing = await prisma.clientGoal.findFirst({ where: { id: goalId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    await prisma.clientGoal.delete({ where: { id: goalId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete goal error:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}

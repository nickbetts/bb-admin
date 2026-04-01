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
    const goals = await prisma.clientGoal.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Get goals error:", error);
    return NextResponse.json({ error: "Failed to get goals" }, { status: 500 });
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
      title: string;
      description?: string;
      metric: string;
      channel?: string;
      targetValue: number;
      currentValue?: number;
      unit?: string;
      targetDate: string;
    };

    if (!data.title || !data.metric || data.targetValue == null || !data.targetDate) {
      return NextResponse.json({ error: "title, metric, targetValue, and targetDate are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const goal = await prisma.clientGoal.create({
      data: {
        clientId: id,
        title: data.title,
        description: data.description ?? null,
        metric: data.metric,
        channel: data.channel ?? null,
        targetValue: data.targetValue,
        currentValue: data.currentValue ?? null,
        unit: data.unit ?? null,
        targetDate: data.targetDate,
        status: "active",
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

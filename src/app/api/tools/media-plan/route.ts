import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (clientId) where.clientId = clientId;

    const plans = await prisma.mediaPlan.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Attach client names
    const clientIds = [...new Set(plans.map((p) => p.clientId).filter(Boolean))] as string[];
    const clients = clientIds.length
      ? await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true },
        })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    const enriched = plans.map((p) => ({
      ...p,
      clientName: p.clientId ? (clientMap.get(p.clientId) ?? null) : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("List media plans error:", error);
    return NextResponse.json({ error: "Failed to list media plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json() as {
      title: string;
      objective: string;
      totalBudget: number;
      duration: number;
      startDate?: string;
      clientId?: string;
      channels?: unknown[];
    };

    if (!data.title || !data.objective || data.totalBudget == null || data.duration == null) {
      return NextResponse.json({ error: "title, objective, totalBudget, duration are required" }, { status: 400 });
    }

    const plan = await prisma.mediaPlan.create({
      data: {
        title: data.title,
        objective: data.objective,
        totalBudget: data.totalBudget,
        duration: data.duration,
        startDate: data.startDate ?? null,
        clientId: data.clientId ?? null,
        channels: JSON.stringify(data.channels ?? []),
        status: "draft",
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Create media plan error:", error);
    return NextResponse.json({ error: "Failed to create media plan" }, { status: 500 });
  }
}

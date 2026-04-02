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
    const plan = await prisma.mediaPlan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Media plan not found" }, { status: 404 });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Get media plan error:", error);
    return NextResponse.json({ error: "Failed to get media plan" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      title?: string;
      objective?: string;
      totalBudget?: number;
      duration?: number;
      startDate?: string;
      clientId?: string;
      channels?: unknown[];
      forecast?: unknown;
      status?: string;
    };

    const existing = await prisma.mediaPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Media plan not found" }, { status: 404 });

    const plan = await prisma.mediaPlan.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.objective !== undefined && { objective: data.objective }),
        ...(data.totalBudget !== undefined && { totalBudget: data.totalBudget }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.channels !== undefined && { channels: JSON.stringify(data.channels) }),
        ...(data.forecast !== undefined && { forecast: JSON.stringify(data.forecast) }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Update media plan error:", error);
    return NextResponse.json({ error: "Failed to update media plan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.mediaPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Media plan not found" }, { status: 404 });

    await prisma.mediaPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete media plan error:", error);
    return NextResponse.json({ error: "Failed to delete media plan" }, { status: 500 });
  }
}

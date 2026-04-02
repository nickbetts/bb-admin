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
    const actions = await prisma.actionItem.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error("Get actions error:", error);
    return NextResponse.json({ error: "Failed to get actions" }, { status: 500 });
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
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      sourceType?: string;
      sourceRef?: string;
    };

    if (!data.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const action = await prisma.actionItem.create({
      data: {
        clientId: id,
        title: data.title,
        description: data.description ?? null,
        status: "open",
        priority: data.priority ?? "medium",
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ?? null,
        sourceType: data.sourceType ?? "manual",
        sourceRef: data.sourceRef ?? null,
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("Create action error:", error);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}

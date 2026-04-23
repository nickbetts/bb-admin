import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "to_do",
  "in_progress",
  "for_approval",
  "signed_off_internal",
  "signed_off_client",
  "done",
  "cancelled",
] as const;

const actionInclude = {
  category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
  assignees: {
    include: { user: { select: { id: true, email: true, name: true } } },
  },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");

    const actions = await prisma.actionItem.findMany({
      where: {
        clientId: id,
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
      },
      include: actionInclude,
      orderBy: [{ status: "asc" }, { boardOrder: "asc" }, { createdAt: "desc" }],
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
    if (!hasPermission(session, "tasks.create")) {
      return NextResponse.json({ error: "Forbidden: tasks.create required" }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json() as {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      categoryId?: string | null;
      assigneeIds?: string[];
      assignedTo?: string;
      dueDate?: string;
      sourceType?: string;
      sourceRef?: string;
      clientPortalUserId?: string | null;
    };

    if (!data.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (data.status && !VALID_STATUSES.includes(data.status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const status = data.status ?? "to_do";

    // Place at end of the destination column for stable ordering.
    const last = await prisma.actionItem.findFirst({
      where: { clientId: id, status, ...(data.categoryId ? { categoryId: data.categoryId } : {}) },
      orderBy: { boardOrder: "desc" },
      select: { boardOrder: true },
    });
    const boardOrder = (last?.boardOrder ?? -1) + 1;

    const action = await prisma.actionItem.create({
      data: {
        clientId: id,
        categoryId: data.categoryId ?? null,
        title: data.title,
        description: data.description ?? null,
        status,
        priority: data.priority ?? "medium",
        boardOrder,
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ?? null,
        sourceType: data.sourceType ?? "manual",
        sourceRef: data.sourceRef ?? null,
        clientPortalUserId: data.clientPortalUserId ?? null,
        ...(data.assigneeIds && data.assigneeIds.length > 0
          ? {
              assignees: {
                create: data.assigneeIds.map((userId) => ({
                  userId,
                  assignedBy: session.user.id,
                })),
              },
            }
          : {}),
      },
      include: actionInclude,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("Create action error:", error);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}

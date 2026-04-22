import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json() as {
      name?: string;
      color?: string | null;
      icon?: string | null;
      sortOrder?: number;
      isArchived?: boolean;
    };

    const updated = await prisma.taskCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const inUse = await prisma.actionItem.count({ where: { categoryId: id } });
    if (inUse > 0) {
      // Soft-archive instead of hard-delete to preserve task history
      const archived = await prisma.taskCategory.update({
        where: { id },
        data: { isArchived: true },
      });
      return NextResponse.json({ archived: true, category: archived });
    }
    await prisma.taskCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

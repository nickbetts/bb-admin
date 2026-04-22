import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalContext, unauthorized, forbidden } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

// List tasks assigned to the current portal user.
export async function GET() {
  const ctx = await getPortalContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes("tasks")) return forbidden();

  const tasks = await prisma.actionItem.findMany({
    where: {
      clientId: ctx.portalUser.clientId,
      clientPortalUserId: ctx.portalUser.id,
      status: { notIn: ["cancelled"] },
    },
    orderBy: [{ clientCompletedAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true, status: true,
      priority: true, dueDate: true, clientCompletedAt: true,
      createdAt: true,
      category: { select: { name: true, color: true, icon: true } },
    },
  });

  return NextResponse.json(tasks);
}

// Mark a client-task as done (or undo).
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes("tasks")) return forbidden();

  const body = (await request.json().catch(() => null)) as { id?: string; done?: boolean } | null;
  if (!body?.id || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "id and done are required" }, { status: 400 });
  }

  // Verify the task belongs to this portal user.
  const task = await prisma.actionItem.findFirst({
    where: {
      id: body.id,
      clientId: ctx.portalUser.clientId,
      clientPortalUserId: ctx.portalUser.id,
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.actionItem.update({
    where: { id: task.id },
    data: body.done
      ? { clientCompletedAt: new Date(), status: "done", completedAt: new Date() }
      : { clientCompletedAt: null, status: "to_do", completedAt: null },
  });
  return NextResponse.json(updated);
}

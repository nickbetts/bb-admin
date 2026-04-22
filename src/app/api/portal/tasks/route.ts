import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalContext, unauthorized, forbidden } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

/**
 * GET — Tasks for this client awaiting client review (status: for_approval or signed_off_internal).
 * Requires the portal user to have the `task_approvals` permission.
 */
export async function GET() {
  try {
    const ctx = await getPortalContext();
    if (!ctx) return unauthorized();
    if (!ctx.permissions.includes("task_approvals")) return forbidden();

    const tasks = await prisma.actionItem.findMany({
      where: {
        clientId: ctx.portalUser.clientId,
        status: { in: ["for_approval", "signed_off_internal"] },
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Portal tasks GET error:", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/notifications/read — mark notification(s) as read
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { notificationIds, markAll } = body as { notificationIds?: string[]; markAll?: boolean };

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, status: "unread" },
        data: { status: "read", readAt: new Date() },
      });
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId: session.user.id },
        data: { status: "read", readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications read error:", error);
    return NextResponse.json({ error: "Failed to mark notifications" }, { status: 500 });
  }
}

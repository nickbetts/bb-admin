import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/notifications — list current user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status"); // "unread" | "read" | "all"
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status && status !== "all") where.status = status;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, status: "unread" },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

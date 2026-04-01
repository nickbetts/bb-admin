import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/notifications/preferences — get current user's notification preferences
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const defaults = {
      email: true,
      slack: false,
      slackWebhook: "",
      digestFrequency: "immediate",
      quietHoursStart: "",
      quietHoursEnd: "",
      enabledTypes: ["anomaly", "report_ready", "report_sent", "report_opened", "proposal_viewed", "integration_error", "snapshot_complete"],
    };

    let prefs = defaults;
    if (user?.notificationPrefs) {
      try { prefs = { ...defaults, ...JSON.parse(user.notificationPrefs) }; } catch { /* use defaults */ }
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Notification preferences GET error:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT /api/notifications/preferences — update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationPrefs: JSON.stringify(body) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification preferences PUT error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

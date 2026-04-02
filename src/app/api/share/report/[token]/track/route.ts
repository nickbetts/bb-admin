import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await request.json(); // consume body but tracking is status-only for now

    const report = await prisma.report.findUnique({
      where: { shareToken: token },
      select: { id: true, status: true },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Mark report as viewed if it was previously sent/draft
    if (report.status === "draft" || report.status === "sent") {
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "viewed" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track report error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}

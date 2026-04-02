import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      approvalStatus: string;
      approvalNotes?: string;
    };

    if (!data.approvalStatus) {
      return NextResponse.json({ error: "approvalStatus is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "approved", "changes_requested"];
    if (!validStatuses.includes(data.approvalStatus)) {
      return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const updated = await prisma.report.update({
      where: { id },
      data: {
        approvalStatus: data.approvalStatus,
        approvalNotes: data.approvalNotes ?? null,
        approvedBy: data.approvalStatus === "approved" ? session.user.id : null,
        approvedAt: data.approvalStatus === "approved" ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approve report error:", error);
    return NextResponse.json({ error: "Failed to update approval status" }, { status: 500 });
  }
}

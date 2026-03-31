import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: true,
        sections: { orderBy: { orderIndex: "asc" } },
        screenshots: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json({ error: "Failed to get report" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const VALID_STATUSES = ["draft", "review", "published", "archived"];
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Build share token update
    let shareTokenUpdate: { shareToken?: string | null } = {};
    if (data.generateShareToken === true) {
      shareTokenUpdate = { shareToken: crypto.randomUUID() };
    } else if (data.revokeShareToken === true) {
      shareTokenUpdate = { shareToken: null };
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        title: data.title,
        period: data.period,
        status: data.status,
        ...shareTokenUpdate,
        customStartDate: data.customStartDate ?? undefined,
        customEndDate: data.customEndDate ?? undefined,
        compareStartDate: data.compareStartDate ?? undefined,
        compareEndDate: data.compareEndDate ?? undefined,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.report.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}

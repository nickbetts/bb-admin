import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { order } = await request.json() as { order: string[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array of section IDs" }, { status: 400 });
    }

    await prisma.$transaction(
      order.map((sectionId, index) =>
        prisma.reportSection.update({
          where: { id: sectionId, reportId: id },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder sections error:", error);
    return NextResponse.json({ error: "Failed to reorder sections" }, { status: 500 });
  }
}

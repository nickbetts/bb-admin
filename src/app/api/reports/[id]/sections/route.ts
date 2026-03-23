import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { sectionId, commentary, enabled, cardConfig } = data;

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    const updateData: { commentary?: string; enabled?: boolean; cardConfig?: string | null } = {};
    if (commentary !== undefined) updateData.commentary = commentary;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (cardConfig !== undefined) updateData.cardConfig = cardConfig;

    const section = await prisma.reportSection.update({
      where: { id: sectionId, reportId: id },
      data: updateData,
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Update section error:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

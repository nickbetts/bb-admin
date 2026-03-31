import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const original = await prisma.report.findUnique({
      where: { id },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    if (!original) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const duplicated = await prisma.report.create({
      data: {
        clientId: original.clientId,
        title: `Copy of ${original.title}`,
        period: original.period,
        status: "draft",
        sections: {
          create: original.sections.map((s) => ({
            sectionType: s.sectionType,
            title: s.title,
            orderIndex: s.orderIndex,
            enabled: s.enabled,
            cardConfig: s.cardConfig,
            // commentary and contentText intentionally omitted — start fresh
          })),
        },
      },
    });

    return NextResponse.json({ id: duplicated.id }, { status: 201 });
  } catch (error) {
    console.error("Duplicate report error:", error);
    return NextResponse.json({ error: "Failed to duplicate report" }, { status: 500 });
  }
}

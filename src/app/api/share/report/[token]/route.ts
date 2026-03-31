import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const report = await prisma.report.findUnique({
      where: { shareToken: token },
      include: {
        client: {
          select: { name: true, logoUrl: true, website: true },
        },
        sections: { orderBy: { orderIndex: "asc" } },
        screenshots: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Share report error:", error);
    return NextResponse.json({ error: "Failed to get report" }, { status: 500 });
  }
}

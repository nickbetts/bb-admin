import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const docs = await prisma.strategyDocument.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        period: true,
        type: true,
        content: true,
        shareToken: true,
        createdAt: true,
      },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Get strategy documents error:", error);
    return NextResponse.json({ error: "Failed to get strategy documents" }, { status: 500 });
  }
}

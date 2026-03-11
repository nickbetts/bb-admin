import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const reports = await prisma.report.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, slug: true } },
        _count: { select: { sections: true, screenshots: true } },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json({ error: "Failed to get reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { clientId, title, period } = data;

    if (!clientId || !title || !period) {
      return NextResponse.json(
        { error: "clientId, title, and period are required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        clientId,
        title,
        period,
        status: "draft",
        sections: {
          create: [
            { sectionType: "overview", title: "Overview & Commentary", orderIndex: 0 },
            { sectionType: "seo", title: "SEO Performance", orderIndex: 1 },
            { sectionType: "web", title: "Website Analytics", orderIndex: 2 },
            { sectionType: "paid_social", title: "Paid Social Performance", orderIndex: 3 },
          ],
        },
      },
      include: {
        sections: true,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

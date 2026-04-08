import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

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
    const { clientId, title, period, templateId, sections: customSections } = data;

    if (!clientId || !title || !period) {
      return NextResponse.json(
        { error: "clientId, title, and period are required" },
        { status: 400 }
      );
    }

    type SectionCreate = { sectionType: string; title: string; orderIndex: number; enabled: boolean; cardConfig: string | null };
    let sectionsToCreate: SectionCreate[] = [];

    if (templateId) {
      const template = await prisma.reportTemplate.findUnique({ where: { id: templateId } });
      if (template) {
        try {
          const parsed = JSON.parse(template.sections) as { sectionType: string; title: string; orderIndex?: number; enabled?: boolean; cardConfig?: string }[];
          sectionsToCreate = parsed.map((s, i) => ({
            sectionType: s.sectionType,
            title: s.title,
            orderIndex: s.orderIndex ?? i,
            enabled: s.enabled !== false,
            cardConfig: s.cardConfig ?? null,
          }));
        } catch {
          console.error("Invalid template sections JSON for template:", templateId);
        }
      }
    } else if (Array.isArray(customSections) && customSections.length > 0) {
      sectionsToCreate = (customSections as { sectionType: string; title: string; orderIndex?: number; enabled?: boolean; cardConfig?: string }[]).map((s, i) => ({
        sectionType: s.sectionType,
        title: s.title,
        orderIndex: s.orderIndex ?? i,
        enabled: s.enabled !== false,
        cardConfig: s.cardConfig ?? null,
      }));
    } else {
      sectionsToCreate = [
        { sectionType: "overview", title: "Overview & Commentary", orderIndex: 0, enabled: true, cardConfig: null },
        { sectionType: "seo", title: "SEO Performance", orderIndex: 1, enabled: true, cardConfig: null },
        { sectionType: "web", title: "Website Analytics", orderIndex: 2, enabled: true, cardConfig: null },
        { sectionType: "paid_social", title: "Paid Social Performance", orderIndex: 3, enabled: true, cardConfig: null },
      ];
    }

    const report = await prisma.report.create({
      data: {
        clientId,
        title,
        period,
        status: "draft",
        sections: {
          create: sectionsToCreate,
        },
      },
      include: {
        sections: true,
      },
    });

    // Fetch client name for the activity log (non-fatal if missing)
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } }).catch(() => null);
    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "report_created",
      resourceType: "report",
      resourceId: report.id,
      clientId,
      clientName: client?.name ?? undefined,
      description: `Created report "${title}" for ${client?.name ?? clientId} (${period})`,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

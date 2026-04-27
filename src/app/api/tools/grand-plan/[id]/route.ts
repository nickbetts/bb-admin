import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// GET /api/tools/grand-plan/[id] — get plan with versions + linked records
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const grandPlan = await prisma.grandPlan.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: "desc" } },
        client: { select: { id: true, name: true, slug: true, website: true, logoUrl: true } },
        proposal: {
          select: {
            id: true,
            title: true,
            clientName: true,
            servicesJson: true,
            timelineJson: true,
            proposalDataJson: true,
          },
        },
        keywordResearch: {
          select: {
            id: true,
            title: true,
            website: true,
            brief: true,
            adGroups: true,
            selectedKws: true,
            ideas: true,
            maxCpc: true,
            monthlyBudget: true,
          },
        },
        contentStrategy: {
          select: {
            id: true,
            title: true,
            period: true,
            spreadsheetData: true,
          },
        },
        mediaPlan: {
          select: {
            id: true,
            title: true,
            objective: true,
            totalBudget: true,
            duration: true,
            channels: true,
            forecast: true,
          },
        },
      },
    });

    if (!grandPlan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (grandPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ grandPlan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan get error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/tools/grand-plan/[id] — update plan metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.grandPlan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      purpose?: string;
      status?: string;
      proposalId?: string | null;
      keywordResearchId?: string | null;
      contentStrategyId?: string | null;
      mediaPlanId?: string | null;
      clientBrief?: string;
      targetAudiences?: string;
      prospectName?: string | null;
      prospectWebsite?: string | null;
      enquiryFormEnabled?: boolean;
      period?: string | null;
      campaignFocusPeriods?: { startMonth: number; endMonth: number; label: string; description?: string }[];
      config?: Record<string, unknown>;
    };

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.purpose !== undefined) data.purpose = body.purpose;
    if (body.status !== undefined) data.status = body.status;
    if (body.proposalId !== undefined) data.proposalId = body.proposalId;
    if (body.keywordResearchId !== undefined) data.keywordResearchId = body.keywordResearchId;
    if (body.contentStrategyId !== undefined) data.contentStrategyId = body.contentStrategyId;
    if (body.mediaPlanId !== undefined) data.mediaPlanId = body.mediaPlanId;
    if (body.clientBrief !== undefined) data.clientBrief = body.clientBrief;
    if (body.targetAudiences !== undefined) data.targetAudiences = body.targetAudiences;
    if (body.prospectName !== undefined) data.prospectName = body.prospectName;
    if (body.prospectWebsite !== undefined) data.prospectWebsite = body.prospectWebsite;
    if (body.enquiryFormEnabled !== undefined) data.enquiryFormEnabled = body.enquiryFormEnabled;
    if (body.period !== undefined) data.period = body.period;
    if (body.campaignFocusPeriods !== undefined) {
      data.campaignFocusPeriodsJson = JSON.stringify(body.campaignFocusPeriods);
    }
    if (body.config !== undefined) data.configJson = JSON.stringify(body.config);

    const updated = await prisma.grandPlan.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ grandPlan: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tools/grand-plan/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.grandPlan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.grandPlan.delete({ where: { id } });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    action: "grand_plan_deleted",
    resourceType: "GrandPlan",
    resourceId: id,
    description: `Deleted grand plan "${existing.title}"`,
  });

  return NextResponse.json({ success: true });
}

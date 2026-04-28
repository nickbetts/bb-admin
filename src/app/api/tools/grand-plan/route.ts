import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/tools/grand-plan — list all grand plans for the current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const purpose = searchParams.get("purpose");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (purpose) where.purpose = purpose;

  try {
    const grandPlans = await prisma.grandPlan.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        purpose: true,
        shareToken: true,
        viewCount: true,
        lastViewedAt: true,
        clientId: true,
        prospectName: true,
        prospectWebsite: true,
        pipelineStage: true,
        expectedValue: true,
        closeDate: true,
        enquiryFormEnabled: true,
        generationMs: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        _count: { select: { versions: true, enquiries: true } },
      },
    });

    return NextResponse.json({ grandPlans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plans list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tools/grand-plan — create a new grand plan
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      clientId?: string;
      prospectName?: string;
      prospectWebsite?: string;
      title: string;
      purpose?: string;
      proposalId?: string;
      keywordResearchId?: string;
      contentStrategyId?: string;
      mediaPlanId?: string;
      clientBrief?: string;
      targetAudiences?: string;
      sector?: string;
      campaignFocusPeriods?: { startMonth: number; endMonth: number; label: string; description?: string }[];
      competitors?: {
        domain: string;
        commonKeywords?: number;
        pageContext?: { headings?: string[]; description?: string; ctaTexts?: string[]; h1?: string };
        source?: "manual" | "auto";
      }[];
      config?: { sections?: string[]; postsPerMonth?: number; socialPostsPerWeek?: number; channelBudgets?: { googleAds?: number; metaAds?: number; linkedInAds?: number }; manualPageUrls?: string[] };
      period?: string;
      cloneFromId?: string;
    };

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Clone: copy config and sources from an existing plan
    if (body.cloneFromId) {
      const source = await prisma.grandPlan.findUnique({ where: { id: body.cloneFromId } });
      if (!source) return NextResponse.json({ error: "Source plan not found" }, { status: 404 });


      const cloned = await prisma.grandPlan.create({
        data: {
          userId: session.user.id,
          clientId: source.clientId,
          title: body.title,
          purpose: source.purpose,
          proposalId: source.proposalId,
          keywordResearchId: source.keywordResearchId,
          contentStrategyId: source.contentStrategyId,
          mediaPlanId: source.mediaPlanId,
          clientBrief: source.clientBrief,
          targetAudiences: source.targetAudiences,
          campaignFocusPeriodsJson: source.campaignFocusPeriodsJson,
          competitorsJson: source.competitorsJson,
          configJson: source.configJson,
        },
        include: { client: { select: { id: true, name: true } } },
      });

      logActivity({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "grand_plan_created",
        resourceType: "GrandPlan",
        resourceId: cloned.id,
        clientId: cloned.clientId ?? undefined,
        clientName: cloned.client?.name ?? undefined,
        description: `Cloned grand plan "${body.title}" from "${source.title}"`,
      });

      return NextResponse.json({ grandPlan: cloned });
    }

    // Validate that linked source records exist and belong to the same client
    const clientId = body.clientId || null;
    if (body.proposalId) {
      const p = await prisma.proposal.findUnique({ where: { id: body.proposalId }, select: { clientId: true } });
      if (!p) return NextResponse.json({ error: "Linked proposal not found" }, { status: 400 });
      if (clientId && p.clientId && p.clientId !== clientId) return NextResponse.json({ error: "Proposal belongs to a different client" }, { status: 400 });
    }
    if (body.keywordResearchId) {
      const kr = await prisma.keywordPlannerResearch.findUnique({ where: { id: body.keywordResearchId }, select: { clientId: true } });
      if (!kr) return NextResponse.json({ error: "Linked keyword research not found" }, { status: 400 });
      if (clientId && kr.clientId && kr.clientId !== clientId) return NextResponse.json({ error: "Keyword research belongs to a different client" }, { status: 400 });
    }
    if (body.contentStrategyId) {
      const cs = await prisma.contentStrategy.findUnique({ where: { id: body.contentStrategyId }, select: { clientId: true } });
      if (!cs) return NextResponse.json({ error: "Linked content strategy not found" }, { status: 400 });
      if (clientId && cs.clientId && cs.clientId !== clientId) return NextResponse.json({ error: "Content strategy belongs to a different client" }, { status: 400 });
    }

    const grandPlan = await prisma.grandPlan.create({
      data: {
        userId: session.user.id,
        clientId: body.clientId || null,
        prospectName: body.clientId ? null : (body.prospectName?.trim() || null),
        prospectWebsite: body.clientId ? null : (body.prospectWebsite?.trim() || null),
        title: body.title,
        purpose: body.purpose || "pitch",
        proposalId: body.proposalId || null,
        keywordResearchId: body.keywordResearchId || null,
        contentStrategyId: body.contentStrategyId || null,
        mediaPlanId: body.mediaPlanId || null,
        clientBrief: body.clientBrief || null,
        targetAudiences: body.targetAudiences || null,
        campaignFocusPeriodsJson: JSON.stringify(body.campaignFocusPeriods ?? []),
        competitorsJson: JSON.stringify(body.competitors ?? []),
        configJson: JSON.stringify({ ...(body.config ?? {}), ...(body.sector ? { sector: body.sector } : {}) }),
        period: body.period?.trim() || null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "grand_plan_created",
      resourceType: "GrandPlan",
      resourceId: grandPlan.id,
      clientId: grandPlan.clientId ?? undefined,
      clientName: grandPlan.client?.name ?? undefined,
      description: `Created grand plan "${body.title}"${grandPlan.client ? ` for ${grandPlan.client.name}` : ""}`,
    });

    return NextResponse.json({ grandPlan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/tools/grand-plan — generate share token for a plan
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, action, password, expiresInDays } = (await request.json()) as {
      id: string;
      action: "share" | "unshare";
      password?: string;
      expiresInDays?: number;
    };

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    const existing = await prisma.grandPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "share") {
      const shareToken = existing.shareToken || crypto.randomBytes(24).toString("hex");
      const sharePassword = password
        ? crypto.createHash("sha256").update(password).digest("hex")
        : null;
      const shareExpiresAt = expiresInDays && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86_400_000)
        : null;

      const updated = await prisma.grandPlan.update({
        where: { id },
        data: { shareToken, sharePassword, shareExpiresAt },
      });

      logActivity({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "grand_plan_shared",
        resourceType: "GrandPlan",
        resourceId: id,
        description: `Shared grand plan "${existing.title}"`,
      });

      return NextResponse.json({ shareToken: updated.shareToken, shareExpiresAt: updated.shareExpiresAt });
    }

    // unshare
    await prisma.grandPlan.update({
      where: { id },
      data: { shareToken: null, sharePassword: null, shareExpiresAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan share error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

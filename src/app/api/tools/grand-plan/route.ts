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

  const where: Record<string, unknown> = { userId: session.user.id };
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
        generationMs: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
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
      title: string;
      purpose?: string;
      proposalId?: string;
      keywordResearchId?: string;
      contentStrategyId?: string;
      mediaPlanId?: string;
      clientBrief?: string;
      campaignFocusPeriods?: { startMonth: number; endMonth: number; label: string; description?: string }[];
      config?: { sections?: string[] };
    };

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const grandPlan = await prisma.grandPlan.create({
      data: {
        userId: session.user.id,
        clientId: body.clientId || null,
        title: body.title,
        purpose: body.purpose || "pitch",
        proposalId: body.proposalId || null,
        keywordResearchId: body.keywordResearchId || null,
        contentStrategyId: body.contentStrategyId || null,
        mediaPlanId: body.mediaPlanId || null,
        clientBrief: body.clientBrief || null,
        campaignFocusPeriodsJson: JSON.stringify(body.campaignFocusPeriods ?? []),
        configJson: JSON.stringify(body.config ?? {}),
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
    const { id, action, password } = (await request.json()) as {
      id: string;
      action: "share" | "unshare";
      password?: string;
    };

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    const existing = await prisma.grandPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "share") {
      const shareToken = existing.shareToken || crypto.randomBytes(24).toString("hex");
      const sharePassword = password
        ? crypto.createHash("sha256").update(password).digest("hex")
        : null;

      const updated = await prisma.grandPlan.update({
        where: { id },
        data: { shareToken, sharePassword },
      });

      logActivity({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "grand_plan_shared",
        resourceType: "GrandPlan",
        resourceId: id,
        description: `Shared grand plan "${existing.title}"`,
      });

      return NextResponse.json({ shareToken: updated.shareToken });
    }

    // unshare
    await prisma.grandPlan.update({
      where: { id },
      data: { shareToken: null, sharePassword: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan share error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

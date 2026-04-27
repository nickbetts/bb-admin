import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// POST /api/tools/grand-plan/[id]/restore-version
// Body: { versionId: string }
// Restores the chosen historical version as the live document and creates a
// new version entry capturing the restore (so the user can always undo).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = (await request.json()) as { versionId?: string };
    if (!body.versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const target = await prisma.grandPlanVersion.findFirst({
      where: { id: body.versionId, grandPlanId: id },
    });
    if (!target) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const nextVersionNumber = (plan.versions[0]?.versionNumber ?? 0) + 1;

    const [restored] = await prisma.$transaction([
      prisma.grandPlanVersion.create({
        data: {
          grandPlanId: id,
          versionNumber: nextVersionNumber,
          generatedHtml: target.generatedHtml,
          planDataJson: target.planDataJson,
          prompt: `Restored from v${target.versionNumber}`,
        },
      }),
      prisma.grandPlan.update({
        where: { id },
        data: {
          generatedHtml: target.generatedHtml,
          planDataJson: target.planDataJson,
        },
      }),
    ]);

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "grand_plan_refined",
      resourceType: "GrandPlan",
      resourceId: id,
      description: `Restored version v${target.versionNumber} (now v${restored.versionNumber})`,
    });

    return NextResponse.json({
      version: {
        id: restored.id,
        versionNumber: restored.versionNumber,
        createdAt: restored.createdAt,
      },
      html: target.generatedHtml,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan restore-version error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

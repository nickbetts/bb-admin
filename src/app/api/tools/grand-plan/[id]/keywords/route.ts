import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";

// PATCH /api/tools/grand-plan/[id]/keywords
// Body: { agIndex: number; agName: string; keywords: string[] }
// Updates the keyword list for a single ad group, preserving volume/CPC metadata
// for existing keywords and creating minimal entries for newly added ones.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { agIndex?: number; agName?: string; keywords?: string[] };

  if (typeof body.agIndex !== "number" || !body.agName || !Array.isArray(body.keywords)) {
    return NextResponse.json({ error: "agIndex, agName, and keywords are required" }, { status: 400 });
  }

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: {
      planDataJson: true,
      userId: true,
      clientBrief: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { versionNumber: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!plan.planDataJson) return NextResponse.json({ error: "No plan data" }, { status: 400 });

  let planData: GrandPlanData;
  try {
    planData = JSON.parse(plan.planDataJson);
  } catch {
    return NextResponse.json({ error: "Invalid plan data" }, { status: 400 });
  }

  const ads = planData.sections?.googleAdsCampaigns;
  if (!ads) return NextResponse.json({ error: "No Google Ads section in this plan" }, { status: 400 });

  const adGroup = ads.adGroups?.[body.agIndex];
  if (!adGroup) return NextResponse.json({ error: "Ad group index out of range" }, { status: 404 });
  if (adGroup.name !== body.agName) {
    return NextResponse.json({ error: "Ad group name mismatch — plan may have changed" }, { status: 409 });
  }

  // Preserve volume/CPC/matchType for existing keywords; create minimal entries for new ones
  const existingByText = new Map(
    (adGroup.keywords ?? []).map((k) => [k.keyword.toLowerCase(), k])
  );

  adGroup.keywords = body.keywords
    .map((kw) => kw.trim())
    .filter(Boolean)
    .map((kw) => existingByText.get(kw.toLowerCase()) ?? { keyword: kw, matchType: "broad" as const });

  const html = renderGrandPlanHtml(planData);
  const nextVersion = (plan.versions[0]?.versionNumber ?? 0) + 1;

  await prisma.$transaction([
    prisma.grandPlan.update({
      where: { id },
      data: { generatedHtml: html, planDataJson: JSON.stringify(planData) },
    }),
    prisma.grandPlanVersion.create({
      data: {
        grandPlanId: id,
        versionNumber: nextVersion,
        generatedHtml: html,
        planDataJson: JSON.stringify(planData),
        prompt: `Edited keywords in ad group "${body.agName}"`,
      },
    }),
  ]);

  return NextResponse.json({ html });
}

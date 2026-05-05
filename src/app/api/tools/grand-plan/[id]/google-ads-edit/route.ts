import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";

// PATCH /api/tools/grand-plan/[id]/google-ads-edit
// Body: { action: string, ...actionPayload }
// Actions: campaign-name, budget, locations, negatives,
//          ag-rename, ag-audience, ag-negatives, ag-add, ag-delete, seeds
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const { action } = body;

  if (typeof action !== "string") {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: {
      planDataJson: true,
      userId: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { versionNumber: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!plan.planDataJson) return NextResponse.json({ error: "No plan data" }, { status: 400 });

  let planData: GrandPlanData;
  try {
    planData = JSON.parse(plan.planDataJson);
  } catch {
    return NextResponse.json({ error: "Invalid plan data" }, { status: 400 });
  }

  const ads = planData.sections?.googleAdsCampaigns;
  if (!ads) return NextResponse.json({ error: "No Google Ads section in this plan" }, { status: 400 });

  let prompt = "";

  switch (action) {
    case "campaign-name": {
      const name = body.campaignName;
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "campaignName required" }, { status: 400 });
      }
      ads.campaignName = name.trim();
      prompt = `Renamed campaign to "${name.trim()}"`;
      break;
    }
    case "budget": {
      const budget = body.budget;
      if (typeof budget !== "string") {
        return NextResponse.json({ error: "budget required" }, { status: 400 });
      }
      ads.overview = { ...(ads.overview ?? {}), "Monthly Budget": budget.trim() };
      prompt = `Updated monthly budget to "${budget.trim()}"`;
      break;
    }
    case "locations": {
      const locs = body.locations;
      if (!Array.isArray(locs)) {
        return NextResponse.json({ error: "locations array required" }, { status: 400 });
      }
      ads.suggestedLocations = (locs as string[]).map((l) => String(l).trim()).filter(Boolean);
      prompt = "Updated suggested locations";
      break;
    }
    case "negatives": {
      const negs = body.negatives;
      if (!Array.isArray(negs)) {
        return NextResponse.json({ error: "negatives array required" }, { status: 400 });
      }
      ads.negativeKeywords = (negs as string[]).map((n) => String(n).trim()).filter(Boolean);
      prompt = "Updated campaign negative keywords";
      break;
    }
    case "ag-rename": {
      const agIndex = body.agIndex;
      const name = body.name;
      if (typeof agIndex !== "number" || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "agIndex and name required" }, { status: 400 });
      }
      const ag = ads.adGroups?.[agIndex];
      if (!ag) return NextResponse.json({ error: "Ad group not found" }, { status: 404 });
      ag.name = name.trim();
      prompt = `Renamed ad group ${agIndex + 1} to "${name.trim()}"`;
      break;
    }
    case "ag-audience": {
      const agIndex = body.agIndex;
      const audience = body.audience;
      if (typeof agIndex !== "number") {
        return NextResponse.json({ error: "agIndex required" }, { status: 400 });
      }
      const ag = ads.adGroups?.[agIndex];
      if (!ag) return NextResponse.json({ error: "Ad group not found" }, { status: 404 });
      ag.audience = typeof audience === "string" && audience.trim() ? audience.trim() : undefined;
      prompt = `Updated audience for ad group ${agIndex + 1}`;
      break;
    }
    case "ag-negatives": {
      const agIndex = body.agIndex;
      const negs = body.negatives;
      if (typeof agIndex !== "number" || !Array.isArray(negs)) {
        return NextResponse.json({ error: "agIndex and negatives array required" }, { status: 400 });
      }
      const ag = ads.adGroups?.[agIndex];
      if (!ag) return NextResponse.json({ error: "Ad group not found" }, { status: 404 });
      ag.adGroupNegatives = (negs as string[]).map((n) => String(n).trim()).filter(Boolean);
      prompt = `Updated negatives for ad group ${agIndex + 1}`;
      break;
    }
    case "ag-add": {
      const name = body.name;
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      ads.adGroups = [...(ads.adGroups ?? []), { name: name.trim(), keywords: [], adGroupNegatives: [] }];
      prompt = `Added ad group "${name.trim()}"`;
      break;
    }
    case "ag-delete": {
      const agIndex = body.agIndex;
      if (typeof agIndex !== "number") {
        return NextResponse.json({ error: "agIndex required" }, { status: 400 });
      }
      if (!ads.adGroups?.[agIndex]) return NextResponse.json({ error: "Ad group not found" }, { status: 404 });
      ads.adGroups = ads.adGroups.filter((_, i) => i !== agIndex);
      prompt = `Deleted ad group ${agIndex + 1}`;
      break;
    }
    case "seeds": {
      const seeds = body.seeds;
      if (!Array.isArray(seeds)) {
        return NextResponse.json({ error: "seeds array required" }, { status: 400 });
      }
      ads.seedSuggestions = (seeds as { theme: string; phrases: string[] }[])
        .filter((s) => s.theme?.trim())
        .map((s) => ({
          theme: s.theme.trim(),
          phrases: (s.phrases ?? []).map((p: string) => String(p).trim()).filter(Boolean),
        }));
      prompt = "Updated seed phrase suggestions";
      break;
    }
    case "intro": {
      const introText = body.intro;
      if (typeof introText !== "string") {
        return NextResponse.json({ error: "intro string required" }, { status: 400 });
      }
      // sectionIntros lives at the plan root, not inside ads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!planData.sectionIntros) (planData as any).sectionIntros = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (planData.sectionIntros as any).googleAdsCampaigns = introText.trim();
      prompt = "Updated Google Ads section intro";
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

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
        prompt,
      },
    }),
  ]);

  return NextResponse.json({ html });
}

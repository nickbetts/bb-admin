import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { generateGrandPlan, type GrandPlanSources, type GrandPlanData } from "@/lib/grand-plan-generator";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID_SECTIONS = [
  "executiveSummary", "strategyPlan", "googleAdsCampaigns", "metaCampaigns",
  "keywordResearch", "contentStrategy", "contentCalendar", "organicSocial",
  "exampleArticles", "servicesInvestment", "mediaPlan", "emailMarketing",
  "linkedInAds", "competitorIntel", "googleAdsForecast", "audiences",
];

// POST /api/tools/grand-plan/[id]/regenerate-section — regenerate a single section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, slug: true, website: true } },
      proposal: {
        select: {
          id: true, title: true, clientName: true,
          servicesJson: true, timelineJson: true, proposalDataJson: true,
        },
      },
      keywordResearch: {
        select: {
          id: true, title: true, website: true, brief: true,
          adGroups: true, selectedKws: true, ideas: true,
          maxCpc: true, monthlyBudget: true,
        },
      },
      contentStrategy: {
        select: { id: true, title: true, period: true, spreadsheetData: true },
      },
      mediaPlan: {
        select: {
          id: true, title: true, objective: true,
          totalBudget: true, channels: true, forecast: true,
        },
      },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!plan.planDataJson) return NextResponse.json({ error: "Plan has not been generated yet" }, { status: 400 });

  const body = await request.json() as { sectionKey: string };
  if (!body.sectionKey || !VALID_SECTIONS.includes(body.sectionKey)) {
    return NextResponse.json({ error: `Invalid sectionKey. Must be one of: ${VALID_SECTIONS.join(", ")}` }, { status: 400 });
  }

  try {
    const existingPlanData: GrandPlanData = JSON.parse(plan.planDataJson);
    const config = safeJsonParse<{ sector?: string }>(plan.configJson, {});
    const clientName = plan.client?.name || plan.proposal?.clientName || "Client";

    // Rebuild sources from linked records (same pattern as generate route)
    const sources: GrandPlanSources = {
      clientName,
      purpose: plan.purpose,
      clientBrief: plan.clientBrief || undefined,
      sector: config.sector || undefined,
      campaignFocusPeriods: safeJsonParse(plan.campaignFocusPeriodsJson, []),
      proposal: plan.proposal
        ? {
            title: plan.proposal.title,
            clientName: plan.proposal.clientName,
            servicesJson: plan.proposal.servicesJson,
            timelineJson: plan.proposal.timelineJson,
            proposalDataJson: plan.proposal.proposalDataJson,
          }
        : undefined,
      keywordResearch: plan.keywordResearch
        ? {
            title: plan.keywordResearch.title,
            website: plan.keywordResearch.website,
            brief: plan.keywordResearch.brief,
            adGroups: plan.keywordResearch.adGroups,
            selectedKws: plan.keywordResearch.selectedKws,
            ideas: plan.keywordResearch.ideas,
            maxCpc: plan.keywordResearch.maxCpc,
            monthlyBudget: plan.keywordResearch.monthlyBudget,
          }
        : undefined,
      contentStrategy: plan.contentStrategy
        ? {
            title: plan.contentStrategy.title,
            period: plan.contentStrategy.period,
            spreadsheetData: plan.contentStrategy.spreadsheetData,
          }
        : undefined,
      mediaPlan: plan.mediaPlan
        ? {
            title: plan.mediaPlan.title,
            objective: plan.mediaPlan.objective,
            totalBudget: plan.mediaPlan.totalBudget,
            channels: plan.mediaPlan.channels,
            forecast: plan.mediaPlan.forecast,
          }
        : undefined,
    };

    // Re-generate only the requested section
    const partial = await generateGrandPlan(sources, undefined, [body.sectionKey]);

    // Merge: overwrite only the regenerated section
    const sectionKey = body.sectionKey as keyof typeof existingPlanData.sections;
    const newSectionValue = partial.sections[sectionKey];
    if (newSectionValue !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existingPlanData.sections as any)[sectionKey] = newSectionValue;
    }

    const html = renderGrandPlanHtml(existingPlanData);

    // Save version
    const latestVersion = plan.versions[0];
    const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

    const [version] = await prisma.$transaction([
      prisma.grandPlanVersion.create({
        data: {
          grandPlanId: id,
          versionNumber: nextVersion,
          generatedHtml: html,
          planDataJson: JSON.stringify(existingPlanData),
          prompt: `Regenerated section: ${body.sectionKey}`,
        },
      }),
      prisma.grandPlan.update({
        where: { id },
        data: {
          generatedHtml: html,
          planDataJson: JSON.stringify(existingPlanData),
        },
      }),
    ]);

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "grand_plan_refined",
      resourceType: "GrandPlan",
      resourceId: id,
      description: `Regenerated section "${body.sectionKey}" (v${version.versionNumber})`,
    });

    return NextResponse.json({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      },
      sectionKey: body.sectionKey,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan section regeneration error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function safeJsonParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import {
  generateGrandPlan,
  type GrandPlanSources,
  type CampaignFocusPeriod,
} from "@/lib/grand-plan-generator";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import { suggestAdGroups, researchKeywords } from "@/lib/keyword-planner-pipeline";
import { generateContentStrategy } from "@/lib/content-strategy-generator";
import { extractBrandContext } from "@/lib/brand-extractor";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

// POST /api/tools/grand-plan/[id]/generate — trigger generation
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true },
      },
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
        select: { id: true, title: true, period: true, spreadsheetData: true },
      },
      mediaPlan: {
        select: {
          id: true,
          title: true,
          objective: true,
          totalBudget: true,
          channels: true,
          forecast: true,
        },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.status === "generating") {
    return NextResponse.json({ error: "Generation already in progress" }, { status: 409 });
  }

  // Allow optional body overrides
  let bodyOverrides: { clientBrief?: string; campaignFocusPeriods?: CampaignFocusPeriod[] } = {};
  try {
    bodyOverrides = await request.json();
  } catch {
    // No body or invalid JSON — that's fine
  }

  // Set status to generating immediately
  await prisma.grandPlan.update({
    where: { id },
    data: { status: "generating" },
  });

  // Capture values for the after() closure
  const planId = plan.id;
  const clientName =
    plan.client?.name || plan.prospectName || plan.proposal?.clientName || "Client";
  const userId = session.user.id;
  const userEmail = session.user.email;

  // Run heavy generation in after() — response returns immediately
  after(async () => {
    const start = Date.now();

    // Helper to update status message (visible to the polling UI)
    async function setProgress(message: string) {
      await prisma.grandPlan.update({
        where: { id: planId },
        data: { statusMessage: message },
      });
    }

    try {
      const focusPeriods: CampaignFocusPeriod[] =
        bodyOverrides.campaignFocusPeriods ?? safeJsonParse(plan.campaignFocusPeriodsJson, []);

      const brief = bodyOverrides.clientBrief ?? plan.clientBrief ?? "";
      const targetAudiences = plan.targetAudiences ?? "";

      // Parse section config — includes section toggles and inline briefs
      const config = safeJsonParse<{
        sections?: string[];
        sector?: string;
        kwBrief?: { website?: string; brief?: string; monthlyBudget?: string };
        contentBrief?: { domain?: string; database?: string; brief?: string; competitors?: string };
        mediaBrief?: { objective?: string; totalBudget?: number; duration?: number };
        lpBrief?: { campaignType?: string };
        channelBudgets?: { googleAds?: number; metaAds?: number; linkedInAds?: number };
        postsPerMonth?: number;
        socialPostsPerMonth?: number;
        socialPostsPerWeek?: number;
        calendarMonths?: number;
      }>(plan.configJson, {});

      const website =
        config.kwBrief?.website ?? plan.client?.website ?? plan.keywordResearch?.website ?? "";
      const clientId = plan.clientId;

      const enabledSections = config.sections?.length ? config.sections : undefined;

      // Track pipeline warnings for the UI
      const pipelineWarnings: string[] = [];

      // ── Auto-generate keyword research if not linked ───────────────────────
      let keywordResearchData = plan.keywordResearch;
      const kwBriefText = config.kwBrief?.brief || brief;
      if (!keywordResearchData && website && kwBriefText) {
        await setProgress("Crawling website and suggesting ad groups...");
        const suggestResult = await suggestAdGroups(website, kwBriefText);

        if (suggestResult.adGroups.length > 0) {
          await setProgress(
            `Researching ${suggestResult.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords via SEMrush...`,
          );
          const ideas = await researchKeywords(suggestResult.adGroups);

          // Convert ad groups with volumes into the format the generator expects
          const adGroupsWithVolumes = suggestResult.adGroups.map((g) => ({
            name: g.name,
            rationale: g.rationale,
            keywords: g.keywords.map((kw) => {
              const idea = ideas.find((i) => i.text.toLowerCase() === kw.toLowerCase());
              return {
                keyword: kw,
                matchType: "broad" as const,
                volume: idea?.avgMonthlySearches,
                cpc: idea ? idea.highTopOfPageBidMicros / 1_000_000 : undefined,
              };
            }),
          }));

          // Save as a real KeywordPlannerResearch record
          const savedResearch = await prisma.keywordPlannerResearch.create({
            data: {
              userId,
              clientId: clientId ?? undefined,
              title: `${clientName} — Auto-generated keyword research`,
              website,
              brief: kwBriefText,
              location: "2826",
              adGroups: JSON.stringify(adGroupsWithVolumes),
              selectedKws: JSON.stringify(suggestResult.adGroups.flatMap((g) => g.keywords)),
              ideas: JSON.stringify(ideas),
              maxCpc: "",
              monthlyBudget: config.kwBrief?.monthlyBudget ?? "",
              conversionRate: "3",
              websiteContext: suggestResult.websiteContext,
            },
          });

          // Link to the grand plan
          await prisma.grandPlan.update({
            where: { id: planId },
            data: { keywordResearchId: savedResearch.id },
          });

          // Set as source data for the generator
          keywordResearchData = {
            id: savedResearch.id,
            title: savedResearch.title,
            website: savedResearch.website,
            brief: savedResearch.brief,
            adGroups: savedResearch.adGroups,
            selectedKws: savedResearch.selectedKws,
            ideas: savedResearch.ideas,
            maxCpc: savedResearch.maxCpc,
            monthlyBudget: savedResearch.monthlyBudget,
          };
        }
      }

      // ── Content strategy ───────────────────────────────────────────────────
      // Spreadsheet auto-generation pathway removed. The Strategy Brain now
      // drives the entire content cluster section from form input via
      // generateContentClusters() inside generateGrandPlan(). Linked records
      // (plan.contentStrategy) are still respected as a legacy fallback.
      const contentStrategyData = plan.contentStrategy;

      await setProgress("Generating plan sections with Claude...");

      const sources: GrandPlanSources = {
        clientName,
        purpose: plan.purpose,
        clientBrief: brief || undefined,
        targetAudiences: targetAudiences || undefined,
        sector: config.sector || undefined,
        enabledPlatforms: enabledSections,
        campaignFocusPeriods: focusPeriods,
        postsPerMonth:
          typeof config.postsPerMonth === "number" && config.postsPerMonth > 0
            ? config.postsPerMonth
            : undefined,
        socialPostsPerMonth:
          typeof config.socialPostsPerMonth === "number" && config.socialPostsPerMonth >= 0
            ? config.socialPostsPerMonth
            : undefined,
        socialPostsPerWeek:
          typeof config.socialPostsPerWeek === "number" && config.socialPostsPerWeek > 0
            ? config.socialPostsPerWeek
            : undefined,
        calendarMonths:
          typeof config.calendarMonths === "number" && config.calendarMonths > 0
            ? config.calendarMonths
            : undefined,
        channelBudgets: config.channelBudgets ?? undefined,
        proposal: plan.proposal
          ? {
              title: plan.proposal.title,
              clientName: plan.proposal.clientName,
              servicesJson: plan.proposal.servicesJson,
              timelineJson: plan.proposal.timelineJson,
              proposalDataJson: plan.proposal.proposalDataJson,
            }
          : undefined,
        keywordResearch: keywordResearchData
          ? {
              title: keywordResearchData.title,
              website: keywordResearchData.website,
              brief: keywordResearchData.brief,
              adGroups: keywordResearchData.adGroups,
              selectedKws: keywordResearchData.selectedKws,
              ideas: keywordResearchData.ideas,
              maxCpc: keywordResearchData.maxCpc,
              monthlyBudget: keywordResearchData.monthlyBudget,
            }
          : undefined,
        contentStrategy: contentStrategyData
          ? {
              title: contentStrategyData.title,
              period: contentStrategyData.period,
              spreadsheetData: contentStrategyData.spreadsheetData,
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
          : config.mediaBrief?.totalBudget
            ? {
                title: `${clientName} — Media Plan`,
                objective: config.mediaBrief.objective ?? "lead_gen",
                totalBudget: config.mediaBrief.totalBudget,
                channels: "[]",
                forecast: null,
              }
            : undefined,
      };

      const planData = await generateGrandPlan(sources, setProgress, enabledSections);

      // Attach pipeline warnings if any
      if (pipelineWarnings.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (planData as any).pipelineWarnings = pipelineWarnings;
      }

      const html = renderGrandPlanHtml(planData);
      const generationMs = Date.now() - start;

      // Get next version number
      const lastVersion = await prisma.grandPlanVersion.findFirst({
        where: { grandPlanId: planId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;

      // Save generated HTML + plan data, create version
      await prisma.$transaction([
        prisma.grandPlan.update({
          where: { id: planId },
          data: {
            status: "complete",
            statusMessage: null,
            generatedHtml: html,
            planDataJson: JSON.stringify(planData),
            generationMs,
          },
        }),
        prisma.grandPlanVersion.create({
          data: {
            grandPlanId: planId,
            versionNumber: nextVersion,
            generatedHtml: html,
            planDataJson: JSON.stringify(planData),
            prompt: sources.clientBrief || "Initial generation",
          },
        }),
      ]);

      logActivity({
        userId,
        userEmail,
        action: "grand_plan_generated",
        resourceType: "GrandPlan",
        resourceId: planId,
        clientId: plan.clientId ?? undefined,
        clientName,
        description: `Generated grand plan "${plan.title}" (v${nextVersion}, ${Math.round(generationMs / 1000)}s)`,
      });
    } catch (genError) {
      const message = genError instanceof Error ? genError.message : "Unknown error";
      console.error("Grand plan generation error:", genError);

      await prisma.grandPlan.update({
        where: { id: planId },
        data: {
          status: "failed",
          statusMessage: null,
          generationError: message,
          planDataJson: JSON.stringify({ error: message }),
        },
      });
    }
  });

  return NextResponse.json({
    id: planId,
    status: "generating",
    message: "Generation started. Poll GET /api/tools/grand-plan/[id] for completion.",
  });
}

function safeJsonParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { generateGrandPlan, type GrandPlanSources, type GrandPlanData, type CampaignFocusPeriod } from "@/lib/grand-plan-generator";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import { suggestAdGroups, researchKeywords } from "@/lib/keyword-planner-pipeline";
import { generateContentStrategy } from "@/lib/content-strategy-generator";
import { extractBrandContext } from "@/lib/brand-extractor";
import { generateLandingPageWithCritique } from "@/lib/lp-generator";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Valid AI/computed section keys that can be generated individually
const SECTION_KEYS = [
  "executiveSummary", "strategyPlan", "googleAdsCampaigns", "metaCampaigns",
  "keywordResearch", "contentStrategy", "contentCalendar", "organicSocial",
  "exampleArticles", "servicesInvestment", "mediaPlan", "emailMarketing",
  "linkedInAds", "competitorIntel", "googleAdsForecast",
];

/**
 * POST /api/tools/grand-plan/[id]/generate-step
 *
 * Generates a grand plan one step at a time. Each call stays within 300s.
 * The client calls these sequentially:
 *   1. step: "start" — set status, initialise planDataJson
 *   2. step: "prepare-keywords" — auto keyword research (skips if linked)
 *   3. step: "prepare-content" — auto content strategy (skips if linked)
 *   4. step: "prepare-lp" — auto landing page (skips if not configured)
 *   5. step: <sectionKey> — generate one section, merge into planDataJson
 *   6. step: "assemble" — render HTML, create version, set complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    step: string;
    overrides?: { clientBrief?: string; campaignFocusPeriods?: CampaignFocusPeriod[] };
  };

  const { step } = body;
  if (!step) return NextResponse.json({ error: "step is required" }, { status: 400 });

  // Load plan with all linked records
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true } },
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

  const config = safeJsonParse<{
    sections?: string[];
    sector?: string;
    kwBrief?: { website?: string; brief?: string; monthlyBudget?: string };
    contentBrief?: { domain?: string; database?: string; brief?: string; competitors?: string };
    mediaBrief?: { objective?: string; totalBudget?: number; duration?: number };
    lpBrief?: { campaignType?: string };
  }>(plan.configJson, {});

  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";
  const brief = body.overrides?.clientBrief ?? plan.clientBrief ?? "";
  const website = config.kwBrief?.website ?? plan.client?.website ?? plan.keywordResearch?.website ?? "";

  try {
    // ─── STEP: start ─────────────────────────────────────────────────────────
    if (step === "start") {
      const focusPeriods = body.overrides?.campaignFocusPeriods
        ?? safeJsonParse(plan.campaignFocusPeriodsJson, []);

      // Initialise empty plan data
      const initialData: GrandPlanData = {
        title: `${clientName} — Go-To-Market Plan`,
        clientName,
        purpose: plan.purpose,
        generatedAt: new Date().toISOString(),
        sections: {},
      };

      await prisma.grandPlan.update({
        where: { id },
        data: {
          status: "generating",
          statusMessage: "Starting generation...",
          generationError: null,
          planDataJson: JSON.stringify(initialData),
          // Save overrides if provided
          ...(body.overrides?.clientBrief ? { clientBrief: body.overrides.clientBrief } : {}),
          ...(body.overrides?.campaignFocusPeriods
            ? { campaignFocusPeriodsJson: JSON.stringify(focusPeriods) }
            : {}),
        },
      });

      return NextResponse.json({ ok: true, step: "start" });
    }

    // ─── STEP: prepare-keywords ──────────────────────────────────────────────
    if (step === "prepare-keywords") {
      // Skip if already linked
      if (plan.keywordResearch) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const kwBriefText = config.kwBrief?.brief || brief;
      if (!website || !kwBriefText) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      await setStatus(id, "Crawling website and suggesting ad groups...");

      const suggestResult = await suggestAdGroups(website, kwBriefText);
      if (suggestResult.adGroups.length === 0) {
        return NextResponse.json({ ok: true, step, skipped: true, reason: "No ad groups suggested" });
      }

      await setStatus(id, `Researching ${suggestResult.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords via SEMrush...`);
      const ideas = await researchKeywords(suggestResult.adGroups);

      const adGroupsWithVolumes = suggestResult.adGroups.map((g) => ({
        name: g.name,
        rationale: g.rationale,
        keywords: g.keywords.map((kw) => {
          const idea = ideas.find((i) => i.text.toLowerCase() === kw.toLowerCase());
          return {
            keyword: kw,
            matchType: "broad" as const,
            volume: idea?.avgMonthlySearches,
            cpc: idea ? (idea.highTopOfPageBidMicros / 1_000_000) : undefined,
          };
        }),
      }));

      const savedResearch = await prisma.keywordPlannerResearch.create({
        data: {
          userId: session.user.id,
          clientId: plan.clientId ?? undefined,
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

      await prisma.grandPlan.update({
        where: { id },
        data: { keywordResearchId: savedResearch.id },
      });

      return NextResponse.json({ ok: true, step });
    }

    // ─── STEP: prepare-content ───────────────────────────────────────────────
    if (step === "prepare-content") {
      // Reload plan to pick up keyword research from previous step
      const freshPlan = await prisma.grandPlan.findUnique({
        where: { id },
        include: { contentStrategy: { select: { id: true } } },
      });

      if (freshPlan?.contentStrategy) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      if (!website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const csDomain = config.contentBrief?.domain ?? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      const csDatabase = config.contentBrief?.database ?? "uk";
      const csBrief = config.contentBrief?.brief || brief || `Full digital marketing strategy for ${clientName}`;
      const csCompetitors = config.contentBrief?.competitors
        ? config.contentBrief.competitors.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const searchConsoleSiteUrl = plan.client?.searchConsoleSiteUrl ?? undefined;

      await setStatus(id, "Running SEMrush analysis and generating content strategy...");

      const strategyResult = await generateContentStrategy(
        csDomain,
        clientName,
        csBrief,
        csCompetitors,
        csDatabase,
        searchConsoleSiteUrl ?? null,
        "claude-opus-4-6",
      );

      const now = new Date();
      const period = `${now.toLocaleString("en-GB", { month: "long", year: "numeric" })} — Auto-generated`;

      const savedStrategy = await prisma.contentStrategy.create({
        data: {
          clientId: plan.clientId ?? undefined,
          createdBy: "Grand Plan Auto-Pipeline",
          title: `${clientName} — Content & SEO Strategy`,
          period,
          spreadsheetData: JSON.stringify(strategyResult.data),
          generatedHtml: "",
        },
      });

      await prisma.grandPlan.update({
        where: { id },
        data: { contentStrategyId: savedStrategy.id },
      });

      return NextResponse.json({ ok: true, step });
    }

    // ─── STEP: prepare-lp ────────────────────────────────────────────────────
    if (step === "prepare-lp") {
      if (!config.lpBrief || !website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const lpCampaignType = config.lpBrief.campaignType ?? "lead-gen";
      const lpBriefText = brief || `${clientName} landing page for ${lpCampaignType} campaign`;

      await setStatus(id, "Extracting brand context from website...");
      const brandContext = await extractBrandContext(website);

      // Three-pass: draft -> critique -> targeted refinements. Each pass
      // gets a fresh 32K-token output budget, so the LP no longer dies
      // after the hero and copy quality lifts noticeably.
      const { html: lpHtml, critique, passes } = await generateLandingPageWithCritique({
        brief: lpBriefText,
        campaignType: lpCampaignType,
        brandContext,
        targetAudience: config.sector || undefined,
        refinementPasses: 2,
        fixesPerPass: 4,
        onProgress: async (msg) => { await setStatus(id, msg); },
      });
      console.log(
        `[grand-plan] Landing page generated with ${passes} refinement pass(es), ${critique.length} critique items.`,
      );

      // Save landing page directly into planDataJson
      const existing = safeJsonParse<GrandPlanData | null>(plan.planDataJson, null);
      if (existing) {
        existing.sections.landingPage = { html: lpHtml, campaignType: lpCampaignType };
        await prisma.grandPlan.update({
          where: { id },
          data: { planDataJson: JSON.stringify(existing) },
        });
      }

      return NextResponse.json({ ok: true, step });
    }

    // ─── STEP: section generation ────────────────────────────────────────────
    if (SECTION_KEYS.includes(step)) {
      await setStatus(id, `Generating ${step}...`);

      // Reload plan to pick up any linked records from prepare steps
      const freshPlan = await prisma.grandPlan.findUnique({
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
        },
      });

      if (!freshPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      const sources = buildSources(freshPlan, config, brief);

      // Generate just this one section
      const partial = await generateGrandPlan(sources, undefined, [step]);

      // Merge into existing planDataJson
      const existingData = safeJsonParse<GrandPlanData>(freshPlan.planDataJson, {
        title: `${clientName} — Go-To-Market Plan`,
        clientName,
        purpose: freshPlan.purpose,
        generatedAt: new Date().toISOString(),
        sections: {},
      });

      const sectionKey = step as keyof typeof existingData.sections;
      const newValue = partial.sections[sectionKey];
      if (newValue !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (existingData.sections as any)[sectionKey] = newValue;
      }

      await prisma.grandPlan.update({
        where: { id },
        data: { planDataJson: JSON.stringify(existingData) },
      });

      return NextResponse.json({ ok: true, step });
    }

    // ─── STEP: assemble ──────────────────────────────────────────────────────
    if (step === "assemble") {
      await setStatus(id, "Assembling final document...");

      // Reload plan to get all accumulated section data
      const freshPlan = await prisma.grandPlan.findUnique({
        where: { id },
        select: {
          planDataJson: true,
          clientBrief: true,
          clientId: true,
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      });

      if (!freshPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      const planData = safeJsonParse<GrandPlanData | null>(freshPlan.planDataJson, null);
      if (!planData) {
        return NextResponse.json({ error: "No plan data to assemble" }, { status: 400 });
      }

      const html = renderGrandPlanHtml(planData);

      // Next version number
      const latestVersion = freshPlan.versions[0];
      const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

      await prisma.$transaction([
        prisma.grandPlan.update({
          where: { id },
          data: {
            status: "complete",
            statusMessage: null,
            generatedHtml: html,
            planDataJson: JSON.stringify(planData),
            generationMs: null, // Individual steps — no single duration
          },
        }),
        prisma.grandPlanVersion.create({
          data: {
            grandPlanId: id,
            versionNumber: nextVersion,
            generatedHtml: html,
            planDataJson: JSON.stringify(planData),
            prompt: freshPlan.clientBrief || "Step-based generation",
          },
        }),
      ]);

      logActivity({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "grand_plan_generated",
        resourceType: "GrandPlan",
        resourceId: id,
        clientId: plan.clientId ?? undefined,
        clientName,
        description: `Generated grand plan "${plan.title}" (v${nextVersion})`,
      });

      return NextResponse.json({ ok: true, step, html: true });
    }

    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Grand plan step "${step}" error:`, error);

    // Mark plan as failed so UI can show retry
    await prisma.grandPlan.update({
      where: { id },
      data: {
        status: "failed",
        statusMessage: null,
        generationError: `Step "${step}" failed: ${message}`,
      },
    }).catch(() => {}); // Don't throw if this update fails

    return NextResponse.json({ error: message, step }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setStatus(id: string, message: string) {
  await prisma.grandPlan.update({
    where: { id },
    data: { statusMessage: message },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSources(plan: any, config: any, brief: string): GrandPlanSources {
  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";
  return {
    clientName,
    purpose: plan.purpose,
    clientBrief: brief || undefined,
    targetAudiences: plan.targetAudiences || undefined,
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
}

function safeJsonParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

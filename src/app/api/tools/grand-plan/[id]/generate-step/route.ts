import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import {
  generateGrandPlan,
  generateHeroTagline,
  generateSectionIntros,
  buildAudienceRationales,
  synthesiseStrategyBrain,
  runWithGrandPlanModelOverride,
  type GrandPlanModelChoice,
  type GrandPlanSources,
  type GrandPlanData,
  type CampaignFocusPeriod,
  type AccountResearchData,
  type CustomerVoiceData,
  type DataAvailability,
  type StrategyBrain,
  type ManualPageIntel,
  runWebSearchResearch,
} from "@/lib/grand-plan-generator";
import { autoFixCoherence, validateCoherence } from "@/lib/grand-plan-coherence";
import { fetchPageSignals } from "@/lib/landing-page-analyzer";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import { suggestAdGroups, researchKeywords } from "@/lib/keyword-planner-pipeline";
import {
  generateContentStrategy,
  generateContentStrategySection,
  collectSemrushData,
  runOnPageAudit,
  enrichPageOptimisationsDeep,
  type ContentStrategyData,
} from "@/lib/content-strategy-generator";
import { withApiCache } from "@/lib/api-cache";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { fetchSitemapUrls } from "@/lib/sitemap";
import {
  getGA4Overview,
  getGA4TrafficSources,
  getGA4Demographics,
  getGA4Devices,
  getGA4ConversionsByChannel,
  getGA4TopPages,
} from "@/lib/ga4";
import { getGSCTopQueries, getGSCTopPages } from "@/lib/search-console";
import {
  getDomainOverview,
  getCompetitors,
  getTopOrganicKeywords,
  getBacklinks,
  getUrlOrganicKeywords,
} from "@/lib/semrush";

// 800s = Vercel Pro maximum. The heaviest steps (prepare-content with Claude
// Opus 32k tokens, prepare-lp-refine with multi-pass critique) can exceed
// 300s on large sites; bumping this to the max ensures we don't 504 on those
// steps. Lighter steps return well within the budget.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

// Valid AI/computed section keys that can be generated individually
const SECTION_KEYS = [
  "executiveSummary",
  "audiences",
  "googleAdsCampaigns",
  "metaCampaigns",
  "contentStrategy",
  "contentCalendar",
  "servicesInvestment",
  "emailMarketing",
  "linkedInAds",
  "competitorIntel",
  "seoFoundations",
];

type QualityStepStatus = "ok" | "skipped" | "failed" | "degraded";

interface QualityStepRecord {
  status: QualityStepStatus;
  critical: boolean;
  reason?: string;
  error?: string;
  warnings?: string[];
  blockers?: string[];
  signals?: Record<string, unknown>;
  updatedAt: string;
}

interface QualityManifest {
  version: 1;
  steps: Record<string, QualityStepRecord>;
}

type PlanDataWithQuality = GrandPlanData & {
  qualityManifest?: QualityManifest;
  _researchData?: AccountResearchData;
  _customerVoice?: CustomerVoiceData;
  _strategyBrain?: StrategyBrain;
  _priorSprint?: GrandPlanSources["priorSprint"];
};

interface QualityStepUpdate {
  status: QualityStepStatus;
  critical?: boolean;
  reason?: string;
  error?: string;
  warnings?: string[];
  blockers?: string[];
  signals?: Record<string, unknown>;
}

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
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    step: string;
    overrides?: { clientBrief?: string; campaignFocusPeriods?: CampaignFocusPeriod[] };
  };

  const { step } = body;
  if (!step) return NextResponse.json({ error: "step is required" }, { status: 400 });

  // Load plan with all linked records
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
          website: true,
          searchConsoleSiteUrl: true,
          ga4PropertyId: true,
          semrushDomain: true,
        },
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
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = safeJsonParse<{
    sections?: string[];
    sector?: string;
    kwBrief?: { website?: string; brief?: string; monthlyBudget?: string };
    contentBrief?: { domain?: string; database?: string; brief?: string; competitors?: string };
    channelBudgets?: { googleAds?: number; metaAds?: number; linkedInAds?: number };
    aiModel?: GrandPlanModelChoice;
    semrushRegion?: string;
    /** User-supplied URLs for SEO Quick Wins / Page Optimisations focus. */
    manualPageUrls?: string[];
    /** Per-plan caps that override the client-level content limits. */
    contentLimits?: {
      pillarPages?: number;
      pageOptimisations?: number;
      landingPages?: number;
      blogPosts?: number;
      linkTargets?: number;
    };
    /** Plan duration mode — affects calendar, roadmap, quick wins, exec summary. */
    planMode?: "annual" | "sprint90";
  }>(plan.configJson, {});

  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";
  const brief = body.overrides?.clientBrief ?? plan.clientBrief ?? "";
  const website =
    config.kwBrief?.website ?? plan.client?.website ?? plan.keywordResearch?.website ?? "";

  return runWithGrandPlanModelOverride(config.aiModel, async () => {
    try {
      // ─── STEP: start ─────────────────────────────────────────────────────────
      if (step === "start") {
        const focusPeriods =
          body.overrides?.campaignFocusPeriods ?? safeJsonParse(plan.campaignFocusPeriodsJson, []);

        // Initialise empty plan data and reset quality manifest for this run.
        const initialData: PlanDataWithQuality = {
          title: `${clientName} — Go-To-Market Plan`,
          clientName,
          clientWebsite: plan.client?.website ?? website ?? undefined,
          purpose: plan.purpose,
          generatedAt: new Date().toISOString(),
          sections: {},
          qualityManifest: {
            version: 1,
            steps: {
              start: {
                status: "ok",
                critical: true,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        };

        // Only unlink keyword research if prepare-keywords will be able to
        // regenerate it (needs both a website and a brief). If neither is
        // available the link must be preserved — otherwise Google Ads Campaigns
        // has no keyword data on the next generation run.
        const kwBriefText = config.kwBrief?.brief || brief;
        const canAutoGenKw = !!(website && kwBriefText);

        await prisma.grandPlan.update({
          where: { id },
          data: {
            status: "generating",
            statusMessage: "Starting generation...",
            generationError: null,
            planDataJson: JSON.stringify(initialData),
            // Unlink keyword research only when prepare-keywords will regenerate it.
            // Unlink content strategy unconditionally — it is always rebuilt from config.
            ...(canAutoGenKw ? { keywordResearchId: null } : {}),
            contentStrategyId: null,
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
        const kwBriefText = config.kwBrief?.brief || brief;
        if (!website || !kwBriefText) {
          await updateStepQuality(id, step, {
            status: "skipped",
            critical: false,
            reason: "Missing website or keyword brief",
            warnings: ["Keyword preparation skipped because website or brief is missing."],
          });
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        await setStatus(id, "Crawling website and suggesting ad groups...");

        const suggestResult = await suggestAdGroups(website, kwBriefText);
        if (suggestResult.adGroups.length === 0) {
          await updateStepQuality(id, step, {
            status: "degraded",
            critical: false,
            reason: "No ad groups suggested",
            warnings: ["Keyword preparation produced no ad groups."],
            signals: { adGroups: 0, keywords: 0 },
          });
          return NextResponse.json({
            ok: true,
            step,
            skipped: true,
            reason: "No ad groups suggested",
          });
        }

        await setStatus(
          id,
          `Researching ${suggestResult.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords via SEMrush...`,
        );
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
              cpc: idea ? idea.highTopOfPageBidMicros / 1_000_000 : undefined,
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

        const keywordCount = suggestResult.adGroups.reduce(
          (sum, group) => sum + group.keywords.length,
          0,
        );
        await updateStepQuality(id, step, {
          status: "ok",
          critical: false,
          signals: {
            adGroups: suggestResult.adGroups.length,
            keywords: keywordCount,
            ideas: ideas.length,
          },
        });

        return NextResponse.json({ ok: true, step });
      }

      // ─── STEP: prepare-content-data ──────────────────────────────────────────
      // Warms all SEMrush / GSC caches via withApiCache before the heavy Claude
      // Opus generation step. Because every sub-call in collectSemrushData uses
      // withApiCache, this step stores the results in the DB so prepare-content
      // gets instant cache hits and its full 300 s budget goes to the AI call.
      if (step === "prepare-content-data") {
        // Always re-warm SEMrush caches; Grand Plans regenerate from scratch.
        if (!website) {
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        const csDomain =
          config.contentBrief?.domain ??
          website
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "")
            .replace(/^www\./, "");
        const csDatabase = config.semrushRegion ?? config.contentBrief?.database ?? "uk";
        const csBrief =
          config.contentBrief?.brief ||
          brief ||
          `Full digital marketing strategy for ${clientName}`;
        const csCompetitors = config.contentBrief?.competitors
          ? config.contentBrief.competitors
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
        const searchConsoleSiteUrl = plan.client?.searchConsoleSiteUrl ?? undefined;

        await setStatus(id, "Collecting SEMrush & Search Console data...");
        await collectSemrushData(
          csDomain,
          csCompetitors,
          csDatabase,
          searchConsoleSiteUrl,
          csBrief,
        );

        return NextResponse.json({ ok: true, step });
      }

      // ─── STEP: prepare-content-1 / -2 / -3 ──────────────────────────────────
      // The content strategy generation is split across three steps so each Claude
      // call targets ~8k output tokens (~160s worst case) and never approaches the
      // 800s Vercel limit. All three share the same SEMrush cache primed by
      // prepare-content-data.
      //
      //  prepare-content-1  →  pageOptimisations
      //  prepare-content-2  →  landingPages + linkTargets  (merges into strategy)
      //  prepare-content-3  →  blogPosts + roadmap          (merges into strategy)
      //
      // Legacy "prepare-content" is still handled below for any plans generated
      // before this change (it will be skipped if a strategy is already linked).
      if (
        step === "prepare-content-1" ||
        step === "prepare-content-2" ||
        step === "prepare-content-3" ||
        step === "prepare-content"
      ) {
        if (!website) {
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        const csDomain =
          config.contentBrief?.domain ??
          website
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "")
            .replace(/^www\./, "");
        const csDatabase = config.semrushRegion ?? config.contentBrief?.database ?? "uk";
        const csBrief =
          config.contentBrief?.brief ||
          brief ||
          `Full digital marketing strategy for ${clientName}`;
        const csCompetitors = config.contentBrief?.competitors
          ? config.contentBrief.competitors
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
        const searchConsoleSiteUrl = plan.client?.searchConsoleSiteUrl ?? undefined;

        // Parse strategist-supplied audience names so each content asset can
        // be correlated back to the audiences it serves.
        const audienceNames = (plan.targetAudiences ?? "")
          .split(/\n+/)
          .map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            const sepIdx = trimmed.search(/[:–—]/);
            const namePart = sepIdx >= 0 ? trimmed.slice(0, sepIdx) : trimmed;
            return namePart.trim().slice(0, 120);
          })
          .filter(Boolean)
          .slice(0, 6);

        // Pull the manual page intel (scraped + SEMrush) stashed by
        // prepare-research so the page optimisations call can prioritise the
        // URLs the client explicitly asked us to optimise.
        const stashForContent = safeJsonParse<
          (GrandPlanData & { _researchData?: AccountResearchData }) | null
        >(plan.planDataJson, null);
        const manualIntelForContent = stashForContent?._researchData?.manualPageIntel;

        // ── Legacy single-shot step (kept for backwards compatibility) ──────────
        if (step === "prepare-content") {
          await setStatus(id, "Generating content strategy with Claude Opus...");
          const strategyResult = await generateContentStrategy(
            csDomain,
            clientName,
            csBrief,
            csCompetitors,
            csDatabase,
            searchConsoleSiteUrl ?? null,
            "claude-opus-4-6",
            undefined,
            undefined,
            true,
          );
          const now = new Date();
          const period = `${now.toLocaleString("en-GB", { month: "long", year: "numeric" })} — Auto-generated`;
          const savedStrategy = await withDbRetry(() =>
            prisma.contentStrategy.create({
              data: {
                clientId: plan.clientId ?? undefined,
                createdBy: "Grand Plan Auto-Pipeline",
                title: `${clientName} — Content & SEO Strategy`,
                period,
                spreadsheetData: JSON.stringify(strategyResult.data),
                generatedHtml: "",
              },
            }),
          );
          await withDbRetry(() =>
            prisma.grandPlan.update({
              where: { id },
              data: { contentStrategyId: savedStrategy.id },
            }),
          );
          return NextResponse.json({ ok: true, step });
        }

        // Resolve the content quantity limits that were set on the form
        // (capacity allocator → contentLimits in config).
        const csLimits = config.contentLimits
          ? {
              pageOptimisations: config.contentLimits.pageOptimisations,
              landingPages: config.contentLimits.landingPages,
              blogPosts: config.contentLimits.blogPosts,
              pillarPages: config.contentLimits.pillarPages,
              linkTargets: config.contentLimits.linkTargets,
            }
          : undefined;

        // ── Step 1: generate pageOptimisations, create the ContentStrategy row ──
        if (step === "prepare-content-1") {
          const t1 = Date.now();
          console.log(
            `[grand-plan:${id}] prepare-content-1 start — domain=${csDomain} db=${csDatabase} limits=${JSON.stringify(csLimits)}`,
          );
          await setStatus(id, "Generating page optimisations (1/3)...");
          const partial = await generateContentStrategySection(
            "pageOptimisations",
            csDomain,
            clientName,
            csBrief,
            csCompetitors,
            csDatabase,
            searchConsoleSiteUrl ?? null,
            csLimits,
            undefined,
            audienceNames,
            manualIntelForContent,
          );
          console.log(
            `[grand-plan:${id}] prepare-content-1 AI done in ${Date.now() - t1}ms — pageOpts=${partial.pageOptimisations?.length ?? 0}`,
          );
          const now = new Date();
          const period = `${now.toLocaleString("en-GB", { month: "long", year: "numeric" })} — Auto-generated`;
          const initialData: ContentStrategyData = {
            clientName,
            period,
            pageOptimisations: partial.pageOptimisations ?? [],
            landingPages: [],
            categoryPages: [],
            blogPosts: [],
            linkTargets: [],
            quickWins: [],
            roadmap: { month1: [], months2to3: [], months4plus: [] },
            stats: {
              totalPageOptimisations: partial.pageOptimisations?.length ?? 0,
              totalLandingPages: 0,
              totalBlogPosts: 0,
              totalLinkTargets: 0,
            },
          };
          console.log(`[grand-plan:${id}] prepare-content-1 saving ContentStrategy row...`);
          const savedStrategy = await withDbRetry(() =>
            prisma.contentStrategy.create({
              data: {
                clientId: plan.clientId ?? undefined,
                createdBy: "Grand Plan Auto-Pipeline",
                title: `${clientName} — Content & SEO Strategy`,
                period,
                spreadsheetData: JSON.stringify(initialData),
                generatedHtml: "",
              },
            }),
          );
          await withDbRetry(() =>
            prisma.grandPlan.update({
              where: { id },
              data: { contentStrategyId: savedStrategy.id },
            }),
          );
          console.log(
            `[grand-plan:${id}] prepare-content-1 complete in ${Date.now() - t1}ms — strategyId=${savedStrategy.id}`,
          );
          return NextResponse.json({ ok: true, step });
        }

        // ── Steps 2 & 3: merge sections into the existing ContentStrategy row ──
        const reloadedPlan = await prisma.grandPlan.findUnique({
          where: { id },
          include: { contentStrategy: { select: { id: true, spreadsheetData: true } } },
        });
        if (!reloadedPlan?.contentStrategy) {
          // Step 1 hasn't run yet — abort gracefully
          return NextResponse.json(
            { error: "prepare-content-1 must run before this step" },
            { status: 400 },
          );
        }

        type SafeStrategyData = Omit<ContentStrategyData, "stats"> & {
          stats?: ContentStrategyData["stats"];
        };
        const existing = JSON.parse(
          reloadedPlan.contentStrategy.spreadsheetData || "{}",
        ) as SafeStrategyData;

        if (step === "prepare-content-2") {
          const t2 = Date.now();
          console.log(`[grand-plan:${id}] prepare-content-2 start — domain=${csDomain}`);
          await setStatus(id, "Generating landing pages (2/3)...");
          const partial = await generateContentStrategySection(
            "landingPages",
            csDomain,
            clientName,
            csBrief,
            csCompetitors,
            csDatabase,
            searchConsoleSiteUrl ?? null,
            csLimits,
            undefined,
            audienceNames,
          );
          console.log(
            `[grand-plan:${id}] prepare-content-2 AI done in ${Date.now() - t2}ms — landingPages=${partial.landingPages?.length ?? 0} linkTargets=${partial.linkTargets?.length ?? 0}`,
          );
          const merged: ContentStrategyData = {
            ...existing,
            landingPages: partial.landingPages ?? [],
            linkTargets: partial.linkTargets ?? [],
            stats: {
              totalPageOptimisations: existing.pageOptimisations?.length ?? 0,
              totalLandingPages: partial.landingPages?.length ?? 0,
              totalBlogPosts: existing.blogPosts?.length ?? 0,
              totalLinkTargets: new Set((partial.linkTargets ?? []).map((t) => t.url)).size,
            },
          };
          console.log(`[grand-plan:${id}] prepare-content-2 saving merge...`);
          await withDbRetry(() =>
            prisma.contentStrategy.update({
              where: { id: reloadedPlan.contentStrategy!.id },
              data: { spreadsheetData: JSON.stringify(merged) },
            }),
          );
          console.log(`[grand-plan:${id}] prepare-content-2 complete in ${Date.now() - t2}ms`);
          return NextResponse.json({ ok: true, step });
        }

        if (step === "prepare-content-3") {
          const t3 = Date.now();
          console.log(`[grand-plan:${id}] prepare-content-3 start — domain=${csDomain}`);
          await setStatus(id, "Generating blog posts & roadmap (3/3)...");
          const partial = await generateContentStrategySection(
            "blogPosts",
            csDomain,
            clientName,
            csBrief,
            csCompetitors,
            csDatabase,
            searchConsoleSiteUrl ?? null,
            csLimits,
            undefined,
            audienceNames,
          );
          console.log(
            `[grand-plan:${id}] prepare-content-3 AI done in ${Date.now() - t3}ms — blogPosts=${partial.blogPosts?.length ?? 0}`,
          );
          const merged: ContentStrategyData = {
            ...existing,
            blogPosts: partial.blogPosts ?? [],
            roadmap: partial.roadmap ??
              existing.roadmap ?? { month1: [], months2to3: [], months4plus: [] },
            stats: {
              totalPageOptimisations: existing.pageOptimisations?.length ?? 0,
              totalLandingPages: existing.landingPages?.length ?? 0,
              totalBlogPosts: partial.blogPosts?.length ?? 0,
              totalLinkTargets: new Set((existing.linkTargets ?? []).map((t) => t.url)).size,
            },
          };
          console.log(`[grand-plan:${id}] prepare-content-3 saving merge...`);
          await withDbRetry(() =>
            prisma.contentStrategy.update({
              where: { id: reloadedPlan.contentStrategy!.id },
              data: { spreadsheetData: JSON.stringify(merged) },
            }),
          );
          console.log(`[grand-plan:${id}] prepare-content-3 complete in ${Date.now() - t3}ms`);
          return NextResponse.json({ ok: true, step });
        }
      }

      // ─── STEP: prepare-content-audit ─────────────────────────────────────────
      // Runs the on-page audit (up to 20 page crawls, 8 s timeout each) against
      // the saved content strategy. Split out from prepare-content so the heavy
      // Claude generation and the network-bound audit each get a fresh 300 s budget.
      if (step === "prepare-content-audit") {
        const freshPlan = await prisma.grandPlan.findUnique({
          where: { id },
          include: { contentStrategy: { select: { id: true, spreadsheetData: true } } },
        });

        const csDomain =
          config.contentBrief?.domain ??
          website
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "")
            .replace(/^www\./, "");
        if (!freshPlan?.contentStrategy || !csDomain) {
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        type PageOptForAudit = Parameters<typeof runOnPageAudit>[1][number];
        const data = safeJsonParse<{ pageOptimisations?: PageOptForAudit[] }>(
          freshPlan.contentStrategy.spreadsheetData,
          {},
        );
        const pageOpts = data.pageOptimisations ?? [];

        // Already audited? Skip.
        const hasAuditData = pageOpts.some((p) => p.audit);
        if (hasAuditData || pageOpts.length === 0) {
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        await setStatus(id, "Auditing on-page SEO for proposed page optimisations...");
        await runOnPageAudit(csDomain, pageOpts);

        // Deep enrichment: pull current SEMrush rankings + Haiku-generated
        // rewrites (title, meta, suggested keywords with potential ranking band,
        // recommended schema, FAQ Q+A) per page. Cap 15 URLs, parallelism 5.
        const csDatabase = config.semrushRegion ?? config.contentBrief?.database ?? "uk";
        try {
          await setStatus(id, "Generating page rewrites & FAQ drafts...");
          await enrichPageOptimisationsDeep(
            csDomain,
            csDatabase,
            pageOpts as Parameters<typeof enrichPageOptimisationsDeep>[2],
          );
        } catch (err) {
          console.warn(
            `[grand-plan:${id}] enrichPageOptimisationsDeep failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // Persist the audit + enrichment results back onto the saved strategy
        const merged = { ...data, pageOptimisations: pageOpts };
        await prisma.contentStrategy.update({
          where: { id: freshPlan.contentStrategy.id },
          data: { spreadsheetData: JSON.stringify(merged) },
        });

        return NextResponse.json({ ok: true, step });
      }

      // ─── STEP: prepare-research ──────────────────────────────────────────────
      // Harvests real account data (GA4, Search Console, SEMrush competitors)
      // and stashes it onto planDataJson._researchData so every downstream
      // generator can ground its recommendations in actual numbers. All calls
      // are wrapped in withApiCache (7-day TTL) so a regeneration within the
      // week reuses the same snapshot.
      if (step === "prepare-research") {
        const cli = plan.client;
        const hasManualPageUrls = (config.manualPageUrls ?? []).length > 0;
        // Skip only if there is nothing to ground against AND no manual page URLs to process.
        if (
          !hasManualPageUrls &&
          (!cli ||
            (!cli.ga4PropertyId && !cli.searchConsoleSiteUrl && !cli.semrushDomain && !website))
        ) {
          await updateStepQuality(id, step, {
            status: "skipped",
            critical: false,
            reason: "No account integrations or manual page URLs available",
            warnings: ["Research step skipped because no data sources are connected."],
          });
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        await setStatus(id, "Harvesting real account data (GA4, Search Console, SEMrush)...");

        const propertyId = cli?.ga4PropertyId ?? null;
        const gscSite = cli?.searchConsoleSiteUrl ?? null;
        const semDomain =
          cli?.semrushDomain ??
          (website
            ? website
                .replace(/^https?:\/\//, "")
                .replace(/\/.*$/, "")
                .replace(/^www\./, "")
            : null);

        // Default to the last 30 days for all data pulls.
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const cacheTtlHours = 24 * 7;

        const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
          try {
            return await fn();
          } catch (err) {
            console.warn(
              `[grand-plan:${id}] research(${label}) failed:`,
              err instanceof Error ? err.message : err,
            );
            return null;
          }
        };

        const [
          ga4Overview,
          ga4Traffic,
          ga4Demo,
          ga4Devices,
          ga4Convs,
          ga4TopPages,
          ga4Geo,
          gscQueries,
          gscPages,
          semCompetitors,
          sitemapPagesRaw,
        ] = await Promise.all([
          propertyId
            ? safe("ga4Overview", () =>
                withApiCache(
                  `gp-research:ga4-overview:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4Overview(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          propertyId
            ? safe("ga4Traffic", () =>
                withApiCache(
                  `gp-research:ga4-traffic:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4TrafficSources(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          propertyId
            ? safe("ga4Demo", () =>
                withApiCache(
                  `gp-research:ga4-demo:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4Demographics(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          propertyId
            ? safe("ga4Devices", () =>
                withApiCache(
                  `gp-research:ga4-devices:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4Devices(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          propertyId
            ? safe("ga4Convs", () =>
                withApiCache(
                  `gp-research:ga4-convs:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4ConversionsByChannel(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          propertyId
            ? safe("ga4TopPages", () =>
                withApiCache(
                  `gp-research:ga4-pages:${propertyId}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGA4TopPages(propertyId, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          // ga4Geo is unused for now but kept as a placeholder slot in the parallel array.
          Promise.resolve(null),
          gscSite
            ? safe("gscQueries", () =>
                withApiCache(
                  `gp-research:gsc-queries:${gscSite}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGSCTopQueries(gscSite, startDate, endDate, 25),
                ),
              )
            : Promise.resolve(null),
          gscSite
            ? safe("gscPages", () =>
                withApiCache(
                  `gp-research:gsc-pages:${gscSite}:${startDate}:${endDate}`,
                  cacheTtlHours,
                  () => getGSCTopPages(gscSite, startDate, endDate),
                ),
              )
            : Promise.resolve(null),
          semDomain
            ? safe("semCompetitors", () =>
                withApiCache(`gp-research:sem-competitors:${semDomain}:uk:v2`, cacheTtlHours, () =>
                  getCompetitors(semDomain, "uk", 12),
                ),
              )
            : Promise.resolve(null),
          semDomain
            ? safe("sitemap", () =>
                withApiCache(`gp-research:sitemap:${semDomain}`, cacheTtlHours, () =>
                  fetchSitemapUrls(semDomain),
                ),
              )
            : Promise.resolve(null),
        ]);
        void ga4Geo; // reserved for future use

        // Per-competitor enrichment (top organic keywords + backlinks). Limited
        // to the top 4 competitors to stay inside SEMrush quota and the lambda
        // budget. Each is independently cached for 7 days.
        //
        // SEMrush returns competitors sorted purely by keyword overlap, which
        // often pulls in directories, news sites, or tangentially related
        // domains (e.g. for a football academy, generic football news sites).
        // We run a Haiku relevance pass first to keep only competitors that
        // actually compete with the client's offering, then enrich the top 4.
        const rawCompetitors = (semCompetitors ?? []) as {
          domain: string;
          commonKeywords?: number;
          organicKeywords?: number;
          organicTraffic?: number;
        }[];
        let relevantCompetitors = rawCompetitors;
        if (rawCompetitors.length > 0 && (brief || config.sector || plan.client?.name)) {
          const filtered = await safe("competitorRelevanceFilter", async () => {
            const anthropic = await getAnthropicClient();
            const candidateBlock = rawCompetitors
              .map(
                (c, i) =>
                  `${i + 1}. ${c.domain} (${(c.commonKeywords ?? 0).toLocaleString()} shared keywords, ${(c.organicTraffic ?? 0).toLocaleString()} organic visits/mo)`,
              )
              .join("\n");
            const res = await anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 600,
              messages: [
                {
                  role: "user",
                  content: `You are filtering a list of SEMrush-detected competitors for a UK marketing strategy. Keep only competitors whose core offering directly competes with the client. Drop news sites, directories, generic media, or tangentially related domains that just happen to share keywords.

Return a JSON object: { "keep": ["domain1.com", "domain2.com", ...] } — list of domains to keep, in priority order (most directly competitive first). Aim for 4-6 entries if possible; return fewer rather than padding with weak matches.

Client: ${plan.client?.name ?? ""}
Website: ${semDomain ?? ""}
Sector: ${config.sector ?? "(not specified)"}
Brief / offering: ${(brief || "").slice(0, 800)}

Candidates:
${candidateBlock}

Return ONLY valid JSON, no markdown fences.`,
                },
              ],
            });
            const text = res.content
              .filter((b) => b.type === "text")
              .map((b) => (b as { type: "text"; text: string }).text)
              .join("")
              .trim()
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```$/i, "");
            const parsed = JSON.parse(text) as { keep?: string[] };
            const norm = (d: string) =>
              d
                .toLowerCase()
                .replace(/^www\./, "")
                .replace(/\/$/, "");
            const keepSet = new Set((parsed.keep ?? []).map(norm));
            const ordered: typeof rawCompetitors = [];
            for (const d of parsed.keep ?? []) {
              const match = rawCompetitors.find((c) => norm(c.domain) === norm(d));
              if (match) ordered.push(match);
            }
            // Append any kept entries we couldn't reorder (defensive)
            for (const c of rawCompetitors) {
              if (keepSet.has(norm(c.domain)) && !ordered.includes(c)) ordered.push(c);
            }
            return ordered;
          });
          if (filtered && filtered.length > 0) {
            relevantCompetitors = filtered;
            console.log(
              `[grand-plan:${id}] competitor relevance filter: ${rawCompetitors.length} → ${filtered.length} kept`,
            );
          }
        }
        const topCompetitors = relevantCompetitors.slice(0, 6);
        const competitorEnriched = await Promise.all(
          topCompetitors.map(async (c) => {
            const overview = await safe(`sem-comp-overview:${c.domain}`, () =>
              withApiCache(`gp-research:sem-comp-overview:${c.domain}:uk`, cacheTtlHours, () =>
                getDomainOverview(c.domain, "uk"),
              ),
            );
            const kws = await safe(`sem-comp-kws:${c.domain}`, () =>
              withApiCache(`gp-research:sem-comp-kws:${c.domain}:uk`, cacheTtlHours, () =>
                getTopOrganicKeywords(c.domain, "uk", 10),
              ),
            );
            const links = await safe(`sem-comp-links:${c.domain}`, () =>
              withApiCache(`gp-research:sem-comp-links:${c.domain}`, cacheTtlHours, () =>
                getBacklinks(c.domain, 1),
              ),
            );
            return {
              domain: c.domain,
              organicTraffic: overview?.organicTraffic ?? c.organicTraffic ?? 0,
              organicKeywords: overview?.organicKeywords ?? c.organicKeywords ?? 0,
              paidKeywords: overview?.paidKeywords ?? 0,
              backlinks: Array.isArray(links) ? links.length : 0,
              topKeywords: Array.isArray(kws)
                ? kws
                    .map((k) => k.keyword)
                    .filter(Boolean)
                    .slice(0, 10)
                : [],
            };
          }),
        );

        // Also fetch SEMrush domain overviews for any competitors the user
        // manually added on the form that are NOT already in the auto-detected
        // list. Without this, manual competitors land with no traffic / keyword
        // metrics and the generator falls back to AI estimates for them.
        const normDomain = (d: string) =>
          d
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/$/, "");
        const autoEnrichedDomains = new Set(competitorEnriched.map((c) => normDomain(c.domain)));
        const formCompsRaw = safeJsonParse<{ domain: string }[]>(plan.competitorsJson ?? null, []);
        const formOnlyCompetitors = formCompsRaw
          .filter((fc) => fc.domain && !autoEnrichedDomains.has(normDomain(fc.domain)))
          .slice(0, 4); // cap to keep within SEMrush quota

        const formCompetitorEnriched = await Promise.all(
          formOnlyCompetitors.map(async (fc) => {
            const d = normDomain(fc.domain);
            const overview = await safe(`sem-form-comp-overview:${d}`, () =>
              withApiCache(`gp-research:sem-comp-overview:${d}:uk`, cacheTtlHours, () =>
                getDomainOverview(d, "uk"),
              ),
            );
            const kws = await safe(`sem-form-comp-kws:${d}`, () =>
              withApiCache(`gp-research:sem-comp-kws:${d}:uk`, cacheTtlHours, () =>
                getTopOrganicKeywords(d, "uk", 10),
              ),
            );
            const links = await safe(`sem-form-comp-links:${d}`, () =>
              withApiCache(`gp-research:sem-comp-links:${d}`, cacheTtlHours, () =>
                getBacklinks(d, 1),
              ),
            );
            return {
              domain: fc.domain,
              organicTraffic: overview?.organicTraffic ?? 0,
              organicKeywords: overview?.organicKeywords ?? 0,
              paidKeywords: overview?.paidKeywords ?? 0,
              backlinks: Array.isArray(links) ? links.length : 0,
              topKeywords: Array.isArray(kws)
                ? kws
                    .map((k) => k.keyword)
                    .filter(Boolean)
                    .slice(0, 10)
                : [],
            };
          }),
        );

        // Form competitors go first (user's authoritative list), then
        // auto-detected ones. Merged pool is what generateCompetitorIntel
        // looks up enrichment from.
        const allCompetitorEnriched = [...formCompetitorEnriched, ...competitorEnriched];

        // Per-URL intel for the user-supplied "optimise these pages" list.
        // Each URL is scraped (title / H1 / meta / body snippet) and run
        // through SEMrush url_organic to pull the keywords that page already
        // ranks for. Both calls are cached for 7 days. We cap at 10 URLs
        // upstream on the form, so this is bounded work.
        const manualUrls = (config.manualPageUrls ?? [])
          .map((u) => (u || "").trim())
          .filter((u) => /^https?:\/\//i.test(u))
          .slice(0, 10);
        const semDb = config.semrushRegion ?? "uk";
        const manualPageIntel: ManualPageIntel[] = manualUrls.length
          ? await Promise.all(
              manualUrls.map(async (url) => {
                const [signals, kws] = await Promise.all([
                  safe(`scrape:${url}`, () =>
                    withApiCache(`gp-research:scrape:${url}`, cacheTtlHours, () =>
                      fetchPageSignals(url),
                    ),
                  ),
                  safe(`url-kws:${url}:${semDb}`, () =>
                    withApiCache(`gp-research:url-kws:${url}:${semDb}`, cacheTtlHours, () =>
                      getUrlOrganicKeywords(url, semDb, 25),
                    ),
                  ),
                ]);
                const intel: ManualPageIntel = { url };
                if (signals) {
                  intel.title = signals.title;
                  intel.metaDescription = signals.metaDescription;
                  intel.h1 = (signals.h1Tags ?? [])[0];
                  intel.bodySnippet = (signals.bodySnippets ?? []).join(" ").slice(0, 320);
                  if (signals.fetchError) intel.fetchError = signals.fetchError;
                } else {
                  intel.fetchError = "scrape failed";
                }
                if (Array.isArray(kws) && kws.length) {
                  intel.organicKeywords = kws.slice(0, 25).map((k) => ({
                    keyword: k.keyword,
                    position: k.position,
                    volume: k.searchVolume,
                    cpc: k.cpc,
                  }));
                }
                return intel;
              }),
            )
          : [];

        const research: AccountResearchData = {
          ga4: propertyId
            ? {
                propertyId,
                overview: ga4Overview
                  ? {
                      sessions: ga4Overview.sessions,
                      users: ga4Overview.users,
                      bounceRate: ga4Overview.bounceRate,
                      conversionRate: ga4Overview.conversionRate,
                      avgSessionDuration: ga4Overview.avgSessionDuration,
                    }
                  : undefined,
                topPages: Array.isArray(ga4TopPages)
                  ? ga4TopPages
                      .slice(0, 15)
                      .map((p) => ({
                        path: p.pagePath,
                        sessions: p.sessions,
                        bounceRate: p.bounceRate,
                      }))
                  : undefined,
                trafficSources: Array.isArray(ga4Traffic)
                  ? ga4Traffic
                      .slice(0, 12)
                      .map((t) => ({
                        source: t.source,
                        medium: t.medium,
                        sessions: t.sessions,
                        conversions: t.conversions,
                      }))
                  : undefined,
                devices: Array.isArray(ga4Devices)
                  ? ga4Devices.map((d) => ({
                      device: d.device,
                      sessions: d.sessions,
                      bounceRate: 0,
                    }))
                  : undefined,
                // Flatten age + gender into a single demographic-like list (country
                // shape is not what we have here, so we re-purpose `country` field as
                // the demographic label — older callers ignored this, new generators
                // read the labels directly).
                demographics: ga4Demo
                  ? [
                      ...(ga4Demo.ageGroups ?? []).map((a) => ({
                        country: `Age ${a.range}`,
                        sessions: a.users,
                      })),
                      ...(ga4Demo.genderSplit ?? []).map((g) => ({
                        country: `Gender ${g.gender}`,
                        sessions: g.users,
                      })),
                    ].slice(0, 15)
                  : undefined,
                conversionsByChannel: Array.isArray(ga4Convs)
                  ? ga4Convs
                      .slice(0, 12)
                      .map((c) => ({
                        channel: c.channel,
                        conversions: c.conversions,
                        conversionRate: c.sessions > 0 ? (c.conversions / c.sessions) * 100 : 0,
                      }))
                  : undefined,
                weakPages: Array.isArray(ga4TopPages)
                  ? ga4TopPages
                      .filter((p) => (p.bounceRate ?? 0) > 70 && (p.sessions ?? 0) >= 50)
                      .slice(0, 8)
                      .map((p) => ({
                        path: p.pagePath,
                        bounceRate: p.bounceRate,
                        sessions: p.sessions,
                      }))
                  : undefined,
              }
            : undefined,
          searchConsole: gscSite
            ? {
                siteUrl: gscSite,
                topQueries: Array.isArray(gscQueries) ? gscQueries.slice(0, 20) : undefined,
                topPages: Array.isArray(gscPages) ? gscPages.slice(0, 20) : undefined,
              }
            : undefined,
          competitorData: allCompetitorEnriched.length ? allCompetitorEnriched : undefined,
          sitemapPages: Array.isArray(sitemapPagesRaw) ? sitemapPagesRaw.slice(0, 200) : undefined,
          manualPageIntel: manualPageIntel.length ? manualPageIntel : undefined,
        };

        const researchSignals = {
          ga4: !!research.ga4,
          gsc: !!research.searchConsole,
          competitors: research.competitorData?.length ?? 0,
          formCompetitorsEnriched: formCompetitorEnriched.length,
          manualPages: research.manualPageIntel?.length ?? 0,
        };
        const noGroundedResearch =
          !researchSignals.ga4 &&
          !researchSignals.gsc &&
          researchSignals.competitors === 0 &&
          researchSignals.manualPages === 0;

        // Stash on planDataJson under a transient key. Stripped at assemble time.
        const fresh = await prisma.grandPlan.findUnique({
          where: { id },
          select: { planDataJson: true },
        });
        const data = safeJsonParse<PlanDataWithQuality | null>(fresh?.planDataJson ?? null, null);
        if (data) {
          data._researchData = research;
          // If this plan continues from a previous sprint, harvest the prior
          // plan's outputs so the generator can avoid duplicating quick wins,
          // pillars, page optimisations, landing pages and blog topics.
          if (plan.previousPlanId) {
            const prior = await prisma.grandPlan.findUnique({
              where: { id: plan.previousPlanId },
              select: { title: true, planDataJson: true },
            });
            if (prior) {
              const priorData = safeJsonParse<GrandPlanData | null>(prior.planDataJson, null);
              const priorSections = priorData?.sections;
              const cs = (
                priorSections as unknown as
                  | {
                      contentStrategy?: {
                        pillars?: Array<{ pillar?: { title?: string } }>;
                        landingPages?: Array<{ title?: string }>;
                        blogPosts?: Array<{ title?: string }>;
                        pageOptimisations?: Array<{ url?: string }>;
                      };
                    }
                  | undefined
              )?.contentStrategy;
              const seo = priorSections?.seoFoundations as
                | { quickWins?: Array<{ url?: string }> }
                | undefined;
              const summaryOutcome = (() => {
                const html = priorSections?.executiveSummary ?? "";
                const m = html.match(/<strong>Outcome:<\/strong>\s*([^<]+)/i);
                return m ? m[1].trim() : undefined;
              })();
              data._priorSprint = {
                title: prior.title ?? undefined,
                headlineOutcome: summaryOutcome,
                quickWinTitles: (priorSections?.quickWins ?? [])
                  .map((q) => q.title)
                  .filter(Boolean),
                seoQuickWinUrls: (seo?.quickWins ?? [])
                  .map((q) => q.url)
                  .filter((u): u is string => !!u),
                pageOptimisationUrls: (cs?.pageOptimisations ?? [])
                  .map((p) => p.url)
                  .filter((u): u is string => !!u),
                pillarTitles: (cs?.pillars ?? [])
                  .map((p) => p.pillar?.title)
                  .filter((t): t is string => !!t),
                landingPageTitles: (cs?.landingPages ?? [])
                  .map((p) => p.title)
                  .filter((t): t is string => !!t),
                blogPostTitles: (cs?.blogPosts ?? [])
                  .map((p) => p.title)
                  .filter((t): t is string => !!t),
              };
            }
          }
          applyStepQuality(data, step, {
            status: noGroundedResearch ? "degraded" : "ok",
            critical: false,
            signals: researchSignals,
            warnings: noGroundedResearch
              ? [
                  "Research completed but no grounded GA4, GSC, competitor, or manual-page signals were captured.",
                ]
              : undefined,
          });

          await prisma.grandPlan.update({
            where: { id },
            data: { planDataJson: JSON.stringify(data) },
          });
        } else {
          await updateStepQuality(id, step, {
            status: noGroundedResearch ? "degraded" : "ok",
            critical: false,
            signals: researchSignals,
            warnings: noGroundedResearch
              ? [
                  "Research completed but no grounded GA4, GSC, competitor, or manual-page signals were captured.",
                ]
              : undefined,
          });
        }

        return NextResponse.json({
          ok: true,
          step,
          signals: researchSignals,
          degraded: noGroundedResearch,
        });
      }

      // ─── STEP: prepare-customer-voice ────────────────────────────────────────
      // Uses Anthropic's built-in web_search tool to harvest real customer pain
      // points, competitor complaints and verbatim quotes from forums and review
      // sites. Stashed on planDataJson._customerVoice for downstream generators.
      if (step === "prepare-customer-voice") {
        // Skip if we have neither a sector nor a brief to ground the search.
        if (!config.sector && !brief && !plan.client?.name) {
          await updateStepQuality(id, step, {
            status: "skipped",
            critical: false,
            reason: "No sector, brief, or client context available",
            warnings: ["Customer voice step skipped due to missing context."],
          });
          return NextResponse.json({ ok: true, step, skipped: true });
        }

        await setStatus(id, "Researching real customer voice (forums, reviews)...");

        // Pull cached competitor list off the research stash if available.
        const fresh = await prisma.grandPlan.findUnique({
          where: { id },
          select: { planDataJson: true },
        });
        const planData = safeJsonParse<
          | (GrandPlanData & {
              _researchData?: AccountResearchData;
              _customerVoice?: CustomerVoiceData;
            })
          | null
        >(fresh?.planDataJson ?? null, null);
        const competitors = (planData?._researchData?.competitorData ?? [])
          .map((c) => c.domain)
          .slice(0, 4);

        // Derive likely services from proposal / keyword research.
        const services: string[] = [];
        if (plan.proposal?.servicesJson) {
          try {
            const parsed = JSON.parse(plan.proposal.servicesJson) as Array<{
              name?: string;
              title?: string;
            }>;
            if (Array.isArray(parsed))
              services.push(
                ...parsed
                  .map((s) => s.name ?? s.title ?? "")
                  .filter(Boolean)
                  .slice(0, 4),
              );
          } catch {
            /* ignore */
          }
        }

        const cacheKey = `gp-customer-voice:${plan.clientId ?? id}:${config.sector ?? "unknown"}:${services.slice(0, 3).join(",")}`;
        let voice: CustomerVoiceData;
        let voiceError: string | null = null;
        try {
          voice = await withApiCache(cacheKey, 24 * 7, async () => {
            const anthropic = await getAnthropicClient();
            return runWebSearchResearch(anthropic, {
              clientName,
              sector: config.sector,
              services,
              competitors,
              brief,
            });
          });
        } catch (err) {
          console.error(`[grand-plan:${id}] customer voice failed:`, err);
          voiceError = err instanceof Error ? err.message : "Unknown customer voice error";
          voice = { painPoints: [], competitorComplaints: [], quotes: [], queriesFired: [] };
        }

        const voiceSignals = {
          painPoints: voice.painPoints.length,
          complaints: voice.competitorComplaints.length,
          quotes: voice.quotes.length,
          queries: voice.queriesFired.length,
        };
        const noVoiceEvidence =
          voiceSignals.painPoints === 0 &&
          voiceSignals.complaints === 0 &&
          voiceSignals.quotes === 0;
        const voiceWarnings: string[] = [];
        if (voiceError) {
          voiceWarnings.push(`Customer voice fallback triggered: ${voiceError}`);
        }
        if (noVoiceEvidence) {
          voiceWarnings.push("Customer voice produced no pain points, complaints, or quotes.");
        }
        const voiceStatus: QualityStepStatus = voiceError || noVoiceEvidence ? "degraded" : "ok";

        if (planData) {
          planData._customerVoice = voice;
          applyStepQuality(planData, step, {
            status: voiceStatus,
            critical: false,
            signals: voiceSignals,
            warnings: voiceWarnings.length ? voiceWarnings : undefined,
            error: voiceError ?? undefined,
          });
          await prisma.grandPlan.update({
            where: { id },
            data: { planDataJson: JSON.stringify(planData) },
          });
        } else {
          await updateStepQuality(id, step, {
            status: voiceStatus,
            critical: false,
            signals: voiceSignals,
            warnings: voiceWarnings.length ? voiceWarnings : undefined,
            error: voiceError ?? undefined,
          });
        }

        return NextResponse.json({
          ok: true,
          step,
          signals: voiceSignals,
          degraded: voiceStatus === "degraded",
        });
      }

      // ─── STEP: prepare-strategy-brain ─────────────────────────────────────────
      // Single upstream reasoning step. Synthesises positioning, audience
      // definitions, message hierarchy, channel strategy and per-section
      // directives BEFORE any section copy is written. Every section step then
      // receives the brain via GrandPlanSources.strategyBrain so the plan reads
      // as one coherent strategy rather than 14 disconnected channel write-ups.
      if (step === "prepare-strategy-brain") {
        await setStatus(id, "Synthesising strategy brain...");

        // Reload to pick up any prepare-* stashes (research data, customer voice).
        const freshPlan = await prisma.grandPlan.findUnique({
          where: { id },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                slug: true,
                website: true,
                searchConsoleSiteUrl: true,
                ga4PropertyId: true,
                semrushDomain: true,
              },
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
          },
        });
        if (!freshPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const sources = buildSources(freshPlan, config, brief);

        let brain: StrategyBrain;
        try {
          brain = await synthesiseStrategyBrain(sources);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown strategy brain error";
          console.error(`[grand-plan:${id}] strategy brain synthesis failed:`, err);
          await updateStepQuality(id, step, {
            status: "failed",
            critical: true,
            error: message,
            blockers: [
              "Strategy brain synthesis failed, so section generation cannot proceed safely.",
            ],
          });
          throw new Error(`Strategy brain synthesis failed: ${message}`);
        }

        const brainSignals = getStrategyBrainSignals(brain);
        if (!isStrategyBrainUsable(brain)) {
          await updateStepQuality(id, step, {
            status: "failed",
            critical: true,
            error: "Strategy brain is missing required strategic fields",
            signals: brainSignals,
            blockers: [
              "Strategy brain did not include enough strategic structure (positioning, audiences, channels, directives).",
            ],
          });
          throw new Error("Strategy brain is missing required strategic fields");
        }

        // Stash the brain so subsequent section steps can pick it up via buildSources.
        const planData = safeJsonParse<PlanDataWithQuality | null>(freshPlan.planDataJson, null);
        if (planData) {
          planData._strategyBrain = brain;
          applyStepQuality(planData, step, {
            status: "ok",
            critical: true,
            signals: brainSignals,
          });
          await prisma.grandPlan.update({
            where: { id },
            data: { planDataJson: JSON.stringify(planData) },
          });
        } else {
          await updateStepQuality(id, step, {
            status: "ok",
            critical: true,
            signals: brainSignals,
          });
        }

        return NextResponse.json({
          ok: true,
          step,
          signals: {
            audiences: brainSignals.audiences,
            channels: brainSignals.channels,
            directives: brainSignals.directives,
          },
        });
      }

      // ─── STEP: section generation ────────────────────────────────────────────
      if (SECTION_KEYS.includes(step)) {
        await setStatus(id, `Generating ${step}...`);

        // Reload plan to pick up any linked records from prepare steps
        const freshPlan = await prisma.grandPlan.findUnique({
          where: { id },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                slug: true,
                website: true,
                searchConsoleSiteUrl: true,
                ga4PropertyId: true,
                semrushDomain: true,
              },
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
          },
        });

        if (!freshPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const sources = buildSources(freshPlan, config, brief);

        // Generate just this one section
        const partial = await generateGrandPlan(sources, undefined, [step]);

        // Merge into existing planDataJson
        const existingData = safeJsonParse<PlanDataWithQuality>(freshPlan.planDataJson, {
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
        } else {
          applyStepQuality(existingData, step, {
            status: "failed",
            critical: true,
            error: `Section "${step}" returned no output`,
            blockers: [`Section "${step}" returned no output and cannot be assembled.`],
          });
          await prisma.grandPlan.update({
            where: { id },
            data: {
              status: "failed",
              statusMessage: null,
              generationError: `Section "${step}" returned no output`,
              planDataJson: JSON.stringify(existingData),
            },
          });
          return NextResponse.json(
            { error: `Section "${step}" returned no output` },
            { status: 500 },
          );
        }
        // Merge grounding metadata for sections that surface it (audiences,
        // emailMarketing, linkedInAds, competitorIntel). Other sections leave
        // partial.grounding undefined and we leave existingData.grounding alone.
        const partialGrounding = partial.grounding?.[sectionKey];
        if (partialGrounding) {
          existingData.grounding = existingData.grounding ?? {};
          existingData.grounding[sectionKey] = partialGrounding;
        }
        // dataSources is recomputed each section pass — replace if present.
        if (partial.dataSources?.length) {
          existingData.dataSources = partial.dataSources;
        }

        applyStepQuality(existingData, step, {
          status: "ok",
          critical: true,
          signals: {
            hasGrounding: !!partialGrounding,
            outputType: Array.isArray(newValue) ? "array" : typeof newValue,
          },
        });

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

        const planData = safeJsonParse<PlanDataWithQuality | null>(freshPlan.planDataJson, null);
        if (!planData) {
          await prisma.grandPlan
            .update({
              where: { id },
              data: {
                status: "failed",
                generationError: "No plan data found at assemble step. Please regenerate.",
              },
            })
            .catch(() => {});
          return NextResponse.json({ error: "No plan data to assemble" }, { status: 400 });
        }

        const qualityManifest = ensureQualityManifest(planData);
        const expectedSections = getExpectedGeneratedSections(config.sections);
        const missingSections = expectedSections.filter(
          (key) => !hasSectionOutput(planData.sections[key as keyof GrandPlanData["sections"]]),
        );
        const unresolvedCritical = Object.entries(qualityManifest.steps)
          .filter(([, record]) => record.critical && record.status !== "ok")
          .map(
            ([key, record]) =>
              `${key} (${record.status})${record.error ? `: ${record.error}` : ""}`,
          );

        const brainCandidate = planData._strategyBrain ?? planData.strategyBrain;
        const brainSignals = getStrategyBrainSignals(brainCandidate);
        const blockers: string[] = [];

        if (!isStrategyBrainUsable(brainCandidate)) {
          blockers.push(
            "Strategy brain is missing required fields (positioning, audiences, channels, or directives).",
          );
        }
        if (missingSections.length > 0) {
          blockers.push(`Missing generated section output: ${missingSections.join(", ")}`);
        }
        if (unresolvedCritical.length > 0) {
          blockers.push(`Critical pipeline steps unresolved: ${unresolvedCritical.join("; ")}`);
        }

        const assembleSignals: Record<string, unknown> = {
          expectedSections: expectedSections.length,
          missingSections: missingSections.length,
          unresolvedCritical: unresolvedCritical.length,
          ...brainSignals,
        };

        if (blockers.length > 0) {
          applyStepQuality(planData, step, {
            status: "failed",
            critical: true,
            error: "Assemble quality gate failed",
            blockers,
            signals: assembleSignals,
          });
          await prisma.grandPlan.update({
            where: { id },
            data: {
              status: "failed",
              statusMessage: null,
              generationError: blockers[0],
              planDataJson: JSON.stringify(planData),
            },
          });
          return NextResponse.json(
            { error: "Assemble quality gate failed", blockers },
            { status: 400 },
          );
        }

        // ── Polish: hero tagline + section intros + audience rationales ─────
        // These read the assembled plan and produce the most-read body copy.
        // All optional: failures fall back to existing renderer defaults.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stash = (planData as any)._customerVoice as CustomerVoiceData | undefined;
          const audienceNames = (planData.sections.audiences ?? [])
            .map((a) => a.name)
            .filter((n): n is string => typeof n === "string" && n.length > 0);
          const rationales = buildAudienceRationales(audienceNames, stash);
          if (Object.keys(rationales).length > 0) {
            planData.audienceRationales = rationales;
          }
        } catch (polishErr) {
          console.warn("audienceRationales polish skipped:", polishErr);
        }

        try {
          const anthropic = await getAnthropicClient();
          const [tagline, intros] = await Promise.all([
            generateHeroTagline(anthropic, planData).catch((e) => {
              console.warn("heroTagline failed:", e);
              return "";
            }),
            generateSectionIntros(anthropic, planData).catch((e) => {
              console.warn("sectionIntros failed:", e);
              return {};
            }),
          ]);
          if (tagline) planData.heroTagline = tagline;
          if (Object.keys(intros).length > 0) planData.sectionIntros = intros;
        } catch (polishErr) {
          console.warn("hero/intros polish skipped:", polishErr);
        }

        // Promote the strategy brain stash to the top-level field so the
        // renderer can show the read-only "Strategy Brain" panel above the plan.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const brainStash = (planData as any)._strategyBrain as StrategyBrain | undefined;
        if (brainStash) planData.strategyBrain = brainStash;

        // ── Coherence validation + auto-fix ─────────────────────────────────
        // Cross-check the assembled plan against the strategy brain and
        // silently correct the offending fields (audience name mismatches,
        // negative-keyword vs focus-period overlaps). Deterministic — no LLM
        // call. Anything that can't be auto-fixed is dropped silently rather
        // than surfaced to the strategist.
        try {
          const fullPlan = await prisma.grandPlan.findUnique({
            where: { id },
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  website: true,
                  searchConsoleSiteUrl: true,
                  ga4PropertyId: true,
                  semrushDomain: true,
                },
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
            },
          });
          if (fullPlan) {
            const sources = buildSources(fullPlan, config, brief);
            const before = validateCoherence(planData, brainStash, sources);
            if (before.length) {
              const fixes = autoFixCoherence(planData, brainStash, sources);
              const after = validateCoherence(planData, brainStash, sources);
              console.log(
                `[grand-plan:${id}] coherence auto-fix: flagged=${before.length}, fixed=${fixes}, remaining=${after.length}`,
              );
            }
            // Never surface coherenceIssues to the renderer — the panel is gone.
            planData.coherenceIssues = undefined;
          }
        } catch (err) {
          console.warn(`[grand-plan:${id}] coherence auto-fix skipped:`, err);
        }

        // Strip transient working state before final render/persistence.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (planData as any)._lpInProgress;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (planData as any)._researchData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (planData as any)._customerVoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (planData as any)._strategyBrain;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (planData as any)._priorSprint;

        applyStepQuality(planData, step, {
          status: "ok",
          critical: true,
          signals: assembleSignals,
        });

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

      // Unknown step — mark plan as failed so polling stops
      await updateStepQuality(id, step, {
        status: "failed",
        critical: true,
        error: `Unknown step: ${step}`,
        blockers: [`Unknown pipeline step requested: ${step}`],
      });
      await prisma.grandPlan
        .update({
          where: { id },
          data: { status: "failed", statusMessage: null, generationError: `Unknown step: ${step}` },
        })
        .catch(() => {});
      return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Grand plan step "${step}" error:`, error);

      await updateStepQuality(id, step, {
        status: "failed",
        critical:
          step === "prepare-strategy-brain" || step === "assemble" || SECTION_KEYS.includes(step),
        error: message,
        blockers:
          step === "prepare-strategy-brain" || step === "assemble" || SECTION_KEYS.includes(step)
            ? [`Critical step "${step}" failed: ${message}`]
            : undefined,
      });

      // Mark plan as failed so UI can show retry
      await prisma.grandPlan
        .update({
          where: { id },
          data: {
            status: "failed",
            statusMessage: null,
            generationError: `Step "${step}" failed: ${message}`,
          },
        })
        .catch(() => {}); // Don't throw if this update fails

      return NextResponse.json({ error: message, step }, { status: 500 });
    }
  }); // end runWithGrandPlanModelOverride
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setStatus(id: string, message: string) {
  await withDbRetry(() =>
    prisma.grandPlan.update({
      where: { id },
      data: { statusMessage: message },
    }),
  );
}

function dedupeStrings(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const unique = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  return unique.length ? unique : undefined;
}

function ensureQualityManifest(planData: PlanDataWithQuality): QualityManifest {
  if (planData.qualityManifest?.version === 1 && planData.qualityManifest.steps) {
    return planData.qualityManifest;
  }
  const manifest: QualityManifest = { version: 1, steps: {} };
  planData.qualityManifest = manifest;
  return manifest;
}

function applyStepQuality(
  planData: PlanDataWithQuality,
  stepKey: string,
  update: QualityStepUpdate,
): void {
  const manifest = ensureQualityManifest(planData);
  const previous = manifest.steps[stepKey];
  manifest.steps[stepKey] = {
    status: update.status,
    critical: update.critical ?? previous?.critical ?? false,
    reason: update.reason,
    error: update.error,
    warnings: dedupeStrings(update.warnings),
    blockers: dedupeStrings(update.blockers),
    signals: update.signals,
    updatedAt: new Date().toISOString(),
  };
}

async function updateStepQuality(
  id: string,
  stepKey: string,
  update: QualityStepUpdate,
): Promise<void> {
  const fresh = await prisma.grandPlan.findUnique({
    where: { id },
    select: { planDataJson: true },
  });
  const planData = safeJsonParse<PlanDataWithQuality | null>(fresh?.planDataJson ?? null, null);
  if (!planData) return;
  applyStepQuality(planData, stepKey, update);
  await prisma.grandPlan.update({
    where: { id },
    data: { planDataJson: JSON.stringify(planData) },
  });
}

function hasSectionOutput(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function getExpectedGeneratedSections(rawSections: unknown): string[] {
  const enabled = Array.isArray(rawSections)
    ? rawSections.filter((section): section is string => typeof section === "string")
    : SECTION_KEYS;
  const expected = enabled.filter((section) => SECTION_KEYS.includes(section));
  return expected.length > 0 ? expected : SECTION_KEYS;
}

function getStrategyBrainSignals(brain: StrategyBrain | undefined): {
  hasPositioning: boolean;
  audiences: number;
  channels: number;
  directives: number;
} {
  const hasPositioning = !!brain?.positioning?.statement?.trim();
  const audiences = Array.isArray(brain?.audiences) ? brain.audiences.length : 0;
  const channels = Array.isArray(brain?.channelStrategy) ? brain.channelStrategy.length : 0;
  const directives = brain?.directives
    ? Object.values(brain.directives).filter(
        (value) => typeof value === "string" && value.trim().length > 0,
      ).length
    : 0;
  return { hasPositioning, audiences, channels, directives };
}

function isStrategyBrainUsable(brain: StrategyBrain | undefined): boolean {
  const signals = getStrategyBrainSignals(brain);
  return (
    signals.hasPositioning &&
    signals.audiences > 0 &&
    signals.channels > 0 &&
    signals.directives > 0
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSources(plan: any, config: any, brief: string): GrandPlanSources {
  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";

  // Pull research / customer-voice stashes off planDataJson if the prepare-* steps
  // have run. These are stripped before the final assemble step renders the HTML.
  const stash = safeJsonParse<{
    _researchData?: AccountResearchData;
    _customerVoice?: CustomerVoiceData;
    _strategyBrain?: StrategyBrain;
    _priorSprint?: GrandPlanSources["priorSprint"];
  } | null>(plan.planDataJson, null);
  const accountData = stash?._researchData;
  const customerVoice = stash?._customerVoice;
  const strategyBrain = stash?._strategyBrain;

  const dataAvailability: DataAvailability = {
    ga4: !!accountData?.ga4,
    searchConsole: !!accountData?.searchConsole,
    meta: !!plan.client?.metaAccountId,
    googleAds: !!plan.client?.googleAdsCustomerId,
    semrushCompetitors: !!accountData?.competitorData?.length,
    customerVoice: !!customerVoice?.painPoints?.length,
  };

  return {
    clientName,
    purpose: plan.purpose,
    clientBrief: brief || undefined,
    targetAudiences: plan.targetAudiences || undefined,
    sector: config.sector || undefined,
    enabledPlatforms: config.sections,
    campaignFocusPeriods: safeJsonParse(plan.campaignFocusPeriodsJson, []),
    competitors:
      safeJsonParse<GrandPlanSources["competitors"]>(plan.competitorsJson, []) ?? undefined,
    accountData,
    customerVoice,
    strategyBrain,
    dataAvailability,
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
    channelBudgets: config.channelBudgets ?? undefined,
    contentLimits: (() => {
      const clientLimits =
        safeJsonParse<GrandPlanSources["contentLimits"]>(
          plan.client?.contentStrategyLimits ?? null,
          undefined,
        ) ?? undefined;
      const overrides = config.contentLimits as GrandPlanSources["contentLimits"] | undefined;
      if (!clientLimits && !overrides) return undefined;
      return { ...(clientLimits ?? {}), ...(overrides ?? {}) };
    })(),
    planMode: config.planMode === "sprint90" ? "sprint90" : "annual",
    previousPlanId: plan.previousPlanId ?? undefined,
    priorSprint: stash?._priorSprint,
    period: plan.period || undefined,
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
  };
}

function safeJsonParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

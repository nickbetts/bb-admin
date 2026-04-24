import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import {
  generateGrandPlan,
  generateHeroTagline,
  generateSectionIntros,
  buildAudienceRationales,
  type GrandPlanSources,
  type GrandPlanData,
  type CampaignFocusPeriod,
  type AccountResearchData,
  type CustomerVoiceData,
  type DataAvailability,
  runWebSearchResearch,
} from "@/lib/grand-plan-generator";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import { suggestAdGroups, researchKeywords } from "@/lib/keyword-planner-pipeline";
import { generateContentStrategy, generateContentStrategySection, collectSemrushData, runOnPageAudit, type ContentStrategyData } from "@/lib/content-strategy-generator";
import { extractBrandContext, type BrandContext } from "@/lib/brand-extractor";
import {
  generateLandingPage,
  critiqueLandingPage,
  refineLandingPage,
  type LPCritiqueItem,
} from "@/lib/lp-generator";
import { withApiCache } from "@/lib/api-cache";
import { getAnthropicClient } from "@/lib/anthropic-client";
import {
  getGA4Overview,
  getGA4TrafficSources,
  getGA4Demographics,
  getGA4Devices,
  getGA4ConversionsByChannel,
  getGA4TopPages,
} from "@/lib/ga4";
import { getGSCTopQueries, getGSCTopPages } from "@/lib/search-console";
import { getDomainOverview, getCompetitors, getTopOrganicKeywords, getBacklinks } from "@/lib/semrush";

// 800s = Vercel Pro maximum. The heaviest steps (prepare-content with Claude
// Opus 32k tokens, prepare-lp-refine with multi-pass critique) can exceed
// 300s on large sites; bumping this to the max ensures we don't 504 on those
// steps. Lighter steps return well within the budget.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

// Valid AI/computed section keys that can be generated individually
const SECTION_KEYS = [
  "executiveSummary", "strategyPlan", "audiences", "googleAdsCampaigns", "metaCampaigns",
  "keywordResearch", "contentStrategy", "contentCalendar", "organicSocial",
  "exampleArticles", "servicesInvestment", "mediaPlan", "emailMarketing",
  "linkedInAds", "competitorIntel", "googleAdsForecast", "quickWins", "kpis",
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
      client: { select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true, ga4PropertyId: true, semrushDomain: true } },
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
  // LP generation is wanted when either the plan was created with lpBrief, OR
  // the landingPage section was enabled (covers plans where the client had no
  // website at creation time but now has one).
  const wantsLp = !!config.lpBrief || !!(config.sections?.includes("landingPage") && website);

  try {
    // ─── STEP: start ─────────────────────────────────────────────────────────
    if (step === "start") {
      const focusPeriods = body.overrides?.campaignFocusPeriods
        ?? safeJsonParse(plan.campaignFocusPeriodsJson, []);

      // Initialise empty plan data
      const initialData: GrandPlanData = {
        title: `${clientName} — Go-To-Market Plan`,
        clientName,
        clientWebsite: plan.client?.website ?? website ?? undefined,
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

    // ─── STEP: prepare-content-data ──────────────────────────────────────────
    // Warms all SEMrush / GSC caches via withApiCache before the heavy Claude
    // Opus generation step. Because every sub-call in collectSemrushData uses
    // withApiCache, this step stores the results in the DB so prepare-content
    // gets instant cache hits and its full 300 s budget goes to the AI call.
    if (step === "prepare-content-data") {
      const freshPlan = await prisma.grandPlan.findUnique({
        where: { id },
        include: { contentStrategy: { select: { id: true } } },
      });

      // Skip if content strategy is already linked or no website to query
      if (freshPlan?.contentStrategy || !website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const csDomain = config.contentBrief?.domain ?? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      const csDatabase = config.contentBrief?.database ?? "uk";
      const csBrief = config.contentBrief?.brief || brief || `Full digital marketing strategy for ${clientName}`;
      const csCompetitors = config.contentBrief?.competitors
        ? config.contentBrief.competitors.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const searchConsoleSiteUrl = plan.client?.searchConsoleSiteUrl ?? undefined;

      await setStatus(id, "Collecting SEMrush & Search Console data...");
      await collectSemrushData(csDomain, csCompetitors, csDatabase, searchConsoleSiteUrl, csBrief);

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
    if (step === "prepare-content-1" || step === "prepare-content-2" || step === "prepare-content-3" || step === "prepare-content") {
      const freshPlan = await prisma.grandPlan.findUnique({
        where: { id },
        include: { contentStrategy: { select: { id: true } } },
      });

      // If it's the legacy single-shot step and a strategy already exists, skip.
      if (step === "prepare-content" && freshPlan?.contentStrategy) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }
      // If step 1 and strategy already exists, all three are already done — skip.
      if (step === "prepare-content-1" && freshPlan?.contentStrategy) {
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

      // ── Legacy single-shot step (kept for backwards compatibility) ──────────
      if (step === "prepare-content") {
        await setStatus(id, "Generating content strategy with Claude Opus...");
        const strategyResult = await generateContentStrategy(
          csDomain, clientName, csBrief, csCompetitors, csDatabase,
          searchConsoleSiteUrl ?? null, "claude-opus-4-6", undefined, undefined, true,
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
          })
        );
        await withDbRetry(() => prisma.grandPlan.update({ where: { id }, data: { contentStrategyId: savedStrategy.id } }));
        return NextResponse.json({ ok: true, step });
      }

      // ── Step 1: generate pageOptimisations, create the ContentStrategy row ──
      if (step === "prepare-content-1") {
        const t1 = Date.now();
        console.log(`[grand-plan:${id}] prepare-content-1 start — domain=${csDomain} db=${csDatabase}`);
        await setStatus(id, "Generating page optimisations (1/3)...");
        const partial = await generateContentStrategySection(
          "pageOptimisations", csDomain, clientName, csBrief, csCompetitors, csDatabase, searchConsoleSiteUrl ?? null, undefined, undefined, audienceNames,
        );
        console.log(`[grand-plan:${id}] prepare-content-1 AI done in ${Date.now() - t1}ms — pageOpts=${partial.pageOptimisations?.length ?? 0}`);
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
          })
        );
        await withDbRetry(() => prisma.grandPlan.update({ where: { id }, data: { contentStrategyId: savedStrategy.id } }));
        console.log(`[grand-plan:${id}] prepare-content-1 complete in ${Date.now() - t1}ms — strategyId=${savedStrategy.id}`);
        return NextResponse.json({ ok: true, step });
      }

      // ── Steps 2 & 3: merge sections into the existing ContentStrategy row ──
      const reloadedPlan = await prisma.grandPlan.findUnique({
        where: { id },
        include: { contentStrategy: { select: { id: true, spreadsheetData: true } } },
      });
      if (!reloadedPlan?.contentStrategy) {
        // Step 1 hasn't run yet — abort gracefully
        return NextResponse.json({ error: "prepare-content-1 must run before this step" }, { status: 400 });
      }

      type SafeStrategyData = Omit<ContentStrategyData, "stats"> & { stats?: ContentStrategyData["stats"] };
      const existing = JSON.parse(reloadedPlan.contentStrategy.spreadsheetData || "{}") as SafeStrategyData;

      if (step === "prepare-content-2") {
        const t2 = Date.now();
        console.log(`[grand-plan:${id}] prepare-content-2 start — domain=${csDomain}`);
        await setStatus(id, "Generating landing pages (2/3)...");
        const partial = await generateContentStrategySection(
          "landingPages", csDomain, clientName, csBrief, csCompetitors, csDatabase, searchConsoleSiteUrl ?? null, undefined, undefined, audienceNames,
        );
        console.log(`[grand-plan:${id}] prepare-content-2 AI done in ${Date.now() - t2}ms — landingPages=${partial.landingPages?.length ?? 0} linkTargets=${partial.linkTargets?.length ?? 0}`);
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
          })
        );
        console.log(`[grand-plan:${id}] prepare-content-2 complete in ${Date.now() - t2}ms`);
        return NextResponse.json({ ok: true, step });
      }

      if (step === "prepare-content-3") {
        const t3 = Date.now();
        console.log(`[grand-plan:${id}] prepare-content-3 start — domain=${csDomain}`);
        await setStatus(id, "Generating blog posts & roadmap (3/3)...");
        const partial = await generateContentStrategySection(
          "blogPosts", csDomain, clientName, csBrief, csCompetitors, csDatabase, searchConsoleSiteUrl ?? null, undefined, undefined, audienceNames,
        );
        console.log(`[grand-plan:${id}] prepare-content-3 AI done in ${Date.now() - t3}ms — blogPosts=${partial.blogPosts?.length ?? 0}`);
        const merged: ContentStrategyData = {
          ...existing,
          blogPosts: partial.blogPosts ?? [],
          roadmap: partial.roadmap ?? existing.roadmap ?? { month1: [], months2to3: [], months4plus: [] },
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
          })
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

      const csDomain = config.contentBrief?.domain ?? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
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

      // Persist the audit results back onto the saved strategy
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
      // Nothing to ground against — skip silently.
      if (!cli || (!cli.ga4PropertyId && !cli.searchConsoleSiteUrl && !cli.semrushDomain && !website)) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      await setStatus(id, "Harvesting real account data (GA4, Search Console, SEMrush)...");

      const propertyId = cli.ga4PropertyId ?? null;
      const gscSite = cli.searchConsoleSiteUrl ?? null;
      const semDomain = cli.semrushDomain
        ?? (website ? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : null);

      // Default to the last 30 days for all data pulls.
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const cacheTtlHours = 24 * 7;

      const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
        try { return await fn(); } catch (err) {
          console.warn(`[grand-plan:${id}] research(${label}) failed:`, err instanceof Error ? err.message : err);
          return null;
        }
      };

      const [ga4Overview, ga4Traffic, ga4Demo, ga4Devices, ga4Convs, ga4TopPages, ga4Geo, gscQueries, gscPages, semCompetitors] = await Promise.all([
        propertyId ? safe("ga4Overview", () => withApiCache(`gp-research:ga4-overview:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4Overview(propertyId, startDate, endDate))) : Promise.resolve(null),
        propertyId ? safe("ga4Traffic", () => withApiCache(`gp-research:ga4-traffic:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4TrafficSources(propertyId, startDate, endDate))) : Promise.resolve(null),
        propertyId ? safe("ga4Demo", () => withApiCache(`gp-research:ga4-demo:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4Demographics(propertyId, startDate, endDate))) : Promise.resolve(null),
        propertyId ? safe("ga4Devices", () => withApiCache(`gp-research:ga4-devices:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4Devices(propertyId, startDate, endDate))) : Promise.resolve(null),
        propertyId ? safe("ga4Convs", () => withApiCache(`gp-research:ga4-convs:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4ConversionsByChannel(propertyId, startDate, endDate))) : Promise.resolve(null),
        propertyId ? safe("ga4TopPages", () => withApiCache(`gp-research:ga4-pages:${propertyId}:${startDate}:${endDate}`, cacheTtlHours, () => getGA4TopPages(propertyId, startDate, endDate))) : Promise.resolve(null),
        // ga4Geo is unused for now but kept as a placeholder slot in the parallel array.
        Promise.resolve(null),
        gscSite ? safe("gscQueries", () => withApiCache(`gp-research:gsc-queries:${gscSite}:${startDate}:${endDate}`, cacheTtlHours, () => getGSCTopQueries(gscSite, startDate, endDate, 25))) : Promise.resolve(null),
        gscSite ? safe("gscPages", () => withApiCache(`gp-research:gsc-pages:${gscSite}:${startDate}:${endDate}`, cacheTtlHours, () => getGSCTopPages(gscSite, startDate, endDate))) : Promise.resolve(null),
        semDomain ? safe("semCompetitors", () => withApiCache(`gp-research:sem-competitors:${semDomain}:uk`, cacheTtlHours, () => getCompetitors(semDomain, "uk", 6))) : Promise.resolve(null),
      ]);
      void ga4Geo; // reserved for future use

      // Per-competitor enrichment (top organic keywords + backlinks). Limited
      // to the top 4 competitors to stay inside SEMrush quota and the lambda
      // budget. Each is independently cached for 7 days.
      const topCompetitors = (semCompetitors ?? []).slice(0, 4);
      const competitorEnriched = await Promise.all(topCompetitors.map(async (c) => {
        const overview = await safe(`sem-comp-overview:${c.domain}`, () => withApiCache(`gp-research:sem-comp-overview:${c.domain}:uk`, cacheTtlHours, () => getDomainOverview(c.domain, "uk")));
        const kws = await safe(`sem-comp-kws:${c.domain}`, () => withApiCache(`gp-research:sem-comp-kws:${c.domain}:uk`, cacheTtlHours, () => getTopOrganicKeywords(c.domain, "uk", 10)));
        const links = await safe(`sem-comp-links:${c.domain}`, () => withApiCache(`gp-research:sem-comp-links:${c.domain}`, cacheTtlHours, () => getBacklinks(c.domain, 1)));
        return {
          domain: c.domain,
          organicTraffic: overview?.organicTraffic ?? c.organicTraffic ?? 0,
          organicKeywords: overview?.organicKeywords ?? c.organicKeywords ?? 0,
          paidKeywords: overview?.paidKeywords ?? 0,
          backlinks: Array.isArray(links) ? links.length : 0,
          topKeywords: Array.isArray(kws) ? kws.map((k) => k.keyword).filter(Boolean).slice(0, 10) : [],
        };
      }));

      const research: AccountResearchData = {
        ga4: propertyId ? {
          propertyId,
          overview: ga4Overview ? {
            sessions: ga4Overview.sessions,
            users: ga4Overview.users,
            bounceRate: ga4Overview.bounceRate,
            conversionRate: ga4Overview.conversionRate,
            avgSessionDuration: ga4Overview.avgSessionDuration,
          } : undefined,
          topPages: Array.isArray(ga4TopPages)
            ? ga4TopPages.slice(0, 15).map((p) => ({ path: p.pagePath, sessions: p.sessions, bounceRate: p.bounceRate }))
            : undefined,
          trafficSources: Array.isArray(ga4Traffic)
            ? ga4Traffic.slice(0, 12).map((t) => ({ source: t.source, medium: t.medium, sessions: t.sessions, conversions: t.conversions }))
            : undefined,
          devices: Array.isArray(ga4Devices)
            ? ga4Devices.map((d) => ({ device: d.device, sessions: d.sessions, bounceRate: 0 }))
            : undefined,
          // Flatten age + gender into a single demographic-like list (country
          // shape is not what we have here, so we re-purpose `country` field as
          // the demographic label — older callers ignored this, new generators
          // read the labels directly).
          demographics: ga4Demo
            ? [
                ...(ga4Demo.ageGroups ?? []).map((a) => ({ country: `Age ${a.range}`, sessions: a.users })),
                ...(ga4Demo.genderSplit ?? []).map((g) => ({ country: `Gender ${g.gender}`, sessions: g.users })),
              ].slice(0, 15)
            : undefined,
          conversionsByChannel: Array.isArray(ga4Convs)
            ? ga4Convs.slice(0, 12).map((c) => ({ channel: c.channel, conversions: c.conversions, conversionRate: c.sessions > 0 ? (c.conversions / c.sessions) * 100 : 0 }))
            : undefined,
          weakPages: Array.isArray(ga4TopPages)
            ? ga4TopPages
                .filter((p) => (p.bounceRate ?? 0) > 70 && (p.sessions ?? 0) >= 50)
                .slice(0, 8)
                .map((p) => ({ path: p.pagePath, bounceRate: p.bounceRate, sessions: p.sessions }))
            : undefined,
        } : undefined,
        searchConsole: gscSite ? {
          siteUrl: gscSite,
          topQueries: Array.isArray(gscQueries) ? gscQueries.slice(0, 20) : undefined,
          topPages: Array.isArray(gscPages) ? gscPages.slice(0, 20) : undefined,
        } : undefined,
        competitorData: competitorEnriched.length ? competitorEnriched : undefined,
      };

      // Stash on planDataJson under a transient key. Stripped at assemble time.
      const fresh = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
      const data = safeJsonParse<(GrandPlanData & { _researchData?: AccountResearchData }) | null>(fresh?.planDataJson ?? null, null);
      if (data) {
        data._researchData = research;
        await prisma.grandPlan.update({ where: { id }, data: { planDataJson: JSON.stringify(data) } });
      }

      return NextResponse.json({ ok: true, step, signals: {
        ga4: !!research.ga4,
        gsc: !!research.searchConsole,
        competitors: research.competitorData?.length ?? 0,
      } });
    }

    // ─── STEP: prepare-customer-voice ────────────────────────────────────────
    // Uses Anthropic's built-in web_search tool to harvest real customer pain
    // points, competitor complaints and verbatim quotes from forums and review
    // sites. Stashed on planDataJson._customerVoice for downstream generators.
    if (step === "prepare-customer-voice") {
      // Skip if we have neither a sector nor a brief to ground the search.
      if (!config.sector && !brief && !plan.client?.name) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      await setStatus(id, "Researching real customer voice (forums, reviews)...");

      // Pull cached competitor list off the research stash if available.
      const fresh = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
      const planData = safeJsonParse<(GrandPlanData & { _researchData?: AccountResearchData; _customerVoice?: CustomerVoiceData }) | null>(fresh?.planDataJson ?? null, null);
      const competitors = (planData?._researchData?.competitorData ?? []).map((c) => c.domain).slice(0, 4);

      // Derive likely services from proposal / keyword research.
      const services: string[] = [];
      if (plan.proposal?.servicesJson) {
        try {
          const parsed = JSON.parse(plan.proposal.servicesJson) as Array<{ name?: string; title?: string }>;
          if (Array.isArray(parsed)) services.push(...parsed.map((s) => s.name ?? s.title ?? "").filter(Boolean).slice(0, 4));
        } catch { /* ignore */ }
      }

      const cacheKey = `gp-customer-voice:${plan.clientId ?? id}:${config.sector ?? "unknown"}:${services.slice(0, 3).join(",")}`;
      let voice: CustomerVoiceData;
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
        voice = { painPoints: [], competitorComplaints: [], quotes: [], queriesFired: [] };
      }

      if (planData) {
        planData._customerVoice = voice;
        await prisma.grandPlan.update({ where: { id }, data: { planDataJson: JSON.stringify(planData) } });
      }

      return NextResponse.json({ ok: true, step, signals: {
        painPoints: voice.painPoints.length,
        complaints: voice.competitorComplaints.length,
        quotes: voice.quotes.length,
        queries: voice.queriesFired.length,
      } });
    }

    // ─── STEP: prepare-lp-brand ───────────────────────────────────────────────
    // Scrapes the website for brand colours, fonts, copy and stashes the
    // BrandContext in planDataJson. Isolated so the LP generation step has the
    // full 300 s budget for the 32K-token Opus call.
    if (step === "prepare-lp-brand") {
      // LP generation requires a website. lpBrief being absent is fine — we
      // default to "lead-gen" so plans created before the client had a website
      // can still get a landing page on regeneration.
      if (!website) {
        await recordLpReport(id, "skipped", "No website on the linked client — landing page generation needs a URL to scrape brand context from.");
        return NextResponse.json({ ok: true, step, skipped: true });
      }
      // If neither lpBrief nor the landingPage section key is present this plan
      // deliberately excluded the LP — skip silently.
      if (!wantsLp) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const lpCampaignType = config.lpBrief?.campaignType ?? "lead-gen";
      const lpBriefText = brief || `${clientName} landing page for ${lpCampaignType} campaign`;

      try {
        await setStatus(id, "Extracting brand context from website...");
        const brandContext = await extractBrandContext(website);

        // Stash brand context so subsequent LP steps don't need to re-scrape.
        const existing = safeJsonParse<GrandPlanData | null>(plan.planDataJson, null);
        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (existing as any)._lpInProgress = {
            html: "",
            critique: [],
            brandContext,
            campaignType: lpCampaignType,
            brief: lpBriefText,
            targetAudience: config.sector || undefined,
          } satisfies LpInProgress;
          await prisma.grandPlan.update({
            where: { id },
            data: { planDataJson: JSON.stringify(existing) },
          });
        }

        return NextResponse.json({ ok: true, step });
      } catch (lpError) {
        const message = lpError instanceof Error ? lpError.message : "Unknown error";
        console.error("[grand-plan] prepare-lp-brand failed:", lpError);
        await recordLpReport(id, "failed", `Brand context extraction failed: ${message}`);
        // Don't halt the pipeline — downstream LP steps will see no stash and skip.
        return NextResponse.json({ ok: true, step, skipped: true, reason: message });
      }
    }

    // ─── STEP: prepare-lp-draft ──────────────────────────────────────────────
    // 32K-token Claude Opus LP generation. Brand context comes from the stash
    // written by prepare-lp-brand so we don't re-scrape. Runs in its own 300 s
    // budget — the only "expensive" operation here is the single Opus stream.
    if (step === "prepare-lp-draft") {
      if (!wantsLp || !website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      try {
        const initialStash = readLpInProgress(plan.planDataJson);
        if (!initialStash?.brandContext) {
          // Brand step didn't run or failed — re-extract inline (adds ~15s but unblocks)
          const lpCampaignType = config.lpBrief?.campaignType ?? "lead-gen";
          const lpBriefText = brief || `${clientName} landing page for ${lpCampaignType} campaign`;
          await setStatus(id, "Extracting brand context from website...");
          const brandContext = await extractBrandContext(website);
          await stashLpInProgress(id, plan.planDataJson, {
            html: "", critique: [], brandContext,
            campaignType: lpCampaignType, brief: lpBriefText,
            targetAudience: config.sector || undefined,
          });
          // Re-read fresh plan to get updated stash
          const updated = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
          Object.assign(plan, { planDataJson: updated?.planDataJson });
        }

        const s = readLpInProgress(plan.planDataJson)!;
        await setStatus(id, "Generating landing page draft (Claude Opus)...");
        const draftHtml = await generateLandingPage({
          brief: s.brief,
          campaignType: s.campaignType,
          brandContext: s.brandContext,
          targetAudience: s.targetAudience,
        });

        // Reload plan before stashing to pick up any intervening writes
        const freshForStash = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
        await stashLpInProgress(id, freshForStash?.planDataJson ?? null, { ...s, html: draftHtml });

        // Promote draft immediately so the user has a page even if refinement fails
        await promoteLpDraftToSection(id, draftHtml, s.campaignType);
        await recordLpReport(id, "ok");

        return NextResponse.json({ ok: true, step });
      } catch (lpError) {
        const message = lpError instanceof Error ? lpError.message : "Unknown error";
        console.error("[grand-plan] prepare-lp-draft failed:", lpError);
        await recordLpReport(id, "failed", `Landing page draft generation failed: ${message}`);
        return NextResponse.json({ ok: true, step, skipped: true, reason: message });
      }
    }

    // ─── STEP: prepare-lp-critique ───────────────────────────────────────────
    // CRO critique of the draft. Isolated from the generation step so a slow
    // Opus stream on the draft doesn't eat into the critique budget.
    if (step === "prepare-lp-critique") {
      if (!wantsLp || !website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const stash = readLpInProgress(plan.planDataJson);
      if (!stash?.html) {
        return NextResponse.json({ ok: true, step, skipped: true, reason: "No draft to critique" });
      }

      try {
        await setStatus(id, "Critiquing landing page draft...");
        const critique = await critiqueLandingPage({
          html: stash.html,
          brief: stash.brief,
          campaignType: stash.campaignType,
          brandContext: stash.brandContext,
          targetAudience: stash.targetAudience,
        });

        const severityRank = { high: 0, medium: 1, low: 2 } as const;
        const sortedCritique = [...critique].sort(
          (a, b) => severityRank[a.severity] - severityRank[b.severity],
        );

        const freshForCritique = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
        await stashLpInProgress(id, freshForCritique?.planDataJson ?? null, { ...stash, critique: sortedCritique });

        return NextResponse.json({ ok: true, step, critiqueItems: sortedCritique.length });
      } catch (lpError) {
        // Critique is a nice-to-have — the draft is already promoted. Log and continue.
        const message = lpError instanceof Error ? lpError.message : "Unknown error";
        console.error("[grand-plan] prepare-lp-critique failed (non-fatal):", lpError);
        return NextResponse.json({ ok: true, step, skipped: true, reason: message });
      }
    }

    // ─── STEPS: prepare-lp-refine-1 / prepare-lp-refine-2 ────────────────────
    // Each pass applies up to 4 critique fixes via a fresh 32K-token Claude Opus
    // call. Splitting refinements across separate lambdas means the worst case
    // is one 32K stream per 300 s budget instead of three back-to-back.
    if (step === "prepare-lp-refine-1" || step === "prepare-lp-refine-2") {
      if (!wantsLp || !website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const passIndex = step === "prepare-lp-refine-1" ? 0 : 1;
      const fixesPerPass = 4;

      const stash = readLpInProgress(plan.planDataJson);
      if (!stash) {
        // Draft step was skipped or failed — nothing to refine.
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const batch = stash.critique.slice(passIndex * fixesPerPass, (passIndex + 1) * fixesPerPass);
      if (batch.length === 0) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const instructions = batch
        .map((item, idx) => `${idx + 1}. [${item.area}] ${item.fix}`)
        .join("\n");

      try {
        await setStatus(
          id,
          `Refining landing page (pass ${passIndex + 1}/2, ${batch.length} fixes)...`,
        );

        const refinedHtml = await refineLandingPage({
          currentHtml: stash.html,
          brandContext: stash.brandContext,
          prompt: `Apply the following targeted improvements. Each is a small, specific change — do not rewrite anything that is not mentioned.\n\n${instructions}`,
        });

        // Reload plan inside the update to avoid stomping on concurrent writes
        const fresh = await prisma.grandPlan.findUnique({
          where: { id },
          select: { planDataJson: true },
        });

        await stashLpInProgress(id, fresh?.planDataJson ?? null, {
          ...stash,
          html: refinedHtml,
        });
        await promoteLpDraftToSection(id, refinedHtml, stash.campaignType);

        return NextResponse.json({ ok: true, step, fixesApplied: batch.length });
      } catch (lpError) {
        // Refinement failed but the unrefined draft is already promoted.
        const message = lpError instanceof Error ? lpError.message : "Unknown error";
        console.error(`[grand-plan] ${step} failed (non-fatal — draft retained):`, lpError);
        return NextResponse.json({ ok: true, step, skipped: true, reason: message });
      }
    }

    // ─── STEP: section generation ────────────────────────────────────────────
    if (SECTION_KEYS.includes(step)) {
      await setStatus(id, `Generating ${step}...`);

      // Reload plan to pick up any linked records from prepare steps
      const freshPlan = await prisma.grandPlan.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true, ga4PropertyId: true, semrushDomain: true } },
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
        await prisma.grandPlan.update({
          where: { id },
          data: { status: "failed", generationError: "No plan data found at assemble step. Please regenerate." },
        }).catch(() => {});
        return NextResponse.json({ error: "No plan data to assemble" }, { status: 400 });
      }

      // ── Polish: hero tagline + section intros + audience rationales ─────
      // These read the assembled plan and produce the most-read body copy.
      // All optional: failures fall back to existing renderer defaults.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stash = (planData as any)._customerVoice as CustomerVoiceData | undefined;
        const audienceNames = (planData.sections.audiences ?? [])
          .map((a) => a.name).filter((n): n is string => typeof n === "string" && n.length > 0);
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
          generateHeroTagline(anthropic, planData).catch((e) => { console.warn("heroTagline failed:", e); return ""; }),
          generateSectionIntros(anthropic, planData).catch((e) => { console.warn("sectionIntros failed:", e); return {}; }),
        ]);
        if (tagline) planData.heroTagline = tagline;
        if (Object.keys(intros).length > 0) planData.sectionIntros = intros;
      } catch (polishErr) {
        console.warn("hero/intros polish skipped:", polishErr);
      }

      // Strip transient working state before final render/persistence.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (planData as any)._lpInProgress;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (planData as any)._researchData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (planData as any)._customerVoice;

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
    await prisma.grandPlan.update({
      where: { id },
      data: { status: "failed", statusMessage: null, generationError: `Unknown step: ${step}` },
    }).catch(() => {});
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
  await withDbRetry(() =>
    prisma.grandPlan.update({
      where: { id },
      data: { statusMessage: message },
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSources(plan: any, config: any, brief: string): GrandPlanSources {
  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";

  // Pull research / customer-voice stashes off planDataJson if the prepare-* steps
  // have run. These are stripped before the final assemble step renders the HTML.
  const stash = safeJsonParse<{ _researchData?: AccountResearchData; _customerVoice?: CustomerVoiceData } | null>(plan.planDataJson, null);
  const accountData = stash?._researchData;
  const customerVoice = stash?._customerVoice;

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
    accountData,
    customerVoice,
    dataAvailability,
    postsPerMonth: typeof config.postsPerMonth === "number" && config.postsPerMonth > 0 ? config.postsPerMonth : undefined,
    socialPostsPerWeek: typeof config.socialPostsPerWeek === "number" && config.socialPostsPerWeek > 0 ? config.socialPostsPerWeek : undefined,
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

// ─── Landing-page interim state helpers ──────────────────────────────────────
//
// The LP pipeline is now split across three lambdas (draft, refine-1, refine-2).
// Each pass needs the previous HTML, the unconsumed critique items, and the
// brand context Claude was originally given. We stash that under a transient
// key on planDataJson — the HTML template ignores keys it doesn't know about.

interface LpInProgress {
  html: string;
  critique: LPCritiqueItem[];
  brandContext: BrandContext;
  campaignType: string;
  brief: string;
  targetAudience?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanDataWithLpStash = GrandPlanData & { _lpInProgress?: LpInProgress };

function readLpInProgress(planDataJson: string | null): LpInProgress | null {
  const data = safeJsonParse<PlanDataWithLpStash | null>(planDataJson, null);
  return data?._lpInProgress ?? null;
}

async function stashLpInProgress(
  planId: string,
  planDataJson: string | null,
  stash: LpInProgress,
): Promise<void> {
  const data = safeJsonParse<PlanDataWithLpStash | null>(planDataJson, null);
  if (!data) return;
  data._lpInProgress = stash;
  await prisma.grandPlan.update({
    where: { id: planId },
    data: { planDataJson: JSON.stringify(data) },
  });
}

async function promoteLpDraftToSection(
  planId: string,
  html: string,
  campaignType: string,
): Promise<void> {
  const fresh = await prisma.grandPlan.findUnique({
    where: { id: planId },
    select: { planDataJson: true },
  });
  const data = safeJsonParse<PlanDataWithLpStash | null>(fresh?.planDataJson ?? null, null);
  if (!data) return;
  data.sections.landingPage = { html, campaignType };
  await prisma.grandPlan.update({
    where: { id: planId },
    data: { planDataJson: JSON.stringify(data) },
  });
}

// Records the landing-page pipeline status under generationReport.landingPage
// so the viewer's pipeline-warnings panel surfaces failures and skips. Without
// this, a quietly-failed LP step would leave the user wondering why the
// "Creative" chapter never appeared in the rendered plan.
async function recordLpReport(
  planId: string,
  status: "ok" | "skipped" | "failed",
  error?: string,
): Promise<void> {
  const fresh = await prisma.grandPlan.findUnique({
    where: { id: planId },
    select: { planDataJson: true },
  });
  const data = safeJsonParse<GrandPlanData | null>(fresh?.planDataJson ?? null, null);
  if (!data) return;
  data.generationReport = data.generationReport ?? {};
  data.generationReport.landingPage = error ? { status, error } : { status };
  await prisma.grandPlan.update({
    where: { id: planId },
    data: { planDataJson: JSON.stringify(data) },
  });
}

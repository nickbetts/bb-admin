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
import { generateContentStrategy, generateContentStrategySection, collectSemrushData, runOnPageAudit, enrichPageOptimisationsDeep, type ContentStrategyData } from "@/lib/content-strategy-generator";
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
import { getDomainOverview, getCompetitors, getTopOrganicKeywords, getBacklinks, getUrlOrganicKeywords } from "@/lib/semrush";

// 800s = Vercel Pro maximum. The heaviest steps (prepare-content with Claude
// Opus 32k tokens, prepare-lp-refine with multi-pass critique) can exceed
// 300s on large sites; bumping this to the max ensures we don't 504 on those
// steps. Lighter steps return well within the budget.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

// Valid AI/computed section keys that can be generated individually
const SECTION_KEYS = [
  "executiveSummary", "strategyPlan", "audiences", "googleAdsCampaigns", "metaCampaigns",
  "contentStrategy", "contentCalendar", "organicSocial",
  "exampleArticles", "servicesInvestment", "emailMarketing",
  "linkedInAds", "competitorIntel", "quickWins", "seoFoundations",
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
    contentLimits?: { pillarPages?: number; pageOptimisations?: number; landingPages?: number; blogPosts?: number; linkTargets?: number };
    /** Plan duration mode — affects calendar, roadmap, quick wins, exec summary. */
    planMode?: "annual" | "sprint90";
  }>(plan.configJson, {});

  const clientName = plan.client?.name || plan.proposal?.clientName || "Client";
  const brief = body.overrides?.clientBrief ?? plan.clientBrief ?? "";
  const website = config.kwBrief?.website ?? plan.client?.website ?? plan.keywordResearch?.website ?? "";

  return runWithGrandPlanModelOverride(config.aiModel, async () => {
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
          // Always start the Grand Plan from scratch — unlink any previously
          // linked keyword research / content strategy so prepare-* steps
          // regenerate fresh data instead of short-circuiting on stale links.
          keywordResearchId: null,
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
      // Always re-warm SEMrush caches; Grand Plans regenerate from scratch.
      if (!website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const csDomain = config.contentBrief?.domain ?? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      const csDatabase = config.semrushRegion ?? config.contentBrief?.database ?? "uk";
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
      if (!website) {
        return NextResponse.json({ ok: true, step, skipped: true });
      }

      const csDomain = config.contentBrief?.domain ?? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      const csDatabase = config.semrushRegion ?? config.contentBrief?.database ?? "uk";
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

      // Pull the manual page intel (scraped + SEMrush) stashed by
      // prepare-research so the page optimisations call can prioritise the
      // URLs the client explicitly asked us to optimise.
      const stashForContent = safeJsonParse<(GrandPlanData & { _researchData?: AccountResearchData }) | null>(plan.planDataJson, null);
      const manualIntelForContent = stashForContent?._researchData?.manualPageIntel;

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
          "pageOptimisations", csDomain, clientName, csBrief, csCompetitors, csDatabase, searchConsoleSiteUrl ?? null, undefined, undefined, audienceNames, manualIntelForContent,
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
        console.warn(`[grand-plan:${id}] enrichPageOptimisationsDeep failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
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

      const [ga4Overview, ga4Traffic, ga4Demo, ga4Devices, ga4Convs, ga4TopPages, ga4Geo, gscQueries, gscPages, semCompetitors, sitemapPagesRaw] = await Promise.all([
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
        semDomain ? safe("sitemap", () => withApiCache(`gp-research:sitemap:${semDomain}`, cacheTtlHours, () => fetchSitemapUrls(semDomain))) : Promise.resolve(null),
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
        ? await Promise.all(manualUrls.map(async (url) => {
            const [signals, kws] = await Promise.all([
              safe(`scrape:${url}`, () => withApiCache(`gp-research:scrape:${url}`, cacheTtlHours, () => fetchPageSignals(url))),
              safe(`url-kws:${url}:${semDb}`, () => withApiCache(`gp-research:url-kws:${url}:${semDb}`, cacheTtlHours, () => getUrlOrganicKeywords(url, semDb, 25))),
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
          }))
        : [];

      const research: AccountResearchData = {        ga4: propertyId ? {
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
        sitemapPages: Array.isArray(sitemapPagesRaw) ? sitemapPagesRaw.slice(0, 200) : undefined,
        manualPageIntel: manualPageIntel.length ? manualPageIntel : undefined,
      };

      // Stash on planDataJson under a transient key. Stripped at assemble time.
      const fresh = await prisma.grandPlan.findUnique({ where: { id }, select: { planDataJson: true } });
      const data = safeJsonParse<(GrandPlanData & { _researchData?: AccountResearchData; _priorSprint?: GrandPlanSources["priorSprint"] }) | null>(fresh?.planDataJson ?? null, null);
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
            const cs = (priorSections as unknown as { contentStrategy?: { pillars?: Array<{ pillar?: { title?: string } }>; landingPages?: Array<{ title?: string }>; blogPosts?: Array<{ title?: string }>; pageOptimisations?: Array<{ url?: string }> } } | undefined)?.contentStrategy;
            const seo = priorSections?.seoFoundations as { quickWins?: Array<{ url?: string }> } | undefined;
            const summaryOutcome = (() => {
              const html = priorSections?.executiveSummary ?? "";
              const m = html.match(/<strong>Outcome:<\/strong>\s*([^<]+)/i);
              return m ? m[1].trim() : undefined;
            })();
            data._priorSprint = {
              title: prior.title ?? undefined,
              headlineOutcome: summaryOutcome,
              quickWinTitles: (priorSections?.quickWins ?? []).map((q) => q.title).filter(Boolean),
              seoQuickWinUrls: (seo?.quickWins ?? []).map((q) => q.url).filter((u): u is string => !!u),
              pageOptimisationUrls: (cs?.pageOptimisations ?? []).map((p) => p.url).filter((u): u is string => !!u),
              pillarTitles: (cs?.pillars ?? []).map((p) => p.pillar?.title).filter((t): t is string => !!t),
              landingPageTitles: (cs?.landingPages ?? []).map((p) => p.title).filter((t): t is string => !!t),
              blogPostTitles: (cs?.blogPosts ?? []).map((p) => p.title).filter((t): t is string => !!t),
            };
          }
        }
        await prisma.grandPlan.update({ where: { id }, data: { planDataJson: JSON.stringify(data) } });
      }

      return NextResponse.json({ ok: true, step, signals: {
        ga4: !!research.ga4,
        gsc: !!research.searchConsole,
        competitors: research.competitorData?.length ?? 0,
        manualPages: research.manualPageIntel?.length ?? 0,
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
          client: { select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true, ga4PropertyId: true, semrushDomain: true } },
          proposal: { select: { id: true, title: true, clientName: true, servicesJson: true, timelineJson: true, proposalDataJson: true } },
          keywordResearch: { select: { id: true, title: true, website: true, brief: true, adGroups: true, selectedKws: true, ideas: true, maxCpc: true, monthlyBudget: true } },
          contentStrategy: { select: { id: true, title: true, period: true, spreadsheetData: true } },
        },
      });
      if (!freshPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      const sources = buildSources(freshPlan, config, brief);

      let brain: StrategyBrain;
      try {
        brain = await synthesiseStrategyBrain(sources);
      } catch (err) {
        console.error(`[grand-plan:${id}] strategy brain synthesis failed:`, err);
        return NextResponse.json({ ok: true, step, skipped: true, error: "synthesis-failed" });
      }

      // Stash the brain so subsequent section steps can pick it up via buildSources.
      const planData = safeJsonParse<(GrandPlanData & { _researchData?: AccountResearchData; _customerVoice?: CustomerVoiceData; _strategyBrain?: StrategyBrain }) | null>(freshPlan.planDataJson, null);
      if (planData) {
        planData._strategyBrain = brain;
        await prisma.grandPlan.update({ where: { id }, data: { planDataJson: JSON.stringify(planData) } });
      }

      return NextResponse.json({ ok: true, step, signals: {
        audiences: brain.audiences.length,
        channels: brain.channelStrategy.length,
        directives: Object.keys(brain.directives).length,
      } });
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
            client: { select: { id: true, name: true, slug: true, website: true, searchConsoleSiteUrl: true, ga4PropertyId: true, semrushDomain: true } },
            proposal: { select: { id: true, title: true, clientName: true, servicesJson: true, timelineJson: true, proposalDataJson: true } },
            keywordResearch: { select: { id: true, title: true, website: true, brief: true, adGroups: true, selectedKws: true, ideas: true, maxCpc: true, monthlyBudget: true } },
            contentStrategy: { select: { id: true, title: true, period: true, spreadsheetData: true } },
          },
        });
        if (fullPlan) {
          const sources = buildSources(fullPlan, config, brief);
          const before = validateCoherence(planData, brainStash, sources);
          if (before.length) {
            const fixes = autoFixCoherence(planData, brainStash, sources);
            const after = validateCoherence(planData, brainStash, sources);
            console.log(`[grand-plan:${id}] coherence auto-fix: flagged=${before.length}, fixed=${fixes}, remaining=${after.length}`);
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
  }); // end runWithGrandPlanModelOverride
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
  const stash = safeJsonParse<{ _researchData?: AccountResearchData; _customerVoice?: CustomerVoiceData; _strategyBrain?: StrategyBrain; _priorSprint?: GrandPlanSources["priorSprint"] } | null>(plan.planDataJson, null);
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
    competitors: safeJsonParse<GrandPlanSources["competitors"]>(plan.competitorsJson, []) ?? undefined,
    accountData,
    customerVoice,
    strategyBrain,
    dataAvailability,
    postsPerMonth: typeof config.postsPerMonth === "number" && config.postsPerMonth > 0 ? config.postsPerMonth : undefined,
    socialPostsPerWeek: typeof config.socialPostsPerWeek === "number" && config.socialPostsPerWeek > 0 ? config.socialPostsPerWeek : undefined,
    channelBudgets: config.channelBudgets ?? undefined,
    contentLimits: (() => {
      const clientLimits = safeJsonParse<GrandPlanSources["contentLimits"]>(plan.client?.contentStrategyLimits ?? null, undefined) ?? undefined;
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
  try { return JSON.parse(s); } catch { return fallback; }
}

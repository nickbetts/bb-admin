import { getAnthropicClient } from "@/lib/anthropic-client";
import type Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

const MODEL = "claude-sonnet-4-6";
const MODEL_LIGHT = "claude-haiku-4-5";

// ─── Resilience helpers ─────────────────────────────────────────────────────

const TRANSIENT_ERROR_CODES = new Set([408, 425, 429, 500, 502, 503, 504, 529]);

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  if (anyErr.status && TRANSIENT_ERROR_CODES.has(Number(anyErr.status))) return true;
  if (typeof anyErr.message === "string") {
    const msg = anyErr.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("timeout") || msg.includes("overloaded") || msg.includes("econnreset")) return true;
  }
  return false;
}

/** Run an Anthropic call with up to 3 retries on transient errors (1s, 3s, 8s backoff). */
async function withAnthropicRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 3000, 8000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length || !isTransientError(err)) throw err;
      console.warn(`[grand-plan] ${label} attempt ${attempt + 1} failed (${(err as Error).message}). Retrying in ${delays[attempt]}ms...`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CampaignFocusPeriod {
  startMonth: number;
  endMonth: number;
  label: string;
  description?: string;
}

interface AdGroupKeyword {
  keyword: string;
  matchType: "exact" | "phrase" | "broad";
  volume?: number;
  cpc?: number;
  competition?: string;
}

interface AdGroup {
  name: string;
  rationale?: string;
  keywords: AdGroupKeyword[];
}

interface ContentStrategyEntry {
  url?: string;
  title?: string;
  keywords?: { keyword: string; volume?: number; intent?: string }[];
  notes?: string;
  type?: string;
  /** Cluster tier — drives the cluster-card colour treatment. */
  tier?: "pillar" | "mega" | "article";
  /** Top-level intent classification used for the coloured intent badge. */
  intent?: "awareness" | "commercial" | "decision";
  /** One-paragraph writer brief surfaced inside the cluster card. */
  brief?: string;
  /** Internal linking recommendations (one short sentence each). */
  internalLinks?: string[];
}

interface QuickWinAction {
  title: string;
  description: string;
  priority: "high" | "medium-high" | "medium" | "ongoing" | "long-term";
}

interface KpiChannel {
  channel: string;
  /** Short emoji or symbol shown above the KPI list. */
  icon?: string;
  metrics: { name: string; target: string }[];
}

interface MetaCampaign {
  campaignName: string;
  objective: string;
  budget: string;
  placements: string;
  bidding: string;
  audienceTargeting: {
    interests: string[];
    customAudiences: string[];
    lookalikes: string[];
  };
  adCreatives: {
    format: string;
    headline: string;
    primaryText: string;
    description?: string;
    cta: string;
  }[];
  captionCopyBank: string[];
  contentPillars: string[];
  /** True when this campaign was synthesised deterministically because the
   * AI returned no usable structures. The renderer surfaces an amber chip so
   * the strategist knows to regenerate the section. */
  isFallback?: boolean;
}

interface ContentCalendarMonth {
  month: string;
  focusLabel?: string;
  blogPosts: { title: string; intent: string; targetKeyword: string }[];
  socialPosts: { platform: string; type: string; topic: string }[];
}

interface OrganicSocialPlan {
  pillars: { name: string; description: string; examplePosts: string[] }[];
  postingFrequency: string;
  contentMix: { type: string; percentage: number }[];
  hashtagStrategy: string[];
}

interface EmailMarketingPlan {
  flows: { name: string; trigger: string; emails: { subject: string; purpose: string; delay?: string }[] }[];
  campaigns: { name: string; frequency: string; audience: string; objectiveText: string }[];
  segmentation: { segments: { name: string; criteria: string; purpose: string }[] };
}

interface LinkedInCampaign {
  campaignName: string;
  objective: string;
  budget: string;
  format: string;
  audienceTargeting: { jobTitles: string[]; industries: string[]; companySize: string; seniority: string[] };
  adCreatives: { headline: string; introText: string; description?: string; cta: string }[];
  /** True when synthesised deterministically because the AI returned nothing. */
  isFallback?: boolean;
}

interface CompetitorInsight {
  domain: string;
  organicTraffic?: number;
  organicKeywords?: number;
  paidKeywords?: number;
  backlinks?: number;
  topKeywords: string[];
  strengths: string[];
  weaknesses: string[];
}

interface GoogleAdsForecast {
  clicks: number;
  impressions: number;
  conversions: number;
  cost: number;
  avgCpa: number;
  ctr: number;
  avgCpc: number;
  monthlyBudget: number;
  conversionRate: number;
  conversionRateOverridden?: boolean;
  range?: {
    clicks: { low: number; high: number };
    conversions: { low: number; high: number };
    avgCpa: { low: number; high: number };
  };
  disclaimer?: string;
}

export interface AudienceItem {
  name: string;
  description: string;
  painPoints: string[];
  channels: string[];
  /** A short, in-voice quote that captures how this persona thinks (1 sentence, max ~25 words). */
  personaQuote?: string;
  /** Sector-level keyword + campaign teaser shown inside an accordion in the audience card. */
  sectorPreview?: {
    keywordGroups: { label: string; samples: string }[];
    campaignTeasers: { channel: string; focus: string }[];
  };
}

/** Per-section grounding badge — surfaced in the rendered HTML so users can
 * see at a glance which parts of the plan are backed by real data versus
 * pure AI inference. */
export type DataGrounding = "real" | "partial" | "ai-only";

/** Grounded section wrapper — attached as a sibling on each section's data
 * shape. Consumers use the legacy property name (e.g. `audiences`) plus a
 * parallel `audiencesGrounding` property on `sections`. */
export interface GroundedSection<T> {
  value: T;
  grounding: DataGrounding;
  /** Short list of source labels — e.g. "GA4 audiences", "Web search: Trustpilot". */
  sourceLabels?: string[];
}

/** Real account data harvested from connected platforms before sections run. */
export interface AccountResearchData {
  ga4?: {
    propertyId: string;
    overview?: { sessions: number; users: number; bounceRate: number; conversionRate: number; avgSessionDuration: number };
    topPages?: { path: string; sessions: number; bounceRate: number }[];
    trafficSources?: { source: string; medium: string; sessions: number; conversions: number }[];
    devices?: { device: string; sessions: number; bounceRate: number }[];
    demographics?: { country: string; sessions: number }[];
    conversionsByChannel?: { channel: string; conversions: number; conversionRate: number }[];
    /** Pages with high bounce + low conversion — concrete CRO targets. */
    weakPages?: { path: string; bounceRate: number; sessions: number }[];
  };
  searchConsole?: {
    siteUrl: string;
    topQueries?: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
    topPages?: { page: string; clicks: number; impressions: number; ctr: number }[];
  };
  competitorData?: {
    domain: string;
    organicTraffic: number;
    organicKeywords: number;
    paidKeywords: number;
    backlinks: number;
    topKeywords: string[];
  }[];
}

/** Customer-voice research harvested via Anthropic web search. */
export interface CustomerVoiceData {
  /** Real customer pain points pulled verbatim (or paraphrased from forums/reviews). */
  painPoints: string[];
  /** Common complaints customers raise about competitors in this sector. */
  competitorComplaints: string[];
  /** Notable quotes / phrasing that should colour persona language. */
  quotes: { text: string; source: string }[];
  /** Web-search queries actually fired — surfaced in the Data Sources panel. */
  queriesFired: string[];
}

/** Flags telling each generator which integrations are actually available. */
export interface DataAvailability {
  ga4: boolean;
  searchConsole: boolean;
  meta: boolean;
  googleAds: boolean;
  semrushCompetitors: boolean;
  customerVoice: boolean;
}

export interface GrandPlanData {
  title: string;
  clientName: string;
  clientWebsite?: string;
  purpose: string;
  generatedAt: string;
  brief?: string;
  campaignPeriods?: CampaignFocusPeriod[];
  sections: {
    audiences?: AudienceItem[];
    executiveSummary?: string;
    strategyPlan?: string;
    googleAdsCampaigns?: {
      campaignName: string;
      overview: Record<string, string>;
      negativeKeywords: string[];
      adGroups: { name: string; keywords: AdGroupKeyword[]; adCopy?: { headlines: string[]; descriptions: string[]; sitelinks?: string[] } }[];
    };
    metaCampaigns?: MetaCampaign[];
    keywordResearch?: {
      adGroups: { name: string; keywords: { keyword: string; volume?: number; cpc?: number }[] }[];
    };
    contentStrategy?: {
      pageOptimisations: ContentStrategyEntry[];
      landingPages: ContentStrategyEntry[];
      blogPosts: ContentStrategyEntry[];
    };
    contentCalendar?: ContentCalendarMonth[];
    organicSocial?: OrganicSocialPlan;
    exampleArticles?: { title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[];
    servicesInvestment?: {
      services: { name: string; description: string; price?: string }[];
      timeline: { phase: string; items: string[] }[];
    };
    mediaPlan?: {
      objective: string;
      totalBudget: number;
      channels: { name: string; budget: number; percentage: number; strategy: string }[];
    };
    landingPage?: {
      html: string;
      campaignType: string;
    };
    emailMarketing?: EmailMarketingPlan;
    linkedInAds?: LinkedInCampaign[];
    competitorIntel?: CompetitorInsight[];
    googleAdsForecast?: GoogleAdsForecast;
    /** Prioritised list of next-step actions, surfaced under Strategy. */
    quickWins?: QuickWinAction[];
    /** KPI/measurement framework grouped by channel. */
    kpis?: KpiChannel[];
  };
  /** Per-section grounding flags + source labels — used by the renderer to
   * surface badges next to each section heading. Keyed by the same keys as
   * `sections`. Optional so legacy plans render unchanged. */
  grounding?: Partial<Record<keyof GrandPlanData["sections"], { grounding: DataGrounding; sourceLabels: string[] }>>;
  /** Aggregate list of every real source consulted across the run. */
  dataSources?: { label: string; detail?: string }[];
  generationReport?: Record<string, { status: "ok" | "skipped" | "failed"; error?: string }>;
}

// ─── Source data interfaces ─────────────────────────────────────────────────

export interface GrandPlanSources {
  proposal?: {
    title: string;
    clientName: string;
    servicesJson: string;
    timelineJson: string;
    proposalDataJson?: string | null;
  };
  keywordResearch?: {
    title: string;
    website: string;
    brief: string;
    adGroups: string; // JSON
    selectedKws: string; // JSON
    ideas: string; // JSON
    maxCpc: string;
    monthlyBudget: string;
    conversionRate?: string;
  };
  contentStrategy?: {
    title: string;
    period: string;
    spreadsheetData: string; // JSON
  };
  mediaPlan?: {
    title: string;
    objective: string;
    totalBudget: number;
    channels: string; // JSON
    forecast?: string | null;
  };
  clientBrief?: string;
  targetAudiences?: string;
  sector?: string;
  /** Optional override list of enabled section keys used to derive paid/owned
   * platforms when regenerating a single section. When omitted the generator
   * falls back to the active `enabledSections` argument. */
  enabledPlatforms?: string[];
  clientName: string;
  purpose: string;
  campaignFocusPeriods: CampaignFocusPeriod[];
  /** Real data harvested by the prepare-research step (GA4, GSC, SEMrush). */
  accountData?: AccountResearchData;
  /** Customer-voice + competitor-complaint research from Anthropic web search. */
  customerVoice?: CustomerVoiceData;
  /** Booleans the generators inspect to decide when to fall back to AI inference. */
  dataAvailability?: DataAvailability;
}

// ─── Customer voice / web search helper ────────────────────────────────────
// Uses Anthropic's built-in web_search tool to harvest real pain points,
// competitor complaints and verbatim quotes from forums and review sites.
// Designed to be called from the prepare-customer-voice route step and
// stashed onto planDataJson._customerVoice for downstream generators.

export async function runWebSearchResearch(
  anthropic: Anthropic,
  options: {
    clientName: string;
    sector?: string;
    services?: string[];
    competitors?: string[];
    brief?: string;
  }
): Promise<CustomerVoiceData> {
  const sectorLabel = options.sector ? options.sector.replace(/_/g, " ") : "their industry";
  const servicesLine = options.services?.length ? options.services.slice(0, 4).join(", ") : "";
  const competitorLine = options.competitors?.length ? options.competitors.slice(0, 4).join(", ") : "";

  const prompt = `You are a qualitative researcher. Use the web_search tool (max 5 searches) to find REAL customer pain points, frustrations, and verbatim quotes about ${sectorLabel}${servicesLine ? ` and specifically ${servicesLine}` : ""}.

Search Reddit, Trustpilot, Google reviews, industry forums and Q&A sites. Look for:
1. Pain points and frustrations buyers express
2. Specific complaints about competitors${competitorLine ? ` (especially: ${competitorLine})` : ""}
3. Verbatim quotes (exact phrasing) from real customers

After your searches, return ONLY a JSON object (no prose, no markdown fences) in this format:
{
  "painPoints": ["pain point 1", "pain point 2", ...],   // 5-10 items, real frustrations in customers' own language
  "competitorComplaints": ["complaint 1", ...],           // 3-8 items, specific competitor weaknesses
  "quotes": [{"text": "verbatim quote", "source": "where it came from (e.g. 'r/smallbusiness, March 2024')"}],  // 3-8 items
  "queriesFired": ["search query 1", "search query 2", ...]  // the queries you actually ran
}

Client: ${options.clientName}
Brief: ${options.brief ?? "(none provided)"}
Sector: ${sectorLabel}
Services: ${servicesLine || "(unspecified)"}
Competitors to investigate: ${competitorLine || "(none provided — search for likely competitors)"}

Be ruthless about authenticity — drop anything that sounds like marketing copy. Real customers complain about specific things in specific words. Capture that.`;

  let res;
  try {
    res = await withAnthropicRetry("customerVoice", () => anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 } as unknown as Anthropic.Tool],
      messages: [{ role: "user", content: prompt }],
    }));
  } catch (err) {
    console.error("[grand-plan] customer voice web search failed:", err);
    return { painPoints: [], competitorComplaints: [], quotes: [], queriesFired: [] };
  }

  // Extract the final text block (after any tool use) and parse JSON
  const text = extractText(res);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Find the first { ... } block in case the model added prose around it
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : cleaned;
  try {
    const parsed = JSON.parse(jsonStr) as Partial<CustomerVoiceData>;
    return {
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints.map(String).slice(0, 12) : [],
      competitorComplaints: Array.isArray(parsed.competitorComplaints) ? parsed.competitorComplaints.map(String).slice(0, 10) : [],
      quotes: Array.isArray(parsed.quotes)
        ? (parsed.quotes as unknown[])
            .filter((q): q is { text: unknown; source?: unknown } => !!q && typeof q === "object")
            .map((q) => ({ text: String((q as { text?: unknown }).text ?? ""), source: String((q as { source?: unknown }).source ?? "") }))
            .filter((q) => q.text)
            .slice(0, 10)
        : [],
      queriesFired: Array.isArray(parsed.queriesFired) ? parsed.queriesFired.map(String).slice(0, 8) : [],
    };
  } catch (err) {
    console.error("[grand-plan] customer voice JSON parse failed:", err);
    return { painPoints: [], competitorComplaints: [], quotes: [], queriesFired: [] };
  }
}

// ─── Main generator ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function generateGrandPlan(
  sources: GrandPlanSources,
  onProgress?: (message: string) => Promise<void>,
  enabledSections?: string[],
): Promise<GrandPlanData> {
  const anthropic = await getAnthropicClient();

  // If enabledSections is provided, only generate those sections
  const isEnabled = (section: string) => !enabledSections || enabledSections.includes(section);

  // Parse source data
  const adGroups: AdGroup[] = sources.keywordResearch
    ? safeJsonParse(sources.keywordResearch.adGroups, [])
    : [];
  const contentData = sources.contentStrategy
    ? safeJsonParse(sources.contentStrategy.spreadsheetData, {})
    : null;
  const services = sources.proposal
    ? safeJsonParse(sources.proposal.servicesJson, [])
    : [];
  const timeline = sources.proposal
    ? safeJsonParse(sources.proposal.timelineJson, [])
    : [];
  const mediaChannels = sources.mediaPlan
    ? safeJsonParse(sources.mediaPlan.channels, [])
    : [];

  // Build context summary for AI prompts
  const contextSummary = buildContextSummary(sources, adGroups, contentData, services);

  // Pre-compute Google Ads forecast (deterministic, no AI). The media plan AI
  // needs this in its prompt so the budget allocation is grounded in real
  // CPC/conversion economics rather than vibes.
  const googleAdsForecast = isEnabled("googleAdsForecast") && sources.keywordResearch && adGroups.length > 0
    ? buildGoogleAdsForecast(adGroups, sources)
    : undefined;

  // Derive which paid/organic platforms the strategist actually selected.
  // Prefer an explicit list on `sources.enabledPlatforms` (used by single
  // section regeneration so the original platform mix isn't lost), else
  // derive from the active `enabledSections` argument.
  const enabledPlatforms = sources.enabledPlatforms?.length
    ? sources.enabledPlatforms.filter((k) => k in PLATFORM_CHANNEL_MAP)
    : deriveEnabledPlatforms(enabledSections);
  const paidOnly = enabledPlatforms.length > 0 && enabledPlatforms.every((p) => PAID_PLATFORM_IDS.includes(p as typeof PAID_PLATFORM_IDS[number]));

  // Generate sections in parallel where possible, with per-section progress tracking
  const sectionNames: string[] = [];
  if (isEnabled("audiences")) sectionNames.push("Audiences");
  if (isEnabled("executiveSummary")) sectionNames.push("Executive Summary");
  if (isEnabled("strategyPlan")) sectionNames.push("Strategy Plan");
  if (isEnabled("metaCampaigns") && sources.keywordResearch) sectionNames.push("Meta Campaigns");
  if (isEnabled("contentCalendar")) sectionNames.push("Content Calendar");
  if (isEnabled("organicSocial")) sectionNames.push("Organic Social");
  if (isEnabled("exampleArticles") && contentData) sectionNames.push("Example Articles");
  if (isEnabled("mediaPlan") && sources.mediaPlan && mediaChannels.length === 0) sectionNames.push("Media Plan");
  if (isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0) sectionNames.push("Ad Copy");
  if (isEnabled("emailMarketing")) sectionNames.push("Email Marketing");
  if (isEnabled("linkedInAds")) sectionNames.push("LinkedIn Ads");
  if (isEnabled("competitorIntel") && sources.keywordResearch) sectionNames.push("Competitor Intel");
  if (isEnabled("quickWins")) sectionNames.push("Quick Wins");
  if (isEnabled("kpis")) sectionNames.push("KPIs");

  let completedCount = 0;
  const total = sectionNames.length;
  const generationReport: Record<string, { status: "ok" | "skipped" | "failed"; error?: string }> = {};

  const runSection = async <T>(label: string, key: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (onProgress) await onProgress(`Generating ${label} (${completedCount + 1}/${total})...`);
    try {
      const result = await fn();
      completedCount++;
      generationReport[key] = { status: "ok" };
      return result;
    } catch (error) {
      completedCount++;
      const message = error instanceof Error ? error.message : String(error);
      generationReport[key] = { status: "failed", error: message };
      console.error(`[grand-plan] Section "${label}" failed:`, message);
      return undefined;
    }
  };

  if (onProgress) await onProgress(`Generating ${total} AI sections...`);

  // Batch 1: core sections (errors are isolated — one failure does not abort the rest)
  const [executiveSummary, strategyPlan, metaCampaigns, contentCalendar, organicSocial, exampleArticles, aiMediaPlan, adCopyData] =
    await Promise.all([
      isEnabled("executiveSummary")
        ? runSection("Executive Summary", "executiveSummary", () => generateExecutiveSummary(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("strategyPlan")
        ? runSection("Strategy Plan", "strategyPlan", () => generateStrategyPlan(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("metaCampaigns") && sources.keywordResearch
        ? runSection("Meta Campaigns", "metaCampaigns", () => generateMetaCampaigns(anthropic, contextSummary, adGroups, sources))
        : Promise.resolve(undefined),
      isEnabled("contentCalendar")
        ? runSection("Content Calendar", "contentCalendar", () => generateContentCalendar(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("organicSocial")
        ? runSection("Organic Social", "organicSocial", () => generateOrganicSocial(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("exampleArticles") && contentData
        ? runSection("Example Articles", "exampleArticles", () => generateExampleArticles(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("mediaPlan") && sources.mediaPlan && mediaChannels.length === 0
        ? runSection("Media Plan", "mediaPlan", () => generateMediaPlanChannels(anthropic, contextSummary, sources, { enabledPlatforms, paidOnly, googleAdsForecast }))
        : Promise.resolve(undefined),
      isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0
        ? runSection("Ad Copy", "googleAdsAdCopy", () => generateGoogleAdsAdCopy(anthropic, adGroups, contextSummary, sources))
        : Promise.resolve(undefined),
    ]);

  // Batch 2: supplementary sections
  const [emailMarketing, linkedInAds, competitorIntel, audiences, quickWins, kpis] =
    await Promise.all([
      isEnabled("emailMarketing")
        ? runSection("Email Marketing", "emailMarketing", () => generateEmailMarketing(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("linkedInAds")
        ? runSection("LinkedIn Ads", "linkedInAds", () => generateLinkedInAds(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("competitorIntel") && sources.keywordResearch
        ? runSection("Competitor Intel", "competitorIntel", () => generateCompetitorIntel(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("audiences")
        ? runSection("Audiences", "audiences", () => generateAudiences(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("quickWins")
        ? runSection("Quick Wins", "quickWins", () => generateQuickWins(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("kpis")
        ? runSection("KPIs", "kpis", () => generateKpis(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
    ]);

  // Build Google Ads campaigns from keyword research (structured data + AI ad copy)
  const googleAdsCampaigns = isEnabled("googleAdsCampaigns") && sources.keywordResearch
    ? buildGoogleAdsCampaigns(adGroups, sources, adCopyData ?? [])
    : undefined;

  // Build keyword research section
  const keywordResearch = isEnabled("keywordResearch") && sources.keywordResearch
    ? buildKeywordResearchSection(adGroups)
    : undefined;

  // Build content strategy section from existing data
  const contentStrategySection = isEnabled("contentStrategy") && contentData
    ? buildContentStrategySection(contentData)
    : undefined;

  // Build services section from proposal
  const servicesInvestment = isEnabled("servicesInvestment") && sources.proposal
    ? { services, timeline }
    : undefined;

  // Build media plan section
  const mediaPlanSection = isEnabled("mediaPlan") && sources.mediaPlan
    ? {
        objective: sources.mediaPlan.objective,
        totalBudget: sources.mediaPlan.totalBudget,
        channels: aiMediaPlan ?? mediaChannels.map((ch: { name?: string; budget?: number; percentage?: number; strategy?: string }) => ({
          name: ch.name ?? "Unknown",
          budget: ch.budget ?? 0,
          percentage: ch.percentage ?? 0,
          strategy: ch.strategy ?? "",
        })),
      }
    : undefined;

  // Unpack grounded sections (audiences, emailMarketing, linkedInAds, competitorIntel)
  // — these now return { value, grounding, sourceLabels } so we can surface badges.
  const grounding: NonNullable<GrandPlanData["grounding"]> = {};
  const recordGrounding = <K extends string>(key: K, gs: GroundedSection<unknown> | undefined) => {
    if (gs) grounding[key as keyof NonNullable<GrandPlanData["grounding"]>] = { grounding: gs.grounding, sourceLabels: gs.sourceLabels ?? [] };
  };
  recordGrounding("audiences", audiences);
  recordGrounding("emailMarketing", emailMarketing);
  recordGrounding("linkedInAds", linkedInAds);
  recordGrounding("competitorIntel", competitorIntel);

  // Aggregate the data sources actually consulted across the plan, for the
  // "Data Sources Used" panel rendered near the top of the report.
  const dataSources: NonNullable<GrandPlanData["dataSources"]> = [];
  if (sources.accountData?.ga4) dataSources.push({ label: "Google Analytics 4", detail: "Last 30 days, audiences, devices, conversions" });
  if (sources.accountData?.searchConsole) dataSources.push({ label: "Search Console", detail: "Top queries and pages" });
  if (sources.accountData?.competitorData?.length) dataSources.push({ label: "SEMrush", detail: `${sources.accountData.competitorData.length} competitor snapshot(s)` });
  if (sources.customerVoice?.queriesFired?.length) dataSources.push({ label: "Customer voice (web search)", detail: `${sources.customerVoice.queriesFired.length} research queries` });
  if (sources.keywordResearch) dataSources.push({ label: "Keyword Planner", detail: sources.keywordResearch.title });
  if (sources.contentStrategy) dataSources.push({ label: "Content Strategy", detail: "Saved strategy doc" });
  if (sources.proposal) dataSources.push({ label: "Proposal", detail: "Services, hours, pricing" });
  if (sources.mediaPlan) dataSources.push({ label: "Media Plan", detail: `Total budget £${sources.mediaPlan.totalBudget?.toLocaleString?.() ?? "?"}` });

  if (onProgress) await onProgress("Assembling final document...");

  return {
    title: `${sources.clientName} — Go-To-Market Plan`,
    clientName: sources.clientName,
    purpose: sources.purpose,
    generatedAt: new Date().toISOString(),
    brief: sources.clientBrief,
    campaignPeriods: sources.campaignFocusPeriods.length > 0 ? sources.campaignFocusPeriods : undefined,
    sections: {
      audiences: audiences?.value,
      executiveSummary,
      strategyPlan,
      googleAdsCampaigns,
      metaCampaigns,
      keywordResearch,
      contentStrategy: contentStrategySection,
      contentCalendar,
      organicSocial,
      exampleArticles,
      servicesInvestment,
      mediaPlan: mediaPlanSection,
      emailMarketing: emailMarketing?.value,
      linkedInAds: linkedInAds?.value,
      competitorIntel: competitorIntel?.value,
      googleAdsForecast,
      quickWins,
      kpis,
    },
    grounding: Object.keys(grounding).length ? grounding : undefined,
    dataSources: dataSources.length ? dataSources : undefined,
    generationReport,
  };
}

// ─── Context builder ────────────────────────────────────────────────────────

function buildContextSummary(
  sources: GrandPlanSources,
  adGroups: AdGroup[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentData: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: any[]
): string {
  const parts: string[] = [];
  parts.push(`Client: ${sources.clientName}`);
  parts.push(`Purpose: ${sources.purpose === "pitch" ? "Pre-sale pitch — persuasive tone" : sources.purpose === "onboarding" ? "Post-sale onboarding — operational tone" : "Strategy refresh — analytical tone"}`);

  if (sources.sector) {
    parts.push(`Sector: ${sources.sector}`);
  }

  if (sources.clientBrief) {
    parts.push(`Brief: ${sources.clientBrief}`);
  }

  if (sources.targetAudiences) {
    parts.push(`Target audiences (provided by strategist):\n${sources.targetAudiences}`);
  }

  if (sources.keywordResearch) {
    parts.push(`Website: ${sources.keywordResearch.website}`);
    parts.push(`Keyword research brief: ${sources.keywordResearch.brief}`);
    parts.push(`Ad groups (${adGroups.length}): ${adGroups.map((g) => g.name).join(", ")}`);
    if (sources.keywordResearch.monthlyBudget) {
      parts.push(`Monthly budget: £${sources.keywordResearch.monthlyBudget}`);
    }
  }

  if (contentData) {
    const pageOpts = contentData.pageOptimisations?.length ?? 0;
    const blogPosts = contentData.blogPosts?.length ?? 0;
    const landingPages = contentData.landingPages?.length ?? 0;
    parts.push(`Content strategy: ${pageOpts} page optimisations, ${landingPages} landing pages, ${blogPosts} blog posts`);
  }

  if (services.length > 0) {
    parts.push(`Proposed services: ${services.map((s: { name?: string }) => s.name).filter(Boolean).join(", ")}`);
  }

  if (sources.mediaPlan) {
    parts.push(`Media plan: ${sources.mediaPlan.objective}, £${sources.mediaPlan.totalBudget} budget`);
  }

  if (sources.campaignFocusPeriods.length > 0) {
    parts.push("Campaign focus periods:");
    for (const p of sources.campaignFocusPeriods) {
      parts.push(`  ${MONTH_NAMES[p.startMonth - 1]}–${MONTH_NAMES[p.endMonth - 1]}: ${p.label}${p.description ? ` (${p.description})` : ""}`);
    }
  }

  return parts.join("\n");
}

// ─── Per-section context helpers ────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  dental: "UK dental practice (mix of NHS and private patients)",
  ecommerce: "UK direct-to-consumer ecommerce / online retail",
  industrial: "UK industrial / manufacturing / B2B engineering",
  charities: "UK charity / non-profit",
  healthcare: "UK private healthcare clinic",
  hospitality: "UK hospitality / events / venue",
  professional_services: "UK professional services firm (law, accountancy, consultancy)",
  saas: "UK SaaS / B2B software",
  education: "UK education / training provider",
  other: "UK business",
};

function buildAudienceBlock(sources: GrandPlanSources): string {
  if (!sources.targetAudiences) return "";
  return `\n\nTarget audiences for this client (these MUST shape the output — reference them by name, address their pain points, and meet them on the channels they use):\n${sources.targetAudiences}`;
}

function buildSectorBlock(sources: GrandPlanSources): string {
  if (!sources.sector) return "";
  const label = SECTOR_LABELS[sources.sector] ?? sources.sector;
  return `\n\nSector: ${label}. Use sector-specific language, regulatory considerations, and benchmarks where relevant.`;
}

function buildCampaignPeriodsBlock(sources: GrandPlanSources): string {
  if (!sources.campaignFocusPeriods.length) return "";
  const lines = sources.campaignFocusPeriods.map(
    (p) => `- ${MONTH_NAMES[p.startMonth - 1]}–${MONTH_NAMES[p.endMonth - 1]}: ${p.label}${p.description ? ` (${p.description})` : ""}`,
  );
  return `\n\nKey campaign focus periods (the plan must reflect these — emphasise relevant messaging, creative, and offers in these windows):\n${lines.join("\n")}`;
}

function buildAccountDataBlock(sources: GrandPlanSources): string {
  const a = sources.accountData;
  if (!a) return "";
  const parts: string[] = [];
  if (a.ga4?.overview) {
    const o = a.ga4.overview;
    parts.push(`GA4 (last 30 days): ${o.sessions.toLocaleString()} sessions, ${o.users.toLocaleString()} users, ${o.bounceRate.toFixed(1)}% bounce, ${o.conversionRate.toFixed(2)}% conversion rate.`);
  }
  if (a.ga4?.trafficSources?.length) {
    const top = a.ga4.trafficSources.slice(0, 5).map((s) => `${s.source}/${s.medium} (${s.sessions.toLocaleString()} sess${s.conversions ? `, ${s.conversions} conv` : ""})`).join("; ");
    parts.push(`Top traffic sources: ${top}.`);
  }
  if (a.ga4?.demographics?.length) {
    const top = a.ga4.demographics.slice(0, 5).map((d) => `${d.country} (${d.sessions.toLocaleString()})`).join("; ");
    parts.push(`Geography: ${top}.`);
  }
  if (a.ga4?.devices?.length) {
    const top = a.ga4.devices.map((d) => `${d.device} ${d.sessions.toLocaleString()} (${d.bounceRate.toFixed(0)}% bounce)`).join("; ");
    parts.push(`Device mix: ${top}.`);
  }
  if (a.ga4?.weakPages?.length) {
    parts.push(`Underperforming pages (high bounce, decent traffic): ${a.ga4.weakPages.slice(0, 5).map((p) => `${p.path} (${p.bounceRate.toFixed(0)}% bounce, ${p.sessions} sess)`).join("; ")}.`);
  }
  if (a.ga4?.conversionsByChannel?.length) {
    parts.push(`Conversions by channel: ${a.ga4.conversionsByChannel.slice(0, 6).map((c) => `${c.channel} ${c.conversions} (${c.conversionRate.toFixed(2)}% CR)`).join("; ")}.`);
  }
  if (a.searchConsole?.topQueries?.length) {
    const top = a.searchConsole.topQueries.slice(0, 8).map((q) => `"${q.query}" (${q.clicks} clicks, ${q.impressions} impr, pos ${q.position.toFixed(1)})`).join("; ");
    parts.push(`Search Console top converting queries: ${top}.`);
  }
  if (a.competitorData?.length) {
    const lines = a.competitorData.slice(0, 5).map((c) => `${c.domain}: ${c.organicTraffic.toLocaleString()} organic visits/mo, ${c.organicKeywords.toLocaleString()} keywords, ${c.backlinks.toLocaleString()} backlinks`);
    parts.push(`SEMrush competitor snapshot:\n${lines.join("\n")}`);
  }
  if (parts.length === 0) return "";
  return `\n\nReal account data (use these numbers to ground recommendations — do NOT invent metrics that contradict them):\n${parts.join("\n")}`;
}

function buildCustomerVoiceBlock(sources: GrandPlanSources): string {
  const cv = sources.customerVoice;
  if (!cv || (!cv.painPoints?.length && !cv.competitorComplaints?.length && !cv.quotes?.length)) return "";
  const parts: string[] = [];
  if (cv.painPoints?.length) {
    parts.push(`Real customer pain points (from review sites, forums, Reddit — use this language and these frustrations in audience profiles, ad copy, and content):\n- ${cv.painPoints.slice(0, 10).join("\n- ")}`);
  }
  if (cv.quotes?.length) {
    parts.push(`Verbatim customer phrasing to echo:\n- ${cv.quotes.slice(0, 6).map((q) => `"${q}"`).join("\n- ")}`);
  }
  if (cv.competitorComplaints?.length) {
    parts.push(`Common complaints customers raise about competitors in this sector (these are positioning opportunities):\n- ${cv.competitorComplaints.slice(0, 8).join("\n- ")}`);
  }
  return `\n\n${parts.join("\n\n")}`;
}

function buildSharedContextBlocks(sources: GrandPlanSources): string {
  return buildAudienceBlock(sources)
    + buildSectorBlock(sources)
    + buildCampaignPeriodsBlock(sources)
    + buildAccountDataBlock(sources)
    + buildCustomerVoiceBlock(sources);
}

// ─── AI generation functions ────────────────────────────────────────────────

async function generateExecutiveSummary(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await withAnthropicRetry("executiveSummary", () => anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media, a specialist UK digital marketing agency. Write an executive summary for a go-to-market plan.

Rules:
- British English only
- No em dashes, no semicolons
- No AI jargon: never use "harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly", "cutting-edge", "robust"
- Write like you've sat in the room with this client. Be direct, specific, grounded.
- Open by naming the audiences this plan is built for and the commercial outcome we are chasing.
- ${sources.purpose === "pitch" ? "This is a pitch — be persuasive but honest. Show you understand their business." : "This is an onboarding plan — be operational and clear about what happens next."}
- Return HTML content (paragraphs, headings h3/h4, bullet lists). No wrapper div or section tags.
- Keep it to 300-400 words.

Write the executive summary for this plan:

${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));
  return extractText(res);
}

async function generateStrategyPlan(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await withAnthropicRetry("strategyPlan", () => anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 1600,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media. Write a phased strategy plan with three phases: Month 1 (Foundation), Months 2-3 (Growth), Months 4+ (Scale).

Rules:
- British English, no em dashes, no semicolons, no AI jargon
- Each phase should cover: what gets done, which audiences we are reaching and on which channels, expected outcomes, key metrics to track
- Reference real channels and tactics from the context provided. Match channels to audiences explicitly (e.g. "reach Practice Managers via LinkedIn in Phase 2").
- If campaign focus periods are listed, weave them into the relevant phase.
- ${sources.purpose === "pitch" ? "Persuasive but grounded — show clear ROI potential" : "Operational clarity — this is the actual plan"}
- Return HTML content (h3 for phases, p, ul/li). No wrapper tags.
- 400-500 words total.

Write the phased strategy plan:

${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));
  return extractText(res);
}

async function generateMetaCampaigns(anthropic: Anthropic, context: string, adGroups: AdGroup[], sources: GrandPlanSources): Promise<MetaCampaign[]> {
  // Rank ad groups by total search volume so themes reflect commercial weight,
  // not arbitrary storage order.
  const ranked = [...adGroups].sort((a, b) => {
    const va = a.keywords.reduce((s, k) => s + (k.volume ?? 0), 0);
    const vb = b.keywords.reduce((s, k) => s + (k.volume ?? 0), 0);
    return vb - va;
  });
  const topThemes = ranked.slice(0, 4).map((g) => g.name).join(", ");

  const res = await withAnthropicRetry("metaCampaigns", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: `You are a Meta Ads specialist at i3media. Generate Meta (Facebook/Instagram) campaign structures.

Return a JSON object with key "campaigns" containing an array of campaign objects. Each campaign should have:
- campaignName: string
- objective: string (awareness, traffic, leads, conversions)
- budget: string (monthly budget recommendation)
- placements: string (e.g., "Facebook Feed, Instagram Feed, Instagram Reels, Stories")
- bidding: string (e.g., "Lowest Cost" or "Cost Cap")
- audienceTargeting: { interests: string[], customAudiences: string[], lookalikes: string[] }
- adCreatives: array of { format: "feed"|"reel"|"story", headline: string, primaryText: string, description?: string, cta: string }
- captionCopyBank: string[] (5-8 ready-to-use captions)
- contentPillars: string[] (4-6 organic content themes)

Rules:
- Create 2-3 campaigns based on the keyword themes provided AND the target audiences below. Each campaign should clearly map to one or more named audiences.
- Audience targeting interests/customAudiences/lookalikes should reflect the real personas — reference their behaviours and pain points, not generic demographics.
- Captions and creative copy must speak directly to the audience's situation in plain British English.
- If campaign focus periods are listed, design at least one campaign or creative variant around the most imminent period — include specific dates/windows in the ad copy to drive urgency.
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

CRITICAL CONSTRAINTS (must be followed — client brief overrides defaults):
- GEOGRAPHY: Use the target markets from the brief. Do NOT default to UK-only if the brief specifies European, international, or non-UK markets. Set interests and audience locations to match the stated geography.
- UNDER-18 AUDIENCES: If any target audience includes minors (under 18), Meta restricts interest-based and demographic targeting for users under 18. Acknowledge this in the campaign strategy — add a note in captionCopyBank or contentPillars — and suggest a compliant workaround (e.g. broad targeting, targeting parents of teenagers, or age-targeting 18+ in parallel campaigns).
- NEGATIVE CONSTRAINTS: If the brief lists any terms or language to avoid, do NOT reference them in any ad copy, headline, caption, or interest targeting.

Client: ${sources.clientName}
Key themes: ${topThemes}
Brief: ${sources.clientBrief || sources.keywordResearch?.brief || "General digital marketing"}

Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const raw = extractText(res);
  const parsed = safeJsonParse(raw, { campaigns: [] });
  const campaigns = (parsed.campaigns ?? parsed ?? []) as MetaCampaign[];
  // If the model returned nothing usable, synthesise a deterministic fallback
  // so the Paid Social chapter still renders — with an amber 'AI fallback'
  // chip telling the strategist to regenerate.
  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    return buildFallbackMetaCampaigns(sources, ranked.slice(0, 3));
  }
  return campaigns;
}

function buildFallbackMetaCampaigns(sources: GrandPlanSources, topGroups: AdGroup[]): MetaCampaign[] {
  const client = sources.clientName;
  const themes = topGroups.length ? topGroups : [{ name: "General awareness", keywords: [] } as AdGroup];
  return themes.slice(0, 2).map((g, i) => ({
    campaignName: `${client} — ${g.name}${i === 0 ? " (Lead Gen)" : " (Awareness)"}`,
    objective: i === 0 ? "leads" : "awareness",
    budget: "£500–£1,000/month",
    placements: "Facebook Feed, Instagram Feed, Instagram Reels, Stories",
    bidding: "Lowest Cost",
    audienceTargeting: {
      interests: [g.name, `${client} customers`, "UK audience"],
      customAudiences: ["Website visitors (90 days)", "Email list"],
      lookalikes: ["1% lookalike of converters"],
    },
    adCreatives: [
      {
        format: "feed",
        headline: `${g.name} — ${client}`,
        primaryText: `Find out how ${client} can help with ${g.name.toLowerCase()}. Trusted by UK customers.`,
        cta: i === 0 ? "Learn More" : "Sign Up",
      },
    ],
    captionCopyBank: [
      `Looking for ${g.name.toLowerCase()}? ${client} can help.`,
      `${client} — trusted experts in ${g.name.toLowerCase()}.`,
    ],
    contentPillars: [g.name, `${client} story`, "Customer wins", "Behind the scenes"],
    isFallback: true,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateContentCalendar(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<ContentCalendarMonth[]> {
  const focusPeriodText = sources.campaignFocusPeriods.length > 0
    ? `\n\nCampaign focus periods (MUST be reflected in the calendar):\n${sources.campaignFocusPeriods.map((p) => `${MONTH_NAMES[p.startMonth - 1]}–${MONTH_NAMES[p.endMonth - 1]}: ${p.label}${p.description ? ` — ${p.description}` : ""}`).join("\n")}`
    : "";

  const blogTopics = contentData?.blogPosts
    ? contentData.blogPosts.slice(0, 15).map((b: { title?: string; keyword?: string }) => b.title || b.keyword).filter(Boolean).join(", ")
    : "";

  const res = await withAnthropicRetry("contentCalendar", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 3500,
    messages: [
      {
        role: "user",
        content: `You are a content strategist at i3media. Create a 6-month content calendar.

Return a JSON object with key "months" containing an array of 6 month objects:
- month: string (e.g., "May 2026")
- focusLabel: string or null (campaign focus for this month, from the focus periods provided)
- blogPosts: array of { title: string, intent: "awareness"|"commercial"|"decision", targetKeyword: string } (2-3 per month)
- socialPosts: array of { platform: "instagram"|"facebook", type: "reel"|"carousel"|"static"|"story", topic: string } (4-6 per month)

Rules:
- Start from next month
- Align blog topics with the content strategy data if available
- Campaign focus periods MUST drive the topic selection for those months
- Topics should clearly serve at least one of the named target audiences
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences${focusPeriodText}

Client: ${sources.clientName}
${blogTopics ? `Available blog topics: ${blogTopics}\n` : ""}Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const raw = extractText(res);
  const parsed = safeJsonParse(raw, { months: [] });
  return parsed.months ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOrganicSocial(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<OrganicSocialPlan> {
  const res = await withAnthropicRetry("organicSocial", () => anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 2200,
    messages: [
      {
        role: "user",
        content: `You are a social media strategist at i3media. Create an organic social media plan for Meta (Instagram + Facebook).

Return a JSON object:
- pillars: array of { name: string, description: string, examplePosts: string[] (3 examples each) } — 4-6 pillars
- postingFrequency: string (e.g., "4-5 posts per week across Instagram and Facebook")
- contentMix: array of { type: "reel"|"carousel"|"static"|"story", percentage: number } (must total 100)
- hashtagStrategy: string[] (10-15 relevant hashtags)

Rules:
- Pillars must serve the named target audiences — each pillar should explicitly help at least one audience.
- Example posts must reference real audience pain points or moments, not generic platitudes.
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Brief: ${sources.clientBrief || sources.keywordResearch?.brief || ""}
${contentData?.blogPosts ? `Blog topics: ${contentData.blogPosts.slice(0, 10).map((b: { title?: string }) => b.title).filter(Boolean).join(", ")}` : ""}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const raw = extractText(res);
  return safeJsonParse(raw, {
    pillars: [],
    postingFrequency: "3-4 posts per week",
    contentMix: [],
    hashtagStrategy: [],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateExampleArticles(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<{ title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[]> {
  // Pick 3 blog topics to generate examples for
  const blogPosts = contentData?.blogPosts ?? [];
  const topicsToGenerate = blogPosts.slice(0, 3).map((b: { title?: string; keyword?: string }) => b.title || b.keyword || "Untitled");

  if (topicsToGenerate.length === 0) return [];

  const articles: { title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[] = [];

  for (const topic of topicsToGenerate) {
    const res = await withAnthropicRetry(`exampleArticle:${topic}`, () => anthropic.messages.create({
      model: MODEL_LIGHT,
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are a senior content writer at i3media. Write a full SEO-optimised article.

Rules:
- British English, no em dashes, no semicolons
- No AI jargon: never "harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly"
- Structure: H2 sections (4-5), H3 subsections where needed, introductory paragraph, FAQ section (3-4 questions), conclusion with CTA
- 800-1000 words
- Write directly to the named target audience for this topic. Address their pain points and reading-level. State who the article is for in the intro.
- Return HTML content only (h2, h3, p, ul, li, blockquote, strong). No wrapper div, no article tag.
- This is an EXAMPLE article to show what the content plan will deliver. Mark it clearly as an example.
- At the very end, add a comment block with SEO metadata in this exact format:
  <!-- SEO_META
  title_tag: [55-60 char title tag with primary keyword]
  meta_description: [150-160 char meta description with primary keyword and CTA]
  primary_keyword: [main target keyword]
  secondary_keywords: [2-3 related keywords, comma separated]
  -->

Write an article titled "${topic}" for ${sources.clientName}.

Context:
${context}${buildSharedContextBlocks(sources)}`,
        },
      ],
    }));

    const html = extractText(res);
    if (html) {
      // Extract SEO metadata from comment block if present
      const seoMatch = html.match(/<!--\s*SEO_META\s*\n([\s\S]*?)-->/);
      let seoMeta: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } | undefined;
      if (seoMatch) {
        const lines = seoMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        const meta: Record<string, string> = {};
        for (const line of lines) {
          const [key, ...rest] = line.split(":");
          if (key && rest.length) meta[key.trim()] = rest.join(":").trim();
        }
        seoMeta = {
          titleTag: meta.title_tag,
          metaDescription: meta.meta_description,
          primaryKeyword: meta.primary_keyword,
          secondaryKeywords: meta.secondary_keywords?.split(",").map(s => s.trim()),
        };
      }
      // Strip the SEO comment from the HTML
      const cleanHtml = html.replace(/<!--\s*SEO_META\s*\n[\s\S]*?-->/, "").trim();
      articles.push({ title: topic as string, html: cleanHtml, seoMeta });
    }
  }

  return articles;
}

// ─── Google Ads ad copy generator ───────────────────────────────────────────

async function generateGoogleAdsAdCopy(
  anthropic: Anthropic,
  adGroups: AdGroup[],
  context: string,
  sources: GrandPlanSources,
): Promise<{ name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[]; isFallback?: boolean } }[]> {
  // Pick the highest-volume keywords per group so the AI gets meaningful
  // commercial intent signals rather than whatever was stored first.
  const groupList = adGroups
    .map((g) => {
      const top = [...g.keywords]
        .filter((k) => (k.volume ?? 0) > 0)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, 8);
      // Fallback to whatever exists if every keyword is zero-volume
      const list = top.length > 0 ? top : g.keywords.slice(0, 5);
      const formatted = list
        .map((k) => k.volume ? `${k.keyword} (${k.volume.toLocaleString()}/mo${k.cpc ? `, £${k.cpc.toFixed(2)} CPC` : ""})` : k.keyword)
        .join(", ");
      return `${g.name}: ${formatted}`;
    })
    .join("\n");

  const HEADLINE_LIMIT = 30;
  const DESC_LIMIT = 90;
  const SITELINK_LIMIT = 25;

  // Pull any explicit "avoid X" constraints out of the brief so the AI
  // doesn't use prohibited language in copy (e.g. "no scholarship language").
  const briefNegatives = parseBriefNegatives(sources.clientBrief ?? "");

  const buildPrompt = (feedback?: string) => `You are a Google Ads specialist at i3media. Write Responsive Search Ad copy for each ad group below.

Return a JSON object with key "adGroups" containing an array. Each item:
- name: string (must match the ad group name exactly)
- headlines: string[] (15 headlines, STRICTLY max ${HEADLINE_LIMIT} characters each — count carefully)
- descriptions: string[] (4 descriptions, STRICTLY max ${DESC_LIMIT} characters each)
- sitelinks: string[] (4-6 sitelink labels, max ${SITELINK_LIMIT} chars each)

Rules:
- British English. No AI jargon. Be direct and benefit-led.
- Vary headlines between: primary keyword inclusion, benefit statement, USP, CTA, social proof.
- Speak to the named target audiences provided in the context — at least 3 headlines per group should reference an audience pain point or moment.
- Descriptions expand on the proposition with a call to action.
- If campaign focus periods list specific dates or windows, include at least one headline or description per group that references the nearest upcoming period to drive urgency.
- Character limits are HARD limits — count every character including spaces. Anything over will be rejected by Google.${briefNegatives.length ? `\n- EXCLUDED TERMS (must NOT appear in any headline, description, or sitelink): ${briefNegatives.join(", ")}` : ""}
- Return ONLY valid JSON, no markdown fences.${feedback ? `\n\nIMPORTANT — your previous attempt was invalid:\n${feedback}\nFix these issues and try again.` : ""}

Client: ${sources.clientName}
Brief: ${sources.clientBrief ?? sources.keywordResearch?.brief ?? ""}

Ad groups and top keywords:
${groupList}

Context:
${context}${buildSharedContextBlocks(sources)}`;

  type RawGroup = {
    name?: string;
    headlines?: unknown;
    descriptions?: unknown;
    sitelinks?: unknown;
    adCopy?: { headlines?: unknown; descriptions?: unknown; sitelinks?: unknown };
  };

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const normalise = (groups: RawGroup[]) =>
    groups.map((g) => {
      const src = g.adCopy ?? g; // accept both flat and nested shapes
      return {
        name: String(g.name ?? "").trim(),
        headlines: toStringArray(src.headlines),
        descriptions: toStringArray(src.descriptions),
        sitelinks: toStringArray(src.sitelinks),
      };
    });

  const collectViolations = (
    groups: { name: string; headlines: string[]; descriptions: string[]; sitelinks: string[] }[],
  ) => {
    const issues: string[] = [];
    for (const g of groups) {
      const overH = g.headlines.filter((h) => h.length > HEADLINE_LIMIT);
      const overD = g.descriptions.filter((d) => d.length > DESC_LIMIT);
      const overS = g.sitelinks.filter((s) => s.length > SITELINK_LIMIT);
      if (overH.length) issues.push(`Ad group "${g.name}": ${overH.length} headline(s) exceed ${HEADLINE_LIMIT} chars: ${overH.map((h) => `"${h}" (${h.length})`).join(", ")}`);
      if (overD.length) issues.push(`Ad group "${g.name}": ${overD.length} description(s) exceed ${DESC_LIMIT} chars`);
      if (overS.length) issues.push(`Ad group "${g.name}": ${overS.length} sitelink(s) exceed ${SITELINK_LIMIT} chars`);
    }
    return issues;
  };

  let lastNormalised: { name: string; headlines: string[]; descriptions: string[]; sitelinks: string[] }[] = [];
  let feedback: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await withAnthropicRetry(`googleAdsAdCopy:${attempt}`, () => anthropic.messages.create({
      model: MODEL_LIGHT,
      max_tokens: 3000,
      messages: [{ role: "user", content: buildPrompt(feedback) }],
    }));

    const parsed = safeJsonParse<{ adGroups?: RawGroup[] }>(extractText(res), { adGroups: [] });
    lastNormalised = normalise(parsed.adGroups ?? []);
    const violations = collectViolations(lastNormalised);

    if (violations.length === 0) break;
    feedback = violations.join("\n");
    console.warn(`[grand-plan] Ad copy attempt ${attempt + 1} had ${violations.length} validation issue(s); retrying.`);
  }

  // Final safety net: hard-truncate anything still over limit. If a group
  // came back with no headlines/descriptions at all (AI returned empty), fall
  // back to a deterministic scaffold so the preview block still renders.
  const requested = adGroups.map((g) => g.name);
  const byName = new Map(lastNormalised.map((g) => [g.name, g] as const));
  return requested.map((name) => {
    const g = byName.get(name);
    if (g && g.headlines.length > 0 && g.descriptions.length > 0) {
      return {
        name,
        adCopy: {
          headlines: g.headlines.map((h) => h.slice(0, HEADLINE_LIMIT)),
          descriptions: g.descriptions.map((d) => d.slice(0, DESC_LIMIT)),
          sitelinks: g.sitelinks.map((s) => s.slice(0, SITELINK_LIMIT)),
        },
      };
    }
    // Fallback: build placeholder copy from the ad group name and top keyword
    const adGroup = adGroups.find((ag) => ag.name === name);
    const topKw = adGroup?.keywords.find((k) => (k.volume ?? 0) > 0)?.keyword ?? adGroup?.keywords[0]?.keyword ?? name;
    const client = sources.clientName;
    const fallback = buildFallbackAdCopy(name, topKw, client);
    return {
      name,
      adCopy: {
        ...fallback,
        isFallback: true,
      },
    };
  });
}

/** Deterministic ad copy scaffold used when the AI returns nothing usable. */
function buildFallbackAdCopy(adGroupName: string, topKeyword: string, clientName: string): { headlines: string[]; descriptions: string[]; sitelinks: string[] } {
  const cap = (s: string, n: number) => s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
  const kw = cap(topKeyword, 24);
  const brand = cap(clientName, 18);
  const headlines = [
    cap(kw, 30),
    cap(`${kw} — Get a Quote`, 30),
    cap(`Trusted ${brand} Service`, 30),
    cap(`Book ${kw} Today`, 30),
    cap(`UK ${kw} Specialists`, 30),
    cap(`Speak To Our Team`, 30),
    cap(`Free, No-Obligation Quote`, 30),
    cap(`Rated By Real Customers`, 30),
    cap(`${brand} — UK Wide`, 30),
    cap(`Same-Day Response`, 30),
    cap(`Fast & Friendly Service`, 30),
    cap(`Local Experts You Can Trust`, 30),
    cap(`Get Started Online`, 30),
    cap(`Tailored To Your Brief`, 30),
    cap(`Talk To A Specialist`, 30),
  ];
  const descriptions = [
    cap(`Looking for ${kw}? ${brand} delivers a clear, professional service. Get in touch today for a free quote.`, 90),
    cap(`Friendly, expert ${kw} from ${brand}. UK customers trust us for quality work and clear pricing.`, 90),
    cap(`Need help with ${kw}? Our team is ready to talk. Quick response, no pressure, honest advice.`, 90),
    cap(`${brand} makes ${kw} simple. Tell us what you need and we will come back with a tailored plan.`, 90),
  ];
  const sitelinks = [cap("Get a Quote", 25), cap("About Us", 25), cap("Contact", 25), cap("How It Works", 25)];
  return { headlines, descriptions, sitelinks };
}

// ─── Media plan AI generator ────────────────────────────────────────────────

/** Map an enabledSections key to the canonical media-plan channel name. */
const PLATFORM_CHANNEL_MAP: Record<string, string> = {
  googleAdsCampaigns: "Google Ads",
  metaCampaigns: "Meta Ads",
  linkedInAds: "LinkedIn Ads",
  organicSocial: "Organic Social",
  emailMarketing: "Email Marketing",
};

/** Platform IDs considered "paid". Anything else is owned/earned. */
const PAID_PLATFORM_IDS = ["googleAdsCampaigns", "metaCampaigns", "linkedInAds"] as const;

/** UK-market CPL benchmarks used to ground media-plan AI suggestions. */
const SECTOR_CHANNEL_BENCHMARKS: Record<string, string> = {
  dental:                "Google Search CPL £25-£60, Meta CPL £15-£40, LinkedIn limited reach for consumer dental",
  ecommerce:             "Google Shopping/Search ROAS 3-6x, Meta CPA £20-£60, TikTok CPA £15-£45 for younger SKUs",
  industrial:            "Google Search CPL £40-£120, LinkedIn CPL £80-£250, Meta less effective for B2B specs",
  charities:             "Meta CPL £8-£25 for donor acquisition, Google Grants for free search where eligible",
  healthcare:            "Google Search CPL £35-£90, Meta CPL £20-£50, regulated copy required",
  hospitality:           "Meta CPA £8-£25 for bookings, Google Search strong for branded + intent terms",
  professional_services: "LinkedIn CPL £100-£300, Google Search CPL £40-£150",
  saas:                  "LinkedIn CPL £80-£250, Google Search CPL £30-£120, retargeting essential",
  education:             "Meta CPL £10-£40, Google Search CPL £20-£70 for course terms",
};

/** Derive the list of enabled platform section keys from the user's selection. */
function deriveEnabledPlatforms(enabledSections?: string[]): string[] {
  if (!enabledSections) return Object.keys(PLATFORM_CHANNEL_MAP);
  return Object.keys(PLATFORM_CHANNEL_MAP).filter((k) => enabledSections.includes(k));
}

/** Deterministic budget split used when the AI returns nothing usable. */
function buildFallbackMediaPlan(
  totalBudget: number,
  enabledPlatforms: string[],
  forecast?: { cost: number; conversions: number; avgCpa: number; monthlyBudget: number },
): { name: string; budget: number; percentage: number; strategy: string }[] {
  const platforms = enabledPlatforms.length > 0 ? enabledPlatforms : Object.keys(PLATFORM_CHANNEL_MAP);
  // Default weights — Google Ads gets the largest share when available because
  // it's the only channel we have a real forecast for.
  const WEIGHTS: Record<string, number> = {
    googleAdsCampaigns: forecast && forecast.cost > 0 ? 5 : 4,
    metaCampaigns: 3,
    linkedInAds: 2,
    organicSocial: 1,
    emailMarketing: 1,
  };
  const totalWeight = platforms.reduce((s, p) => s + (WEIGHTS[p] ?? 1), 0);
  const channels = platforms.map((p) => {
    const w = WEIGHTS[p] ?? 1;
    const budget = Math.round((w / totalWeight) * totalBudget);
    return {
      name: PLATFORM_CHANNEL_MAP[p],
      budget,
      percentage: Math.round((w / totalWeight) * 100),
      strategy: p === "googleAdsCampaigns" && forecast && forecast.cost > 0
        ? `Anchored on the keyword forecast: ~${forecast.conversions} conversions/month at ~£${Math.round(forecast.avgCpa)} CPA on a £${forecast.monthlyBudget.toLocaleString()} budget. Capture in-market demand first.`
        : "Allocation derived from default weighting. Review with a strategist before committing budget.",
    };
  });
  return channels;
}

async function generateMediaPlanChannels(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources,
  options: {
    enabledPlatforms: string[];
    paidOnly: boolean;
    googleAdsForecast?: { cost: number; conversions: number; avgCpa: number; monthlyBudget: number; clicks: number; ctr: number; avgCpc: number };
  },
): Promise<{ name: string; budget: number; percentage: number; strategy: string }[]> {
  const totalBudget = sources.mediaPlan?.totalBudget ?? 10000;
  const objective = sources.mediaPlan?.objective ?? "lead_gen";
  const { enabledPlatforms, paidOnly, googleAdsForecast } = options;

  const allowedChannelNames = enabledPlatforms.map((p) => PLATFORM_CHANNEL_MAP[p]).filter(Boolean);
  const benchmarks = SECTOR_CHANNEL_BENCHMARKS[sources.sector ?? ""] ?? "Use prevailing UK market benchmarks for the objective.";

  const forecastBlock = googleAdsForecast && googleAdsForecast.cost > 0 ? `

Google Ads forecast (already computed from the keyword research — use this to anchor the Google Ads line):
- Modelled monthly spend: £${googleAdsForecast.cost.toLocaleString()}
- Modelled clicks: ${googleAdsForecast.clicks.toLocaleString()}
- Modelled conversions: ${googleAdsForecast.conversions.toLocaleString()}
- Modelled CPA: £${Math.round(googleAdsForecast.avgCpa).toLocaleString()}
- Avg CPC: £${googleAdsForecast.avgCpc.toFixed(2)}
- Forecast budget cap: £${googleAdsForecast.monthlyBudget.toLocaleString()}/month
The Google Ads line MUST sit between £${Math.round(googleAdsForecast.cost * 0.85).toLocaleString()} and £${Math.round(googleAdsForecast.monthlyBudget * 1.1).toLocaleString()} unless you justify deviating in the strategy text.` : "";

  const modeBlock = paidOnly
    ? "\n\nMODE: paid-only. The strategist has explicitly requested PAID channels only. Do NOT include SEO, organic social, email, content marketing or any other earned/owned line."
    : "\n\nMODE: blended. Include the requested mix of paid + owned channels.";

  const channelConstraint = `

Allowed channels (you MUST choose ONLY from this list — the strategist has unticked anything not listed):
${allowedChannelNames.map((c) => `- ${c}`).join("\n")}`;

  const res = await withAnthropicRetry("mediaPlanChannels", () => anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 2200,
    messages: [
      {
        role: "user",
        content: `You are a senior media planner at i3media. Generate a channel allocation for a digital marketing media plan.

Total monthly budget: £${totalBudget.toLocaleString()}
Objective: ${objective.replace(/_/g, " ")}
Sector benchmarks: ${benchmarks}${modeBlock}${channelConstraint}${forecastBlock}

Return a JSON object with key "channels" containing an array. Each channel:
- name: string (must match one of the allowed channel names exactly)
- budget: number (in £, must sum to the total budget — round to whole pounds)
- percentage: number (0-100, must sum to 100, integer)
- strategy: string (2-3 sentences — must reference (a) which named audience this channel reaches, (b) why this share of budget is right given the forecast / benchmarks, (c) the primary KPI for the channel)

Rules:
- Use ONLY the allowed channels listed above. Do not invent additional channels. Do not split a single platform into multiple lines.
- Budgets MUST sum to £${totalBudget.toLocaleString()} exactly. Percentages MUST sum to 100.
- Anchor the Google Ads line on the forecast above when present. If the forecast cost is below the total budget, the surplus goes to other allowed channels in priority order.
- The strategy text MUST cite the forecast numbers (CPA, conversions) for Google Ads, and cite UK CPL/CPA benchmarks for other paid channels.
- British English. No AI jargon. No em dashes. No semicolons.
- Return ONLY valid JSON, no markdown fences.

Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  try {
    const parsed = JSON.parse(extractText(res));
    const allowed = new Set(allowedChannelNames);
    const channels = (parsed.channels ?? [])
      .map((ch: { name?: string; budget?: number; percentage?: number; strategy?: string }) => ({
        name: ch.name ?? "Unknown",
        budget: ch.budget ?? 0,
        percentage: ch.percentage ?? 0,
        strategy: ch.strategy ?? "",
      }))
      // Strip anything outside the allowed list — protects against the AI
      // sneaking in SEO/Email when paid-only was requested.
      .filter((ch: { name: string }) => allowed.size === 0 || allowed.has(ch.name));

    if (channels.length === 0) {
      console.warn("[grand-plan] Media plan AI returned no usable channels; using deterministic fallback.");
      return buildFallbackMediaPlan(totalBudget, enabledPlatforms, googleAdsForecast);
    }
    return channels;
  } catch {
    console.warn("[grand-plan] Media plan AI JSON parse failed; using deterministic fallback.");
    return buildFallbackMediaPlan(totalBudget, enabledPlatforms, googleAdsForecast);
  }
}

// ─── Anthropic helper ───────────────────────────────────────────────────────

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text.trim() : "";
  // Strip markdown fencing if present (any language: json, html, markdown, etc.)
  const stripped = raw.replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "");
  return cleanEmDashes(stripped);
}

/**
 * Post-processes AI output to remove em-dashes (and en-dashes used as em-dashes).
 * Claude follows the "no em-dash" prompt rule only ~70% of the time, so we enforce it here.
 * Preserves number ranges like "10–20" or "9-5" by only replacing dashes surrounded by spaces
 * or where a sentence pause is clearly intended.
 */
export function cleanEmDashes(text: string): string {
  if (!text) return text;
  return text
    // " — " or " – " (em/en-dash with surrounding spaces) → ", "
    .replace(/\s+[—–]\s+/g, ", ")
    // Em-dash with no spaces between words (e.g. "fast—reliable") → ", "
    .replace(/([a-zA-Z]),?\s*[—]\s*([a-zA-Z])/g, "$1, $2")
    // Stray em-dashes left over → ", "
    .replace(/—/g, ", ");
}

/**
 * Universal style rules prepended to every Grand Plan AI prompt.
 * Centralises tone, voice, and formatting standards so we don't repeat them everywhere.
 */
export const STYLE_RULES = `STYLE RULES (apply to every output):
- British English spelling (optimise, organise, colour, programme, behaviour).
- Plain-text dashes only: use commas, full stops, or "and". Never use em-dashes (—) or en-dashes (–) as punctuation.
- Active voice. Concrete numbers and verbs. No filler phrases ("in today's fast-paced world", "leverage synergies").
- Speak as the agency planning the work for the client. Avoid first-person plural waffle ("we will work tirelessly to...").
- No marketing clichés. No exclamation marks unless quoting an ad headline.
`;

// ─── Structured data builders (no AI needed) ────────────────────────────────

// ─── Sector-aware settings ───────────────────────────────────────────────────

const SECTOR_NEGATIVES: Record<string, string[]> = {
  dental:                ["NHS", "NHS dentist", "free dental", "dental school", "dental nurse", "dental hygienist jobs"],
  ecommerce:             ["wholesale", "dropshipping", "alibaba", "sample"],
  industrial:            ["training", "apprenticeship", "course", "certification"],
  charities:             ["volunteering", "intern", "work experience"],
  healthcare:            ["NHS waiting list", "NHS referral", "free treatment", "GP referral"],
  hospitality:           ["jobs", "work", "employment", "training course"],
  professional_services: ["course", "certification", "how to become"],
  saas:                  ["open source", "free alternative", "vs", "comparison"],
  education:             ["free course", "YouTube", "reddit"],
};

const SECTOR_AD_SCHEDULE: Record<string, string> = {
  dental:                "Mon-Sat, 8am-8pm",
  ecommerce:             "All week, 7am-11pm",
  industrial:            "Mon-Fri, 7am-6pm",
  charities:             "All week, 6am-11pm",
  healthcare:            "Mon-Sat, 7am-9pm",
  hospitality:           "All week, 8am-10pm",
  professional_services: "Mon-Fri, 8am-7pm",
  saas:                  "Mon-Fri, 8am-8pm",
  education:             "All week, 8am-10pm",
};

const BASE_NEGATIVES = ["free", "cheap", "DIY", "job", "jobs", "career", "salary", "reddit", "forum", "template", "download"];

/**
 * Parse the client brief for explicit negative term instructions
 * (e.g. "Avoid 'scholarship' language entirely" → ["scholarship"]).
 */
function parseBriefNegatives(brief: string): string[] {
  const negatives = new Set<string>();
  const patterns = [
    /\bavoid(?:ing)?\s+['"]?([a-z][^'",.]{1,50})['"]?/gi,
    /\bdo\s+not\s+(?:use|include|reference|mention)\s+['"]?([a-z][^'",.]{1,50})['"]?/gi,
    /\bno\s+['"]([^'"]{1,50})['"]?\s+(?:language|keywords?|terms?|messaging|copy)/gi,
    /\bexclude\s+['"]?([a-z][^'",.]{1,50})['"]?/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(brief)) !== null) {
      negatives.add(m[1].trim().toLowerCase());
    }
  }
  return [...negatives];
}

/**
 * Detect the primary target geography from the client brief.
 * Defaults to "United Kingdom" when no signals are found.
 */
function detectLocations(brief?: string): string {
  if (!brief) return "United Kingdom";
  const l = brief.toLowerCase();
  if (l.includes("europe") && !l.includes("uk only")) return "Europe";
  if (l.includes("international") || l.includes("worldwide") || l.includes("global")) return "International";
  if (l.includes("uk and ireland") || l.includes("uk & ireland")) return "United Kingdom, Republic of Ireland";
  return "United Kingdom";
}

function buildGoogleAdsCampaigns(adGroups: AdGroup[], sources: GrandPlanSources, adCopyData: { name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[]; isFallback?: boolean } }[]) {
  const adCopyMap = new Map(adCopyData.map((d) => [d.name, d.adCopy]));
  const sector = sources.sector ?? "";
  const sectorNegs = SECTOR_NEGATIVES[sector] ?? [];
  const briefNegs = parseBriefNegatives(sources.clientBrief ?? "");
  const allNegatives = [...new Set([...BASE_NEGATIVES, ...sectorNegs, ...briefNegs])];
  const adSchedule = SECTOR_AD_SCHEDULE[sector] ?? "Mon-Fri, 7am-9pm";

  return {
    campaignName: `${sources.clientName} — Search`,
    overview: {
      "Campaign Type": "Search",
      "Goal": "Conversions",
      "Bidding": "Maximise Conversions",
      "Budget": sources.keywordResearch?.monthlyBudget ? `£${sources.keywordResearch.monthlyBudget}/month` : "TBC",
      "Locations": detectLocations(sources.clientBrief),
      "Language": "English",
      "Ad Schedule": adSchedule,
      "Conversion Tracking": "Website form submissions, phone calls",
      "Networks": "Search Network only",
      "Max CPC": sources.keywordResearch?.maxCpc ? `£${sources.keywordResearch.maxCpc}` : "Auto",
    },
    negativeKeywords: allNegatives,
    adGroups: adGroups.map((g) => {
      // Drop zero/null-volume keywords — they don't deserve real estate in the
      // ad group breakdown. If everything is zero (rare), keep the original
      // list so the strategist still sees something. Sort by volume desc.
      const filtered = g.keywords
        .filter((k) => (k.volume ?? 0) > 0)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
      const hiddenCount = g.keywords.length - filtered.length;
      const visible = filtered.length > 0 ? filtered : g.keywords;
      return {
        name: g.name,
        keywords: visible.map((k) => ({
          keyword: k.keyword,
          matchType: k.matchType || "broad" as const,
          volume: k.volume,
          cpc: k.cpc,
        })),
        hiddenLowVolumeCount: filtered.length > 0 ? hiddenCount : 0,
        adCopy: adCopyMap.get(g.name),
      };
    }),
  };
}

function buildKeywordResearchSection(adGroups: AdGroup[]) {
  return {
    adGroups: adGroups.map((g) => {
      const filtered = g.keywords
        .filter((k) => (k.volume ?? 0) > 0)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
      const hiddenCount = g.keywords.length - filtered.length;
      const visible = filtered.length > 0 ? filtered : g.keywords;
      return {
        name: g.name,
        keywords: visible.map((k) => ({
          keyword: k.keyword,
          volume: k.volume,
          cpc: k.cpc,
        })),
        hiddenLowVolumeCount: filtered.length > 0 ? hiddenCount : 0,
      };
    }),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContentStrategySection(contentData: any) {
  // Map intent strings from the source spreadsheet to the canonical short codes
  // used by the renderer's coloured intent badges.
  const normaliseIntent = (raw: unknown): "awareness" | "commercial" | "decision" | undefined => {
    if (typeof raw !== "string") return undefined;
    const v = raw.toLowerCase();
    if (v.includes("decis") || v.includes("transact") || v.includes("convers")) return "decision";
    if (v.includes("comm") || v.includes("consider") || v.includes("eval")) return "commercial";
    if (v.includes("aware") || v.includes("info") || v.includes("educat")) return "awareness";
    return undefined;
  };
  const enrich = (entry: ContentStrategyEntry, tier: ContentStrategyEntry["tier"]): ContentStrategyEntry => ({
    ...entry,
    tier,
    intent: entry.intent ?? normaliseIntent(entry.keywords?.[0]?.intent) ?? (tier === "pillar" ? "decision" : tier === "mega" ? "awareness" : "commercial"),
    brief: entry.brief ?? entry.notes,
  });
  const landingPages = (contentData.landingPages ?? []) as ContentStrategyEntry[];
  const blogPosts = (contentData.blogPosts ?? []) as ContentStrategyEntry[];
  const pageOptimisations = (contentData.pageOptimisations ?? []) as ContentStrategyEntry[];
  return {
    pageOptimisations,
    landingPages: landingPages.map((p, i) => enrich(p, i === 0 ? "pillar" : "mega")),
    blogPosts: blogPosts.map((p) => enrich(p, "article")),
  };
}

// ─── Email Marketing generator ──────────────────────────────────────────────

async function generateEmailMarketing(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<GroundedSection<EmailMarketingPlan>> {
  const a = sources.accountData;
  const cv = sources.customerVoice;
  // Derive grounding: real if we have GA4 conversion-by-channel data showing
  // email/owned activity OR customer voice; partial if just one; ai-only otherwise.
  const hasChannelData = !!a?.ga4?.conversionsByChannel?.some((c) => /email|newsletter|mailchimp|klaviyo|hubspot/i.test(c.channel));
  const hasCustomerVoice = !!cv?.painPoints?.length;
  const grounding: DataGrounding = hasChannelData && hasCustomerVoice ? "real" : hasChannelData || hasCustomerVoice ? "partial" : "ai-only";
  const sourceLabels: string[] = [];
  if (hasChannelData) sourceLabels.push("GA4 channel conversions");
  if (hasCustomerVoice) sourceLabels.push("Customer voice (web search)");

  const res = await withAnthropicRetry("emailMarketing", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `You are an email marketing strategist at i3media. Create an email marketing plan for this client.

Return a JSON object:
- flows: array of { name: string, trigger: string, emails: [{ subject: string, purpose: string, delay: string }] } — 3-5 automated flows
- campaigns: array of { name: string, frequency: string, audience: string, objectiveText: string } — 4-6 regular campaigns
- segmentation: { segments: [{ name: string, criteria: string, purpose: string }] } — 4-6 audience segments

Rules:
- Flows must include: Welcome sequence, Abandoned cart/enquiry, Re-engagement, and sector-appropriate triggers
- Campaigns should mix promotional, educational, and nurture content
- Segments MUST mirror the named target audiences where possible (use the same names) and include at least one behavioural segment.
- Each campaign's audience field must reference a real named audience, not "all subscribers".
- ${hasCustomerVoice ? "Subject lines and email purposes MUST echo the real customer pain points listed in the context. Use the actual frustrations as hooks." : ""}
- ${hasChannelData ? "Anchor your campaign cadence in the actual conversion volume from GA4 — do not promise more activity than the data supports." : ""}
- ${sources.sector === "ecommerce" ? "Include post-purchase, browse abandonment, VIP/loyalty flows" : sources.sector === "charities" ? "Include donation receipt, Ramadan series, impact updates" : "Include lead nurture, case study digest, service update flows"}
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  return {
    value: safeJsonParse(extractText(res), {
      flows: [],
      campaigns: [],
      segmentation: { segments: [] },
    }),
    grounding,
    sourceLabels,
  };
}

// ─── LinkedIn Ads generator ─────────────────────────────────────────────────

async function generateLinkedInAds(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<GroundedSection<LinkedInCampaign[]>> {
  const a = sources.accountData;
  const hasLinkedInTraffic = !!a?.ga4?.trafficSources?.some((s) => /linkedin/i.test(s.source));
  const hasAudienceJobTitles = !!sources.targetAudiences;
  const grounding: DataGrounding = hasLinkedInTraffic && hasAudienceJobTitles ? "real" : hasLinkedInTraffic || hasAudienceJobTitles ? "partial" : "ai-only";
  const sourceLabels: string[] = [];
  if (hasLinkedInTraffic) sourceLabels.push("GA4 LinkedIn referral data");
  if (hasAudienceJobTitles) sourceLabels.push("Strategist-supplied audiences");

  const res = await withAnthropicRetry("linkedInAds", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `You are a LinkedIn Ads specialist at i3media. Create LinkedIn advertising campaign structures.

Return a JSON object with key "campaigns" containing an array of 2-3 campaign objects:
- campaignName: string
- objective: string (brand awareness, website visits, lead generation, engagement)
- budget: string (monthly budget recommendation)
- format: string (single image, carousel, video, document, conversation ad, message ad)
- audienceTargeting: { jobTitles: string[], industries: string[], companySize: string, seniority: string[] }
- adCreatives: array of { headline: string (max 70 chars), introText: string (max 150 chars), description: string (optional, max 100 chars), cta: string }

Rules:
- One campaign should focus on lead gen, one on awareness/thought leadership
- Audience targeting MUST be derived from the named target audiences (use their job titles, seniority, industries)
- Headlines and intro text must speak to the audience by their role and pain point
- ${sources.sector === "industrial" || sources.sector === "professional_services" ? "LinkedIn is a primary channel — make campaigns comprehensive" : sources.sector === "ecommerce" || sources.sector === "dental" ? "LinkedIn is secondary for this sector — focus on brand building and partnerships" : "LinkedIn campaigns should target decision makers"}
- Strictly respect character limits: headline ≤70, intro ≤150, description ≤100
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const parsed = safeJsonParse(extractText(res), { campaigns: [] });
  const campaigns = (parsed.campaigns ?? []) as LinkedInCampaign[];
  let value: LinkedInCampaign[];
  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    value = buildFallbackLinkedInCampaigns(sources);
  } else {
    value = campaigns.map((c) => ({
      ...c,
      adCreatives: (c.adCreatives ?? []).map((ad) => ({
        ...ad,
        headline: (ad.headline ?? "").slice(0, 70),
        introText: (ad.introText ?? "").slice(0, 150),
        description: ad.description ? ad.description.slice(0, 100) : undefined,
      })),
    }));
  }
  return { value, grounding, sourceLabels };
}

function buildFallbackLinkedInCampaigns(sources: GrandPlanSources): LinkedInCampaign[] {
  const client = sources.clientName;
  return [
    {
      campaignName: `${client} — Lead Gen`,
      objective: "lead generation",
      budget: "£1,000–£2,000/month",
      format: "single image",
      audienceTargeting: {
        jobTitles: ["Marketing Manager", "Director", "Head of Marketing"],
        industries: ["Marketing & Advertising", "Professional Services"],
        companySize: "11–500 employees",
        seniority: ["Manager", "Director", "VP"],
      },
      adCreatives: [
        {
          headline: `${client} — trusted UK partner`.slice(0, 70),
          introText: `See how ${client} helps teams like yours achieve more.`.slice(0, 150),
          cta: "Learn More",
        },
      ],
      isFallback: true,
    },
    {
      campaignName: `${client} — Thought Leadership`,
      objective: "brand awareness",
      budget: "£500–£1,000/month",
      format: "document",
      audienceTargeting: {
        jobTitles: ["Founder", "Owner", "CEO"],
        industries: ["Marketing & Advertising"],
        companySize: "1–200 employees",
        seniority: ["Owner", "Founder", "C-Level"],
      },
      adCreatives: [
        {
          headline: `Insights from ${client}`.slice(0, 70),
          introText: "Practical guidance from our team — download the latest report.".slice(0, 150),
          cta: "Download",
        },
      ],
      isFallback: true,
    },
  ];
}

// ─── Competitor Intelligence generator ──────────────────────────────────────

async function generateCompetitorIntel(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<GroundedSection<CompetitorInsight[]>> {
  const website = sources.keywordResearch?.website ?? "";
  const brief = sources.clientBrief ?? sources.keywordResearch?.brief ?? "";
  const realCompetitors = sources.accountData?.competitorData ?? [];
  const customerComplaints = sources.customerVoice?.competitorComplaints ?? [];

  // If we have real SEMrush competitor snapshots from the prepare-research
  // step, use those as the spine — just have the AI add strengths/weaknesses
  // commentary anchored to the real numbers and customer complaints.
  if (realCompetitors.length > 0) {
    const competitorBlock = realCompetitors
      .map((c) => `${c.domain}: ${c.organicTraffic.toLocaleString()} organic visits/mo, ${c.organicKeywords.toLocaleString()} keywords, ${c.paidKeywords.toLocaleString()} paid keywords, ${c.backlinks.toLocaleString()} backlinks. Top keywords: ${c.topKeywords.slice(0, 6).join(", ")}`)
      .join("\n");
    const complaintBlock = customerComplaints.length
      ? `\n\nReal customer complaints about competitors in this sector (use these to seed the weaknesses fields):\n- ${customerComplaints.slice(0, 8).join("\n- ")}`
      : "";
    const res = await withAnthropicRetry("competitorIntel:enrich", () => anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: `You are a competitive intelligence analyst at i3media. The real SEMrush data for each competitor is provided below — your job is ONLY to add the strengths and weaknesses commentary. Do NOT change the numeric fields.

Return a JSON object with key "competitors" containing one entry per competitor below, in the same order. Each entry:
- domain: string (must match exactly)
- strengths: string[] (2-3 specific competitive strengths grounded in the real data — e.g. "Ranks page 1 for 12 commercial keywords we target")
- weaknesses: string[] (2-3 areas where ${sources.clientName} could beat them, drawing on the customer complaints below where possible)

Competitor data (verified SEMrush snapshot):
${competitorBlock}${complaintBlock}

Client context:
${context}${buildSharedContextBlocks(sources)}

Rules: British English, no AI jargon, no fluff. Each strength/weakness must reference a specific number, keyword, or complaint — no platitudes. Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    }));
    const parsed = safeJsonParse<{ competitors?: { domain?: string; strengths?: string[]; weaknesses?: string[] }[] }>(extractText(res), { competitors: [] });
    const enriched = parsed.competitors ?? [];
    const value: CompetitorInsight[] = realCompetitors.map((c) => {
      const match = enriched.find((e) => e.domain && e.domain.toLowerCase().includes(c.domain.toLowerCase().replace(/^www\./, "")));
      return {
        domain: c.domain,
        organicTraffic: c.organicTraffic,
        organicKeywords: c.organicKeywords,
        paidKeywords: c.paidKeywords,
        backlinks: c.backlinks,
        topKeywords: c.topKeywords.slice(0, 8),
        strengths: Array.isArray(match?.strengths) ? match!.strengths : [],
        weaknesses: Array.isArray(match?.weaknesses) ? match!.weaknesses : [],
      };
    });
    return {
      value,
      grounding: "real",
      sourceLabels: ["SEMrush domain overview", customerComplaints.length ? "Customer voice (web search)" : ""].filter(Boolean) as string[],
    };
  }

  // No real data — fall back to AI estimates (renderer surfaces the disclaimer).
  const res = await withAnthropicRetry("competitorIntel", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `You are a competitive intelligence analyst at i3media. Identify and analyse the top competitors for this client.

Return a JSON object with key "competitors" containing an array of 4-6 competitor objects:
- domain: string (competitor website URL)
- organicTraffic: number (estimated monthly organic visits — LABEL CLEARLY AS APPROXIMATE)
- organicKeywords: number (estimated number of ranking keywords)
- paidKeywords: number (estimated number of PPC keywords)
- backlinks: number (estimated backlink count)
- topKeywords: string[] (5-8 keywords they rank well for)
- strengths: string[] (2-3 competitive strengths)
- weaknesses: string[] (2-3 areas where the client could beat them)

IMPORTANT: All numeric estimates here are AI approximations, NOT verified third-party data. Be conservative — do not claim precision you do not have. The client will see a disclaimer to that effect.

Rules:
- Identify REAL competitors in this sector and geography (UK market)
- If you genuinely do not know likely competitors, return fewer entries rather than fabricating
- Strengths and weaknesses should be actionable — things the client can actually exploit
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Website: ${website}
Brief: ${brief}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const parsed = safeJsonParse(extractText(res), { competitors: [] });
  return {
    value: parsed.competitors ?? [],
    grounding: customerComplaints.length ? "partial" : "ai-only",
    sourceLabels: customerComplaints.length ? ["Customer voice (web search)"] : [],
  };
}

// ─── Audience generator ──────────────────────────────────────────────────────

async function generateAudiences(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources
): Promise<GroundedSection<AudienceItem[]>> {
  const cv = sources.customerVoice;
  const a = sources.accountData;
  const hasGa4Audience = !!(a?.ga4?.demographics?.length || a?.ga4?.devices?.length);
  const hasGscIntent = !!a?.searchConsole?.topQueries?.length;
  const hasCustomerVoice = !!cv?.painPoints?.length;
  const sourceLabels: string[] = [];
  if (sources.targetAudiences) sourceLabels.push("Strategist-supplied audiences");
  if (hasGa4Audience) sourceLabels.push("GA4 demographics & devices");
  if (hasGscIntent) sourceLabels.push("Search Console intent signals");
  if (hasCustomerVoice) sourceLabels.push("Customer voice (web search)");
  // Need at least 2 real signals for "real"; 1 for "partial"; else "ai-only".
  const signalCount = (sources.targetAudiences ? 1 : 0) + (hasGa4Audience ? 1 : 0) + (hasGscIntent ? 1 : 0) + (hasCustomerVoice ? 1 : 0);
  const grounding: DataGrounding = signalCount >= 2 ? "real" : signalCount === 1 ? "partial" : "ai-only";

  if (sources.targetAudiences) {
    // Strategist has provided audiences — parse them rather than regenerate from scratch.
    const lines = sources.targetAudiences.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length) {
      const value = lines.slice(0, 6).map((line) => {
        const sepMatch = line.match(/[:–—]/);
        const sepIdx = sepMatch?.index ?? -1;
        const namePart = sepIdx >= 0 ? line.slice(0, sepIdx) : line;
        const descPart = sepIdx >= 0 ? line.slice(sepIdx + 1).trim() : "";
        // If we have customer voice, sprinkle 2 real pain points per audience.
        const painPoints = cv?.painPoints?.length ? cv.painPoints.slice(0, 3) : [];
        return {
          name: namePart.trim().slice(0, 120),
          description: descPart || "Provided by client strategist.",
          painPoints,
          channels: [],
        } as AudienceItem;
      });
      return { value, grounding, sourceLabels };
    }
  }

  const res = await withAnthropicRetry("audiences", () => anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 2200,
    messages: [
      {
        role: "user",
        content: `You are a senior digital strategist at i3media. Define the target audiences for this client's digital marketing plan.

Rules:
- British English only
- No em dashes, no semicolons
- Be specific and realistic about who this client is trying to reach
- Each audience should reflect a real person or buying group, not a generic demographic label
- Pain points must be grounded in the specific sector context — not generic marketing platitudes
- ${hasCustomerVoice ? "CRITICAL: pain points MUST be drawn from the real customer voice block in the context. Use the actual phrasing from forums and reviews." : ""}
- ${hasGscIntent ? "Use the real Search Console queries listed in the context to inform which audiences are actually showing buying intent right now." : ""}
- The personaQuote must sound like something this person would actually say to a colleague (one sentence, max 25 words, no marketing speak)
- The sectorPreview must reference real keywords, services, and campaign angles that fit this audience and sector
- Return ONLY a valid JSON array, no prose, no markdown fences
- 3 to 5 audiences maximum

Return JSON in this exact format:
[
  {
    "name": "Audience name (short, specific — e.g. 'Practice Managers considering Invisalign')",
    "description": "2-3 sentence description of who they are and what motivates them",
    "personaQuote": "One first-person sentence that sounds like this person speaking, e.g. 'I just need a supplier who turns up, sets up, and doesn't make me look bad in front of the trustees.'",
    "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"],
    "channels": ["Google Search", "Facebook", "Instagram"],
    "sectorPreview": {
      "keywordGroups": [
        { "label": "Short keyword theme (3-4 words)", "samples": "\\"sample keyword 1\\", \\"sample keyword 2\\", \\"sample keyword 3\\"" }
      ],
      "campaignTeasers": [
        { "channel": "Google PPC", "focus": "Brand & Core, Service Terms, Competitor" },
        { "channel": "LinkedIn", "focus": "Job titles + industries this audience holds" },
        { "channel": "Meta", "focus": "Interest targeting + lookalike angles" }
      ]
    }
  }
]
- 3-5 keywordGroups per audience
- 2-3 campaignTeasers per audience (only include channels actually relevant to this client)

Client context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const raw = extractText(res);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return { value: [], grounding, sourceLabels };
    const value = parsed
      .filter((a) => a && typeof a.name === "string")
      .map((a): AudienceItem => ({
        name: String(a.name).trim(),
        description: String(a.description ?? "").trim(),
        painPoints: Array.isArray(a.painPoints) ? a.painPoints.map(String) : [],
        channels: Array.isArray(a.channels) ? a.channels.map(String) : [],
        personaQuote: typeof a.personaQuote === "string" ? a.personaQuote.trim().slice(0, 240) : undefined,
        sectorPreview: a.sectorPreview && typeof a.sectorPreview === "object" ? {
          keywordGroups: Array.isArray(a.sectorPreview.keywordGroups)
            ? a.sectorPreview.keywordGroups
                .filter((g: unknown): g is { label?: unknown; samples?: unknown } => !!g && typeof g === "object")
                .map((g: { label?: unknown; samples?: unknown }) => ({
                  label: String(g.label ?? "").trim(),
                  samples: String(g.samples ?? "").trim(),
                }))
                .filter((g: { label: string; samples: string }) => g.label && g.samples)
            : [],
          campaignTeasers: Array.isArray(a.sectorPreview.campaignTeasers)
            ? a.sectorPreview.campaignTeasers
                .filter((t: unknown): t is { channel?: unknown; focus?: unknown } => !!t && typeof t === "object")
                .map((t: { channel?: unknown; focus?: unknown }) => ({
                  channel: String(t.channel ?? "").trim(),
                  focus: String(t.focus ?? "").trim(),
                }))
                .filter((t: { channel: string; focus: string }) => t.channel && t.focus)
            : [],
        } : undefined,
      }));
    return { value, grounding, sourceLabels };
  } catch {
    return { value: [], grounding, sourceLabels };
  }
}

// ─── Quick Wins (priority actions) generator ────────────────────────────────

async function generateQuickWins(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<QuickWinAction[]> {
  const res = await withAnthropicRetry("quickWins", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior strategist at i3media. Distil the plan below into a prioritised action list — what should be done first, then second, then ongoing.

Return ONLY a JSON array (no markdown fences, no commentary) of 8-10 objects:
{ "title": string, "description": string, "priority": "high" | "medium-high" | "medium" | "ongoing" | "long-term" }

Rules:
- Title is 4-8 words, action-led ("Launch brand search campaign", "Rebuild homepage hero section").
- Description is one short sentence (max 22 words) explaining why and the expected outcome.
- Mix: at least 2 "high" (do first 30 days), 2 "medium-high", 2 "medium", 1-2 "ongoing", 1-2 "long-term".
- Cover paid media, content/SEO, conversion/landing-page, measurement, organic social where relevant.
- Each action must be concrete and reference real assets, channels, or audiences from the plan — no platitudes.
- British English. No AI jargon ("harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly", "robust", "cutting-edge").

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const parsed = safeJsonParse<QuickWinAction[]>(extractText(res), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((a) => a && typeof a.title === "string" && typeof a.description === "string")
    .map((a) => ({
      title: String(a.title).trim(),
      description: String(a.description).trim(),
      priority: ["high", "medium-high", "medium", "ongoing", "long-term"].includes(a.priority)
        ? a.priority
        : "medium",
    }));
}

// ─── KPI / measurement framework generator ──────────────────────────────────

async function generateKpis(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<KpiChannel[]> {
  const res = await withAnthropicRetry("kpis", () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior strategist at i3media. Define the measurement framework — the KPIs the team will report on for each active channel.

Return ONLY a JSON array (no markdown fences) of 4-6 objects:
{ "channel": string, "icon": string, "metrics": [{ "name": string, "target": string }] }

Rules:
- Channel options: "Google Ads", "Meta Ads", "LinkedIn Ads", "SEO & Content", "Organic Social", "Email Marketing", "Website / CRO". Only include channels actually in the plan.
- icon is a single emoji (one character) appropriate for the channel — e.g. "🔍", "📱", "💼", "📈", "📨", "🛒".
- Each channel returns 3-5 metric objects.
- Metric "name" is a short KPI (e.g. "Cost per lead", "Organic sessions", "Email click rate").
- Metric "target" is a specific 90-day target — a number, percentage, or directional change ("£35 max", "+25% MoM", "8-12 leads/month"). Numbers should be sensible for the budget and sector implied by the context.
- Mix acquisition + engagement + conversion KPIs per channel.
- British English. No AI jargon.

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const parsed = safeJsonParse<KpiChannel[]>(extractText(res), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((k) => k && typeof k.channel === "string" && Array.isArray(k.metrics))
    .map((k) => ({
      channel: String(k.channel).trim(),
      icon: typeof k.icon === "string" && k.icon.trim() ? k.icon.trim() : "📊",
      metrics: k.metrics
        .filter((m) => m && typeof m.name === "string" && typeof m.target === "string")
        .map((m) => ({ name: String(m.name).trim(), target: String(m.target).trim() })),
    }))
    .filter((k) => k.metrics.length > 0);
}

// ─── Google Ads Forecast builder (computed, no AI) ──────────────────────────

function buildGoogleAdsForecast(adGroups: AdGroup[], sources: GrandPlanSources): GoogleAdsForecast {
  const ideas = adGroups.flatMap(g => g.keywords.filter(k => k.volume && k.cpc));
  const budgetPounds = parseFloat(sources.keywordResearch?.monthlyBudget ?? "0") || 2000;
  const maxCpcPounds = parseFloat(sources.keywordResearch?.maxCpc ?? "0");
  const overrideRate = parseFloat(sources.keywordResearch?.conversionRate ?? "");
  const convRatePct = Number.isFinite(overrideRate) && overrideRate > 0 ? overrideRate : 3;
  const overridden = Number.isFinite(overrideRate) && overrideRate > 0;

  const disclaimer = `Forecast is a planning estimate based on keyword volume, market CPC and ${overridden ? `your supplied conversion rate of ${convRatePct}%` : `an industry-standard ${convRatePct}% conversion rate`}. Actual performance depends on landing-page quality, ad relevance and seasonality. Treat figures as a directional range, not a guarantee.`;

  if (ideas.length === 0 || budgetPounds <= 0) {
    return { clicks: 0, impressions: 0, conversions: 0, cost: 0, avgCpa: 0, ctr: 0, avgCpc: 0, monthlyBudget: budgetPounds, conversionRate: convRatePct, conversionRateOverridden: overridden, disclaimer };
  }

  // Bid-aware, position-adjusted forecast model (matches keyword planner logic)
  const BASE_CTR: Record<string, number> = { HIGH: 0.02, MEDIUM: 0.03, LOW: 0.04 };

  const perKw = ideas.map(kw => {
    const marketCpc = kw.cpc ?? 1;
    const effectiveMax = maxCpcPounds > 0 ? maxCpcPounds : marketCpc;
    const isEst = Math.min(1, effectiveMax / (marketCpc * 1.5)); // impression share estimate
    const baseCtr = BASE_CTR[kw.competition ?? "MEDIUM"] ?? 0.03;
    const ctr = baseCtr * (0.6 + isEst * 0.4); // position-adjusted CTR
    const impressions = Math.round((kw.volume ?? 0) * isEst);
    const clicks = Math.round(impressions * ctr);
    const actualCpc = Math.min(effectiveMax, marketCpc);
    return { impressions, clicks, actualCpc };
  });

  const totalUncappedCost = perKw.reduce((s, k) => s + k.clicks * k.actualCpc, 0);
  const totalUncappedClicks = perKw.reduce((s, k) => s + k.clicks, 0);
  const totalUncappedImpressions = perKw.reduce((s, k) => s + k.impressions, 0);

  let clicks: number, impressions: number, cost: number;
  if (totalUncappedCost <= budgetPounds || totalUncappedCost === 0) {
    clicks = totalUncappedClicks;
    impressions = totalUncappedImpressions;
    cost = totalUncappedCost;
  } else {
    const scale = budgetPounds / totalUncappedCost;
    clicks = Math.round(totalUncappedClicks * scale);
    impressions = Math.round(totalUncappedImpressions * scale);
    cost = budgetPounds;
  }

  const conversions = Math.round(clicks * (convRatePct / 100));
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const avgCpc = clicks > 0 ? cost / clicks : 0;
  const avgCpa = conversions > 0 ? cost / conversions : 0;

  // ±25% planning band
  const range = {
    clicks: { low: Math.round(clicks * 0.75), high: Math.round(clicks * 1.25) },
    conversions: { low: Math.round(conversions * 0.75), high: Math.round(conversions * 1.25) },
    avgCpa: { low: avgCpa * 0.8, high: avgCpa * 1.25 },
  };

  return { clicks, impressions, conversions, cost, avgCpa, ctr, avgCpc, monthlyBudget: budgetPounds, conversionRate: convRatePct, conversionRateOverridden: overridden, range, disclaimer };
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(jsonrepair(json)) as T;
  } catch {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }
}

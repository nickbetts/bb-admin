import { getAnthropicClient } from "@/lib/anthropic-client";
import type Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { AsyncLocalStorage } from "node:async_hooks";

// Default models. Opus 4.7 is the default for all heavy reasoning, Haiku 4.5
// stays as the cheap structural model. The override mechanism is kept for
// edge cases (e.g. cost-sensitive bulk regeneration) but no UI exposes it.
const DEFAULT_MODEL = "claude-opus-4-7";
const DEFAULT_MODEL_LIGHT = "claude-haiku-4-5";

/** Whitelisted Anthropic model IDs callers may pick from. */
export type GrandPlanModelChoice = "sonnet" | "haiku" | "opus";
const MODEL_BY_CHOICE: Record<GrandPlanModelChoice, string> = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5",
  opus: "claude-opus-4-7",
};

interface GenerationContext {
  /** Override for the primary model (used by all heavy generation steps). */
  primary?: string;
  /** Override for the light model (used by classifiers + small refinements). */
  light?: string;
}
const generationContext = new AsyncLocalStorage<GenerationContext>();

/** Resolves the primary model for the current generation, honouring overrides. */
function MODEL_PRIMARY(): string {
  return generationContext.getStore()?.primary ?? DEFAULT_MODEL;
}
/** Resolves the light model for the current generation, honouring overrides. */
function MODEL_LIGHT_FN(): string {
  return generationContext.getStore()?.light ?? DEFAULT_MODEL_LIGHT;
}

/** Wraps a generation run so MODEL_PRIMARY()/MODEL_LIGHT_FN() see the overrides. */
export function runWithGrandPlanModelOverride<T>(choice: GrandPlanModelChoice | undefined, fn: () => Promise<T>): Promise<T> {
  if (!choice) return fn();
  const primary = MODEL_BY_CHOICE[choice];
  // Light model stays as Haiku unless caller picked Haiku for everything.
  const light = choice === "haiku" ? MODEL_BY_CHOICE.haiku : DEFAULT_MODEL_LIGHT;
  return generationContext.run({ primary, light }, fn);
}

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
  /** Top-level intent classification used for the coloured intent badge.
   * Five-stage funnel: awareness → informational → commercial → transactional → decision. */
  intent?: "awareness" | "informational" | "commercial" | "transactional" | "decision";
  /** Primary target keyword for this asset (drives the page title and primary H1). */
  primaryKeyword?: string;
  /** Secondary keywords reinforcing the topic — used in subheadings. */
  secondaryKeywords?: string[];
  /** Long-tail keyword variants the asset should pick up incidentally. */
  longTailKeywords?: string[];
  /** One-paragraph editorial summary surfaced inside the cluster card. */
  summary?: string;
  /** One-paragraph writer brief surfaced inside the cluster card. */
  brief?: string;
  /** Internal linking recommendations (one short sentence each). */
  internalLinks?: (string | { url?: string; anchorText?: string })[];
  /** Names of audiences (matching AudienceItem.name) this asset is built for.
   * Used to render the cross-reference Audience Plays panel. */
  targetAudiences?: string[];
  /** ── Structured on-page optimisation fields (used for pageOptimisations entries) ── */
  /** Rewritten <title> tag (≤ 60 chars). */
  titleTag?: string;
  /** Rewritten meta description (≤ 160 chars). */
  metaDescription?: string;
  /** 3-5 specific edits to make to the page body. */
  contentEnhancements?: string[];
  /** schema.org type to deploy on the page. */
  schema?: string;
  /** Estimated business impact for the impact/effort matrix render. */
  impact?: "high" | "medium" | "low";
  /** Implementation effort for the impact/effort matrix render. */
  effort?: "high" | "medium" | "low";
  /** schema.org type to recommend (e.g. "Article", "Product", "FAQPage").
   *  Page-optimisation entries surface this as a structured-data suggestion. */
  suggestedSchema?: string;
}

/** Dedicated link-target entries (anchor text + type + impact/effort).
 *  Optional sub-section of contentStrategy — populated when a back-link plan
 *  is part of the brief. */
interface LinkTargetEntry {
  url?: string;
  anchorText?: string;
  /** Anchor classification used by the renderer's coloured badge. */
  anchorType?: "exact" | "broad" | "brand" | "naked" | "generic";
  notes?: string;
  impact?: "high" | "medium" | "low";
  effort?: "high" | "medium" | "low";
}

// ─── SEO Foundations (quick wins, internal linking, outbound link building) ──
/** Page-level quick win: rewrite title + meta and add cross-links to existing pages. */
interface SeoQuickWinPage {
  url: string;
  pageTitle?: string;
  /** Why this page is a quick win (e.g. "Ranks position 6 for 'X' — light edits could push to top 3"). */
  rationale: string;
  /** Search intent classification — bias the primary keyword toward commercial / transactional. */
  intent?: "transactional" | "commercial" | "informational" | "navigational";
  /** Keyword breakdown the rewrites should target. */
  keywords?: {
    primary: string;
    secondary: string[];
    longTail: string[];
  };
  /** Rewritten <title> (≤ 60 chars). */
  newTitleTag: string;
  /** Rewritten meta description (≤ 160 chars). */
  newMetaDescription: string;
  /** Concrete on-page changes beyond the title/meta (H1 rewrite, FAQ block, schema, CTAs, etc.). */
  onPageSuggestions?: string[];
  /** 2–4 cross-links to add from THIS page to other pages on the site. */
  crossLinksToAdd: { targetUrl: string; anchorText: string; rationale?: string }[];
  estimatedTimeToImpact?: "1–2 weeks" | "3–4 weeks" | "1–2 months";
  effort?: "low" | "medium" | "high";
}
/** Hub page in the internal linking structure (a page that should attract links from supporting pages). */
interface InternalLinkingHub {
  hubUrl: string;
  hubTitle: string;
  /** Why this page is a hub (commercial value, ranking authority, etc.). */
  hubRole: string;
  /** Pages that should link TO the hub, with the anchor text to use. */
  inboundLinks: { fromUrl: string; anchorText: string; rationale?: string }[];
}
/** A page on the client's site that needs outbound backlinks (link-building target). */
interface LinkBuildingTarget {
  /** The page on the client's own site we want links pointing TO. */
  targetUrl: string;
  targetPageTitle?: string;
  priority: "tier-1" | "tier-2" | "tier-3";
  /** Why this page is worth building links to (commercial value / ranking gap). */
  rationale: string;
  /** Recommended anchor text mix for backlinks pointing at this page. */
  anchorMix: {
    anchorText: string;
    anchorType: "exact" | "partial" | "branded" | "naked-url" | "generic";
    /** Suggested share of total backlinks to use this anchor (e.g. "40%"). */
    suggestedShare?: string;
  }[];
  /** Outreach angles / placement ideas (industry sites, guest posts, resource lists, journalists, etc.). */
  outreachAngles: string[];
  estimatedLinksNeeded?: string;
}
interface SeoFoundations {
  /** Editorial intro shown above the section. */
  intro?: string;
  quickWins: SeoQuickWinPage[];
  internalLinking: {
    /** One-paragraph overview of the linking philosophy. */
    overview: string;
    hubs: InternalLinkingHub[];
  };
  linkBuilding: {
    /** Overarching anchor strategy + sourcing approach. */
    overallStrategy: string;
    targets: LinkBuildingTarget[];
    /** Channels/tactics to use across all targets (PR, guest posts, resource pages, digital PR, etc.). */
    outreachChannels: string[];
  };
}

/** First-class typing for the services / timeline / why-us blocks. */
interface ServiceItem {
  name: string;
  description?: string;
  price?: string;
}
interface TimelinePhase {
  phase: string;
  duration?: string;
  description?: string;
}
interface WhyUsPoint {
  title: string;
  description?: string;
  /** Optional emoji / lucide icon name surfaced in the proof card. */
  icon?: string;
}

interface InvestmentAllocationLine {
  channel: string;
  amount: number;
  share: number;
  rationale: string;
}
interface InvestmentAllocation {
  totalMonthly: number;
  byChannel: InvestmentAllocationLine[];
}

interface QuickWinAction {
  title: string;
  description: string;
  priority: "high" | "medium-high" | "medium" | "ongoing" | "long-term";
  /** Optional impact / effort scoring used by the matrix render. */
  impact?: "high" | "medium" | "low";
  effort?: "high" | "medium" | "low";
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
    /** Short paragraph describing the visual — opening shot, on-screen text, key beat. Used by the renderer to draw a faux ad mockup so the client can visualise the creative. */
    previewMockup?: string;
  }[];
  captionCopyBank: string[];
  contentPillars: string[];
  /** Optional platform/policy compliance notes (e.g. minor-targeting workarounds, age gating). Surfaced as a separate callout, not mixed into captions. */
  complianceNotes?: string[];
  /** True when this campaign was synthesised deterministically because the
   * AI returned no usable structures. The renderer surfaces an amber chip so
   * the strategist knows to regenerate the section. */
  isFallback?: boolean;
}

interface ContentCalendarMonth {
  month: string;
  focusLabel?: string | null;
  blogPosts: { title: string; intent: string; targetKeyword: string; angle?: string }[];
  socialPosts: { platform: string; type: string; topic: string }[];
}

interface OrganicSocialPlan {
  pillars: { name: string; description: string; examplePosts: string[] }[];
  postingFrequency: string;
  contentMix: { type: string; percentage: number }[];
  hashtagStrategy: string[];
  /** Indexes (into hashtagStrategy) of tags flagged as low-confidence by validation.
   * Renderer surfaces a soft ⚠️ chip rather than a hard rejection. */
  hashtagWarnings?: number[];
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
  /** SEMrush common-keyword overlap with the client domain (0 = no overlap detected). */
  commonKeywords?: number;
  /** How this competitor came into the analysis. */
  source?: "manual" | "auto" | "inferred";
  /** Headline messaging extracted from a homepage scrape (only set when SEMrush
   *  has no overlap data and we fell back to a site scrape). */
  pageContext?: { h1?: string; description?: string; ctaTexts?: string[] };
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
  /** URLs harvested from the client's sitemap.xml — used to ground SEO recommendations to real pages. */
  sitemapPages?: string[];
  /**
   * User-supplied "please optimise these specific pages" URLs, with the
   * page scraped (title / H1 / meta / body snippet) and the keywords each
   * page already ranks for via SEMrush. Drives the priority list for SEO
   * Quick Wins and Page Optimisations with a strong commercial /
   * transactional intent bias.
   */
  manualPageIntel?: ManualPageIntel[];
}

/** Per-URL intel for a manually flagged "optimise this page" request. */
export interface ManualPageIntel {
  url: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  bodySnippet?: string;
  organicKeywords?: { keyword: string; position: number; volume: number; cpc: number }[];
  fetchError?: string;
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

/** Strategy Brain — upstream reasoning produced before any section copy is written.
 * Every section generator receives this so the plan reads like one coherent strategy
 * instead of 14 disconnected channel write-ups. */
export interface StrategyBrain {
  positioning: {
    /** 1-2 sentence positioning statement: who it is for, what it does, how it differs. */
    statement: string;
    /** 3-4 concrete proof points the plan can reference. */
    proofPoints: string[];
  };
  audiences: Array<{
    name: string;
    /** One-sentence definition of who this audience really is. */
    coreInsight: string;
    /** The single pain point we lead with for this audience. */
    primaryPain: string;
    /** What actually triggers them to convert. */
    decisionTrigger: string;
    /** Recommended channels for this audience, in priority order. */
    channels: string[];
  }>;
  marketContext: {
    state: string;
    opportunity: string;
    threat: string;
  };
  competitorAngle: {
    /** How we win against the competitors named in the data. */
    differentiator: string;
    /** Saturated messages every competitor is already running. */
    messagesToAvoid: string[];
    /** White-space messages we should own. */
    messagesToOwn: string[];
  };
  messageHierarchy: {
    /** The headline message that runs everywhere (hero, ads, email, social). */
    primary: string;
    /** 2-4 supporting messages, each ideally tagged to an audience or funnel stage. */
    secondary: string[];
  };
  channelStrategy: Array<{
    channel: string;
    role: string;
    primaryAudience: string;
    successMetric: string;
  }>;
  /** Geographic markets the plan should target. Inferred from the brief, target audiences
   * and sector. Used by every paid-channel section so locations are not hard-coded. */
  targetGeographies: string[];
  /** Per-section directives. Each generator reads its own block as guardrails so
   * email segments mirror audience names, ad copy uses the agreed primary pain, etc. */
  directives: {
    audiences?: string;
    googleAds?: string;
    meta?: string;
    linkedIn?: string;
    email?: string;
    content?: string;
    organicSocial?: string;
    calendar?: string;
    competitorIntel?: string;
    quickWins?: string;
  };
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
  /** Purpose-written 1-2 sentence proposition for the cover hero — beats the
   * sliced exec summary fallback. Generated in the assemble step. */
  heroTagline?: string;
  /** Client-aware section intros. Renderer falls back to hardcoded copy when
   * the matching key is missing. Generated in the assemble step. */
  sectionIntros?: {
    contentStrategy?: string;
    metaCampaigns?: string;
    googleAdsCampaigns?: string;
    organicSocial?: string;
  };
  /** Audience name → 1-line "why this audience matters" rationale, built from
   * customerVoice pain points at assemble time. No AI call. */
  audienceRationales?: Record<string, string>;
  /** Upstream strategic reasoning the plan was built from. Rendered as a read-only
   * brief panel so strategists can see what the AI decided before writing copy. */
  strategyBrain?: StrategyBrain;
  /** Issues raised by the coherence validator after assembly. Surfaced in a
   * "Strategist Review" panel so the strategist can fix or accept them. */
  coherenceIssues?: Array<{ section: string; issue: string; suggestedFix: string; severity: "low" | "medium" | "high" }>;
  sections: {
    audiences?: AudienceItem[];
    executiveSummary?: string;
    strategyPlan?: string;
    googleAdsCampaigns?: {
      campaignName: string;
      overview: Record<string, string>;
      negativeKeywords: string[];
      aiNegativesWithReason?: { keyword: string; reason: string }[];
      suggestedLocations?: string[];
      adGroups: { name: string; keywords: AdGroupKeyword[]; audience?: string; adGroupNegatives?: string[] }[];
    };
    metaCampaigns?: MetaCampaign[];
    contentStrategy?: {
      pageOptimisations: ContentStrategyEntry[];
      landingPages: ContentStrategyEntry[];
      blogPosts: ContentStrategyEntry[];
      /** Dedicated link-target list with anchor text + type. Optional. */
      linkTargets?: LinkTargetEntry[];
    };
    /** SEO foundations: on-page quick wins, internal linking structure, outbound link-building plan. */
    seoFoundations?: SeoFoundations;
    contentCalendar?: ContentCalendarMonth[];
    organicSocial?: OrganicSocialPlan;
    exampleArticles?: { title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[];
    servicesInvestment?: {
      services: ServiceItem[];
      timeline: { phase: string; items: string[] }[] | TimelinePhase[];
      /** Auto-generated investment allocation across selected channels. */
      investmentAllocation?: InvestmentAllocation;
      /** Structured "why us" proof points — first-class on GrandPlan. */
      whyUs?: WhyUsPoint[];
    };
    mediaPlan?: {
      objective: string;
      totalBudget: number;
      channels: { name: string; budget: number; percentage: number; strategy: string }[];
    };
    emailMarketing?: EmailMarketingPlan;
    linkedInAds?: LinkedInCampaign[];
    competitorIntel?: CompetitorInsight[];
    /** Prioritised list of next-step actions, surfaced under Strategy. */
    quickWins?: QuickWinAction[];
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
  /** Upstream strategic reasoning. Synthesised once before any section copy is
   * written; piped into every generator so the plan stays coherent. */
  strategyBrain?: StrategyBrain;
  /** Booleans the generators inspect to decide when to fall back to AI inference. */
  dataAvailability?: DataAvailability;
  /** Optional content-volume overrides (default 4 blog posts/month, 3 social/week). */
  postsPerMonth?: number;
  socialPostsPerWeek?: number;
  /** Number of months the content calendar should cover. Defaults to 12 (a full year). */
  calendarMonths?: number;
  /** Per-channel paid advertising budgets (£/month) entered on the creation form. */
  channelBudgets?: { googleAds?: number; metaAds?: number; linkedInAds?: number };
  /** Per-client content output caps (read from `Client.contentStrategyLimits`). */
  contentLimits?: {
    pageOptimisations?: number;
    landingPages?: number;
    blogPosts?: number;
    linkTargets?: number;
    pillarPages?: number;
  };
  /** Plan duration mode. Sprint90 reframes calendar, roadmap, quick wins and
   *  exec summary around a 12-week window. Defaults to annual. */
  planMode?: "annual" | "sprint90";
  /** Optional id of the previous sprint plan this one continues from. */
  previousPlanId?: string;
  /** When `previousPlanId` is set, harvested items from the prior sprint
   *  that the generator must NOT propose again. */
  priorSprint?: {
    title?: string;
    headlineOutcome?: string;
    quickWinTitles?: string[];
    seoQuickWinUrls?: string[];
    pageOptimisationUrls?: string[];
    pillarTitles?: string[];
    landingPageTitles?: string[];
    blogPostTitles?: string[];
  };
  /** Explicit reporting / planning period label (e.g. "January 2026" or "Q1 2026").
   *  Surfaced as a directive so generators can date copy correctly. */
  period?: string;
  /** User-supplied competitor list from the new-plan form. Each entry is a
   *  domain that has either been auto-detected via SEMrush keyword overlap
   *  (commonKeywords > 0) or manually added (then site-scraped if no overlap).
   *  Fed into the strategy brain and competitor intel generators. */
  competitors?: {
    domain: string;
    commonKeywords?: number;
    pageContext?: {
      headings: string[];
      description?: string;
      ctaTexts?: string[];
      h1?: string;
    };
    source?: "auto" | "manual";
  }[];
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
      model: MODEL_PRIMARY(),
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

// ─── Strategy Brain ─────────────────────────────────────────────────────────
// Single upstream reasoning call. Runs BEFORE any section copy is generated so
// every downstream prompt receives a single source of truth (positioning,
// audience definitions, message hierarchy, channel strategy, per-section
// directives). This is what makes the plan feel like one coherent strategy
// rather than 14 independent channel write-ups.

export async function synthesiseStrategyBrain(sources: GrandPlanSources): Promise<StrategyBrain> {
  const anthropic = await getAnthropicClient();

  // Pre-parse what we have so the prompt sees concrete signals, not raw JSON.
  const adGroups: AdGroup[] = sources.keywordResearch
    ? safeJsonParse(sources.keywordResearch.adGroups, [])
    : [];
  const contentData = sources.contentStrategy
    ? safeJsonParse<{ blogPosts?: { title?: string; keyword?: string }[] }>(sources.contentStrategy.spreadsheetData, {})
    : null;
  const competitors = sources.accountData?.competitorData ?? [];
  const formCompetitors = sources.competitors ?? [];
  const ga4 = sources.accountData?.ga4 as { topPages?: { url: string; sessions: number }[]; topAudiences?: string[]; deviceMix?: Record<string, number> } | undefined;
  const customerVoice = sources.customerVoice;

  const adGroupNames = adGroups.slice(0, 12).map((g) => g.name).filter(Boolean).join(", ");
  const blogTopics = (contentData?.blogPosts ?? []).slice(0, 8).map((b: { title?: string }) => b.title).filter(Boolean).join(", ");
  // Merge form-supplied competitors with auto-harvested SEMrush snapshots
  // so the strategist sees both. Form list comes first (those are what the
  // client/account team explicitly told us to consider).
  const norm = (d: string) => d.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  const competitorLines: string[] = [];
  for (const fc of formCompetitors.slice(0, 6)) {
    const semrush = competitors.find((c) => norm(c.domain) === norm(fc.domain));
    if (semrush) {
      competitorLines.push(`${fc.domain} [client-named, ${fc.commonKeywords ?? 0} common KWs] — ${semrush.organicTraffic} org traffic, ${semrush.organicKeywords} kws`);
    } else if (fc.pageContext) {
      const ctx = fc.pageContext;
      const summary = [ctx.h1 ? `H1: "${ctx.h1}"` : "", ctx.description ? `desc: "${ctx.description.slice(0, 120)}"` : ""].filter(Boolean).join("; ");
      competitorLines.push(`${fc.domain} [client-named, no SEMrush overlap] — ${summary || "site scraped"}`);
    } else {
      competitorLines.push(`${fc.domain} [client-named, no SEMrush data]`);
    }
  }
  for (const c of competitors.slice(0, 5)) {
    if (formCompetitors.some((fc) => norm(fc.domain) === norm(c.domain))) continue;
    competitorLines.push(`${c.domain} [auto] (${c.organicTraffic ?? 0} org. traffic, ${c.organicKeywords ?? 0} kws)`);
  }
  const competitorList = competitorLines.join("\n");
  const painList = (customerVoice?.painPoints ?? []).slice(0, 8).map((p) => `- ${p}`).join("\n");
  const compComplaints = (customerVoice?.competitorComplaints ?? []).slice(0, 6).map((c) => `- ${c}`).join("\n");
  const focusPeriods = sources.campaignFocusPeriods.length
    ? sources.campaignFocusPeriods.map((p) => `${MONTH_NAMES[p.startMonth - 1]}–${MONTH_NAMES[p.endMonth - 1]}: ${p.label}`).join("; ")
    : "none";

  const channelBudgets = sources.channelBudgets ?? {};
  const budgetLine = [
    channelBudgets.googleAds ? `Google Ads £${channelBudgets.googleAds}/mo` : "",
    channelBudgets.metaAds ? `Meta £${channelBudgets.metaAds}/mo` : "",
    channelBudgets.linkedInAds ? `LinkedIn £${channelBudgets.linkedInAds}/mo` : "",
  ].filter(Boolean).join(", ") || "not specified";

  const enabledPlatforms = sources.enabledPlatforms?.join(", ") || "not specified";

  const prompt = `${STYLE_RULES}

You are the lead strategist on a new ${sources.purpose === "pitch" ? "pitch" : "client onboarding"} for ${sources.clientName}. Before any channel writes its plan, you produce the STRATEGY BRAIN — the single source of truth that every downstream channel must follow.

You MUST think hard before writing. Reason from the data; do not guess. Where the data is thin, say what you would need to know rather than fabricating.

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "positioning": { "statement": string, "proofPoints": string[] },
  "audiences": [ { "name": string, "coreInsight": string, "primaryPain": string, "decisionTrigger": string, "channels": string[] } ],
  "marketContext": { "state": string, "opportunity": string, "threat": string },
  "competitorAngle": { "differentiator": string, "messagesToAvoid": string[], "messagesToOwn": string[] },
  "messageHierarchy": { "primary": string, "secondary": string[] },
  "channelStrategy": [ { "channel": string, "role": string, "primaryAudience": string, "successMetric": string } ],
  "targetGeographies": string[],
  "directives": {
    "audiences": string, "googleAds": string, "meta": string, "linkedIn": string,
    "email": string, "content": string, "organicSocial": string, "calendar": string,
    "competitorIntel": string, "quickWins": string
  }
}

Hard rules:
- 3-5 audiences, named with terms a non-marketer would recognise (e.g. "Owner-operators in West Yorkshire" not "Persona A").
- The SAME audience names you list here MUST appear verbatim in the channel-strategy "primaryAudience" fields, in the per-section directives, and will be reused across email segments and ad copy. Choose names you are happy to repeat everywhere.
- "messagesToOwn" must be specific, ownable angles — not generic claims every competitor could make.
- Each "directives" entry is 1-3 short sentences that tell the channel writer what to do (and what NOT to do). Reference audience names, the primary message, and (where relevant) the channel budget so the downstream prompt has guardrails.
- "channelStrategy" entries: only include channels that are actually enabled.
- "targetGeographies" must be the actual markets this client serves — infer from the brief, audience names (e.g. "Owner-operators in West Yorkshire" → ["United Kingdom (West Yorkshire)"]), and sector. Use full country / region names ("United Kingdom", "Republic of Ireland", "United States", "London", "Greater Manchester"). NEVER default to a region that is not evidenced. If the brief is silent, return ["United Kingdom"].
- British English, no AI jargon, no em dashes.

Inputs:
- Client: ${sources.clientName}
- Purpose: ${sources.purpose === "pitch" ? "Pitch (we are competing for this account)" : "Onboarding (account is signed)"}
- Brief: ${(sources.clientBrief ?? "").slice(0, 1500) || "(none provided)"}
- Target audiences (strategist input): ${(sources.targetAudiences ?? "").slice(0, 800) || "(none provided)"}
- Sector: ${sources.sector ?? "not specified"}
- Enabled paid channels: ${enabledPlatforms}
- Monthly paid budget: ${budgetLine}
- Campaign focus periods: ${focusPeriods}
${adGroupNames ? `- Keyword ad groups (top 12): ${adGroupNames}` : ""}
${blogTopics ? `- Planned blog topics (top 8): ${blogTopics}` : ""}
${competitorList ? `- Competitor data:\n${competitorList}` : ""}
${ga4?.topPages?.length ? `- Top GA4 pages: ${ga4.topPages.slice(0, 5).map(p => `${p.url} (${p.sessions} sess)`).join("; ")}` : ""}
${ga4?.topAudiences?.length ? `- GA4 top audience signals: ${ga4.topAudiences.slice(0, 5).join(", ")}` : ""}
${painList ? `- Real customer pain points (use this language):\n${painList}` : ""}
${compComplaints ? `- What customers complain about competitors:\n${compComplaints}` : ""}
`;

  const res = await withAnthropicRetry("strategyBrain", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  }));
  const raw = extractText(res);
  const fallback: StrategyBrain = {
    positioning: { statement: "", proofPoints: [] },
    audiences: [],
    marketContext: { state: "", opportunity: "", threat: "" },
    competitorAngle: { differentiator: "", messagesToAvoid: [], messagesToOwn: [] },
    messageHierarchy: { primary: "", secondary: [] },
    channelStrategy: [],
    targetGeographies: [],
    directives: {},
  };
  return safeJsonParse<StrategyBrain>(raw, fallback);
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
  if (isEnabled("contentStrategy") && !contentData) sectionNames.push("Content Clusters");
  if (isEnabled("seoFoundations")) sectionNames.push("SEO Foundations");
  if (isEnabled("metaCampaigns") && sources.keywordResearch) sectionNames.push("Meta Campaigns");
  if (isEnabled("contentCalendar")) sectionNames.push("Content Calendar");
  if (isEnabled("organicSocial")) sectionNames.push("Organic Social");
  if (isEnabled("exampleArticles") && contentData) sectionNames.push("Example Articles");
  if (isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0) sectionNames.push("Ad Copy");
  if (isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0) sectionNames.push("Negative Keywords");
  if (isEnabled("emailMarketing")) sectionNames.push("Email Marketing");
  if (isEnabled("linkedInAds")) sectionNames.push("LinkedIn Ads");
  if (isEnabled("competitorIntel") && sources.keywordResearch) sectionNames.push("Competitor Intel");
  if (isEnabled("quickWins")) sectionNames.push("Quick Wins");

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
  const [executiveSummary, strategyPlan, metaCampaigns, contentCalendar, organicSocial, exampleArticles, , aiNegatives, aiContentClusters] =
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
      // Ad copy generation removed — Google Ads is now research-only (keywords +
      // negatives + ad-group structure). The PPC team writes the actual copy.
      Promise.resolve(undefined),
      isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0
        ? runSection("Negative Keywords", "googleAdsNegatives", () => generateNegativeKeywords(anthropic, adGroups, contextSummary, sources))
        : Promise.resolve(undefined),
      // Brain-driven content clusters — only run when no spreadsheet contentData
      // is supplied. Replaces the legacy SEMrush spreadsheet upload pathway.
      isEnabled("contentStrategy") && !contentData
        ? runSection("Content Clusters", "contentClusters", () => generateContentClusters(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
    ]);

  // Batch 2: supplementary sections
  const [emailMarketing, linkedInAds, competitorIntel, audiences, quickWins, seoFoundations] =
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
      isEnabled("seoFoundations")
        ? runSection("SEO Foundations", "seoFoundations", () => generateSeoFoundations(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
    ]);

  // Auto-generate Services & Investment from sector + budget + selected
  // platforms (no proposal dependency).
  const servicesInvestmentGenerated = isEnabled("servicesInvestment")
    ? await runSection("Services & Investment", "servicesInvestment", () =>
        generateServicesInvestment(anthropic, contextSummary, sources, enabledPlatforms),
      )
    : undefined;

  // Build Google Ads campaigns from keyword research (structured data + AI targeting)
  const googleAdsTargeting = isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0
    ? await runSection("Google Ads Targeting", "googleAdsTargeting", () => generateGoogleAdsTargeting(anthropic, sources, adGroups))
    : undefined;
  const googleAdsCampaigns = isEnabled("googleAdsCampaigns") && sources.keywordResearch
    ? buildGoogleAdsCampaigns(adGroups, sources, aiNegatives, googleAdsTargeting)
    : undefined;

  // Build content strategy section: prefer AI clusters (form-driven), fall back
  // to legacy spreadsheet data when a ContentStrategy record is linked.
  const contentStrategySection = isEnabled("contentStrategy")
    ? buildContentStrategySection(contentData, aiContentClusters)
    : undefined;

  // Build services section: prefer auto-generated output (sector + budget +
  // platforms). Falls back to a legacy proposal payload if one is supplied
  // (kept for backwards compatibility, no longer wired in the new form).
  const servicesInvestment = servicesInvestmentGenerated
    ? servicesInvestmentGenerated
    : (isEnabled("servicesInvestment") && sources.proposal
        ? { services, timeline }
        : undefined);

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
      contentStrategy: contentStrategySection,
      seoFoundations,
      contentCalendar,
      organicSocial,
      exampleArticles,
      servicesInvestment,
      emailMarketing: emailMarketing?.value,
      linkedInAds: linkedInAds?.value,
      competitorIntel: competitorIntel?.value,
      quickWins,
    },
    grounding: Object.keys(grounding).length ? grounding : undefined,
    dataSources: dataSources.length ? dataSources : undefined,
    generationReport,
    strategyBrain: sources.strategyBrain,
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

  if (sources.channelBudgets) {
    const cb = sources.channelBudgets;
    const budgetLines: string[] = [];
    if (cb.googleAds) budgetLines.push(`  Google Ads: £${cb.googleAds}/month`);
    if (cb.metaAds) budgetLines.push(`  Meta Ads: £${cb.metaAds}/month`);
    if (cb.linkedInAds) budgetLines.push(`  LinkedIn Ads: £${cb.linkedInAds}/month`);
    if (budgetLines.length > 0) {
      parts.push(`Channel budgets (use these to calibrate campaign scale and ad group count):\n${budgetLines.join("\n")}`);
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

/**
 * Surfaces per-client output caps so generators stay inside contracted scope.
 * Returns an empty string when no limits are configured.
 */
function buildContentLimitsBlock(sources: GrandPlanSources): string {
  const l = sources.contentLimits;
  if (!l) return "";
  const parts: string[] = [];
  if (l.pageOptimisations) parts.push(`page optimisations: max ${l.pageOptimisations}`);
  if (l.landingPages) parts.push(`landing pages: max ${l.landingPages}`);
  if (l.blogPosts) parts.push(`blog posts: max ${l.blogPosts} (across the whole plan)`);
  if (l.linkTargets) parts.push(`link targets: max ${l.linkTargets}`);
  if (!parts.length) return "";
  return `\n\nCONTENT OUTPUT CAPS (contracted scope \u2014 DO NOT exceed): ${parts.join(", ")}.`;
}

/**
 * Surfaces the explicit reporting/planning period so date references in
 * generated copy are accurate (e.g. "Q1 2026 will focus on\u2026").
 */
function buildPeriodBlock(sources: GrandPlanSources): string {
  const sprint = sources.planMode === "sprint90";
  const periodLine = sources.period
    ? `\n\nReporting period for this plan: ${sources.period}. Anchor any date references and timelines to this period.`
    : "";
  if (!sprint) return periodLine;
  return `${periodLine}\n\n<sprint_window>
THIS IS A 90-DAY SPRINT PLAN — NOT AN ANNUAL STRATEGY.
- Every recommendation, calendar entry, roadmap item, milestone and timeline MUST fit inside the next 12 weeks (~3 months).
- Do NOT propose anything that lands beyond week 12. No "Q3", "year-end", "annual", "next 12 months" framing.
- Frame everything as a punchy quarterly sprint with a clear week-by-week shape (weeks 1–4 quick wins, 5–8 build, 9–12 finish + measure).
- Quantities follow the brief's per-month / per-week inputs scaled to 12 weeks (postsPerMonth × 3; socialPostsPerWeek × 13). Landing pages, pillar pages, page optimisations are TOTALS for the sprint, not monthly.
</sprint_window>`;
}

/**
 * When this plan is a continuation of a previous sprint, list the items that
 * the prior plan already delivered or recommended. The new plan must NOT
 * propose any of these again unless it is materially upgrading them.
 */
function buildPriorSprintBlock(sources: GrandPlanSources): string {
  const prior = sources.priorSprint;
  if (!prior) return "";
  const lines: string[] = [];
  if (prior.title) lines.push(`Prior sprint: "${prior.title}"`);
  if (prior.headlineOutcome) lines.push(`Prior outcome commitment: ${prior.headlineOutcome}`);
  if (prior.quickWinTitles?.length) lines.push(`Prior quick wins (do NOT repeat):\n- ${prior.quickWinTitles.slice(0, 20).join("\n- ")}`);
  if (prior.seoQuickWinUrls?.length) lines.push(`Prior SEO quick win URLs (already optimised):\n- ${prior.seoQuickWinUrls.slice(0, 20).join("\n- ")}`);
  if (prior.pageOptimisationUrls?.length) lines.push(`Prior page optimisation URLs (already rewritten):\n- ${prior.pageOptimisationUrls.slice(0, 20).join("\n- ")}`);
  if (prior.pillarTitles?.length) lines.push(`Prior pillar topics (already in flight):\n- ${prior.pillarTitles.slice(0, 10).join("\n- ")}`);
  if (prior.landingPageTitles?.length) lines.push(`Prior landing pages (already shipped):\n- ${prior.landingPageTitles.slice(0, 15).join("\n- ")}`);
  if (prior.blogPostTitles?.length) lines.push(`Prior blog topics (already covered):\n- ${prior.blogPostTitles.slice(0, 25).join("\n- ")}`);
  if (!lines.length) return "";
  return `\n\n<prior_sprint>
PRIOR SPRINT — these items have already been shipped or recommended in the previous 90-day sprint. Do NOT propose any of them again unless you are MATERIALLY upgrading them. Lead this sprint's recommendations with NEW initiatives that build on what was done. Where you reference prior work, frame it as "now that X is live, the next move is Y".

${lines.join("\n\n")}
</prior_sprint>`;
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

function buildSharedContextBlocks(sources: GrandPlanSources, directiveKey?: keyof StrategyBrain["directives"]): string {
  return buildStrategyBrainBlock(sources, directiveKey)
    + buildGeographyBlock(sources)
    + buildAudienceBlock(sources)
    + buildSectorBlock(sources)
    + buildPeriodBlock(sources)
    + buildContentLimitsBlock(sources)
    + buildCampaignPeriodsBlock(sources)
    + buildAccountDataBlock(sources)
    + buildManualPageIntelBlock(sources)
    + buildPriorSprintBlock(sources)
    + buildCustomerVoiceBlock(sources);
}

/**
 * Build the "PRIORITY PAGES" block — the user explicitly flagged these URLs
 * on the generate form. Surfaces the scraped title / H1 / meta and current
 * organic keywords so generators (Quick Wins, SEO Foundations, Page
 * Optimisations) can target commercial / transactional intent against
 * pages the client actually wants to move.
 */
function buildManualPageIntelBlock(sources: GrandPlanSources): string {
  const pages = sources.accountData?.manualPageIntel ?? [];
  if (!pages.length) return "";
  const lines = pages.map((p, i) => {
    const meta: string[] = [`URL: ${p.url}`];
    if (p.title) meta.push(`Title tag: "${p.title}"`);
    if (p.h1) meta.push(`H1: "${p.h1}"`);
    if (p.metaDescription) meta.push(`Meta description: "${p.metaDescription}"`);
    if (p.bodySnippet) meta.push(`Body snippet: ${p.bodySnippet.slice(0, 240)}`);
    if (p.organicKeywords?.length) {
      const kws = p.organicKeywords.slice(0, 12).map((k) => `"${k.keyword}" (pos ${k.position}, vol ${k.volume.toLocaleString()}, CPC £${k.cpc.toFixed(2)})`).join("; ");
      meta.push(`Currently ranks for: ${kws}`);
    } else if (p.fetchError) {
      meta.push(`(scrape error: ${p.fetchError})`);
    } else {
      meta.push(`(no organic keyword data found)`);
    }
    return `Page ${i + 1}: ${meta.join("\n  ")}`;
  }).join("\n\n");
  return `\n\n<priority_pages>
PRIORITY PAGES — the client explicitly asked us to optimise these URLs (paste-in list from the brief). Treat these as the FIRST priority for any SEO Quick Wins and Page Optimisations work. Recommendations for these pages MUST:
- Use the actual title / H1 / meta / body content shown below as the rewrite anchor (do not invent page content).
- Lead with COMMERCIAL or TRANSACTIONAL intent keywords (people ready to buy / enquire / book). Push informational keywords to a secondary role.
- Where possible, cite the SEMrush keywords the page already ranks for and propose a clear "primary / secondary / long-tail" tier.
- Suggest concrete on-page changes (title tag, meta description, H1, intra-page sections, CTA copy, schema) — not generic advice.

${lines}
</priority_pages>`;
}

function buildStrategyBrainBlock(sources: GrandPlanSources, directiveKey?: keyof StrategyBrain["directives"]): string {
  const brain = sources.strategyBrain;
  if (!brain) return "";
  const audienceList = brain.audiences.length
    ? brain.audiences.map((a) => `- ${a.name}: ${a.coreInsight} (lead pain: ${a.primaryPain}; trigger: ${a.decisionTrigger}; channels: ${a.channels.join(", ")})`).join("\n")
    : "(none)";
  const channelStrategy = brain.channelStrategy.length
    ? brain.channelStrategy.map((c) => `- ${c.channel} → ${c.role} (audience: ${c.primaryAudience}; success: ${c.successMetric})`).join("\n")
    : "(none)";
  const messages = [brain.messageHierarchy.primary, ...(brain.messageHierarchy.secondary ?? [])].filter(Boolean).join(" | ");
  const directive = directiveKey && brain.directives[directiveKey] ? brain.directives[directiveKey] : "";
  return `\n\n<strategy_brain>
The agency strategist has already produced an upstream brief that this section MUST follow. Treat the brain as the source of truth — do not introduce new audiences, contradict the positioning, or invent a different message hierarchy.

POSITIONING: ${brain.positioning.statement}
PROOF POINTS: ${brain.positioning.proofPoints.join(" • ")}
PRIMARY MESSAGE: ${brain.messageHierarchy.primary}
SUPPORTING MESSAGES: ${(brain.messageHierarchy.secondary ?? []).join(" | ")}
DIFFERENTIATOR: ${brain.competitorAngle.differentiator}
MESSAGES TO AVOID (saturated): ${brain.competitorAngle.messagesToAvoid.join(" | ")}
MESSAGES TO OWN (white space): ${brain.competitorAngle.messagesToOwn.join(" | ")}

AUDIENCES (use these EXACT names):
${audienceList}

CHANNEL STRATEGY:
${channelStrategy}

ALL MESSAGES IN ONE LINE: ${messages}
${directive ? `\nSECTION DIRECTIVE FOR THIS GENERATOR (read carefully):\n${directive}` : ""}
</strategy_brain>`;
}

function buildGeographyBlock(sources: GrandPlanSources): string {
  const loc = detectLocations(sources.clientBrief);
  return `\n\nTarget geography: ${loc}. All copy, examples, references (regulators, currency, units, place names) must reflect this market. Do not reference unrelated regions.`;
}

// ─── AI generation functions ────────────────────────────────────────────────

async function generateExecutiveSummary(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await withAnthropicRetry("executiveSummary", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 1400,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media, a specialist UK digital marketing agency. You are writing a strategic memo DIRECTLY TO the client's decision-maker — not a report about them. Write in second person throughout ("your business", "you are", "your customers").

Structure the memo using a situation → complication → resolution framework:
1. SITUATION: What is true about their market and position right now (specific facts, no generics)
2. COMPLICATION: What stands between them and the outcome they want (the real obstacle)
3. RESOLUTION: What this plan does about it and what they can expect if they commit

Rules:
- British English only
- No em dashes, no semicolons
- No AI jargon: never use "harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly", "cutting-edge", "robust"
- Write like you've sat in the room with this client. Be direct, specific, grounded.
- Open by naming the audiences this plan is built for and the commercial outcome we are chasing.
- ${sources.purpose === "pitch" ? "This is a pitch — be persuasive but honest. Show you understand their business." : "This is an onboarding plan — be operational and clear about what happens next."}
- Return HTML content (paragraphs, headings h3/h4, bullet lists). No wrapper div or section tags.
- You MUST include all three callout paragraphs in this exact format (they render as visual highlights):
  <p><strong>Why this matters:</strong> one sentence on the strategic stake — make it specific to their market.</p>
  <p><strong>Outcome:</strong> the measurable result we expect if the plan is executed. Name a number or direction.</p>
  <p><strong>Risk:</strong> the single most likely reason this plan fails. Be honest — it builds trust.</p>
${sources.planMode === "sprint90" ? "\n- THIS IS A 90-DAY SPRINT executive memo. Open by naming the sprint window (e.g. 'Over the next 12 weeks…'). The 'Outcome' callout MUST commit to a measurable result by week 12, not by year-end. Frame the situation/complication/resolution arc around what gets done in this single quarter, not an annual strategy." : ""}

Write the executive summary for this plan:

${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));
  return extractText(res);
}

/**
 * Auto-generates a Services & Investment block from sector + monthly budget +
 * channel splits + selected platforms. Replaces the old proposal-driven flow.
 * Returns recommended services, a delivery timeline, an investment allocation
 * across channels, and short why-us proof points.
 */
async function generateServicesInvestment(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources,
  enabledPlatforms: string[],
): Promise<{
  services: ServiceItem[];
  timeline: { phase: string; items: string[] }[];
  investmentAllocation: InvestmentAllocation;
  whyUs: WhyUsPoint[];
}> {
  const cb = sources.channelBudgets ?? {};
  const totalChannelBudget = (cb.googleAds ?? 0) + (cb.metaAds ?? 0) + (cb.linkedInAds ?? 0);
  const monthlyBudgetHint = totalChannelBudget > 0 ? totalChannelBudget : (sources.keywordResearch?.monthlyBudget ?? 0);
  const platformList = enabledPlatforms.length > 0 ? enabledPlatforms.join(", ") : "(unspecified)";
  const channelBudgetSummary = [
    cb.googleAds ? `Google Ads: \u00a3${cb.googleAds}/mo` : "",
    cb.metaAds ? `Meta Ads: \u00a3${cb.metaAds}/mo` : "",
    cb.linkedInAds ? `LinkedIn Ads: \u00a3${cb.linkedInAds}/mo` : "",
  ].filter(Boolean).join(", ") || "no per-channel splits supplied";

  const res = await withAnthropicRetry("servicesInvestment", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 2200,
    messages: [
      {
        role: "user",
        content: `You are a senior account director at i3media, a UK digital marketing agency. Build a Services & Investment block for the client below.

Inputs:
- Sector: ${sources.sector ?? "(not specified)"}
- Purpose: ${sources.purpose}
- Selected platforms / channels in scope: ${platformList}
- Per-channel ad spend on the form: ${channelBudgetSummary}
- Approximate total monthly ad budget: \u00a3${monthlyBudgetHint || "(not specified)"}

Rules:
- British English. No em dashes. No semicolons. No marketing jargon ("leverage", "harness", "elevate", "robust", "tailored", "bespoke", "cutting-edge", "seamless").
- Recommend 4\u20137 distinct services that match the platforms in scope. Typical agency line items: Strategy & Account Management, SEO, Google Ads Management, Meta Ads Management, LinkedIn Ads Management, Content & Copywriting, Email Marketing, Conversion Rate Optimisation, Reporting & Analytics. Only include services that are actually relevant to the channel mix.
- Service prices should be realistic UK agency monthly retainers (e.g. SEO \u00a3800\u20131800/mo, Google Ads management 10\u201315% of media spend with a \u00a3500\u2013800/mo minimum, Meta Ads management similar, content packages \u00a3400\u20131200/mo). Use a string like "\u00a31,200/mo" or "\u00a3500/mo + 12% media".
- Timeline: 3\u20134 phases covering onboarding (weeks 1\u20132), setup & launch (weeks 3\u20136), optimisation (months 2\u20133), and growth (months 4+). Each phase has 3\u20135 deliverable items.
- Investment Allocation: split the total monthly budget across the channels in scope. The "amount" is the agreed monthly media spend (use the per-channel figures supplied where present). The "share" is the percentage of the total. Add a one-line "rationale" explaining why that channel gets that share given the sector and purpose. Channels with zero supplied budget can still appear if the platform is in scope, with a sensible recommended figure. Total of "amount" should equal totalMonthly. If no budget at all is supplied, propose a sensible split totalling \u00a32,500\u20135,000 based on sector.
- Why Us: 3\u20134 short, specific proof points (no generic claims). Each has a title and a 1-sentence description.

Return STRICT JSON only \u2014 no prose, no markdown, no code fences. Schema:
{
  "services": [{ "name": string, "description": string, "price": string }],
  "timeline": [{ "phase": string, "items": [string] }],
  "investmentAllocation": {
    "totalMonthly": number,
    "byChannel": [{ "channel": string, "amount": number, "share": number, "rationale": string }]
  },
  "whyUs": [{ "title": string, "description": string }]
}

Plan context:
${context}${buildSharedContextBlocks(sources)}`,
      },
    ],
  }));

  const raw = extractText(res).trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("servicesInvestment: AI did not return JSON");
    parsed = JSON.parse(match[0]);
  }
  const obj = parsed as {
    services?: ServiceItem[];
    timeline?: { phase: string; items: string[] }[];
    investmentAllocation?: InvestmentAllocation;
    whyUs?: WhyUsPoint[];
  };
  return {
    services: Array.isArray(obj.services) ? obj.services : [],
    timeline: Array.isArray(obj.timeline) ? obj.timeline : [],
    investmentAllocation: obj.investmentAllocation ?? { totalMonthly: 0, byChannel: [] },
    whyUs: Array.isArray(obj.whyUs) ? obj.whyUs : [],
  };
}

async function generateStrategyPlan(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await withAnthropicRetry("strategyPlan", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 1600,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media. Write a phased strategy plan with three phases: Month 1 (Foundation), Months 2-3 (Growth), Months 4+ (Scale).

Rules:
- British English, no em dashes, no semicolons, no AI jargon
- Use exactly THREE <h3> headings, one per phase. Format them as: "<h3>Phase 1, Foundations (Month 1)</h3>", "<h3>Phase 2, Build (Months 2-3)</h3>", "<h3>Phase 3, Scale (Months 4+)</h3>". Renderer turns each h3 + body into a visual phase card.
- Inside each phase use h4 for sub-sections (e.g. "Audiences", "Channels", "Outcomes", "Metrics").
- Each phase should cover: what gets done, which audiences we are reaching and on which channels, expected outcomes, key metrics to track.
- PHASE 1 MUST name EXACTLY which 1-2 channels go live first and which single audience segment they target. No generics — name the channel and the audience by their exact names from the plan.
- PHASE 2 MUST name the second audience being layered on AND identify the first optimisation metric being tracked with a specific threshold (e.g. "when CPA falls below £X, we increase budget by Y%" or "once CTR exceeds X%, we expand match types").
- PHASE 3 MUST cite a specific measurable trigger for scale — a real number, not a direction. (e.g. "when conversion rate reaches 3.5%" not "when performance improves").
- Reference real channels and tactics from the context provided. Match channels to audiences explicitly.
- If campaign focus periods are listed, weave them into the relevant phase.
- ${sources.purpose === "pitch" ? "Persuasive but grounded, show clear ROI potential" : "Operational clarity, this is the actual plan"}
- Return HTML content (h3, h4, p, ul/li). No wrapper tags. No markdown fences.
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
    model: MODEL_PRIMARY(),
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
- adCreatives: array of { format: "feed"|"reel"|"story", headline: string, primaryText: string, description?: string, cta: string, previewMockup: string }
- captionCopyBank: string[] (5-8 ready-to-use captions — POLISHED ad copy only, no compliance/strategy notes)
- contentPillars: string[] (4-6 organic content themes)
- complianceNotes: string[] (OPTIONAL — only if Meta policy or audience constraints require it: under-18 targeting workarounds, geo-restricted product mentions, prohibited categories. Each note ONE short sentence, NEVER duplicated in captions.)

Rules:
- Create 2-3 campaigns based on the keyword themes provided AND the target audiences below. Each campaign should clearly map to one or more named audiences.
- AD CREATIVE BUILD: each campaign needs 2-3 adCreatives. Mix formats (at least one reel or story alongside feed). Each creative MUST have all six fields populated.
- HARD CHARACTER LIMITS (Meta enforced — count every character including spaces): headline ≤ 40, primaryText 80–125, description ≤ 30. If you cannot fit the message inside these limits, rewrite it shorter, do not exceed.
- CTA enum (use the exact label, capitalised as shown): "Learn More", "Shop Now", "Sign Up", "Book Now", "Get Quote", "Contact Us", "Apply Now", "Download", "Subscribe", "Get Offer". No invented CTAs.
- previewMockup field: 1–2 sentences describing the actual creative — opening visual, on-screen text overlay, key beat, brand cue. Treat it as a brief to a designer (e.g. "Tight shot of barista pouring oat milk, on-screen text 'New autumn menu', logo bug bottom-right"). NEVER repeat the headline or primaryText verbatim — describe what the eye sees.
- The strongest creative MUST reference the Strategy Brain primary message and the named audience pain point being relieved. Mediocre creatives that do not connect to the brain's positioning will be rejected.
${(() => {
  const metaBudget = sources.channelBudgets?.metaAds;
  if (!metaBudget) return "";
  let rule = `- BUDGET CALIBRATION: This client has £${metaBudget}/month for Meta Ads.\n`;
  if (metaBudget < 300) {
    rule += `  Under £300/mo — create ONLY 1 campaign with 2-3 ad creatives. Budget field: "£${metaBudget}/month". At this level, a single focused campaign will outperform a split budget.`;
  } else if (metaBudget < 1000) {
    const split = Math.round(metaBudget * 0.6);
    rule += `  £300–1000/mo — create 2 campaigns max. Budget field examples: "£${split}/month" and "£${metaBudget - split}/month". Do not create more campaigns than the total budget can sustain.`;
  } else {
    const perCampaign = Math.round(metaBudget / 3);
    rule += `  Over £1000/mo — 2-3 campaigns. Budget field examples: approx "£${perCampaign}/month" each. Ensure each campaign has enough budget to exit the Meta learning phase.`;
  }
  return rule + "\n";
})()}- Audience targeting interests/customAudiences/lookalikes should reflect the real personas, not generic demographics. Mix specific behaviours, life events, and adjacent interests, not just first-person pain points.
- CAPTION HOOK RULE: Every caption in captionCopyBank MUST open with a single sentence of 12 words or fewer that would stop a scroll — a provocative question, a specific pain point stated as fact, or a surprising statistic. The detail and offer follow in lines 2-3.
- COPY VARIANTS: Of the 5-8 captions, produce: 2 written in first-person from the customer's perspective (e.g. "I spent three months searching for..."), 2 in brand voice, and 2 as direct offers (lead with the outcome or price point).
- Captions and creative copy must speak directly to the audience's situation in plain British English.
- If campaign focus periods are listed, design at least one campaign or creative variant around the most imminent period, include specific dates/windows in the ad copy to drive urgency.
- British English, no AI jargon, no em-dashes
- Return ONLY valid JSON, no markdown fences

CRITICAL CONSTRAINTS (must be followed, client brief overrides defaults):
- GEOGRAPHY: Use the target markets from the brief. Do NOT default to UK-only if the brief specifies European, international, or non-UK markets. Set interests and audience locations to match the stated geography.
- UNDER-18 AUDIENCES: If any target audience includes minors, Meta restricts interest-based and demographic targeting for users under 18. Put the workaround (parents-of, broad targeting, parallel 18+ campaign) in complianceNotes ONLY. Do NOT mention it in captionCopyBank.
- NEGATIVE CONSTRAINTS: If the brief lists any terms or language to avoid, do NOT reference them in any ad copy, headline, caption, or interest targeting.

Client: ${sources.clientName}
Key themes: ${topThemes}
Brief: ${sources.clientBrief || sources.keywordResearch?.brief || "General digital marketing"}

Context:
${context}${buildSharedContextBlocks(sources, "meta")}`,
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
    ? contentData.blogPosts.slice(0, 25).map((b: { title?: string; keyword?: string }) => b.title || b.keyword).filter(Boolean).join(", ")
    : "";

  const postsPerMonth = sources.postsPerMonth ?? 4;
  const socialPerWeek = sources.socialPostsPerWeek ?? 3;
  const socialPerMonth = socialPerWeek * 4;

  // Sprint mode forces a 3-month calendar regardless of any explicit
  // calendarMonths override. Otherwise default to a full 12-month calendar.
  const sprint = sources.planMode === "sprint90";
  const monthCount = sprint ? 3 : (sources.calendarMonths ?? 12);

  // For a default 12-month calendar, render the current calendar year (Jan–Dec)
  // so the plan reads like an annual operating plan rather than a rolling
  // window. For shorter custom windows fall back to "next N months from now".
  const now = new Date();
  const monthLabels: string[] = [];
  if (monthCount === 12) {
    const year = now.getFullYear();
    for (let i = 0; i < 12; i++) monthLabels.push(`${MONTH_NAMES[i]} ${year}`);
  } else {
    for (let i = 1; i <= monthCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthLabels.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
    }
  }

  async function generateHalf(label: string, months: string[]): Promise<ContentCalendarMonth[]> {
    if (months.length === 0) return [];
    const res = await withAnthropicRetry(`contentCalendar:${label}`, () => anthropic.messages.create({
      model: MODEL_LIGHT_FN(),
      max_tokens: 3500,
      messages: [
        {
          role: "user",
          content: `${STYLE_RULES}

You are a content strategist at i3media. Generate the ${label} of a ${sprint ? "12-week sprint calendar (3 months)" : `${monthCount}-month content calendar`}.

Months you must cover (use these EXACT labels, in order): ${months.map(m => `"${m}"`).join(", ")}

Return a JSON object with key "months" containing an array of month objects:
- month: string (one of the labels above)
- focusLabel: string or null (campaign focus for this month from focus periods, or null)
- blogPosts: array of { title: string, intent: "awareness"|"commercial"|"decision", targetKeyword: string, angle: string } (EXACTLY ${postsPerMonth} per month) — angle is one sentence: "Written for [audience name], addresses [specific pain point], opens with [hook type e.g. a question / a statistic / a customer scenario]"
- socialPosts: array of { platform: "instagram"|"facebook", type: "reel"|"carousel"|"static"|"story", topic: string } (EXACTLY ${socialPerMonth} per month, equating to ${socialPerWeek} per week)

Rules:
- Align blog topics with the supplied content strategy where it overlaps
- Campaign focus periods MUST drive topic selection for those months
- Topics should clearly serve at least one of the named target audiences
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences${focusPeriodText}

Client: ${sources.clientName}
${blogTopics ? `Available blog topics: ${blogTopics}\n` : ""}Context:
${context}${buildSharedContextBlocks(sources, "calendar")}`,
        },
      ],
    }));
    const raw = extractText(res);
    const parsed = safeJsonParse<{ months?: ContentCalendarMonth[] }>(raw, { months: [] });
    return parsed.months ?? [];
  }

  // For 12+ months, split in two parallel Haiku calls (faster, lighter).
  // For shorter calendars run a single call.
  let result: ContentCalendarMonth[];
  if (monthCount >= 8) {
    const half = Math.ceil(monthCount / 2);
    const firstHalf = monthLabels.slice(0, half);
    const secondHalf = monthLabels.slice(half);
    const [a, b] = await Promise.all([
      generateHalf(`first ${firstHalf.length} months`, firstHalf),
      generateHalf(`final ${secondHalf.length} months`, secondHalf),
    ]);
    result = [...a, ...b];
  } else {
    result = await generateHalf(`${monthCount}-month calendar`, monthLabels);
  }

  // Enforce exact post counts so the calendar always honours the form-supplied
  // cadence. AI sometimes returns 3 or 5 posts when asked for 4 — pad with
  // evergreen markers and truncate the surplus rather than silently drift.
  const byLabel = new Map(result.map((m) => [m.month, m] as const));
  const evergreenBlog = (): ContentCalendarMonth["blogPosts"][number] => ({
    title: "Evergreen brand story",
    intent: "awareness",
    targetKeyword: sources.clientName.toLowerCase(),
    angle: "Slot for an evergreen brand or audience story — replace with a topical angle nearer the time.",
  });
  const evergreenSocial = (): ContentCalendarMonth["socialPosts"][number] => ({
    platform: "instagram",
    type: "static",
    topic: "Evergreen brand moment",
  });
  const padded: ContentCalendarMonth[] = monthLabels.map((label) => {
    const m = byLabel.get(label) ?? { month: label, focusLabel: null, blogPosts: [], socialPosts: [] };
    const blogs = [...(m.blogPosts ?? [])];
    while (blogs.length < postsPerMonth) blogs.push(evergreenBlog());
    const socials = [...(m.socialPosts ?? [])];
    while (socials.length < socialPerMonth) socials.push(evergreenSocial());
    return {
      ...m,
      month: label,
      blogPosts: blogs.slice(0, postsPerMonth),
      socialPosts: socials.slice(0, socialPerMonth),
    };
  });
  return padded;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOrganicSocial(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<OrganicSocialPlan> {
  const socialPerWeek = sources.socialPostsPerWeek ?? 3;
  const res = await withAnthropicRetry("organicSocial", () => anthropic.messages.create({
    model: MODEL_LIGHT_FN(),
    max_tokens: 2200,
    messages: [
      {
        role: "user",
        content: `You are a social media strategist at i3media. Create an organic social media plan for Meta (Instagram + Facebook).

Return a JSON object:
- pillars: array of { name: string, description: string, examplePosts: string[] (3 examples each) } — 4-6 pillars
- postingFrequency: string (state ${socialPerWeek} posts per week across Instagram and Facebook)
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
${context}${buildSharedContextBlocks(sources, "organicSocial")}`,
      },
    ],
  }));

  const raw = extractText(res);
  const plan = safeJsonParse<OrganicSocialPlan>(raw, {
    pillars: [],
    postingFrequency: "3-4 posts per week",
    contentMix: [],
    hashtagStrategy: [],
  });
  // Soft validation: flag hashtags that are very long, contain non-tag punctuation,
  // or are obvious filler (e.g. #1, #love alone). The renderer shows a ⚠️ chip
  // — we never silently delete what the AI produced.
  const warnings: number[] = [];
  (plan.hashtagStrategy ?? []).forEach((tag, i) => {
    const t = (tag ?? "").trim();
    const body = t.replace(/^#/, "");
    if (!body || body.length > 30 || body.length < 3) { warnings.push(i); return; }
    if (/[^a-z0-9_]/i.test(body)) { warnings.push(i); return; }
    if (/^(love|life|insta|photooftheday|follow|like4like|1)$/i.test(body)) { warnings.push(i); return; }
  });
  if (warnings.length) plan.hashtagWarnings = warnings;
  return plan;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateExampleArticles(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<{ title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[]> {
  // Pick up to 3 blog topics, prioritising audience coverage over list order.
  // If blog posts carry targetAudiences, take the first post per distinct audience
  // so the samples span the audience set rather than clustering on one persona.
  const blogPosts = (contentData?.blogPosts ?? []) as { title?: string; keyword?: string; targetAudiences?: string[]; brief?: string; notes?: string; intent?: string; keywords?: { keyword: string }[] }[];
  const seenAudiences = new Set<string>();
  const picked: typeof blogPosts = [];
  for (const post of blogPosts) {
    const audKey = (post.targetAudiences?.[0] ?? "").trim().toLowerCase();
    if (audKey && !seenAudiences.has(audKey)) {
      seenAudiences.add(audKey);
      picked.push(post);
      if (picked.length >= 3) break;
    }
  }
  // Top-up with remaining posts in original order if we have fewer than 3.
  for (const post of blogPosts) {
    if (picked.length >= 3) break;
    if (!picked.includes(post)) picked.push(post);
  }
  const topicsToGenerate = picked.slice(0, 3);

  if (topicsToGenerate.length === 0) return [];

  // Pull strategist-supplied audience names + customer-voice pain points so we
  // can give each article a SPECIFIC audience anchor, not generic copy.
  const audienceNames = (sources.targetAudiences ?? "")
    .split(/\n+/).map((l) => l.trim().replace(/^[-•*\d.)\s]+/, "").split(/[:–—]/)[0].trim()).filter(Boolean);
  const customerPains = (sources.customerVoice?.painPoints ?? []).slice(0, 8);

  const articles: { title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[] = [];

  // Run all 3 articles in parallel (each is its own Haiku call) — sequential
  // generation was wasting ~30-45s of wall time on every plan run.
  const generated = await Promise.all(topicsToGenerate.map(async (post) => {
    const topic = post.title || post.keyword || "Untitled";
    const articleAudience = post.targetAudiences?.[0]?.trim() || audienceNames[0] || "";
    const articlePrimaryKeyword = post.keywords?.[0]?.keyword || post.keyword || "";
    const articleBrief = post.brief || post.notes || "";

    const res = await withAnthropicRetry(`exampleArticle:${topic}`, () => anthropic.messages.create({
      model: MODEL_LIGHT_FN(),
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `${STYLE_RULES}

You are a senior content writer at i3media. Write a full SEO-optimised article.

Rules:
- British English, no em dashes, no semicolons
- No AI jargon: never "harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly"
- Structure: H2 sections (4-5), H3 subsections where needed, introductory paragraph, FAQ section (3-4 questions), conclusion with CTA
- 800-1000 words
- Write directly to the named target audience for this topic. Address their pain points and reading-level. State who the article is for in the intro.
- Return HTML content only (h2, h3, p, ul, li, blockquote, strong). No wrapper div, no article tag.
- This is an EXAMPLE article to show what the content plan will deliver. Mark it clearly as an example.
- MANDATORY — at the very end, add this comment block. EVERY field is required (no skipping):
  <!-- SEO_META
  title_tag: [55-60 char title tag containing the primary keyword]
  meta_description: [150-160 char meta description with primary keyword and a clear CTA]
  primary_keyword: [the main target keyword for this article]
  secondary_keywords: [2-3 related keywords, comma separated]
  -->
  Do not omit any field. Do not skip the SEO_META block. The downstream report renders nothing if it is missing.

Article topic: "${topic}"
Client: ${sources.clientName}
${articlePrimaryKeyword ? `Primary keyword to use: ${articlePrimaryKeyword}` : ""}
${articleAudience ? `Primary target audience: ${articleAudience}` : ""}
${post.intent ? `Search intent: ${post.intent}` : ""}
${articleBrief ? `Writer brief from the content plan: ${articleBrief}` : ""}

${customerPains.length ? `Real pain points this audience has expressed (use the language and frustrations naturally in the article — do not paste verbatim):
${customerPains.map((p) => `  - ${p}`).join("\n")}
` : ""}
Context:
${context}${buildSharedContextBlocks(sources, "content")}`,
        },
      ],
    }));

    const html = extractText(res);
    if (!html) return null;

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
    const fallbackTitleTag = topic.length <= 60 ? topic : topic.slice(0, 57).trim() + "...";
    const fallbackMetaDesc = articlePrimaryKeyword
      ? `Practical guidance on ${articlePrimaryKeyword} from ${sources.clientName}. Read the full guide and get in touch to find out more.`
      : `Read the full guide from ${sources.clientName} and get in touch to find out how we can help.`;
    seoMeta = {
      titleTag: seoMeta?.titleTag || fallbackTitleTag,
      metaDescription: seoMeta?.metaDescription || fallbackMetaDesc.slice(0, 160),
      primaryKeyword: seoMeta?.primaryKeyword || articlePrimaryKeyword || undefined,
      secondaryKeywords: seoMeta?.secondaryKeywords?.length
        ? seoMeta.secondaryKeywords
        : (post.keywords ?? []).slice(1, 4).map((k) => k.keyword).filter(Boolean),
    };
    const cleanHtml = html.replace(/<!--\s*SEO_META\s*\n[\s\S]*?-->/, "").trim();
    return { title: topic, html: cleanHtml, seoMeta };
  }));

  for (const a of generated) if (a) articles.push(a);

  return articles;
}

// ─── Google Ads ad copy generator ───────────────────────────────────────────

async function generateGoogleAdsAdCopy(
  anthropic: Anthropic,
  adGroups: AdGroup[],
  context: string,
  sources: GrandPlanSources,
): Promise<{ name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[]; urlPaths?: string[]; isFallback?: boolean } }[]> {
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
- urlPaths: string[] (exactly 2 display path segments, max 15 chars each, no spaces — use hyphens)

Rules:
- British English. No AI jargon. Be direct and benefit-led.
- HEADLINE DISTRIBUTION — write EXACTLY this mix for each ad group:
  * 4 headlines that include the primary keyword or a close variant
  * 4 benefit-led headlines that do NOT repeat the keyword (focus on outcome or pain resolution)
  * 3 USP/differentiator headlines (what makes this client unique)
  * 2 urgency or offer headlines (limited time, specific saving, or availability signal)
  * 2 social proof headlines (rating, case study reference, years in business, or number of customers served)
  Total = 15 headlines.
- Each ad group should also include 2 URL path fields (urlPaths: string[2]) for the display path, max 15 chars each (e.g. ["dental-care", "book-online"]). These appear in the ad as: domain.com/path1/path2.
- Speak to the named target audiences provided in the context — at least 3 headlines per group should reference an audience pain point or moment.
- Descriptions expand on the proposition with a call to action.
- If campaign focus periods list specific dates or windows, include at least one headline or description per group that references the nearest upcoming period to drive urgency.
- Character limits are HARD limits — count every character including spaces. Anything over will be rejected by Google.${briefNegatives.length ? `\n- EXCLUDED TERMS (must NOT appear in any headline, description, or sitelink): ${briefNegatives.join(", ")}` : ""}
${(() => {
  const gBudget = sources.channelBudgets?.googleAds;
  if (!gBudget) return "";
  let rule = `- BUDGET CALIBRATION: This client has £${gBudget}/month for Google Ads. Scale your ad groups accordingly:\n`;
  if (gBudget < 300) rule += "  Under £300/mo — write ad copy for a MAXIMUM of 1 ad group. Focus on the single highest-intent group only.";
  else if (gBudget < 800) rule += "  £300–800/mo — write ad copy for a MAXIMUM of 2 ad groups. Prioritise the two highest-intent groups.";
  else if (gBudget < 2000) rule += "  £800–2000/mo — write ad copy for up to 3-4 ad groups.";
  else rule += "  Over £2000/mo — write ad copy for all ad groups provided.";
  rule += "\n  Do NOT write ad copy for more groups than the budget allows to run simultaneously.";
  return rule + "\n";
})()}- Return ONLY valid JSON, no markdown fences.${feedback ? `\n\nIMPORTANT — your previous attempt was invalid:\n${feedback}\nFix these issues and try again.` : ""}

Client: ${sources.clientName}
Brief: ${sources.clientBrief ?? sources.keywordResearch?.brief ?? ""}

Ad groups and top keywords:
${groupList}

Context:
${context}${buildSharedContextBlocks(sources, "googleAds")}`;

  const URL_PATH_LIMIT = 15;

  type RawGroup = {
    name?: string;
    headlines?: unknown;
    descriptions?: unknown;
    sitelinks?: unknown;
    urlPaths?: unknown;
    adCopy?: { headlines?: unknown; descriptions?: unknown; sitelinks?: unknown; urlPaths?: unknown };
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
        urlPaths: toStringArray(src.urlPaths),
      };
    });

  const collectViolations = (
    groups: { name: string; headlines: string[]; descriptions: string[]; sitelinks: string[]; urlPaths: string[] }[],
  ) => {
    const issues: string[] = [];
    for (const g of groups) {
      const overH = g.headlines.filter((h) => h.length > HEADLINE_LIMIT);
      const overD = g.descriptions.filter((d) => d.length > DESC_LIMIT);
      const overS = g.sitelinks.filter((s) => s.length > SITELINK_LIMIT);
      const overP = g.urlPaths.filter((p) => p.length > URL_PATH_LIMIT);
      if (overH.length) issues.push(`Ad group "${g.name}": ${overH.length} headline(s) exceed ${HEADLINE_LIMIT} chars: ${overH.map((h) => `"${h}" (${h.length})`).join(", ")}`);
      if (overD.length) issues.push(`Ad group "${g.name}": ${overD.length} description(s) exceed ${DESC_LIMIT} chars`);
      if (overS.length) issues.push(`Ad group "${g.name}": ${overS.length} sitelink(s) exceed ${SITELINK_LIMIT} chars`);
      if (overP.length) issues.push(`Ad group "${g.name}": ${overP.length} URL path(s) exceed ${URL_PATH_LIMIT} chars`);
    }
    return issues;
  };

  let lastNormalised: { name: string; headlines: string[]; descriptions: string[]; sitelinks: string[]; urlPaths: string[] }[] = [];
  let feedback: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await withAnthropicRetry(`googleAdsAdCopy:${attempt}`, () => anthropic.messages.create({
      model: MODEL_LIGHT_FN(),
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
          urlPaths: g.urlPaths.slice(0, 2).map((p) => p.slice(0, URL_PATH_LIMIT)),
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
    cap(`${kw} Specialists`, 30),
    cap(`Speak To Our Team`, 30),
    cap(`Free, No-Obligation Quote`, 30),
    cap(`Rated By Real Customers`, 30),
    cap(`${brand} | Expert Team`, 30),
    cap(`Same-Day Response`, 30),
    cap(`Fast & Friendly Service`, 30),
    cap(`Local Experts You Can Trust`, 30),
    cap(`Get Started Online`, 30),
    cap(`Tailored To Your Brief`, 30),
    cap(`Talk To A Specialist`, 30),
  ];
  const descriptions = [
    cap(`Looking for ${kw}? ${brand} delivers a clear, professional service. Get in touch today for a free quote.`, 90),
    cap(`Friendly, expert ${kw} from ${brand}. Trusted for quality work and transparent pricing.`, 90),
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
    model: MODEL_LIGHT_FN(),
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

// ─── Hero & section intro generators (run in assemble step) ─────────────────
//
// These are post-section "polish" generators that read the assembled plan and
// produce the most-read body copy in the document: the cover hero subtitle and
// the four highest-impact section intros. Both are optional; the renderer
// falls back to safe defaults when either is missing.

/**
 * Build a 1-2 sentence proposition for the cover hero.
 * Uses Sonnet (most-read 30 words in the document — worth the model spend).
 */
export async function generateHeroTagline(
  anthropic: Anthropic,
  data: GrandPlanData,
): Promise<string> {
  const audienceLines = (data.sections.audiences ?? [])
    .slice(0, 4)
    .map((a) => `- ${a.name}${a.description ? `: ${a.description}` : ""}`)
    .join("\n");
  const briefSnippet = (data.brief ?? "").slice(0, 800);
  const execSnippet = (data.sections.executiveSummary ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);

  const res = await withAnthropicRetry("heroTagline", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 220,
    messages: [
      {
        role: "user",
        content: `${STYLE_RULES}

You are writing the cover-page subtitle for ${data.clientName}'s ${data.purpose === "pitch" ? "pitch deck" : data.purpose === "onboarding" ? "onboarding plan" : "strategy document"}.

Write ONE proposition, 2 sentences max, 240 characters max total. It must:
- Name the audience or sector being served
- State the commercial outcome we are chasing (growth, market share, lifecycle revenue, etc.)
- Sound like a senior strategist briefing the room, not marketing copy

Return PLAIN TEXT only. No quotes around the answer. No HTML. No "Tagline:" prefix.

Client: ${data.clientName}
${audienceLines ? `Audiences:\n${audienceLines}\n` : ""}${briefSnippet ? `Brief: ${briefSnippet}\n` : ""}${execSnippet ? `Executive summary excerpt: ${execSnippet}` : ""}`,
      },
    ],
  }));
  return cleanEmDashes(extractText(res).trim().replace(/^["'`]|["'`]$/g, ""));
}

/**
 * Generate client-aware intro paragraphs for the four highest-impact sections.
 * One Haiku call returning a JSON object so we batch four intros for the price
 * of one round-trip.
 */
export async function generateSectionIntros(
  anthropic: Anthropic,
  data: GrandPlanData,
): Promise<NonNullable<GrandPlanData["sectionIntros"]>> {
  const want = {
    contentStrategy: !!data.sections.contentStrategy,
    metaCampaigns: !!data.sections.metaCampaigns?.length,
    googleAdsCampaigns: !!data.sections.googleAdsCampaigns,
    organicSocial: !!data.sections.organicSocial,
  };
  const wanted = Object.entries(want).filter(([, v]) => v).map(([k]) => k);
  if (wanted.length === 0) return {};

  const audienceLines = (data.sections.audiences ?? [])
    .slice(0, 4)
    .map((a) => `- ${a.name}${a.description ? `: ${a.description}` : ""}`)
    .join("\n");

  const res = await withAnthropicRetry("sectionIntros", () => anthropic.messages.create({
    model: MODEL_LIGHT_FN(),
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `${STYLE_RULES}

You are writing introduction paragraphs for ${data.clientName}'s strategy document. Each intro is the first thing the reader sees under the section heading.

Return ONLY a JSON object with the keys listed below. Each value is ONE paragraph, 2-3 sentences, 320 characters max. No HTML. No markdown. No leading "In this section…" formula. Speak directly about what we are doing for this client and why it works for the named audiences.

Required keys: ${wanted.map((k) => `"${k}"`).join(", ")}.

Section briefs:
${want.contentStrategy ? '- contentStrategy: "Topic-cluster SEO content plan: pillar page, mega guides, supporting articles, on-page optimisations."\n' : ""}${want.metaCampaigns ? '- metaCampaigns: "Audience-led Meta (Facebook + Instagram) paid social plan, with creative angles and pillar topics."\n' : ""}${want.googleAdsCampaigns ? '- googleAdsCampaigns: "Google Ads search campaigns with ad groups, keywords, RSA copy and a forecast."\n' : ""}${want.organicSocial ? '- organicSocial: "Organic Meta plan: pillars, content mix, posting cadence and hashtag strategy."\n' : ""}

Client: ${data.clientName}
${audienceLines ? `Audiences:\n${audienceLines}` : ""}`,
      },
    ],
  }));
  const raw = extractText(res);
  const parsed = safeJsonParse<Record<string, string>>(raw, {});
  const out: NonNullable<GrandPlanData["sectionIntros"]> = {};
  for (const k of wanted) {
    const v = parsed[k];
    if (typeof v === "string" && v.trim().length > 0) {
      out[k as keyof typeof out] = cleanEmDashes(v.trim());
    }
  }
  return out;
}

/**
 * Build a per-audience "why this audience matters" map from customerVoice
 * pain points already harvested by the prepare-customer-voice step. Pure
 * function: no AI call. Each audience name is matched against pain-point
 * strings; the first match wins. Audiences without a match are omitted.
 */
export function buildAudienceRationales(
  _audienceNames: string[],
  _customerVoice?: CustomerVoiceData,
): Record<string, string> {
  // Audience rationales previously surfaced raw scraped pain-point text verbatim,
  // which produced noisy, unpolished output. The personaQuote field in each
  // audience card handles per-audience voice more effectively. Return empty
  // to suppress the audience-play-why paragraph entirely.
  return {};
}

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

// Note: previously held a hardcoded universal-negatives list ("free","jobs","career","salary","reddit").
// Removed in favour of letting the AI negative keyword pass infer what's appropriate per client/sector.
// SECTOR_NEGATIVES + parseBriefNegatives still apply.

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
 * Strip AI instruction-text that leaks into generated negative keyword arrays.
 * Removes multiline strings, strings over 60 chars, and lines that start with
 * common prompt-instruction phrases.
 */
function sanitiseNegativeTerms(terms: string[]): string[] {
  const INSTRUCTION_RE = /^(focus on|avoid|note[:\s]|use |do not|consider|tip[:\s]|rationale|exclude|reminder)/i;
  return terms
    .map((t) => t.split("\n")[0].trim())            // drop multiline instruction leakage
    .filter((t) => t.length > 0 && t.length <= 60)  // drop over-long strings
    .filter((t) => !INSTRUCTION_RE.test(t));         // drop instruction-phrase prefixes
}

/**
 * Detect the primary target geography from the client brief.
 * Defaults to "United Kingdom" when no signals are found.
 * Recognises explicit country names and common UK city/region cues.
 */
function detectLocations(brief?: string): string {
  if (!brief) return "United Kingdom";
  const l = brief.toLowerCase();

  // Multi-country first
  if (l.includes("uk and ireland") || l.includes("uk & ireland")) return "United Kingdom, Republic of Ireland";
  if (l.includes("united states") || /\busa?\b/.test(l) || l.includes("north america")) return "United States";
  if (l.includes("canada")) return "Canada";
  if (l.includes("australia")) return "Australia";
  if (l.includes("ireland") && !l.includes("northern ireland")) return "Republic of Ireland";
  if (l.includes("europe") && !l.includes("uk only")) return "Europe";
  if (l.includes("international") || l.includes("worldwide") || l.includes("global")) return "International";

  // UK regional / city scoping → "United Kingdom (X)"
  const ukRegions = ["london", "manchester", "birmingham", "leeds", "liverpool", "bristol", "glasgow", "edinburgh", "cardiff", "belfast", "scotland", "wales", "northern ireland", "yorkshire", "midlands", "south west", "south east", "north east", "north west"];
  const matches = ukRegions.filter((r) => l.includes(r));
  if (matches.length === 1) return `United Kingdom (${matches[0].replace(/\b\w/g, (c) => c.toUpperCase())})`;
  if (matches.length > 1) return "United Kingdom (regional)";

  return "United Kingdom";
}

function buildGoogleAdsCampaigns(
  adGroups: AdGroup[],
  sources: GrandPlanSources,
  aiNegatives?: { campaignLevel: { keyword: string; reason: string }[]; byAdGroup: { name: string; negatives: string[] }[] },
  targeting?: { suggestedLocations: string[]; adGroupAudiences: { name: string; audience: string }[] },
) {
  const adGroupNegMap = new Map((aiNegatives?.byAdGroup ?? []).map((g) => [g.name, g.negatives]));
  const audienceMap = new Map((targeting?.adGroupAudiences ?? []).map((a) => [a.name, a.audience]));
  const sector = sources.sector ?? "";
  const sectorNegs = SECTOR_NEGATIVES[sector] ?? [];
  const briefNegs = parseBriefNegatives(sources.clientBrief ?? "");
  const aiCampaignNegs = sanitiseNegativeTerms((aiNegatives?.campaignLevel ?? []).map((n) => n.keyword));
  const allNegatives = [...new Set([...sectorNegs, ...briefNegs, ...aiCampaignNegs])];
  const aiNegativesWithReason = (aiNegatives?.campaignLevel ?? []).filter((n) => n.keyword && n.reason);

  const suggestedLocations = (targeting?.suggestedLocations?.length
    ? targeting.suggestedLocations
    : (sources.strategyBrain?.targetGeographies?.length
        ? sources.strategyBrain.targetGeographies
        : [detectLocations(sources.clientBrief)])).filter(Boolean);

  return {
    campaignName: `${sources.clientName} — Search`,
    overview: {
      "Monthly Budget": sources.channelBudgets?.googleAds
        ? `£${sources.channelBudgets.googleAds}/month`
        : sources.keywordResearch?.monthlyBudget
          ? `£${sources.keywordResearch.monthlyBudget}/month`
          : "Custom",
    },
    suggestedLocations,
    negativeKeywords: allNegatives,
    aiNegativesWithReason,
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
          matchType: k.matchType || "broad" as const,
          volume: k.volume,
          cpc: k.cpc,
        })),
        hiddenLowVolumeCount: filtered.length > 0 ? hiddenCount : 0,
        audience: audienceMap.get(g.name),
        adGroupNegatives: adGroupNegMap.get(g.name) ?? [],
      };
    }),
  };
}

// Use Opus to suggest tailored geo-targeting for the Search campaign and to
// map each ad group to the most relevant audience from the Strategy Brain.
async function generateGoogleAdsTargeting(
  anthropic: Anthropic,
  sources: GrandPlanSources,
  adGroups: AdGroup[],
): Promise<{ suggestedLocations: string[]; adGroupAudiences: { name: string; audience: string }[] }> {
  const audiences = (sources.strategyBrain?.audiences ?? []).map((a) => a.name).filter(Boolean);
  const adGroupNames = adGroups.map((g) => g.name).slice(0, 20);
  const brainGeos = (sources.strategyBrain?.targetGeographies ?? []).join(", ");
  const briefGeo = detectLocations(sources.clientBrief);

  const prompt = `You are a Google Ads strategist at i3media. Reason carefully before answering.

Client: ${sources.clientName}
Sector: ${sources.sector ?? "general"}
Brief: ${(sources.clientBrief ?? "").slice(0, 1500) || "(none)"}
Strategy Brain target geographies: ${brainGeos || "(none)"}
Detected geo from brief: ${briefGeo}
Audiences from Strategy Brain: ${audiences.length ? audiences.join(" | ") : "(none)"}
Ad groups: ${adGroupNames.length ? adGroupNames.join(" | ") : "(none)"}

Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "suggestedLocations": string[],
  "adGroupAudiences": [ { "name": string, "audience": string } ]
}

Rules:
- suggestedLocations: 3-8 specific Google Ads location targets (countries, regions, cities or postcode areas). Use the geographies above. Be specific, not vague ("London" not "South of England"; "Greater Manchester" not "North West").
- adGroupAudiences: one entry per ad group above, mapping the ad group name verbatim to the SINGLE most relevant audience name verbatim from the audiences list. If no audience clearly maps, use "All audiences".
- British English. No commentary.`;

  try {
    const res = await withAnthropicRetry("googleAdsTargeting", () => anthropic.messages.create({
      model: MODEL_PRIMARY(),
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }));
    const parsed = safeJsonParse<{ suggestedLocations?: unknown; adGroupAudiences?: unknown }>(extractText(res), {});
    const locs = Array.isArray(parsed.suggestedLocations)
      ? parsed.suggestedLocations.map((l) => String(l).trim()).filter(Boolean).slice(0, 8)
      : [];
    const map = Array.isArray(parsed.adGroupAudiences)
      ? parsed.adGroupAudiences
          .filter((g): g is { name?: unknown; audience?: unknown } => !!g && typeof g === "object")
          .map((g) => ({ name: String(g.name ?? "").trim(), audience: String(g.audience ?? "").trim() }))
          .filter((g) => g.name && g.audience)
      : [];
    return { suggestedLocations: locs, adGroupAudiences: map };
  } catch (err) {
    console.warn("[grand-plan] googleAdsTargeting failed:", err instanceof Error ? err.message : err);
    return { suggestedLocations: [], adGroupAudiences: [] };
  }
}

/**
 * Use AI to suggest tailored campaign-level and per-ad-group negative keywords.
 * The static SECTOR_NEGATIVES/BASE_NEGATIVES list is fine for the obvious
 * "free", "jobs", "reddit" stuff but the AI catches sector-and-brief-specific
 * waste (e.g. for a football academy: "FIFA video game", "ronaldo", "highlights").
 */
async function generateNegativeKeywords(
  anthropic: Anthropic,
  adGroups: AdGroup[],
  context: string,
  sources: GrandPlanSources,
): Promise<{ campaignLevel: { keyword: string; reason: string }[]; byAdGroup: { name: string; negatives: string[] }[] }> {
  const groupSummary = adGroups
    .slice(0, 8)
    .map((g) => `- ${g.name}: ${g.keywords.slice(0, 5).map((k) => k.keyword).join(", ")}`)
    .join("\n");

  const res = await withAnthropicRetry("googleAdsNegatives", () => anthropic.messages.create({
    model: MODEL_LIGHT_FN(),
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a Google Ads PPC specialist at i3media. Suggest negative keywords for this client's Search campaign so we don't burn budget on irrelevant clicks.

Client: ${sources.clientName}
Sector: ${sources.sector ?? "general"}
Brief: ${sources.clientBrief ?? "n/a"}

Ad groups in the campaign:
${groupSummary}

Return ONLY valid JSON with this exact shape:
{
  "campaignLevel": [
    { "keyword": "negative term", "reason": "one short sentence why this would waste budget" }
  ],
  "byAdGroup": [
    { "name": "exact ad group name from the list above", "negatives": ["term 1", "term 2", "term 3"] }
  ]
}

Rules:
- Produce 12-20 campaign-level negatives. Each MUST be specific to this client's product, sector or brief — not generic ("free", "jobs", "reddit" are already handled, do NOT include those).
- For each ad group, suggest 4-8 negatives that would only matter for THAT group (e.g. exclude course/training searches from a buying-focused group, exclude DIY searches from a service group).
- Each campaign-level reason must be one short sentence (max 18 words). No marketing waffle, plain English.
- Cover: cheaper alternatives, DIY/self-serve searches, related-but-wrong audiences, lower-intent informational queries, competitor brand names the client should NOT bid on, locations outside the target geography, and obviously off-topic terms that the keyword set might trigger.
- British English. No em dashes. No semicolons.
- Return ONLY the JSON object, no markdown fences, no commentary.

Context:
${context}${buildSharedContextBlocks(sources, "googleAds")}`,
      },
    ],
  }));

  const parsed = safeJsonParse(extractText(res), { campaignLevel: [], byAdGroup: [] });
  const campaignLevel = Array.isArray(parsed.campaignLevel)
    ? parsed.campaignLevel
        .filter((n: unknown): n is { keyword?: unknown; reason?: unknown } => !!n && typeof n === "object")
        .map((n: { keyword?: unknown; reason?: unknown }) => ({
          keyword: cleanEmDashes(String(n.keyword ?? "").trim()),
          reason: cleanEmDashes(String(n.reason ?? "").trim()),
        }))
        .filter((n: { keyword: string; reason: string }) => n.keyword.length > 0 && n.keyword.length <= 60)
        .slice(0, 25)
    : [];
  const byAdGroup = Array.isArray(parsed.byAdGroup)
    ? parsed.byAdGroup
        .filter((g: unknown): g is { name?: unknown; negatives?: unknown } => !!g && typeof g === "object")
        .map((g: { name?: unknown; negatives?: unknown }) => ({
          name: String(g.name ?? "").trim(),
          negatives: Array.isArray(g.negatives)
            ? g.negatives.map((n) => cleanEmDashes(String(n).trim())).filter((n: string) => n.length > 0 && n.length <= 60).slice(0, 10)
            : [],
        }))
        .filter((g: { name: string; negatives: string[] }) => g.name && g.negatives.length > 0)
    : [];
  return { campaignLevel, byAdGroup };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContentStrategySection(contentData: any, aiClusters?: AiContentClusters | undefined) {
  // Five-stage intent funnel.
  type IntentVal = NonNullable<ContentStrategyEntry["intent"]>;
  const normaliseIntent = (raw: unknown): IntentVal | undefined => {
    if (typeof raw !== "string") return undefined;
    const v = raw.toLowerCase();
    if (v.includes("decis")) return "decision";
    if (v.includes("transact") || v.includes("convers") || v.includes("purchase") || v.includes("buy")) return "transactional";
    if (v.includes("comm") || v.includes("consider") || v.includes("eval") || v.includes("compar")) return "commercial";
    if (v.includes("info") || v.includes("how to") || v.includes("educat") || v.includes("learn") || v.includes("guide")) return "informational";
    if (v.includes("aware") || v.includes("brand")) return "awareness";
    return undefined;
  };
  const enrich = (entry: ContentStrategyEntry, tier: ContentStrategyEntry["tier"]): ContentStrategyEntry => ({
    ...entry,
    tier,
    intent: entry.intent ?? normaliseIntent(entry.keywords?.[0]?.intent) ?? (tier === "pillar" ? "decision" : tier === "mega" ? "informational" : "commercial"),
    brief: entry.brief ?? entry.summary ?? entry.notes,
  });

  // ── AI clusters preferred (Strategy Brain drives this when no spreadsheet is linked) ──
  if (aiClusters && (aiClusters.pillars?.length || aiClusters.pageOptimisations?.length)) {
    const landingPages: ContentStrategyEntry[] = [];
    const blogPosts: ContentStrategyEntry[] = [];
    aiClusters.pillars.forEach((p, pi) => {
      // Pillar entry
      landingPages.push(enrich({
        title: p.pillar.title,
        primaryKeyword: p.pillar.primaryKeyword,
        secondaryKeywords: p.pillar.secondaryKeywords ?? [],
        longTailKeywords: p.pillar.longTailKeywords ?? [],
        intent: normaliseIntent(p.pillar.intent),
        summary: p.pillar.summary,
        brief: p.pillar.summary,
        targetAudiences: p.pillar.targetAudiences ?? [],
        keywords: p.pillar.primaryKeyword ? [{ keyword: p.pillar.primaryKeyword, intent: p.pillar.intent }] : [],
      }, pi === 0 ? "pillar" : "mega"));
      // Mega guide entries
      (p.megaGuides ?? []).forEach((m) => landingPages.push(enrich({
        title: m.title,
        primaryKeyword: m.primaryKeyword,
        secondaryKeywords: m.secondaryKeywords ?? [],
        longTailKeywords: m.longTailKeywords ?? [],
        intent: normaliseIntent(m.intent),
        summary: m.summary,
        brief: m.summary,
        targetAudiences: m.targetAudiences ?? [],
        keywords: m.primaryKeyword ? [{ keyword: m.primaryKeyword, intent: m.intent }] : [],
      }, "mega")));
      // Articles
      (p.articles ?? []).forEach((a) => blogPosts.push(enrich({
        title: a.title,
        primaryKeyword: a.primaryKeyword,
        secondaryKeywords: a.secondaryKeywords ?? [],
        longTailKeywords: a.longTailKeywords ?? [],
        intent: normaliseIntent(a.intent),
        summary: a.summary,
        brief: a.summary,
        targetAudiences: a.targetAudiences ?? [],
        keywords: a.primaryKeyword ? [{ keyword: a.primaryKeyword, intent: a.intent }] : [],
      }, "article")));
    });
    return {
      pageOptimisations: aiClusters.pageOptimisations ?? [],
      landingPages,
      blogPosts,
    };
  }

  // ── Legacy: read from linked ContentStrategy spreadsheet data ──
  if (!contentData) return undefined;
  const landingPages = (contentData.landingPages ?? []) as ContentStrategyEntry[];
  const blogPosts = (contentData.blogPosts ?? []) as ContentStrategyEntry[];
  const pageOptimisations = (contentData.pageOptimisations ?? []) as ContentStrategyEntry[];
  return {
    pageOptimisations,
    landingPages: landingPages.map((p, i) => enrich(p, i === 0 ? "pillar" : "mega")),
    blogPosts: blogPosts.map((p) => enrich(p, "article")),
    ...(contentData.linkTargets ? { linkTargets: contentData.linkTargets as LinkTargetEntry[] } : {}),
  };
}

// ─── AI-generated content clusters (Strategy Brain driven) ──────────────────
// Replaces the spreadsheet-upload pathway. Produces a structured topic-cluster
// plan (3 pillars × 2 mega guides + 4 articles each, plus on-page optimisations)
// straight from the brief, brain, and form inputs.

interface AiContentClusters {
  pillars: Array<{
    pillar: AiContentEntry;
    megaGuides: AiContentEntry[];
    articles: AiContentEntry[];
  }>;
  pageOptimisations: ContentStrategyEntry[];
}

interface AiContentEntry {
  title: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  intent?: string;
  summary: string;
  targetAudiences?: string[];
}

async function generateContentClusters(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources,
): Promise<AiContentClusters> {
  const brain = sources.strategyBrain;
  const audienceLines = (brain?.audiences ?? []).map((a) => `- ${a.name}: ${a.coreInsight} (lead pain: ${a.primaryPain})`).join("\n") || "(no brain audiences)";
  const messageLines = brain ? `Primary message: ${brain.messageHierarchy?.primary ?? ""}\nMessages to own: ${(brain.competitorAngle?.messagesToOwn ?? []).join("; ")}` : "";
  const directive = brain?.directives?.content ?? "";
  const limits = sources.contentLimits ?? {};
  const optsCap = limits.pageOptimisations ?? 12;
  const pillarCap = Math.max(1, Math.min(6, limits.pillarPages ?? 3));

  const prompt = `${STYLE_RULES}

You are the SEO content lead at i3media. Build a complete topic-cluster content strategy for ${sources.clientName} from the strategic foundation below.

Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "pillars": [
    {
      "pillar": { "title": string, "primaryKeyword": string, "secondaryKeywords": string[], "longTailKeywords": string[], "intent": "awareness"|"informational"|"commercial"|"transactional"|"decision", "summary": string, "targetAudiences": string[] },
      "megaGuides": [ /* 2 entries, same schema */ ],
      "articles": [ /* 4 entries, same schema */ ]
    }
  ],
  "pageOptimisations": [
    { "url": string, "title": string, "keywords": [ { "keyword": string, "intent": string } ], "titleTag": string, "metaDescription": string, "contentEnhancements": string[], "internalLinks": [ { "url": string, "anchorText": string } ], "schema": string, "summary": string, "targetAudiences": string[] }
  ]
}

Hard rules:
- EXACTLY ${pillarCap} pillar${pillarCap === 1 ? "" : "s"}. Each pillar MUST have EXACTLY 2 megaGuides and EXACTLY 4 articles.
- The 4 articles per pillar MUST span the full intent funnel \u2014 at least one each from awareness/informational/commercial/transactional, with the pillar itself sitting at decision.
- Pillars represent the most commercially valuable topics for this client based on the brief, market, and audiences. They are the cornerstones the rest of the cluster supports.
- Mega guides go deep on a sub-topic of the pillar. Articles answer specific questions, target long-tail searches, or capture stage-specific intent.
- "primaryKeyword" must be a real search term a target customer would type (not jargon, not a slogan).
- "secondaryKeywords" (3-5) are supporting variants the article will pick up.
- "longTailKeywords" (4-8) are full-question, low-volume searches the article should also rank for.
- "summary" is one paragraph (2-3 sentences) stating what the asset says, who it is for, and why it converts.
- "targetAudiences" must use the EXACT audience names listed below \u2014 these names already appear in ad copy, email segments, and the strategy brain.
- "pageOptimisations": list ${optsCap} existing pages on ${sources.keywordResearch?.website ?? "the client's website"} that need refreshing. Use real-looking URL slugs (e.g. /services/dental-implants).
  - "titleTag": rewritten <title> (\u2264 60 characters, primary keyword near the start, brand suffix if it fits).
  - "metaDescription": rewritten meta description (\u2264 160 characters, ends with a soft CTA).
  - "contentEnhancements": 3-5 specific bullet points naming what to add (e.g. "Add comparison table vs Invisalign", "Insert FAQ block targeting 5 long-tail questions", "Add schema FAQ markup").
  - "internalLinks": 2-4 outgoing internal links {url, anchorText} that strengthen the cluster (link to pillar/mega/article URLs you create above wherever possible).
  - "schema": single short string naming the most appropriate schema.org type (e.g. "Service", "Product", "FAQPage", "LocalBusiness").
- British English, no AI jargon, no em dashes.
${directive ? `\nContent directive from the strategy brain: ${directive}` : ""}

Strategic foundation:
- Client: ${sources.clientName}
- Sector: ${sources.sector ?? "not specified"}
- Brief: ${(sources.clientBrief ?? "").slice(0, 1500) || "(none provided)"}
- Markets: ${(brain?.targetGeographies ?? []).join(", ") || "United Kingdom"}
- Audiences:\n${audienceLines}
${messageLines ? `\n${messageLines}` : ""}

Context:
${context}${buildSharedContextBlocks(sources, "content")}`;

  const res = await withAnthropicRetry("contentClusters", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  }));
  const fallback: AiContentClusters = { pillars: [], pageOptimisations: [] };
  return safeJsonParse<AiContentClusters>(extractText(res), fallback);
}

// ─── SEO Foundations generator ──────────────────────────────────────────────
// Produces the three SEO pieces that sit alongside the content cluster:
//   1. Quick wins on existing pages (title + meta rewrites + cross-links)
//   2. Internal linking structure (hub-and-spoke map)
//   3. Outbound link-building plan (per-target anchor mix + outreach angles)

async function generateSeoFoundations(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources,
): Promise<SeoFoundations> {
  const brain = sources.strategyBrain;
  const audienceLines = (brain?.audiences ?? []).map((a) => `- ${a.name}: ${a.coreInsight}`).join("\n") || "(no brain audiences)";
  const website = sources.keywordResearch?.website ?? "the client's website";
  const geos = (brain?.targetGeographies ?? []).join(", ") || "United Kingdom";

  // Build the KNOWN PAGES list — every URL the AI uses MUST come from here.
  // Combine sitemap pages (authoritative) with GA4 top pages.
  const sitemapUrls = sources.accountData?.sitemapPages ?? [];
  const ga4Pages = sources.accountData?.ga4?.topPages ?? [];
  const manualUrls = (sources.accountData?.manualPageIntel ?? []).map((p) => p.url);
  const cleanWebsite = website.replace(/\/$/, "");
  const ga4Paths = ga4Pages.map((p) => p.path.startsWith("http") ? p.path : `${cleanWebsite}${p.path.startsWith("/") ? p.path : `/${p.path}`}`);
  // Manual URLs go first so they survive the slice cap and are clearly the priority list.
  const knownPages = [...new Set([...manualUrls, ...sitemapUrls, ...ga4Paths])].slice(0, 80);
  const knownPagesBlock = knownPages.length > 0
    ? `KNOWN PAGES (the ONLY URLs you may use anywhere in the response):\n${knownPages.map((u) => `- ${u}${manualUrls.includes(u) ? "  ← PRIORITY (client requested)" : ""}`).join("\n")}`
    : `KNOWN PAGES: none available — DO NOT INVENT URLs. Return empty quickWins, empty internalLinking.hubs and empty linkBuilding.targets rather than fabricate URLs.`;

  const prompt = `${STYLE_RULES}

You are the SEO lead at i3media. Build a tight, actionable SEO foundations brief for ${sources.clientName} covering THREE things only:
  1. Quick wins on existing pages (rewrite title tags + meta descriptions + add cross-links).
  2. Internal linking structure (hub-and-spoke map showing which existing pages should pass authority to which).
  3. Outbound link-building plan (target pages on the client site, recommended anchor mix, outreach angles).

Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "intro": string,
  "quickWins": [
    {
      "url": string,
      "pageTitle": string,
      "rationale": string,
      "intent": "transactional" | "commercial" | "informational" | "navigational",
      "keywords": {
        "primary": string,
        "secondary": [ string ],
        "longTail": [ string ]
      },
      "newTitleTag": string,
      "newMetaDescription": string,
      "onPageSuggestions": [ string ],
      "crossLinksToAdd": [ { "targetUrl": string, "anchorText": string, "rationale": string } ],
      "estimatedTimeToImpact": "1–2 weeks" | "3–4 weeks" | "1–2 months",
      "effort": "low" | "medium" | "high"
    }
  ],
  "internalLinking": {
    "overview": string,
    "hubs": [
      {
        "hubUrl": string,
        "hubTitle": string,
        "hubRole": string,
        "inboundLinks": [ { "fromUrl": string, "anchorText": string, "rationale": string } ]
      }
    ]
  },
  "linkBuilding": {
    "overallStrategy": string,
    "targets": [
      {
        "targetUrl": string,
        "targetPageTitle": string,
        "priority": "tier-1" | "tier-2" | "tier-3",
        "rationale": string,
        "anchorMix": [
          { "anchorText": string, "anchorType": "exact" | "partial" | "branded" | "naked-url" | "generic", "suggestedShare": string }
        ],
        "outreachAngles": [ string ],
        "estimatedLinksNeeded": string
      }
    ],
    "outreachChannels": [ string ]
  }
}

Hard rules:
- ABSOLUTE URL RULE: Every "url", "targetUrl", "fromUrl" and "hubUrl" field MUST be copied verbatim from the KNOWN PAGES list below. Do NOT invent, guess, modify or extrapolate URLs. If you cannot find a suitable known page for a quick win, hub, or link-building target, OMIT that entry rather than fabricate a URL. Returning fewer entries that are accurate is far better than the requested count with invented URLs.
- "intro": one paragraph (2 sentences) framing the SEO foundations work as the multiplier on top of the content cluster.
- "quickWins": UP TO 6 entries (fewer is fine if KNOWN PAGES is short). Pick existing commercial / service / category pages from the KNOWN PAGES list — not blog posts.
  - PRIORITY ORDER: Any pages marked "← PRIORITY (client requested)" in the KNOWN PAGES list MUST appear in quickWins first, in the same order. Use the <priority_pages> intel block (page title / H1 / meta / current ranking keywords) as the rewrite anchor.
  - INTENT BIAS: Prefer transactional and commercial-intent keywords (people ready to buy, enquire, get a quote, book) for the "primary" keyword on every quick win — especially the priority pages. Push purely informational keywords into "longTail" only.
  - "keywords.primary": ONE keyword. Must be commercial / transactional unless the page is unambiguously informational. If the page already ranks for related keywords (see <priority_pages>), choose a primary that lifts an existing position 4–20 keyword over the line.
  - "keywords.secondary": 2–4 supporting keywords (mix of commercial and longer-tail commercial variants).
  - "keywords.longTail": 3–5 long-tail variants (4+ words, conversational / question-led / location-modified).
  - "newTitleTag" ≤ 60 characters, MUST contain the primary keyword near the start, brand suffix if it fits.
  - "newMetaDescription" ≤ 160 characters, MUST contain the primary keyword and end with a soft CTA.
  - "onPageSuggestions": 3–5 concrete on-page changes beyond the title/meta — eg "Add a comparison table for X vs Y above the fold", "Insert FAQ schema with 4 questions", "Rewrite H1 to lead with primary keyword", "Add trust block (logos / testimonials) under hero". Be specific to this page, not generic.
  - "crossLinksToAdd": EXACTLY 3 cross-links per page, pointing to OTHER URLs from the KNOWN PAGES list. Anchor text must be natural prose (not bare keywords stuffed in).
- "internalLinking.hubs": UP TO 4 hub pages, each chosen from KNOWN PAGES. A hub is a high-commercial-value page that should attract internal links from supporting pages.
  - Each hub has 4–6 inboundLinks (other URLs from KNOWN PAGES that should link to it). Mix anchor text — do NOT repeat the same exact-match anchor across all 4–6 inbound links.
  - "rationale" on each inbound link is one short sentence explaining why the link belongs there.
- "linkBuilding.targets": UP TO 4 target pages chosen from KNOWN PAGES. Order by priority (tier-1 first).
  - "anchorMix": EXACTLY 5 entries per target representing the recommended diversification. Suggested shares should add to roughly 100% (e.g. 30% / 25% / 20% / 15% / 10%).
  - Anchor type discipline: aim for 20–30% exact, 25–35% partial, 25–35% branded, 5–15% naked URL, 5–15% generic. Adjust per target if a more conservative or aggressive mix is warranted and explain why in the rationale.
  - "outreachAngles": 3–5 concrete placement ideas (named site types, content angles, journalist beats — not generic "guest posts").
  - "estimatedLinksNeeded": e.g. "8–12 over 6 months".
- "linkBuilding.outreachChannels": 4–6 distinct channels (digital PR, niche edits, resource pages, broken-link reclaim, sector journalism, podcast appearances, etc.).
- British English throughout. No em dashes. No AI jargon.

Strategic foundation:
- Client: ${sources.clientName}
- Sector: ${sources.sector ?? "not specified"}
- Markets: ${geos}
- Brief: ${(sources.clientBrief ?? "").slice(0, 1200) || "(none provided)"}
- Audiences:\n${audienceLines}

${knownPagesBlock}

Context:
${context}${buildSharedContextBlocks(sources, "content")}`;

  const res = await withAnthropicRetry("seoFoundations", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 5000,
    messages: [{ role: "user", content: prompt }],
  }));

  const fallback: SeoFoundations = {
    quickWins: [],
    internalLinking: { overview: "", hubs: [] },
    linkBuilding: { overallStrategy: "", targets: [], outreachChannels: [] },
  };
  return safeJsonParse<SeoFoundations>(extractText(res), fallback);
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
    model: MODEL_PRIMARY(),
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
${context}${buildSharedContextBlocks(sources, "email")}`,
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
    model: MODEL_PRIMARY(),
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
- Create at least 3 ad creatives per campaign (minimum) — LinkedIn's algorithm needs creative variants to optimise delivery across placements and audiences. Label the first as the control and subsequent ones as variants.
- One campaign should focus on lead gen (use Lead Gen Form format for lowest friction), one on awareness/thought leadership (Thought Leadership ads or document ads perform well here — recommend appropriately)
- For awareness campaigns, suggest Thought Leadership ad format where applicable (promoted posts from a personal profile rather than company page — higher engagement rates)
${(() => {
  const lisBudget = sources.channelBudgets?.linkedInAds;
  if (!lisBudget) return "";
  let rule = `- BUDGET CALIBRATION: This client has £${lisBudget}/month for LinkedIn Ads. LinkedIn CPCs typically range from £8–25.\n`;
  if (lisBudget < 500) {
    rule += `  Under £500/mo — create ONLY 1 campaign with 3 ad creatives. Budget field: "£${lisBudget}/month". At this spend level, splitting across multiple campaigns means neither will exit the learning phase.`;
  } else if (lisBudget < 1500) {
    const split = Math.round(lisBudget * 0.65);
    rule += `  £500–1500/mo — create 2 campaigns max. Budget field examples: "£${split}/month" (lead gen) and "£${lisBudget - split}/month" (awareness). Prioritise the lead gen campaign.`;
  } else {
    const perCampaign = Math.round(lisBudget / 3);
    rule += `  Over £1500/mo — up to 3 campaigns. Budget field examples: approx "£${perCampaign}/month" each.`;
  }
  return rule + "\n";
})()}- Audience targeting MUST be derived from the named target audiences (use their job titles, seniority, industries)
- Headlines and intro text must speak to the audience by their role and pain point — address the decision-maker's specific problem, not a generic pitch
- Each creative should include urlPaths: string[] (2 display path segments, max 15 chars each) for the ad destination
- ${sources.sector === "industrial" || sources.sector === "professional_services" ? "LinkedIn is a primary channel — make campaigns comprehensive" : sources.sector === "ecommerce" || sources.sector === "dental" ? "LinkedIn is secondary for this sector — focus on brand building and partnerships" : "LinkedIn campaigns should target decision makers"}
- Strictly respect character limits: headline ≤70, intro ≤150, description ≤100
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources, "linkedIn")}`,
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
  const formCompetitors = sources.competitors ?? [];
  const customerComplaints = sources.customerVoice?.competitorComplaints ?? [];

  // Merge form-supplied competitors with auto-harvested SEMrush snapshots.
  // Form list is authoritative; we enrich with any SEMrush data we already
  // have for the same domain. Form competitors with no overlap surface their
  // scraped pageContext as qualitative messaging signal instead.
  type Merged = {
    domain: string;
    semrush?: typeof realCompetitors[number];
    pageContext?: { headings?: string[]; description?: string; ctaTexts?: string[]; h1?: string };
    commonKeywords?: number;
    source: "manual" | "auto" | "inferred";
  };

  const norm = (d: string) => d.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  const merged: Merged[] = [];

  if (formCompetitors.length > 0) {
    for (const fc of formCompetitors) {
      const semrush = realCompetitors.find((r) => norm(r.domain) === norm(fc.domain));
      merged.push({
        domain: fc.domain,
        semrush,
        pageContext: fc.pageContext,
        commonKeywords: fc.commonKeywords,
        source: fc.source ?? "manual",
      });
    }
    // Add any SEMrush-discovered competitors NOT already in the form list (cap at 6 total).
    for (const r of realCompetitors) {
      if (merged.length >= 6) break;
      if (!merged.some((m) => norm(m.domain) === norm(r.domain))) {
        merged.push({ domain: r.domain, semrush: r, source: "auto" });
      }
    }
  } else if (realCompetitors.length > 0) {
    for (const r of realCompetitors) {
      merged.push({ domain: r.domain, semrush: r, source: "auto" });
    }
  }

  if (merged.length > 0) {
    const competitorBlock = merged
      .map((m) => {
        if (m.semrush) {
          return `${m.domain} [${m.source}${m.commonKeywords ? `, ${m.commonKeywords} common KWs` : ""}]: ${m.semrush.organicTraffic.toLocaleString()} organic visits/mo, ${m.semrush.organicKeywords.toLocaleString()} keywords, ${m.semrush.paidKeywords.toLocaleString()} paid keywords, ${m.semrush.backlinks.toLocaleString()} backlinks. Top keywords: ${m.semrush.topKeywords.slice(0, 6).join(", ")}`;
        }
        // No SEMrush data — use scraped page context as qualitative input
        const ctx = m.pageContext;
        const lines = [`${m.domain} [${m.source}, no SEMrush overlap]`];
        if (ctx?.h1) lines.push(`  H1: ${ctx.h1}`);
        if (ctx?.description) lines.push(`  Meta description: ${ctx.description.slice(0, 200)}`);
        if (ctx?.headings?.length) lines.push(`  Page headings: ${ctx.headings.slice(0, 8).join(" | ")}`);
        if (ctx?.ctaTexts?.length) lines.push(`  CTAs: ${ctx.ctaTexts.slice(0, 5).join(", ")}`);
        return lines.join("\n");
      })
      .join("\n\n");
    const complaintBlock = customerComplaints.length
      ? `\n\nReal customer complaints about competitors in this sector (use these to seed the weaknesses fields):\n- ${customerComplaints.slice(0, 8).join("\n- ")}`
      : "";
    const res = await withAnthropicRetry("competitorIntel:enrich", () => anthropic.messages.create({
      model: MODEL_PRIMARY(),
      max_tokens: 2200,
      messages: [
        {
          role: "user",
          content: `You are a competitive intelligence analyst at i3media. The competitor list below is a mix of (a) competitors named on the brief by ${sources.clientName} (source: manual), (b) competitors auto-detected from SEMrush keyword overlap (source: auto), and (c) where no SEMrush data was available, scraped homepage signals (h1, headings, CTAs). Your job is ONLY to add the strengths and weaknesses commentary plus topKeywords (where missing). Do NOT change the numeric fields.

Return a JSON object with key "competitors" containing one entry per competitor below, in the same order. Each entry:
- domain: string (must match exactly)
- topKeywords: string[] (5-8 keywords; pull from SEMrush data when present, otherwise infer from page headings/CTAs)
- strengths: string[] (2-3 specific competitive strengths; reference the SEMrush numbers OR scraped messaging)
- weaknesses: string[] (2-3 areas where ${sources.clientName} could beat them, drawing on the customer complaints below where possible)

Competitor data:
${competitorBlock}${complaintBlock}

Client context:
${context}${buildSharedContextBlocks(sources, "competitorIntel")}

Rules: British English, no AI jargon, no fluff. Each strength/weakness must reference a specific number, keyword, complaint, or scraped messaging signal — no platitudes. Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    }));
    const parsed = safeJsonParse<{ competitors?: { domain?: string; topKeywords?: string[]; strengths?: string[]; weaknesses?: string[] }[] }>(extractText(res), { competitors: [] });
    const enriched = parsed.competitors ?? [];
    const value: CompetitorInsight[] = merged.map((m) => {
      const match = enriched.find((e) => e.domain && norm(e.domain) === norm(m.domain));
      return {
        domain: m.domain,
        organicTraffic: m.semrush?.organicTraffic,
        organicKeywords: m.semrush?.organicKeywords,
        paidKeywords: m.semrush?.paidKeywords,
        backlinks: m.semrush?.backlinks,
        topKeywords: Array.isArray(match?.topKeywords) && match!.topKeywords.length
          ? match!.topKeywords.slice(0, 8)
          : (m.semrush?.topKeywords?.slice(0, 8) ?? []),
        strengths: Array.isArray(match?.strengths) ? match!.strengths : [],
        weaknesses: Array.isArray(match?.weaknesses) ? match!.weaknesses : [],
        commonKeywords: m.commonKeywords,
        source: m.source,
        pageContext: m.pageContext
          ? { h1: m.pageContext.h1, description: m.pageContext.description, ctaTexts: m.pageContext.ctaTexts }
          : undefined,
      };
    });
    const semrushCount = merged.filter((m) => m.semrush).length;
    return {
      value,
      grounding: semrushCount > 0 ? "real" : (formCompetitors.length > 0 ? "partial" : "ai-only"),
      sourceLabels: [
        formCompetitors.length > 0 ? `Client-supplied competitors (${formCompetitors.length})` : "",
        semrushCount > 0 ? "SEMrush domain overview" : "",
        customerComplaints.length ? "Customer voice (web search)" : "",
      ].filter(Boolean) as string[],
    };
  }

  // No real or form data — fall back to AI estimates (renderer surfaces the disclaimer).
  const res = await withAnthropicRetry("competitorIntel", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
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
${context}${buildSharedContextBlocks(sources, "audiences")}`,
      },
    ],
  }));

  const parsed = safeJsonParse<{ competitors?: CompetitorInsight[] }>(extractText(res), { competitors: [] });
  const value = (parsed.competitors ?? []).map((c) => ({ ...c, source: "inferred" as const }));
  return {
    value,
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

  // Parse strategist-supplied audience NAMES so the AI is constrained to them
  // (rather than inventing audiences). Pain points, descriptions, persona
  // quotes and sectorPreview are ALL generated by the AI per audience —
  // we never surface raw scraped customer-voice text or the strategist's
  // own one-line description verbatim.
  let strategistAudienceNames: string[] = [];
  if (sources.targetAudiences) {
    strategistAudienceNames = sources.targetAudiences
      .split(/\n+/)
      .map((l) => {
        const trimmed = l.trim();
        if (!trimmed) return "";
        // Strip any leading bullet markers, numbering or dash separators
        const cleaned = trimmed.replace(/^[-•*\d.)\s]+/, "");
        // Take the part before any : – — (the rest is description waffle we'll discard)
        const sepMatch = cleaned.match(/[:–—]/);
        const namePart = sepMatch?.index !== undefined ? cleaned.slice(0, sepMatch.index) : cleaned;
        return namePart.trim().slice(0, 120);
      })
      .filter(Boolean)
      .slice(0, 6);
  }

  const res = await withAnthropicRetry("audiences", () => anthropic.messages.create({
    model: MODEL_LIGHT_FN(),
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
${strategistAudienceNames.length ? `
MANDATORY — the strategist has specified the audiences for this client. You MUST produce exactly one entry per name below, in the order given. Do NOT add, rename, merge or omit any. Use the names verbatim:
${strategistAudienceNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n")}

For each audience, write the description, painPoints, personaQuote and sectorPreview FROM SCRATCH. Each painPoint must be:
  - A short, plain-English sentence (10-22 words). NEVER a paragraph, NEVER multiple sentences.
  - Specific to THAT named audience (a pain a parent has is not the same as a pain a teenager has).
  - In their voice, not marketing copy. No em dashes. No semicolons.
  - Drawn from the customer-voice block below where it fits, but rewritten and trimmed — do NOT paste raw scraped text.
  - Distinct: never repeat the same pain across two audiences.
Produce 4-6 painPoints per audience.
` : ""}
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
      .map((a, idx): AudienceItem => ({
        // If the strategist specified names, enforce them slot-for-slot
        // so the AI can't quietly rename or reorder audiences.
        name: strategistAudienceNames[idx] ?? String(a.name).trim(),
        description: cleanEmDashes(String(a.description ?? "").trim()),
        painPoints: Array.isArray(a.painPoints)
          ? a.painPoints
              .map((p: unknown) => cleanEmDashes(String(p).trim()))
              .filter((p: string) => p.length > 0 && p.length <= 220)
              .slice(0, 6)
          : [],
        channels: Array.isArray(a.channels) ? a.channels.map(String) : [],
        personaQuote: typeof a.personaQuote === "string" ? cleanEmDashes(a.personaQuote.trim().slice(0, 240)) : undefined,
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
  const sprint = sources.planMode === "sprint90";
  const res = await withAnthropicRetry("quickWins", () => anthropic.messages.create({
    model: MODEL_PRIMARY(),
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior strategist at i3media. Distil the plan below into a prioritised action list — what should be done first, then second, then ongoing.

Return ONLY a JSON array (no markdown fences, no commentary) of ${sprint ? "8" : "8-10"} objects:
{ "title": string, "description": string, "priority": ${sprint ? "\"high\" | \"medium-high\" | \"medium\"" : "\"high\" | \"medium-high\" | \"medium\" | \"ongoing\" | \"long-term\""} }

Rules:
- Title is 4-8 words, action-led ("Launch brand search campaign", "Rebuild homepage hero section").
- Description is one short sentence (max 22 words) explaining why and the expected outcome.
${sprint
  ? "- This is a 90-DAY SPRINT plan. Mix MUST be: at least 4 \"high\" (weeks 1-4), 2 \"medium-high\" (weeks 5-8), 2 \"medium\" (weeks 9-12). Do NOT use \"ongoing\" or \"long-term\" — anything beyond week 12 does not belong in a sprint plan."
  : "- Mix: at least 2 \"high\" (do first 30 days), 2 \"medium-high\", 2 \"medium\", 1-2 \"ongoing\", 1-2 \"long-term\"."}
- Cover paid media, content/SEO, conversion/landing-page, measurement, organic social where relevant.
- Each action must be concrete and reference real assets, channels, or audiences from the plan — no platitudes.
- British English. No AI jargon ("harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly", "robust", "cutting-edge").

Client: ${sources.clientName}
Context:
${context}${buildSharedContextBlocks(sources, "quickWins")}`,
      },
    ],
  }));

  const parsed = safeJsonParse<QuickWinAction[]>(extractText(res), []);
  if (!Array.isArray(parsed)) return [];
  const allowed = sprint
    ? ["high", "medium-high", "medium"]
    : ["high", "medium-high", "medium", "ongoing", "long-term"];
  return parsed
    .filter((a) => a && typeof a.title === "string" && typeof a.description === "string")
    .map((a) => ({
      title: String(a.title).trim(),
      description: String(a.description).trim(),
      priority: allowed.includes(a.priority) ? a.priority : "medium",
    }));
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

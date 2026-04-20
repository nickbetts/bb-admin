import { getAnthropicClient } from "@/lib/anthropic-client";
import type Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
const MODEL_LIGHT = "claude-haiku-4-5";

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
}

export interface GrandPlanData {
  title: string;
  clientName: string;
  purpose: string;
  generatedAt: string;
  sections: {
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
  };
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
  sector?: string;
  clientName: string;
  purpose: string;
  campaignFocusPeriods: CampaignFocusPeriod[];
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

  // Generate sections in parallel where possible, with per-section progress tracking
  const sectionNames: string[] = [];
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

  let completedCount = 0;
  const total = sectionNames.length;
  const trackProgress = async <T>(label: string, promise: Promise<T>): Promise<T> => {
    if (onProgress) await onProgress(`Generating ${label} (${completedCount + 1}/${total})...`);
    const result = await promise;
    completedCount++;
    return result;
  };

  if (onProgress) await onProgress(`Generating ${total} AI sections...`);

  // Batch 1: core sections (exec summary, strategy, campaigns, calendar, articles, ad copy)
  const [executiveSummary, strategyPlan, metaCampaigns, contentCalendar, organicSocial, exampleArticles, aiMediaPlan, adCopyData] =
    await Promise.all([
      isEnabled("executiveSummary")
        ? trackProgress("Executive Summary", generateExecutiveSummary(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("strategyPlan")
        ? trackProgress("Strategy Plan", generateStrategyPlan(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("metaCampaigns") && sources.keywordResearch
        ? trackProgress("Meta Campaigns", generateMetaCampaigns(anthropic, contextSummary, adGroups, sources))
        : Promise.resolve(undefined),
      isEnabled("contentCalendar")
        ? trackProgress("Content Calendar", generateContentCalendar(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("organicSocial")
        ? trackProgress("Organic Social", generateOrganicSocial(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("exampleArticles") && contentData
        ? trackProgress("Example Articles", generateExampleArticles(anthropic, contextSummary, contentData, sources))
        : Promise.resolve(undefined),
      isEnabled("mediaPlan") && sources.mediaPlan && mediaChannels.length === 0
        ? trackProgress("Media Plan", generateMediaPlanChannels(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("googleAdsCampaigns") && sources.keywordResearch && adGroups.length > 0
        ? trackProgress("Ad Copy", generateGoogleAdsAdCopy(anthropic, adGroups, contextSummary, sources))
        : Promise.resolve([]),
    ]);

  // Batch 2: supplementary sections (email, LinkedIn, competitor — run after core to avoid rate limits)
  const [emailMarketing, linkedInAds, competitorIntel] =
    await Promise.all([
      isEnabled("emailMarketing")
        ? trackProgress("Email Marketing", generateEmailMarketing(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("linkedInAds")
        ? trackProgress("LinkedIn Ads", generateLinkedInAds(anthropic, contextSummary, sources))
        : Promise.resolve(undefined),
      isEnabled("competitorIntel") && sources.keywordResearch
        ? trackProgress("Competitor Intel", generateCompetitorIntel(anthropic, contextSummary, sources))
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

  // Build Google Ads forecast from keyword data (no AI needed — pure maths)
  const googleAdsForecast = isEnabled("googleAdsForecast") && sources.keywordResearch && adGroups.length > 0
    ? buildGoogleAdsForecast(adGroups, sources)
    : undefined;

  if (onProgress) await onProgress("Assembling final document...");

  return {
    title: `${sources.clientName} — Go-To-Market Plan`,
    clientName: sources.clientName,
    purpose: sources.purpose,
    generatedAt: new Date().toISOString(),
    sections: {
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
      emailMarketing,
      linkedInAds,
      competitorIntel,
      googleAdsForecast,
    },
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

// ─── AI generation functions ────────────────────────────────────────────────

async function generateExecutiveSummary(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media, a specialist UK digital marketing agency. Write an executive summary for a go-to-market plan.

Rules:
- British English only
- No em dashes, no semicolons
- No AI jargon: never use "harness", "leverage", "supercharge", "elevate", "craft", "tailored", "seamlessly", "cutting-edge", "robust"
- Write like you've sat in the room with this client. Be direct, specific, grounded.
- ${sources.purpose === "pitch" ? "This is a pitch — be persuasive but honest. Show you understand their business." : "This is an onboarding plan — be operational and clear about what happens next."}
- Return HTML content (paragraphs, headings h3/h4, bullet lists). No wrapper div or section tags.
- Keep it to 300-400 words.

Write the executive summary for this plan:

${context}`,
      },
    ],
  });
  return extractText(res);
}

async function generateStrategyPlan(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<string> {
  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are a senior digital marketing strategist at i3media. Write a phased strategy plan with three phases: Month 1 (Foundation), Months 2-3 (Growth), Months 4+ (Scale).

Rules:
- British English, no em dashes, no semicolons, no AI jargon
- Each phase should cover: what gets done, expected outcomes, key metrics to track
- Reference real channels and tactics from the context provided
- ${sources.purpose === "pitch" ? "Persuasive but grounded — show clear ROI potential" : "Operational clarity — this is the actual plan"}
- Return HTML content (h3 for phases, p, ul/li). No wrapper tags.
- 400-500 words total.

Write the phased strategy plan:

${context}`,
      },
    ],
  });
  return extractText(res);
}

async function generateMetaCampaigns(anthropic: Anthropic, context: string, adGroups: AdGroup[], sources: GrandPlanSources): Promise<MetaCampaign[]> {
  const topThemes = adGroups.slice(0, 4).map((g) => g.name).join(", ");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
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
- Create 2-3 campaigns based on the keyword themes provided
- British English, no AI jargon
- Captions should feel human, not corporate
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Key themes: ${topThemes}
Brief: ${sources.clientBrief || sources.keywordResearch?.brief || "General digital marketing"}

Context:
${context}`,
      },
    ],
  });

  const raw = extractText(res);
  const parsed = safeJsonParse(raw, { campaigns: [] });
  return parsed.campaigns ?? parsed ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateContentCalendar(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<ContentCalendarMonth[]> {
  const focusPeriodText = sources.campaignFocusPeriods.length > 0
    ? `\n\nCampaign focus periods (MUST be reflected in the calendar):\n${sources.campaignFocusPeriods.map((p) => `${MONTH_NAMES[p.startMonth - 1]}–${MONTH_NAMES[p.endMonth - 1]}: ${p.label}${p.description ? ` — ${p.description}` : ""}`).join("\n")}`
    : "";

  const blogTopics = contentData?.blogPosts
    ? contentData.blogPosts.slice(0, 15).map((b: { title?: string; keyword?: string }) => b.title || b.keyword).filter(Boolean).join(", ")
    : "";

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
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
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences${focusPeriodText}

Client: ${sources.clientName}
${blogTopics ? `Available blog topics: ${blogTopics}\n` : ""}Context:
${context}`,
      },
    ],
  });

  const raw = extractText(res);
  const parsed = safeJsonParse(raw, { months: [] });
  return parsed.months ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOrganicSocial(anthropic: Anthropic, context: string, contentData: any, sources: GrandPlanSources): Promise<OrganicSocialPlan> {
  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 2000,
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
- Pillars should reflect the client's business and content strategy
- British English, no AI jargon
- Example posts should feel genuine, not templated
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Brief: ${sources.clientBrief || sources.keywordResearch?.brief || ""}
${contentData?.blogPosts ? `Blog topics: ${contentData.blogPosts.slice(0, 10).map((b: { title?: string }) => b.title).filter(Boolean).join(", ")}` : ""}
Context:
${context}`,
      },
    ],
  });

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
    const res = await anthropic.messages.create({
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
- Write for the client's target audience, grounding every paragraph in a real pain point or practical value
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
${context}`,
        },
      ],
    });

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
): Promise<{ name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[] } }[]> {
  const groupList = adGroups
    .map((g) => `${g.name}: ${g.keywords.slice(0, 5).map((k) => k.keyword).join(", ")}`)
    .join("\n");

  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a Google Ads specialist at i3media. Write Responsive Search Ad copy for each ad group below.

Return a JSON object with key "adGroups" containing an array. Each item:
- name: string (must match the ad group name exactly)
- headlines: string[] (15 headlines, STRICTLY max 30 characters each — count carefully)
- descriptions: string[] (4 descriptions, STRICTLY max 90 characters each)
- sitelinks: string[] (4-6 sitelink labels, max 25 chars each)

Rules:
- British English. No AI jargon. Be direct and benefit-led.
- Vary headlines between: primary keyword inclusion, benefit statement, USP, CTA, social proof.
- Descriptions expand on the proposition with a call to action.
- Character limits are hard limits — headlines over 30 chars or descriptions over 90 chars will be rejected by Google.
- Return ONLY valid JSON, no markdown fences.

Client: ${sources.clientName}
Brief: ${sources.clientBrief ?? sources.keywordResearch?.brief ?? ""}

Ad groups and top keywords:
${groupList}

Context:
${context}`,
      },
    ],
  });

  try {
    const parsed = safeJsonParse(extractText(res), { adGroups: [] });
    const raw = (parsed.adGroups ?? []) as { name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[] } }[];

    // Validate and truncate ad copy to Google Ads character limits
    return raw.map((group) => ({
      ...group,
      adCopy: group.adCopy ? {
        headlines: (group.adCopy.headlines ?? []).map((h) => h.slice(0, 30)),
        descriptions: (group.adCopy.descriptions ?? []).map((d) => d.slice(0, 90)),
        sitelinks: (group.adCopy.sitelinks ?? []).map((s) => s.slice(0, 25)),
      } : group.adCopy,
    }));
  } catch {
    return [];
  }
}

// ─── Media plan AI generator ────────────────────────────────────────────────

async function generateMediaPlanChannels(
  anthropic: Anthropic,
  context: string,
  sources: GrandPlanSources,
): Promise<{ name: string; budget: number; percentage: number; strategy: string }[]> {
  const totalBudget = sources.mediaPlan?.totalBudget ?? 10000;
  const objective = sources.mediaPlan?.objective ?? "lead_gen";

  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior media planner at i3media. Generate a channel allocation for a digital marketing media plan.

Total budget: £${totalBudget.toLocaleString()}
Objective: ${objective.replace(/_/g, " ")}

Return a JSON object with key "channels" containing an array. Each channel:
- name: string (e.g. "Google Ads", "Meta Ads", "LinkedIn Ads", "SEO & Content", "Email Marketing", "TikTok Ads")
- budget: number (in £, must sum to total budget)
- percentage: number (0-100, must sum to 100)
- strategy: string (2-3 sentence strategy for this channel)

Rules:
- Allocate across 4-7 channels appropriate for the objective
- British English, no AI jargon
- Be realistic about channel suitability for the objective
- Return ONLY valid JSON, no markdown fences

Context:
${context}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(extractText(res));
    return (parsed.channels ?? []).map((ch: { name?: string; budget?: number; percentage?: number; strategy?: string }) => ({
      name: ch.name ?? "Unknown",
      budget: ch.budget ?? 0,
      percentage: ch.percentage ?? 0,
      strategy: ch.strategy ?? "",
    }));
  } catch {
    return [];
  }
}

// ─── Anthropic helper ───────────────────────────────────────────────────────

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text.trim() : "";
  // Strip markdown fencing if present
  return raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
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

const BASE_NEGATIVES = ["free", "cheap", "DIY", "job", "jobs", "career", "salary", "reddit", "forum", "template", "download"];

function buildGoogleAdsCampaigns(adGroups: AdGroup[], sources: GrandPlanSources, adCopyData: { name: string; adCopy: { headlines: string[]; descriptions: string[]; sitelinks?: string[] } }[]) {
  const adCopyMap = new Map(adCopyData.map((d) => [d.name, d.adCopy]));
  const sector = sources.sector ?? "";
  const sectorNegs = SECTOR_NEGATIVES[sector] ?? [];
  const allNegatives = [...new Set([...BASE_NEGATIVES, ...sectorNegs])];
  const adSchedule = SECTOR_AD_SCHEDULE[sector] ?? "Mon-Fri, 7am-9pm";

  return {
    campaignName: `${sources.clientName} — Search`,
    overview: {
      "Campaign Type": "Search",
      "Goal": "Conversions",
      "Bidding": "Maximise Conversions",
      "Budget": sources.keywordResearch?.monthlyBudget ? `£${sources.keywordResearch.monthlyBudget}/month` : "TBC",
      "Locations": "United Kingdom",
      "Language": "English",
      "Ad Schedule": adSchedule,
      "Conversion Tracking": "Website form submissions, phone calls",
      "Networks": "Search Network only",
      "Max CPC": sources.keywordResearch?.maxCpc ? `£${sources.keywordResearch.maxCpc}` : "Auto",
    },
    negativeKeywords: allNegatives,
    adGroups: adGroups.map((g) => ({
      name: g.name,
      keywords: g.keywords.map((k) => ({
        keyword: k.keyword,
        matchType: k.matchType || "broad" as const,
        volume: k.volume,
        cpc: k.cpc,
      })),
      adCopy: adCopyMap.get(g.name),
    })),
  };
}

function buildKeywordResearchSection(adGroups: AdGroup[]) {
  return {
    adGroups: adGroups.map((g) => ({
      name: g.name,
      keywords: g.keywords.map((k) => ({
        keyword: k.keyword,
        volume: k.volume,
        cpc: k.cpc,
      })),
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContentStrategySection(contentData: any) {
  return {
    pageOptimisations: contentData.pageOptimisations ?? [],
    landingPages: contentData.landingPages ?? [],
    blogPosts: contentData.blogPosts ?? [],
  };
}

// ─── Email Marketing generator ──────────────────────────────────────────────

async function generateEmailMarketing(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<EmailMarketingPlan> {
  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
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
- ${sources.sector === "ecommerce" ? "Include post-purchase, browse abandonment, VIP/loyalty flows" : sources.sector === "charities" ? "Include donation receipt, Ramadan series, impact updates" : "Include lead nurture, case study digest, service update flows"}
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
${sources.sector ? `Sector: ${sources.sector}` : ""}
Context:
${context}`,
      },
    ],
  });

  return safeJsonParse(extractText(res), {
    flows: [],
    campaigns: [],
    segmentation: { segments: [] },
  });
}

// ─── LinkedIn Ads generator ─────────────────────────────────────────────────

async function generateLinkedInAds(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<LinkedInCampaign[]> {
  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
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
- Audience targeting should be specific to the client's ICP
- ${sources.sector === "industrial" || sources.sector === "professional_services" ? "LinkedIn is a primary channel — make campaigns comprehensive" : sources.sector === "ecommerce" || sources.sector === "dental" ? "LinkedIn is secondary for this sector — focus on brand building and partnerships" : "LinkedIn campaigns should target decision makers"}
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
${sources.sector ? `Sector: ${sources.sector}` : ""}
Context:
${context}`,
      },
    ],
  });

  const parsed = safeJsonParse(extractText(res), { campaigns: [] });
  return parsed.campaigns ?? [];
}

// ─── Competitor Intelligence generator ──────────────────────────────────────

async function generateCompetitorIntel(anthropic: Anthropic, context: string, sources: GrandPlanSources): Promise<CompetitorInsight[]> {
  const website = sources.keywordResearch?.website ?? "";
  const brief = sources.clientBrief ?? sources.keywordResearch?.brief ?? "";

  const res = await anthropic.messages.create({
    model: MODEL_LIGHT,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `You are a competitive intelligence analyst at i3media. Identify and analyse the top competitors for this client.

Return a JSON object with key "competitors" containing an array of 4-6 competitor objects:
- domain: string (competitor website URL)
- organicTraffic: number (estimated monthly organic visits)
- organicKeywords: number (estimated number of ranking keywords)
- paidKeywords: number (estimated number of PPC keywords)
- backlinks: number (estimated backlink count)
- topKeywords: string[] (5-8 keywords they rank well for)
- strengths: string[] (2-3 competitive strengths)
- weaknesses: string[] (2-3 areas where the client could beat them)

Rules:
- Identify REAL competitors in this sector and geography (UK market)
- Be realistic with traffic estimates — these are approximations
- Strengths and weaknesses should be actionable — things the client can actually exploit
- British English, no AI jargon
- Return ONLY valid JSON, no markdown fences

Client: ${sources.clientName}
Website: ${website}
Brief: ${brief}
${sources.sector ? `Sector: ${sources.sector}` : ""}
Context:
${context}`,
      },
    ],
  });

  const parsed = safeJsonParse(extractText(res), { competitors: [] });
  return parsed.competitors ?? [];
}

// ─── Google Ads Forecast builder (computed, no AI) ──────────────────────────

function buildGoogleAdsForecast(adGroups: AdGroup[], sources: GrandPlanSources): GoogleAdsForecast {
  const ideas = adGroups.flatMap(g => g.keywords.filter(k => k.volume && k.cpc));
  const budgetPounds = parseFloat(sources.keywordResearch?.monthlyBudget ?? "0") || 2000;
  const maxCpcPounds = parseFloat(sources.keywordResearch?.maxCpc ?? "0");
  const convRatePct = 3; // Default 3% conversion rate

  if (ideas.length === 0 || budgetPounds <= 0) {
    return { clicks: 0, impressions: 0, conversions: 0, cost: 0, avgCpa: 0, ctr: 0, avgCpc: 0, monthlyBudget: budgetPounds, conversionRate: convRatePct };
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

  return { clicks, impressions, conversions, cost, avgCpa, ctr, avgCpc, monthlyBudget: budgetPounds, conversionRate: convRatePct };
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

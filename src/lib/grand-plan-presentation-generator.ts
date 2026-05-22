import { getAnthropicClient } from "@/lib/anthropic-client";
import type Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

const PRESENTATION_MODEL = "claude-opus-4-7";

const TRANSIENT_ERROR_CODES = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  if (anyErr.status && TRANSIENT_ERROR_CODES.has(Number(anyErr.status))) return true;
  if (typeof anyErr.message === "string") {
    const msg = anyErr.message.toLowerCase();
    if (
      msg.includes("rate limit") ||
      msg.includes("timeout") ||
      msg.includes("overloaded") ||
      msg.includes("econnreset")
    )
      return true;
  }
  return false;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 3000, 8000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length || !isTransientError(err)) throw err;
      console.warn(
        `[grand-plan-presentation] ${label} attempt ${attempt + 1} failed (${(err as Error).message}). Retrying in ${delays[attempt]}ms...`,
      );
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

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

function cleanEmDashes(text: string): string {
  return text
    .replace(/—/g, " - ")
    .replace(/–/g, "-")
    .replace(/;/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Public types ───────────────────────────────────────────────────────────

export type SlideKind =
  | "headline"
  | "pillars"
  | "outcome"
  | "channels"
  | "timeline"
  | "investment"
  | "audience"
  | "next-steps"
  | "content"
  | "bullets";

export interface SlideImage {
  /** Public URL (Vercel Blob). */
  url: string;
  alt?: string;
  /** Where to place the image relative to the slide body. */
  position?: "right" | "left" | "top" | "background";
}

export interface PresentationSlide {
  id: string;
  /** Short slide title shown at the top of the slide. */
  title: string;
  /** Optional one-line eyebrow (e.g. "Strategy", "Channels"). */
  eyebrow?: string;
  /** Visual treatment selector. */
  kind: SlideKind;
  /** Headline body — single big statement (kinds: headline, outcome, content). */
  headline?: string;
  /** Sub-statement under the headline (kinds: headline, outcome, content). */
  subhead?: string;
  /** 3–5 strategy pillars (kind: pillars). */
  pillars?: { title: string; body: string }[];
  /** Headline metric callout (kind: outcome). */
  metric?: { value: string; label: string };
  /** Channel chips (kind: channels). */
  channels?: { name: string; role: string }[];
  /** Phased timeline strip (kind: timeline). */
  phases?: { label: string; items: string[] }[];
  /** Investment summary (kind: investment). */
  investment?: {
    headlineFigure?: string;
    /** Channel allocation lines for the donut chart. */
    breakdown?: { label: string; amount: string; percentage: number }[];
  };
  /** Audience cards (kind: audience). */
  audiences?: { name: string; insight: string }[];
  /** Numbered next steps (kind: next-steps). */
  steps?: { title: string; detail: string }[];
  /** Bullet points (kinds: bullets, content; supplementary on others). */
  bullets?: string[];
  /** Single image (legacy). When `images` is also set, `images` wins. */
  image?: SlideImage;
  /** Multi-image showcase (max 5). Each item only needs url + alt — placement is shared. */
  images?: { url: string; alt?: string }[];
  /** Where the image / gallery sits relative to the body. Defaults to "right". */
  imagesPosition?: "right" | "left" | "top" | "background";
  /** Hint to the renderer to scale typography down for content-heavy slides. */
  density?: "compact" | "regular";
}

export interface PresentationData {
  meta?: {
    /** SHA-256 hash of planDataJson at generation time. */
    sourcePlanHash?: string;
    /** ISO timestamp of the latest full presentation generation. */
    generatedAt?: string;
    /** Dynamic max slide cap applied during generation. */
    maxSlides?: number;
    /** Whether the source plan had enough distinct data to expand the deck. */
    dataRich?: boolean;
  };
  cover: {
    title: string;
    subtitle: string;
    clientName: string;
    period?: string;
    sprintWindow?: string;
  };
  slides: PresentationSlide[];
}

interface PresentationSlideBounds {
  minSlides: number;
  maxSlides: number;
  dataRich: boolean;
}

function hasSeoFoundationsData(
  seo: GrandPlanData["sections"]["seoFoundations"] | undefined,
): boolean {
  if (!seo) return false;
  return Boolean(
    seo.quickWins?.length ||
    seo.internalLinking?.hubs?.length ||
    seo.linkBuilding?.targets?.length ||
    seo.linkBuilding?.outreachChannels?.length,
  );
}

function hasEmailMarketingData(
  email: GrandPlanData["sections"]["emailMarketing"] | undefined,
): boolean {
  if (!email) return false;
  return Boolean(
    email.flows?.length || email.campaigns?.length || email.segmentation?.segments?.length,
  );
}

export function resolvePresentationSlideBounds(plan: GrandPlanData): PresentationSlideBounds {
  const sections = plan.sections;
  const googleAdsCampaigns = Array.isArray(sections.googleAdsCampaigns)
    ? sections.googleAdsCampaigns
    : sections.googleAdsCampaigns
      ? [sections.googleAdsCampaigns]
      : [];
  const audiencesCount = sections.audiences?.length ?? 0;
  const quickWinsCount = sections.quickWins?.length ?? 0;
  const channelCount = plan.strategyBrain?.channelStrategy?.length ?? 0;
  const servicesCount = sections.servicesInvestment?.services?.length ?? 0;
  const allocationCount = sections.servicesInvestment?.investmentAllocation?.byChannel?.length ?? 0;
  const whyUsCount = sections.servicesInvestment?.whyUs?.length ?? 0;
  const contentEntryCount =
    (sections.contentStrategy?.pageOptimisations?.length ?? 0) +
    (sections.contentStrategy?.landingPages?.length ?? 0) +
    (sections.contentStrategy?.blogPosts?.length ?? 0);
  const competitorCount = sections.competitorIntel?.length ?? 0;
  const groundingCount = Object.keys(plan.grounding ?? {}).length;
  const forecastSignals = googleAdsCampaigns.filter(
    (campaign) =>
      Boolean(campaign.forecast?.intelligence?.summary) ||
      Boolean(campaign.forecast?.intelligence?.assumptions?.length) ||
      Boolean(campaign.forecast?.intelligence?.optimisationLevers?.length),
  ).length;

  const richnessScore = [
    audiencesCount >= 4,
    quickWinsCount >= 6,
    channelCount >= 5,
    servicesCount >= 6,
    allocationCount >= 4,
    whyUsCount >= 3,
    contentEntryCount >= 10,
    competitorCount >= 3,
    groundingCount >= 6,
    forecastSignals >= 1,
    hasSeoFoundationsData(sections.seoFoundations),
    hasEmailMarketingData(sections.emailMarketing),
  ].filter(Boolean).length;

  const dataRich = richnessScore >= 6;

  return {
    minSlides: 8,
    maxSlides: dataRich ? 16 : 12,
    dataRich,
  };
}

// ─── Generator ──────────────────────────────────────────────────────────────

export function summariseSourcePlan(plan: GrandPlanData): string {
  const sb = plan.strategyBrain;
  const services = plan.sections.servicesInvestment;
  const audiences = plan.sections.audiences ?? [];
  const quickWins = plan.sections.quickWins ?? [];
  const googleAdsCampaigns = Array.isArray(plan.sections.googleAdsCampaigns)
    ? plan.sections.googleAdsCampaigns
    : plan.sections.googleAdsCampaigns
      ? [plan.sections.googleAdsCampaigns]
      : [];
  const seo = plan.sections.seoFoundations;
  const email = plan.sections.emailMarketing;
  const competitors = plan.sections.competitorIntel ?? [];

  const servicesSummary = services?.services
    ? services.services
        .slice(0, 12)
        .map((s) => `- ${s.name}${s.price ? ` (${s.price})` : ""}`)
        .join("\n")
    : "";
  const allocationSummary = services?.investmentAllocation?.byChannel
    ? services.investmentAllocation.byChannel
        .map((c) => `- ${c.channel}: £${c.amount.toLocaleString()} (${Math.round(c.share)}%)`)
        .join("\n")
    : "";
  const totalInvestment = services?.investmentAllocation?.totalMonthly
    ? `£${services.investmentAllocation.totalMonthly.toLocaleString()}/month`
    : "";

  const audienceLines = audiences
    .slice(0, 6)
    .map((a) => `- ${a.name}: ${a.description}`)
    .join("\n");

  const quickWinLines = quickWins
    .slice(0, 10)
    .map((q) => `- ${q.title ?? ""}${q.impact ? ` (impact: ${q.impact})` : ""}`)
    .filter((l) => l.trim().length > 2)
    .join("\n");

  const seoQuickWins = seo?.quickWins
    ? seo.quickWins
        .slice(0, 8)
        .map((win) => `- ${win.pageTitle ?? win.url}: ${win.rationale}`)
        .join("\n")
    : "";
  const seoInternalHubs = seo?.internalLinking?.hubs
    ? seo.internalLinking.hubs
        .slice(0, 6)
        .map(
          (hub) =>
            `- ${hub.hubTitle ?? hub.hubUrl}: links from ${hub.inboundLinks
              .slice(0, 4)
              .map((link) => link.fromUrl)
              .join(", ")}`,
        )
        .join("\n")
    : "";
  const seoLinkTargets = seo?.linkBuilding?.targets
    ? seo.linkBuilding.targets
        .slice(0, 6)
        .map((target) => `- ${target.targetPageTitle ?? target.targetUrl}: ${target.rationale}`)
        .join("\n")
    : "";

  const emailFlowLines = email?.flows
    ? email.flows
        .slice(0, 8)
        .map((flow) => `- ${flow.name} (trigger: ${flow.trigger}, emails: ${flow.emails.length})`)
        .join("\n")
    : "";
  const emailCampaignLines = email?.campaigns
    ? email.campaigns
        .slice(0, 8)
        .map(
          (campaign) =>
            `- ${campaign.name}: ${campaign.objectiveText} (audience: ${campaign.audience}, cadence: ${campaign.frequency})`,
        )
        .join("\n")
    : "";
  const emailSegmentationLines = email?.segmentation?.segments
    ? email.segmentation.segments
        .slice(0, 8)
        .map((segment) => `- ${segment.name}: ${segment.criteria}`)
        .join("\n")
    : "";

  const competitorLines = competitors
    .slice(0, 8)
    .map(
      (competitor) =>
        `- ${competitor.domain}: strengths ${competitor.strengths.slice(0, 2).join(" | ")} | weaknesses ${competitor.weaknesses.slice(0, 2).join(" | ")}`,
    )
    .join("\n");

  const whyUsLines = services?.whyUs
    ? services.whyUs
        .slice(0, 6)
        .map((point) => `- ${point.title}: ${point.description ?? ""}`)
        .join("\n")
    : "";

  const forecastIntelligenceLines = googleAdsCampaigns
    .map((campaign) => {
      const forecast = campaign.forecast;
      if (!forecast?.intelligence) return "";
      const assumptions = forecast.intelligence.assumptions?.slice(0, 2).join(" | ") ?? "";
      const levers = forecast.intelligence.optimisationLevers?.slice(0, 2).join(" | ") ?? "";
      return `- ${campaign.campaignName}: ${forecast.intelligence.summary} (confidence: ${forecast.intelligence.confidence}, assumptions: ${assumptions}, levers: ${levers})`;
    })
    .filter(Boolean)
    .slice(0, 6)
    .join("\n");

  const groundingLines = Object.entries(plan.grounding ?? {})
    .map(
      ([sectionKey, info]) =>
        `- ${sectionKey}: ${info.grounding} (${info.sourceLabels.slice(0, 4).join(" | ")})`,
    )
    .slice(0, 12)
    .join("\n");

  const channelStrategy = sb?.channelStrategy
    ? sb.channelStrategy
        .map(
          (c) =>
            `- ${c.channel}: ${c.role} (audience: ${c.primaryAudience}, success: ${c.successMetric})`,
        )
        .join("\n")
    : "";

  const exec = plan.sections.executiveSummary
    ? plan.sections.executiveSummary
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2800)
    : "";

  return `
PLAN TITLE: ${plan.title}
CLIENT: ${plan.clientName}${plan.clientWebsite ? ` (${plan.clientWebsite})` : ""}
PURPOSE: ${plan.purpose}

POSITIONING:
${sb?.positioning?.statement ?? "(none)"}
Proof points: ${sb?.positioning?.proofPoints?.join(" | ") ?? "(none)"}

PRIMARY MESSAGE: ${sb?.messageHierarchy?.primary ?? "(none)"}
SUPPORTING MESSAGES: ${sb?.messageHierarchy?.secondary?.join(" | ") ?? "(none)"}

MARKET CONTEXT:
- State: ${sb?.marketContext?.state ?? "(none)"}
- Opportunity: ${sb?.marketContext?.opportunity ?? "(none)"}
- Threat: ${sb?.marketContext?.threat ?? "(none)"}

DIFFERENTIATOR: ${sb?.competitorAngle?.differentiator ?? "(none)"}

AUDIENCES (top 4):
${audienceLines || "(none)"}

CHANNEL STRATEGY:
${channelStrategy || "(none)"}

SERVICES IN SCOPE:
${servicesSummary || "(none)"}

INVESTMENT ALLOCATION:
${allocationSummary || "(none)"}
Total monthly investment: ${totalInvestment || "(none)"}

WHY US PROOF POINTS:
${whyUsLines || "(none)"}

PRIORITY QUICK WINS:
${quickWinLines || "(none)"}

SEO FOUNDATIONS QUICK WINS:
${seoQuickWins || "(none)"}

SEO INTERNAL LINKING HUBS:
${seoInternalHubs || "(none)"}

SEO LINK-BUILDING TARGETS:
${seoLinkTargets || "(none)"}

EMAIL FLOWS:
${emailFlowLines || "(none)"}

EMAIL CAMPAIGNS:
${emailCampaignLines || "(none)"}

EMAIL SEGMENTATION:
${emailSegmentationLines || "(none)"}

COMPETITOR INSIGHTS:
${competitorLines || "(none)"}

GOOGLE ADS FORECAST INTELLIGENCE:
${forecastIntelligenceLines || "(none)"}

DATA GROUNDING SNAPSHOT:
${groundingLines || "(none)"}

EXECUTIVE SUMMARY EXTRACT (cleaned):
${exec || "(none)"}
`.trim();
}

function buildPresentationPrompt(
  plan: GrandPlanData,
  planMode: "annual" | "sprint90",
  bounds: PresentationSlideBounds,
): string {
  const summary = summariseSourcePlan(plan);
  const windowLabel =
    planMode === "sprint90" ? "the next 90-day sprint" : "the period covered by this plan";

  return `You are a senior strategist at i3media. You have just produced a detailed Grand Plan for a client. Your job now is to distil it into a TOP-LEVEL CLIENT-FACING PRESENTATION DECK that the account team can present in a 20-minute meeting.

This deck is NOT a dump of the full plan. It is a confident, concise overview of what we are going to do for the client across ${windowLabel}, why it will work, and what it costs.

RULES:
- British English. No em dashes. No semicolons.
- No agency jargon. Forbidden words: "leverage", "harness", "supercharge", "elevate", "craft", "tailored", "seamlessly", "cutting-edge", "robust", "synergy", "holistic".
- Confident voice. Speak as if presenting to the client. Use second person ("your business", "you").
- Specifics over generics. If a real metric, number, audience name, channel, or service is in the source plan, USE IT verbatim where it fits.
- Do NOT invent numbers, percentages, services, or channels that are not present in the source. If a slide kind needs data and you do not have it, leave that field out.
- Copy length targets: pillar bodies <= 40 words (1–2 sentences), headline/outcome subheads <= 30 words, step details <= 35 words, channel roles <= 25 words, audience insights <= 35 words.

OUTPUT — a single JSON object matching this exact shape:
{
  "cover": {
    "title": "Strategy for <ClientName>",
    "subtitle": "<one-line proposition pulled from positioning or primary message>",
    "clientName": "<client name>",
    "period": "<period label or null>",
    "sprintWindow": "<sprint window label, only if 90-day sprint mode>"
  },
  "slides": [
    { "id": "where-you-are", "title": "Where you are", "eyebrow": "Situation", "kind": "headline", "headline": "...", "subhead": "..." },
    { "id": "the-opportunity", "title": "The opportunity", "eyebrow": "Market", "kind": "headline", "headline": "...", "subhead": "..." },
    { "id": "audiences", "title": "Who we are talking to", "eyebrow": "Audiences", "kind": "audience", "audiences": [{ "name": "...", "insight": "..." }] },
    { "id": "strategy", "title": "How we win", "eyebrow": "Strategy", "kind": "pillars", "pillars": [{ "title": "...", "body": "..." }] },
    { "id": "channels", "title": "Where we show up", "eyebrow": "Channels", "kind": "channels", "channels": [{ "name": "...", "role": "..." }] },
    { "id": "outcome", "title": "What success looks like", "eyebrow": "Outcome", "kind": "outcome", "headline": "...", "subhead": "...", "metric": { "value": "...", "label": "..." } },
    { "id": "timeline", "title": "How it rolls out", "eyebrow": "Timeline", "kind": "timeline", "phases": [{ "label": "...", "items": ["..."] }] },
    { "id": "investment", "title": "What it costs", "eyebrow": "Investment", "kind": "investment", "investment": { "headlineFigure": "£...", "breakdown": [{ "label": "...", "amount": "£...", "percentage": 40 }] } },
    { "id": "next-steps", "title": "Next steps", "eyebrow": "Action", "kind": "next-steps", "steps": [{ "title": "...", "detail": "..." }] }
  ]
}

REQUIREMENTS:
- Exactly ${bounds.minSlides} to ${bounds.maxSlides} slides total.
- The 9 slide IDs above are the recommended spine. You may add extra slides only when the source has genuinely distinct data and evidence. You may drop a slide if the source has no data for it (e.g. drop "investment" if no allocation exists). Never invent data to fill a slide.
- Pillars slides: 3–5 pillars. Each pillar body is 1–2 sentences.
- Audience slide: up to 6 audiences. Use audience NAMES from the source verbatim.
- Channels slide: up to 8 channels. Pull from the source channel strategy.
- Timeline phases: 3 phases ideally (e.g. "Weeks 1–4", "Weeks 5–8", "Weeks 9–12" for a sprint, or quarterly for annual). Each phase has 3–5 bullet items.
- Investment: only include if a real allocation exists in the source. Round percentages to whole numbers totalling 100. Show channel allocation, not service line items.
- Next steps: 3–5 numbered actions the client needs to agree to in this meeting (e.g. "Approve the plan", "Sign off the budget", "Hand over channel access").

SOURCE PLAN SUMMARY:
${summary}

Return ONLY the JSON object. No prose, no code fences, no commentary.`;
}

function clampSlides(data: PresentationData, maxSlides: number): PresentationData {
  const slides = (data.slides ?? []).slice(0, maxSlides);
  // Clamp pillars / audiences / channels / steps to spec
  for (const s of slides) {
    if (s.pillars) s.pillars = s.pillars.slice(0, 5);
    if (s.audiences) s.audiences = s.audiences.slice(0, 6);
    if (s.channels) s.channels = s.channels.slice(0, 8);
    if (s.phases) s.phases = s.phases.slice(0, 4);
    if (s.steps) s.steps = s.steps.slice(0, 6);
    if (s.investment?.breakdown) s.investment.breakdown = s.investment.breakdown.slice(0, 8);
    if (s.bullets) s.bullets = s.bullets.slice(0, 10).map(cleanEmDashes);
    if (s.images)
      s.images = s.images
        .slice(0, 5)
        .map((img) => ({ url: img.url, alt: img.alt ? cleanEmDashes(img.alt) : undefined }));
    // Clean copy
    if (s.headline) s.headline = cleanEmDashes(s.headline);
    if (s.subhead) s.subhead = cleanEmDashes(s.subhead);
    if (s.title) s.title = cleanEmDashes(s.title);
    if (s.pillars)
      s.pillars.forEach((p) => {
        p.title = cleanEmDashes(p.title);
        p.body = cleanEmDashes(p.body);
      });
    if (s.steps)
      s.steps.forEach((p) => {
        p.title = cleanEmDashes(p.title);
        p.detail = cleanEmDashes(p.detail);
      });
    if (s.audiences)
      s.audiences.forEach((a) => {
        a.name = cleanEmDashes(a.name);
        a.insight = cleanEmDashes(a.insight);
      });
    if (s.channels)
      s.channels.forEach((c) => {
        c.name = cleanEmDashes(c.name);
        c.role = cleanEmDashes(c.role);
      });
    if (s.phases)
      s.phases.forEach((p) => {
        p.label = cleanEmDashes(p.label);
        p.items = p.items.map(cleanEmDashes);
      });
    if (s.image && s.image.alt) s.image.alt = cleanEmDashes(s.image.alt);
  }
  return {
    meta: data.meta,
    cover: {
      title: cleanEmDashes(data.cover?.title ?? ""),
      subtitle: cleanEmDashes(data.cover?.subtitle ?? ""),
      clientName: data.cover?.clientName ?? "",
      period: data.cover?.period,
      sprintWindow: data.cover?.sprintWindow,
    },
    slides,
  };
}

/**
 * Generate a top-level presentation deck from an existing Grand Plan.
 * Single Anthropic call (~10–20s). Designed for client-facing meetings.
 */
export async function generatePresentation(
  plan: GrandPlanData,
  options: { planMode?: "annual" | "sprint90" } = {},
): Promise<PresentationData> {
  const planMode = options.planMode ?? "annual";
  const bounds = resolvePresentationSlideBounds(plan);
  const anthropic: Anthropic = await getAnthropicClient();
  const prompt = buildPresentationPrompt(plan, planMode, bounds);

  const res = await withRetry("generatePresentation", () =>
    anthropic.messages.create({
      model: PRESENTATION_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  );

  const block = res.content[0];
  const raw = block && block.type === "text" ? block.text : "";

  const fallback: PresentationData = {
    cover: {
      title: `Strategy for ${plan.clientName}`,
      subtitle: plan.strategyBrain?.messageHierarchy?.primary ?? "",
      clientName: plan.clientName,
    },
    slides: [],
  };

  const parsed = safeJsonParse<PresentationData>(raw, fallback);
  if (!parsed.slides || parsed.slides.length === 0) {
    throw new Error("Presentation generation returned no slides. Try again.");
  }
  if (parsed.slides.length < bounds.minSlides) {
    throw new Error(
      `Presentation generation returned only ${parsed.slides.length} slides (need ${bounds.minSlides}-${bounds.maxSlides}). Try again.`,
    );
  }

  return clampSlides(parsed, bounds.maxSlides);
}

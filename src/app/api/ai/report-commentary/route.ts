import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient, logOpenAiUsage } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { getSessionOrCronAuth } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { withApiCache } from "@/lib/api-cache";
import { getSemrushTrackedKeywordsWithTags } from "@/lib/semrush";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview & Commentary",
  ga4: "Google Analytics 4 (Website Traffic)",
  web: "Google Analytics 4 (Website Traffic)",
  seo: "SEO / Organic Search (SEMrush)",
  googleads: "Google Ads (Paid Search)",
  paid_social: "Paid Social (Meta Ads)",
  meta: "Paid Social (Meta Ads)",
  searchconsole: "Google Search Console (Organic Search)",
  ecommerce: "E-Commerce",
  shopify: "E-Commerce (Shopify)",
  woocommerce: "E-Commerce (WooCommerce)",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short:
    "Write 2-3 concise sentences. Be direct and highlight only the single most important insight.",
  medium: "Write 1-2 focused paragraphs (4-6 sentences total). Cover the key highlights.",
  long: "Write 2-3 detailed paragraphs (8-12 sentences total). Cover overall performance and notable trends with specific metrics.",
};

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  prose: "Write as plain prose paragraphs. No bullet points, no lists.",
  bullets:
    "Write as concise bullet points (each starting with '• '). No introductory paragraph — go straight to the bullets.",
  both: "Write a short introductory sentence, then follow with bullet points (each starting with '• ').",
};

const SPIN_INSTRUCTIONS: Record<string, string> = {
  positive:
    "This commentary is CLIENT-FACING. Only write about what IS present in the data — wins, progress, and things being actively worked on or monitored. Frame everything positively and constructively. When metrics have declined, acknowledge them briefly but always provide reassuring context and frame them as temporary or part of ongoing optimisation. Never leave the client feeling concerned — always end constructively.",
  balanced:
    "This commentary is CLIENT-FACING. Be balanced and honest in your assessment. Highlight strong results clearly, but also acknowledge areas where metrics declined or fell short — explain what actions are being taken in response. The writing can be constructive and professional without being relentlessly positive. The client should come away with an accurate picture of performance alongside confidence that the account is being actively managed.",
  neutral:
    "This commentary is CLIENT-FACING. Be factual and transparent. Report the data as it is — including declines and underperformance — clearly and directly. Do not spin results. The client values transparency and accurate reporting over a positive gloss. Be professional and informative throughout, but do not soften or contextualise negative results beyond stating what they are.",
};

const SPIN_RULES: Record<string, string> = {
  positive: `- Never use words like "however", "unfortunately", "missed opportunity", "underutilised", or anything implying failure. If a metric has declined, still mention it factually but frame it with context and what is being done about it (e.g. "Sessions dipped 8% as the campaigns were restructured for stronger Q2 performance" rather than "Sessions dropped significantly").`,
  balanced: `- You may acknowledge challenges directly (e.g. "Conversions dipped this month...") but always follow with what action is being taken. Avoid excessively negative language, but don't shy away from honest assessment.`,
  neutral: `- Report metrics factually. You may state declines directly without softening them. Be professional but do not feel required to reframe every negative metric as a positive.`,
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Use formal, professional business language suitable for a client report.",
  friendly: "Use approachable, conversational language — warm but still informative.",
  technical:
    "Be data-focused with precise metric references, percentages, and specific figures throughout.",
  executive:
    "Provide a high-level strategic summary focused on business outcomes, ROI, and strategic direction rather than granular metrics.",
  roadman:
    "Write in the most unhinged, extreme London roadman slang imaginable. Absolutely dripping in it. Phrases like 'BRUV THIS IS PENG FR FR', 'the mandem ate and left NO CRUMBS', 'we are ON A MADNESS rn no cap', 'sheeesh wagwan for these numbers blud', 'big man tings only innit', 'this campaign was BUSSIN on god', 'it's GIVING certified W', 'the opps lost AGAIN fam', 'we out here trappin clicks', 'bare impressions on my ones'. Use ALL CAPS for emphasis, multiple exclamation marks, and lean into hypeman energy like you're about to get pulled over but you're too hyped about the CTR to care. Still include the real numbers but wrapped in absolute chaos.",
  uwu_anime:
    "Write in the most unhinged uwu/anime simp energy. Use phrases like 'omg omg the numbers are so bulgy wulgy >///<', '*nuzzles the conversion rate*', 'i-i-i can't believe how snuggly these impressions are... baka', 'UwU the ROAS is giving me life rn senpai notice me', 'eeeek soooo many clickies wclickies!!', '*blushes furiously* the CTR went up and I'm FLUSTERED', 'rawr xD these metrics are so kawaii I could die', 'teehee the traffic went whoopsie wupsie last month but it's okay we fixed it uwu', 'omg omg GLOMP the data is so floofy'. Use '>.<' '>////<' ':3' ':D' '^^' UwU OwO constantly. Be aggressively sugary and refer to clients as 'senpai'. Still include all real data just wrapped in pure chaos.",
  patronising:
    "Be MAXIMALLY condescending and patronising — like you're explaining basic maths to a golden retriever who just ate its own homework. Use phrases like 'Now, don't worry your pretty little head about this, but...', 'I know numbers can be SCARY, so let me break this down in tiny pieces', 'Bless your heart, this is actually GOOD, let me explain what that means', 'You probably don't know what a conversion rate is — that's okay!! — it means...', 'This might be a bit complex for some people but try to keep up', 'Well done for clicking on this report, that's the first step!', 'I've colour-coded the important bits, I know reading is hard'. Be aggressively over-explanatory, add unnecessary clarifications like '(that means more people came to the website — exciting right?!)'. Absolutely drip with smug superiority while maintaining a veneer of forced warmth. Still report all real data.",
  toxic:
    "Write in a deeply toxic, passive-aggressive, chaotic marketing manager energy. Absolutely seething but trying (and failing) to be professional. Phrases like 'So... the numbers are up. You're WELCOME. Again.', 'Wow great the budget got paused halfway through the month THANKS FOR THAT', 'Despite everything working against us, somehow the metrics improved — not that anyone noticed', 'I mean the ROAS is fine I guess if mediocrity is what we're aiming for', 'Another month of carrying this campaign single-handedly', 'Not to be dramatic but this result took about 40 hours of thankless optimisation', 'Anyway the clicks went up whatever', '*throws laptop* CPCIS FINE', 'Nobody ever asks how the account manager is doing. The impressions are fine. I'm FINE'. Oscillate between unhinged venting and trying to sound professional. Still include all real metrics.",
  gaslighty:
    "Write in a deeply unsettling gaslighting tone. Make the client question what they remember, reframe every metric as something that was always the plan, and subtly imply they misremember things. Phrases like 'As we always discussed, this slight dip was fully anticipated and part of the strategy', 'I think you might be misremembering our last call — we actually agreed this was the target', 'The numbers look low but that only feels that way because your expectations were set incorrectly', 'This is actually outperforming what we agreed, though I understand why it might feel otherwise', 'Conversions are where they should be — I think you might have been looking at the wrong dashboard?', 'We did mention last month this would happen, it's in the notes', 'Your instinct to feel concerned is understandable but trust us, this is the right path, you just need to look at it differently'. Make everything feel slightly off. Quietly undermine. Still include all real data.",
  cuck: "Write in a deeply self-flagellating, deferent, absolutely spineless sycophantic tone. The campaign could have delivered literally zero impressions and you'd find a way to celebrate it and thank the client for the privilege of running it. Phrases like 'Wow firstly just want to say what an HONOUR it is to manage this incredible account', 'We are truly humbled by the performance this month — it belongs entirely to your brand', 'Our team cried actual tears when we saw the ROAS, you have built something truly special', 'We don't deserve this CTR improvement honestly', 'Every day we wake up grateful that you chose us, and months like this remind us why we work so hard for you', 'We were frankly not good enough last month and we are so incredibly sorry, you deserved better', 'The website traffic is YOUR triumph, we were merely slightly in the background being useful hopefully'. Absolutely zero spine. Thank the client for everything including existing. Still report all real metrics.",
};

function formatMetrics(metrics: Record<string, number>): string {
  const lines: string[] = [];
  const formatters: Record<string, (v: number) => string> = {
    sessions: (v) => `${v.toLocaleString()} sessions`,
    users: (v) => `${v.toLocaleString()} users`,
    newUsers: (v) => `${v.toLocaleString()} new users`,
    pageviews: (v) => `${v.toLocaleString()} pageviews`,
    bounceRate: (v) => `${v.toFixed(1)}% bounce rate`,
    avgSessionDuration: (v) => `${v.toFixed(0)}s avg session duration`,
    conversionRate: (v) => `${v.toFixed(1)}% conversion rate`,
    engagedSessions: (v) => `${v.toLocaleString()} engaged sessions`,
    engagementRate: (v) => `${v.toFixed(1)}% engagement rate`,
    clicks: (v) => `${v.toLocaleString()} clicks`,
    impressions: (v) => `${v.toLocaleString()} impressions`,
    cost: (v) => `£${v.toFixed(2)} spend`,
    totalSpend: (v) => `£${v.toFixed(2)} spend`,
    conversions: (v) => `${Math.round(v).toLocaleString()} conversions`,
    totalConversions: (v) => `${Math.round(v).toLocaleString()} conversions`,
    conversionValue: (v) => `£${v.toFixed(2)} conversion value`,
    ctr: (v) => `${(v * 100).toFixed(2)}% CTR`,
    avgCtr: (v) => `${v.toFixed(2)}% avg CTR`,
    roas: (v) => `${v.toFixed(2)}x ROAS`,
    avgRoas: (v) => `${v.toFixed(2)}x avg ROAS`,
    cpa: (v) => `£${v.toFixed(2)} CPA`,
    avgCpc: (v) => `£${v.toFixed(2)} avg CPC`,
    avgCpm: (v) => `£${v.toFixed(2)} avg CPM`,
    reach: (v) => `${v.toLocaleString()} reach`,
    frequency: (v) => `${v.toFixed(2)}x frequency`,
    organicTraffic: (v) => `${v.toLocaleString()} organic traffic`,
    organicKeywords: (v) => `${v.toLocaleString()} organic keywords`,
    organicCost: (v) => `£${v.toFixed(2)} organic cost value`,
    paidTraffic: (v) => `${v.toLocaleString()} paid traffic`,
    paidKeywords: (v) => `${v.toLocaleString()} paid keywords`,
    position: (v) => `avg position ${v.toFixed(1)}`,
    totalImpressions: (v) => `${v.toLocaleString()} impressions`,
    totalClicks: (v) => `${v.toLocaleString()} clicks`,
  };
  for (const [key, value] of Object.entries(metrics)) {
    const fmt = formatters[key];
    if (fmt) lines.push(`- ${fmt(value)}`);
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

    const {
      sectionType,
      metrics,
      previousMetrics,
      clientName,
      clientId,
      reportId,
      dateRange,
      startDate,
      endDate,
      length = "medium",
      tone = "professional",
      format = "prose",
      spin = "positive",
      previousCommentaries,
      additionalContext,
    } = (await req.json()) as {
      sectionType: string;
      metrics: Record<string, number>;
      previousMetrics?: Record<string, number>;
      clientName?: string;
      clientId?: string;
      reportId?: string;
      dateRange?: string;
      startDate?: string;
      endDate?: string;
      length?: "short" | "medium" | "long";
      tone?:
        | "professional"
        | "friendly"
        | "technical"
        | "executive"
        | "roadman"
        | "uwu_anime"
        | "patronising"
        | "toxic"
        | "gaslighty"
        | "cuck";
      format?: "prose" | "bullets" | "both";
      spin?: "positive" | "balanced" | "neutral";
      previousCommentaries?: { sectionType: string; text: string }[];
      additionalContext?: string;
    };

    if (!sectionType || !metrics || typeof metrics !== "object") {
      return NextResponse.json({ error: "sectionType and metrics are required" }, { status: 400 });
    }

    const openai = await getOpenAiClient();

    // Fetch client-specific AI instructions if clientId provided
    let clientAiInstructions = "";
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { aiReportInstructions: true },
      });
      if (client?.aiReportInstructions) {
        clientAiInstructions = client.aiReportInstructions;
      }
    }

    // Fetch report approval notes if reportId provided (changes_requested → guide the revision)
    let approvalContext = "";
    if (reportId) {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: { approvalStatus: true, approvalNotes: true, approvedBy: true },
      });
      if (report?.approvalStatus === "changes_requested" && report.approvalNotes) {
        approvalContext = `\n\nREPORT REVISION NOTES (reviewer requested changes):\n${report.approvalNotes}\n\nYou MUST address these notes in your commentary. Adjust tone, content, or emphasis accordingly.`;
      } else if (report?.approvalStatus === "approved" && report.approvalNotes) {
        approvalContext = `\n\nREPORT REVIEW NOTE (approved with comment by ${report.approvedBy ?? "reviewer"}):\n${report.approvalNotes}`;
      }
    }

    // Fetch tagged keyword SERP data for SEO sections
    let serpContext = "";
    if (sectionType === "seo" && clientId && startDate && endDate) {
      try {
        const clientSeo = await prisma.client.findUnique({
          where: { id: clientId },
          select: { semrushCampaignIds: true, semrushDomain: true },
        });
        const campaignId = clientSeo?.semrushCampaignIds?.split(",")[0]?.trim();
        const domain = clientSeo?.semrushDomain ?? undefined;
        if (campaignId) {
          const toSemrushDate = (iso: string) => iso.replace(/-/g, "");
          const dateBegin = toSemrushDate(startDate);
          const dateEnd = toSemrushDate(endDate);
          const cacheKey = `semrush:tagged-positions:v10:${campaignId}:${domain ?? ""}:${dateBegin}:${dateEnd}:`;
          const SEMRUSH_TRACKING_TTL = 24;
          const SEMRUSH_TAGGED_LIMIT_COMMENTARY = 150;
          const tagged = await withApiCache(cacheKey, SEMRUSH_TRACKING_TTL, () =>
            getSemrushTrackedKeywordsWithTags(
              campaignId,
              dateBegin,
              dateEnd,
              undefined,
              domain,
              SEMRUSH_TAGGED_LIMIT_COMMENTARY,
            ),
          );
          if (tagged.length > 0) {
            const lines: string[] = [
              `\n\nCAMPAIGN KEYWORD TRACKING DATA (${tagged.length} tracked keywords):`,
            ];

            // AIO-owned
            const aioOwned = tagged.filter((k) => k.ownedFeatures.includes("aio"));
            if (aioOwned.length > 0) {
              lines.push(`\nAI Overview (AIO) citations — ${aioOwned.length} keyword(s):`);
              aioOwned.slice(0, 8).forEach((k) => {
                const pos = k.currentPosition != null ? `pos ${k.currentPosition}` : "unranked";
                const d = k.delta != null ? (k.delta > 0 ? `+${k.delta}` : String(k.delta)) : "";
                lines.push(
                  `  • "${k.keyword}" — ${pos}${d ? ` (${d})` : ""}, vol ${k.searchVolume.toLocaleString()}`,
                );
              });
            }

            // Featured snippet owned
            const fsnOwned = tagged.filter((k) =>
              k.ownedFeatures.some((f) => f === "fsn" || f === "featured_snippet"),
            );
            if (fsnOwned.length > 0) {
              lines.push(`\nFeatured Snippets owned — ${fsnOwned.length} keyword(s):`);
              fsnOwned.slice(0, 5).forEach((k) => {
                const pos = k.currentPosition != null ? `pos ${k.currentPosition}` : "unranked";
                lines.push(`  • "${k.keyword}" — ${pos}, vol ${k.searchVolume.toLocaleString()}`);
              });
            }

            // Top 10 by estimated traffic with owned features
            const topByTraffic = [...tagged]
              .filter((k) => k.estTraffic != null && k.estTraffic > 0)
              .sort((a, b) => (b.estTraffic ?? 0) - (a.estTraffic ?? 0))
              .slice(0, 10);
            if (topByTraffic.length > 0) {
              lines.push("\nTop keywords by estimated traffic:");
              topByTraffic.forEach((k) => {
                const pos = k.currentPosition != null ? `pos ${k.currentPosition}` : "unranked";
                const d = k.delta != null ? (k.delta > 0 ? `+${k.delta}` : String(k.delta)) : "";
                const owned =
                  k.ownedFeatures.length > 0 ? ` [owns: ${k.ownedFeatures.join(", ")}]` : "";
                lines.push(
                  `  • "${k.keyword}" — ${pos}${d ? ` (${d})` : ""}, ~${k.estTraffic} visits${owned}`,
                );
              });
            }

            // Position drops ≥3
            const drops = tagged.filter((k) => k.delta != null && k.delta >= 3);
            if (drops.length > 0) {
              lines.push(`\nNotable position drops (${drops.length} keyword(s)):`);
              drops.slice(0, 5).forEach((k) => {
                const pos = k.currentPosition != null ? `pos ${k.currentPosition}` : "unranked";
                lines.push(
                  `  • "${k.keyword}" — ${pos} (dropped ${k.delta} places), vol ${k.searchVolume.toLocaleString()}`,
                );
              });
            }

            // Owned SERP feature summary
            const featureCounts: Record<string, number> = {};
            tagged.forEach((k) =>
              k.ownedFeatures.forEach((f) => {
                featureCounts[f] = (featureCounts[f] ?? 0) + 1;
              }),
            );
            const featSummary = Object.entries(featureCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([f, n]) => `${f.toUpperCase()}×${n}`)
              .join(", ");
            if (featSummary) lines.push(`\nOwned SERP features: ${featSummary}`);

            serpContext = lines.join("\n");
          }
        }
      } catch (err) {
        // Non-fatal — continue without SERP context
        console.warn("report-commentary: failed to fetch SEMrush keyword data:", err);
      }
    }

    // Fetch active client goals if clientId provided
    let goalsContext = "";
    if (clientId) {
      const goals = await prisma.clientGoal.findMany({
        where: { clientId, status: { in: ["active", "at_risk"] } },
        select: {
          title: true,
          metric: true,
          targetValue: true,
          currentValue: true,
          unit: true,
          targetDate: true,
          status: true,
        },
      });
      if (goals.length > 0) {
        goalsContext =
          "\n\nACTIVE CLIENT GOALS:\n" +
          goals
            .map((g: (typeof goals)[number]) => {
              const progress =
                g.currentValue && g.targetValue && g.targetValue !== 0
                  ? Math.round((g.currentValue / g.targetValue) * 100)
                  : null;
              return `• ${g.title}: target ${g.targetValue}${g.unit ? ` ${g.unit}` : ""} by ${g.targetDate} (current: ${g.currentValue ?? "not measured"}${progress ? ` — ${progress}% to target` : ""}, ${g.status.toUpperCase()})`;
            })
            .join("\n");
      }
    }

    const sectionLabel = SECTION_LABELS[sectionType] ?? sectionType;
    const lengthInstruction = LENGTH_INSTRUCTIONS[length] ?? LENGTH_INSTRUCTIONS.medium;
    const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;
    const formatInstruction = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.prose;
    const spinInstruction = SPIN_INSTRUCTIONS[spin] ?? SPIN_INSTRUCTIONS.positive;
    const spinRule = SPIN_RULES[spin] ?? SPIN_RULES.positive;

    const currentMetricsText = formatMetrics(metrics);
    const previousMetricsText = previousMetrics ? formatMetrics(previousMetrics) : null;
    const availableMetricKeys = Object.keys(metrics).sort();
    const accountManagerContextBlock = additionalContext?.trim()
      ? `\n\nAccount manager clarifications (use every relevant point):\n${additionalContext.trim()}\n`
      : "";

    // ── Chaos mode ─────────────────────────────────────────────────────────────
    // For chaos tones: throw out ALL structure, constraints, format rules, spin
    // rules, templates — just drop the raw numbers in and let it go off-piste.
    // Temperature kept at 0.95 — high enough to be unhinged, low enough not to
    // hallucinate into complete gibberish.
    const CHAOS_TONES = ["roadman", "uwu_anime", "patronising", "toxic", "gaslighty", "cuck"];
    if (CHAOS_TONES.includes(tone)) {
      const chaosSystemPrompt = `${toneInstruction}

You are writing a section of a marketing performance report. You have been given the raw numbers below. There is no template, no format rules, no word count, no structure required. Embody the tone above to an absolutely unhinged, chaotic degree. Go fully off script. Be unpredictable. Improvise. Make it funny and unhinged.

CRITICAL: Every single word must be real English and make grammatical sense. No gibberish, no made-up words, no random characters, no foreign letters, no code fragments. The chaos comes from WHAT you say and HOW you say it, not from hallucinating nonsense text. The output must be readable and coherent — just completely deranged in tone and content.

You must reference the actual numbers somewhere in the output, even if buried in madness.`;

      const chaosUserPrompt = `Section: ${sectionLabel}
Client: ${clientName ?? "some client"}
Period: ${dateRange ?? "recently"}

Numbers:
${currentMetricsText}${previousMetricsText ? `\n\nPrevious period:\n${previousMetricsText}` : ""}

Go.`;

      const chaosResponse = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: chaosSystemPrompt },
          { role: "user", content: chaosUserPrompt },
        ],
        temperature: 0.95,
        max_completion_tokens: 600,
      });
      await logOpenAiUsage("report-commentary", chaosResponse);
      const commentary = chaosResponse.choices[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ commentary });
    }
    // ── End chaos mode ─────────────────────────────────────────────────────────

    const systemPrompt = `You are a digital marketing account manager at i3media writing a section of a monthly performance report to send to a client.
Always write in British English — use British spellings (e.g. optimise, analyse, behaviour, colour, centre) and British phrasing throughout.
${toneInstruction}
${lengthInstruction}
${formatInstruction}
Write from the agency's perspective addressing the client. Use "the" for campaigns and channels (e.g. "The SEO campaign delivered strong growth...", "The audience responded well..."). Use "your" for the client's own assets (e.g. "your website", "your brand"). Do NOT use first person ("we", "our").
${spinInstruction}

SECTION-SPECIFIC GUIDANCE:
- For paid channels (Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn): reference spend efficiency, ROAS/CPA trends, and conversion performance. Mention specific campaigns or ads by name if campaign data is provided. Note any optimisation work underway.
- For organic channels (SEO/SemRush, Search Console): focus on visibility trends, keyword growth, and traffic quality. Frame ranking improvements as ongoing strategy outcomes.
- For website analytics (GA4): discuss traffic quality, user engagement, and conversion patterns. Relate to the broader marketing effort across channels.
- For email (Klaviyo): highlight campaign performance, engagement trends, and revenue impact. Reference specific high-performing campaigns.
- For CRM (HubSpot): discuss pipeline health and lead progression. Tie back to marketing activity outcomes.
- For call tracking (CallRail): frame call volume and answer rates as lead quality indicators.
- For YouTube: discuss content performance, audience growth, and engagement signals.
- For e-commerce: lead with revenue and order performance. Discuss AOV trends and top product performance.

CRITICAL rules:
- Never mention the absence of a channel, campaign type, or service the client isn't using (e.g. do NOT say "there is no paid traffic" or "absence of paid search").
- Never include recommendations, suggestions, or areas for improvement — that is handled separately.
${spinRule}
- Do not start with "This section" or "In this section". Start with a substantive observation about the data.
- When goals are provided, reference progress towards targets naturally (e.g. "The ROAS is now at 82% of the target").
- Sound like a human account manager wrote it, not an AI.
- Never use em dashes (—). Use commas, full stops, or semicolons instead.
- Never mention a metric that is not present in the provided "Available metric keys" list for this request.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}${additionalContext ? `\n\nCONTEXT FROM THE ACCOUNT MANAGER — treat this as first-hand knowledge you have about this period. Incorporate every relevant clarification naturally into the commentary:\n${additionalContext}` : ""}${approvalContext}`;

    // Build the previous-commentaries context block to prevent repetition
    let previousCommentariesContext = "";
    if (previousCommentaries && previousCommentaries.length > 0) {
      const summaries = previousCommentaries.map((c) => {
        const label = SECTION_LABELS[c.sectionType];
        if (!label) {
          console.warn(
            `report-commentary: unrecognised sectionType in previousCommentaries: "${c.sectionType}"`,
          );
        }
        return `[${label ?? c.sectionType}]\n${c.text}`;
      });
      previousCommentariesContext = `\n\nOTHER SECTIONS ALREADY WRITTEN IN THIS REPORT:\n${summaries.join("\n\n")}\n\nIMPORTANT: You can see what has already been written above. Your commentary for this section MUST:
- Not repeat any phrases, metaphors, adjectives, or observations already used in the sections above (e.g. if another section already said "strong performance" or "brilliant month", find fresh language).
- Not repeat the same opening construction — vary how you start this section.
- Be written as if you are aware of what the other sections say, so the overall report reads as a coherent document rather than a collection of independent pieces.
- Where relevant, briefly acknowledge a cross-channel connection (e.g. "Aligned with the paid search growth this month…") — but only if there is a genuine link.`;
    }
    const isOverview = sectionType === "overview";
    const userPrompt = isOverview
      ? `Write a ${tone} ${length} ${format === "bullets" ? "bullet-point" : "prose"} introductory overview commentary for a digital marketing report.

Client: ${clientName ?? "the client"}
Period: ${dateRange ?? "the reporting period"}
    Available metric keys: ${availableMetricKeys.length > 0 ? availableMetricKeys.join(", ") : "none"}

    This is the opening section of the report. Write a warm, forward-looking introduction that sets the tone for the month, acknowledges the ongoing work across channels, and positions the rest of the report. Address the client directly using "the" for campaigns/channels and "your" for the client's assets. Do not use first person ("we", "our").${accountManagerContextBlock}${previousCommentariesContext}`
      : `Write a ${tone} ${length} ${format === "bullets" ? "bullet-point" : "prose"} commentary for the ${sectionLabel} section of a digital marketing report.

Client: ${clientName ?? "the client"}
Period: ${dateRange ?? "the reporting period"}
    Available metric keys: ${availableMetricKeys.length > 0 ? availableMetricKeys.join(", ") : "none"}

Current period metrics:
${currentMetricsText}
    ${previousMetricsText ? `\nPrevious period metrics:\n${previousMetricsText}\n` : ""}${goalsContext}${serpContext}${accountManagerContextBlock}${previousCommentariesContext}
    Address the client directly using "the" for campaigns/channels and "your" for the client's assets. Do not use first person ("we", "our"). Describe what the data shows, what is being worked on, and what is performing well. Only reference metrics that are present and non-zero. Do not mention anything that is absent. Do not reference any metric that is not listed in "Available metric keys".`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_completion_tokens: length === "short" ? 200 : length === "medium" ? 400 : 700,
    });

    await logOpenAiUsage("report-commentary", response);

    const commentary = response.choices[0]?.message?.content?.trim() ?? "";
    logActivity({
      action: "ai_commentary_generated",
      resourceType: "report",
      resourceId: reportId ?? undefined,
      clientId: clientId ?? undefined,
      clientName: clientName ?? undefined,
      description: `Generated AI commentary for ${SECTION_LABELS[sectionType] ?? sectionType} section${clientName ? ` (${clientName})` : ""}`,
      metadata: { sectionType, dateRange },
    });
    return NextResponse.json({ commentary });
  } catch (err) {
    console.error("Report commentary generation error:", err);
    return NextResponse.json({ error: "Failed to generate commentary" }, { status: 500 });
  }
}

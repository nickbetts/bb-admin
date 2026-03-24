import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECTION_LABELS: Record<string, string> = {
  ga4: "Google Analytics 4 (Website Traffic)",
  web: "Google Analytics 4 (Website Traffic)",
  seo: "SEO / Organic Search (SEMrush)",
  googleads: "Google Ads (Paid Search)",
  paid_social: "Paid Social (Meta Ads)",
  meta: "Paid Social (Meta Ads)",
  searchconsole: "Google Search Console (Organic Search)",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short: "Write 2-3 concise sentences. Be direct and highlight only the single most important insight.",
  medium: "Write 1-2 focused paragraphs (4-6 sentences total). Cover the key highlights and one or two recommendations.",
  long: "Write 2-3 detailed paragraphs (8-12 sentences total). Cover overall performance, notable trends with specific metrics, and actionable recommendations.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Use formal, professional business language suitable for a client report.",
  friendly: "Use approachable, conversational language — warm but still informative.",
  technical: "Be data-focused with precise metric references, percentages, and specific figures throughout.",
  executive: "Provide a high-level strategic summary focused on business outcomes, ROI, and strategic direction rather than granular metrics.",
};

function formatMetrics(metrics: Record<string, number>): string {
  const lines: string[] = [];
  const formatters: Record<string, (v: number) => string> = {
    sessions: (v) => `${v.toLocaleString()} sessions`,
    users: (v) => `${v.toLocaleString()} users`,
    newUsers: (v) => `${v.toLocaleString()} new users`,
    pageviews: (v) => `${v.toLocaleString()} pageviews`,
    bounceRate: (v) => `${(v * 100).toFixed(1)}% bounce rate`,
    avgSessionDuration: (v) => `${v.toFixed(0)}s avg session duration`,
    conversionRate: (v) => `${(v * 100).toFixed(2)}% conversion rate`,
    engagedSessions: (v) => `${v.toLocaleString()} engaged sessions`,
    engagementRate: (v) => `${(v * 100).toFixed(1)}% engagement rate`,
    clicks: (v) => `${v.toLocaleString()} clicks`,
    impressions: (v) => `${v.toLocaleString()} impressions`,
    cost: (v) => `£${v.toFixed(2)} spend`,
    totalSpend: (v) => `£${v.toFixed(2)} spend`,
    conversions: (v) => `${v.toLocaleString()} conversions`,
    totalConversions: (v) => `${v.toLocaleString()} conversions`,
    conversionValue: (v) => `£${v.toFixed(2)} conversion value`,
    ctr: (v) => `${(v * 100).toFixed(2)}% CTR`,
    avgCtr: (v) => `${(v * 100).toFixed(2)}% avg CTR`,
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
    const { sectionType, metrics, previousMetrics, clientName, dateRange, length = "medium", tone = "professional" } =
      await req.json() as {
        sectionType: string;
        metrics: Record<string, number>;
        previousMetrics?: Record<string, number>;
        clientName?: string;
        dateRange?: string;
        length?: "short" | "medium" | "long";
        tone?: "professional" | "friendly" | "technical" | "executive";
      };

    if (!sectionType || !metrics || typeof metrics !== "object") {
      return NextResponse.json({ error: "sectionType and metrics are required" }, { status: 400 });
    }

    // Get OpenAI API key from app settings
    const settingRow = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
    const apiKey = settingRow?.value ?? process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured. Add it in Settings." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const sectionLabel = SECTION_LABELS[sectionType] ?? sectionType;
    const lengthInstruction = LENGTH_INSTRUCTIONS[length] ?? LENGTH_INSTRUCTIONS.medium;
    const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;

    const currentMetricsText = formatMetrics(metrics);
    const previousMetricsText = previousMetrics ? formatMetrics(previousMetrics) : null;

    const systemPrompt = `You are an expert digital marketing analyst writing a performance report commentary section.
${toneInstruction}
${lengthInstruction}
Write ONLY the commentary text — no headers, no bullet points, no labels. Plain prose only.
Do not start with "This section" or "In this section". Start with a substantive observation.`;

    const userPrompt = `Write a ${tone} ${length} commentary for the ${sectionLabel} section of a digital marketing report.

Client: ${clientName ?? "the client"}
Period: ${dateRange ?? "the reporting period"}

Current period metrics:
${currentMetricsText}
${previousMetricsText ? `\nPrevious period metrics:\n${previousMetricsText}\n` : ""}
Focus on what the numbers mean for the business, highlight what's working or needs attention, and if the length allows, suggest next steps.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: length === "short" ? 200 : length === "medium" ? 400 : 700,
    });

    const commentary = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ commentary });
  } catch (err) {
    console.error("Report commentary generation error:", err);
    return NextResponse.json({ error: "Failed to generate commentary" }, { status: 500 });
  }
}

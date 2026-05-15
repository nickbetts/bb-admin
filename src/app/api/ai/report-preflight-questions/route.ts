import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type InputSection = {
  sectionType: string;
  title: string;
  metrics?: Record<string, number>;
  previousMetrics?: Record<string, number>;
};

type PreflightQuestion = {
  id: string;
  question: string;
  hint?: string;
};

const PREFLIGHT_HINT_FALLBACK = "Potential reasons may include seasonality, budget reallocation, creative or audience changes, tracking updates, or landing-page changes.";

const AVG_POSITION_CHANGE_REGEX = /average position[^0-9-]*\(?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:→|->)\s*([0-9]+(?:\.[0-9]+)?)/i;

function formatMetricKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

function buildNotableSignals(sections: InputSection[]): string[] {
  const signals: string[] = [];

  for (const section of sections) {
    const metrics = section.metrics ?? {};
    const previous = section.previousMetrics ?? {};

    for (const [metricKey, value] of Object.entries(metrics)) {
      const previousValue = previous[metricKey];
      if (typeof previousValue !== "number" || previousValue === 0) continue;

      const deltaPct = ((value - previousValue) / Math.abs(previousValue)) * 100;
      if (Math.abs(deltaPct) < 30) continue;

      signals.push(
        `${section.sectionType}: ${formatMetricKey(metricKey)} changed ${deltaPct.toFixed(1)}% (${previousValue.toFixed(2)} -> ${value.toFixed(2)})`,
      );
    }
  }

  return signals.slice(0, 25);
}

function normaliseAveragePositionQuestion(question: string): string {
  const match = AVG_POSITION_CHANGE_REGEX.exec(question);
  if (!match) return question;

  const previous = Number(match[1]);
  const current = Number(match[2]);

  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === current) {
    return question;
  }

  if (current > previous) {
    return question
      .replace(/average position has improved/gi, "average position has worsened")
      .replace(/average position improved/gi, "average position worsened")
      .replace(/average position got better/gi, "average position got worse")
      .replace(/average position is better/gi, "average position is worse");
  }

  return question
    .replace(/average position has worsened/gi, "average position has improved")
    .replace(/average position worsened/gi, "average position improved")
    .replace(/average position got worse/gi, "average position got better")
    .replace(/average position is worse/gi, "average position is better");
}

function sanitiseQuestions(value: unknown): PreflightQuestion[] {
  if (!Array.isArray(value)) return [];

  const dedupe = new Set<string>();
  const output: PreflightQuestion[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const questionRaw = (item as { question?: unknown }).question;
    const hintRaw = (item as { hint?: unknown }).hint;

    if (typeof questionRaw !== "string") continue;
    const question = normaliseAveragePositionQuestion(questionRaw.trim());
    if (!question) continue;

    const key = question.toLowerCase().replace(/\s+/g, " ");
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    output.push({
      id: `q-${output.length + 1}`,
      question,
      hint: typeof hintRaw === "string" && hintRaw.trim() ? hintRaw.trim() : PREFLIGHT_HINT_FALLBACK,
    });

    if (output.length >= 8) break;
  }

  return output;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

    const body = await req.json() as {
      reportId: string;
      clientId: string;
      period?: string;
      additionalContext?: string;
      sections?: InputSection[];
    };

    const { reportId, clientId, period, additionalContext, sections = [] } = body;

    if (!reportId || !clientId) {
      return NextResponse.json({ error: "reportId and clientId are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, aiReportInstructions: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    const openai = await getOpenAiClient();
    const notableSignals = buildNotableSignals(sections);

    const promptPayload = sections
      .slice(0, 20)
      .map((s) => ({
        sectionType: s.sectionType,
        title: s.title,
        metrics: s.metrics ?? {},
        previousMetrics: s.previousMetrics ?? {},
      }));

    const systemPrompt = `You are a senior marketing strategist preparing preflight clarification questions before writing a client report narrative.
Always write in British English with British spellings.

Goal:
- Ask only high-value questions a CMO would ask when data appears unusual, contradictory, or lacks key context.
- Ask nothing if the data is straightforward.
- Questions should be answerable quickly by an account manager.
- Use only the metric data and user-provided context below. Do not rely on, reference, or infer from existing commentary text.

Rules:
- Return 0 to 8 questions.
- Keep each question concise, specific, and decision-relevant.
- Avoid generic filler questions.
- Use change wording like "increased" / "decreased" first; avoid ambiguous wording.
- Never use contradictory phrasing (for example: "improved ... actually worse").
- Direction rules: lower is better for average position, bounce rate, CPA, CPC, CPM, and cost.
- Direction rules: higher is better for clicks, impressions, CTR, ROAS, conversions, conversion value, revenue, sessions, users, and engagement rate.
- Include a short hint for every question.
- Each hint must describe 1 to 3 plausible potential reasons based only on the provided data/context.
- Write each hint as a hypothesis, not a fact, and keep it under 28 words.
- Start each hint with "Potential reasons:".
- Return valid JSON only in this shape:
{
  "questions": [
    { "question": "string", "hint": "string" }
  ]
}${client.aiReportInstructions ? `\n\nClient-specific instructions:\n${client.aiReportInstructions}` : ""}`;

    const userPrompt = `Client: ${client.name}
Report ID: ${reportId}
Period: ${period ?? "Current reporting period"}

User-provided context:
${additionalContext?.trim() ? additionalContext.trim() : "No user context provided."}

Notable computed signals:
${notableSignals.length > 0 ? notableSignals.map((s) => `- ${s}`).join("\n") : "- No major computed discrepancies detected."}

Section payload:
${JSON.stringify(promptPayload, null, 2)}

Metric direction reference:
- Lower is better: average position, bounce rate, CPA, CPC, CPM, cost.
- Higher is better: clicks, impressions, CTR, ROAS, conversions, conversion value, revenue, sessions, users, engagement rate.

If clarifications are needed, ask focused preflight questions now. If not needed, return an empty questions array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      temperature: 0.2,
      max_completion_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
    }

    const questions = sanitiseQuestions((parsed as { questions?: unknown }).questions);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Report preflight questions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate preflight questions" },
      { status: 500 },
    );
  }
}

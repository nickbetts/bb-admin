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
  commentary?: string;
  metrics?: Record<string, number>;
  previousMetrics?: Record<string, number>;
};

type PreflightQuestion = {
  id: string;
  question: string;
  hint?: string;
};

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

    if (section.commentary?.trim()) {
      signals.push(`${section.sectionType} commentary excerpt: ${section.commentary.trim().slice(0, 280)}`);
    }
  }

  return signals.slice(0, 25);
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
    const question = questionRaw.trim();
    if (!question) continue;

    const key = question.toLowerCase().replace(/\s+/g, " ");
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    output.push({
      id: `q-${output.length + 1}`,
      question,
      hint: typeof hintRaw === "string" && hintRaw.trim() ? hintRaw.trim() : undefined,
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
      sections?: InputSection[];
    };

    const { reportId, clientId, period, sections = [] } = body;

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
        commentary: s.commentary?.trim() || "",
        metrics: s.metrics ?? {},
        previousMetrics: s.previousMetrics ?? {},
      }));

    const systemPrompt = `You are a senior marketing strategist preparing preflight clarification questions before writing a client report narrative.
Always write in British English with British spellings.

Goal:
- Ask only high-value questions a CMO would ask when data appears unusual, contradictory, or lacks key context.
- Ask nothing if the data is straightforward.
- Questions should be answerable quickly by an account manager.

Rules:
- Return 0 to 8 questions.
- Keep each question concise, specific, and decision-relevant.
- Avoid generic filler questions.
- Include a short hint only when it helps the user answer faster.
- Return valid JSON only in this shape:
{
  "questions": [
    { "question": "string", "hint": "string (optional)" }
  ]
}${client.aiReportInstructions ? `\n\nClient-specific instructions:\n${client.aiReportInstructions}` : ""}`;

    const userPrompt = `Client: ${client.name}
Report ID: ${reportId}
Period: ${period ?? "Current reporting period"}

Notable computed signals:
${notableSignals.length > 0 ? notableSignals.map((s) => `- ${s}`).join("\n") : "- No major computed discrepancies detected."}

Section payload:
${JSON.stringify(promptPayload, null, 2)}

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

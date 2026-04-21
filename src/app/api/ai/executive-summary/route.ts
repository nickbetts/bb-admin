import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

    const { sections, clientName, clientId, reportId, period } = await req.json() as {
      sections: { sectionType: string; title: string; commentary: string }[];
      clientName?: string;
      clientId?: string;
      reportId?: string;
      period?: string;
    };

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: "sections array is required" }, { status: 400 });
    }

    const openai = await getOpenAiClient();

    let clientAiInstructions = "";
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { aiReportInstructions: true },
      });
      if (client?.aiReportInstructions) clientAiInstructions = client.aiReportInstructions;
    }

    // Fetch report approval notes if reportId provided
    let approvalContext = "";
    if (reportId) {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: { approvalStatus: true, approvalNotes: true, approvedBy: true },
      });
      if (report?.approvalStatus === "changes_requested" && report.approvalNotes) {
        approvalContext = `\n\nREPORT REVISION NOTES (reviewer requested changes — address these in the executive summary):\n${report.approvalNotes}`;
      }
    }

    // Fetch active goals so the executive summary can anchor to KPI progress
    let goalsContext = "";
    if (clientId) {
      const goals = await prisma.clientGoal.findMany({
        where: { clientId, status: { in: ["active", "at_risk"] } },
        select: { metric: true, targetValue: true, currentValue: true, unit: true, status: true },
      });
      if (goals.length > 0) {
        goalsContext = `\n\nACTIVE CLIENT GOALS (reference goal progress in the executive summary where relevant):\n${goals.map(g => {
          const pct = g.targetValue > 0 && g.currentValue != null ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
          return `• ${g.metric}: ${pct}% to target (${g.currentValue}${g.unit ? " " + g.unit : ""} of ${g.targetValue}${g.unit ? " " + g.unit : ""} — ${g.status.toUpperCase()})`;
        }).join("\n")}`;
      }
    }

    // Scale bullet count to number of active sections
    const bulletRange = sections.length <= 3 ? "3–4" : sections.length <= 6 ? "4–5" : "5–7";

    const sectionSummaries = sections
      .filter((s) => s.commentary?.trim())
      .map((s) => `**${s.title}**: ${s.commentary.slice(0, 600)}`)
      .join("\n\n");

    if (!sectionSummaries) {
      return NextResponse.json({ error: "No section commentary available to summarise" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `You are a digital marketing account manager at i3media writing an executive summary for a monthly performance report.
Always write in British English — use British spellings throughout.
Use formal, professional language suitable for senior stakeholders.
Write in the first person as the agency — use "we" and "our".
This summary is CLIENT-FACING and should be upbeat, clear, and strategic.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}${approvalContext}`,
        },
        {
          role: "user",
          content: `Write a concise executive summary for a digital marketing performance report.

Client: ${clientName ?? "the client"}
Period: ${period ?? "the reporting period"}
${goalsContext}

The report contains the following sections (summarised below):
${sectionSummaries}

Write ${bulletRange} impactful bullet points (each starting with '• ') that summarise the most important results across ALL channels. If goals data is provided above, open with a bullet on overall goal progress. Focus on headline wins and overall trajectory. Each bullet should be one punchy sentence. Do not repeat the section titles verbatim. Cover breadth (multiple channels) rather than depth on one.`,
        },
      ],
      temperature: 0.65,
      max_completion_tokens: 700,
    });

    const commentary = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ commentary });
  } catch (err) {
    console.error("Executive summary generation error:", err);
    return NextResponse.json({ error: "Failed to generate executive summary" }, { status: 500 });
  }
}

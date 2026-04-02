import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { sections, clientName, clientId, period } = await req.json() as {
      sections: { sectionType: string; title: string; commentary: string }[];
      clientName?: string;
      clientId?: string;
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

    const sectionSummaries = sections
      .filter((s) => s.commentary?.trim())
      .map((s) => `**${s.title}**: ${s.commentary.slice(0, 600)}`)
      .join("\n\n");

    if (!sectionSummaries) {
      return NextResponse.json({ error: "No section commentary available to summarise" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a digital marketing account manager at i3media writing an executive summary for a monthly performance report.
Always write in British English — use British spellings throughout.
Use formal, professional language suitable for senior stakeholders.
Write in the first person as the agency — use "we" and "our".
This summary is CLIENT-FACING and should be upbeat, clear, and strategic.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`,
        },
        {
          role: "user",
          content: `Write a concise executive summary for a digital marketing performance report.

Client: ${clientName ?? "the client"}
Period: ${period ?? "the reporting period"}

The report contains the following sections (summarised below):
${sectionSummaries}

Write 4-6 impactful bullet points (each starting with '• ') that summarise the most important results across ALL channels. Focus on the headline wins and overall trajectory. Each bullet should be one punchy sentence. Do not repeat the section titles verbatim. Cover breadth (multiple channels) rather than depth on one.`,
        },
      ],
      temperature: 0.65,
      max_tokens: 450,
    });

    const commentary = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ commentary });
  } catch (err) {
    console.error("Executive summary generation error:", err);
    return NextResponse.json({ error: "Failed to generate executive summary" }, { status: 500 });
  }
}

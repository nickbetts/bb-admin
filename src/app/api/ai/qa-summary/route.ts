import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient, logOpenAiUsage } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

    const { checklistId } = await request.json() as { checklistId: string };
    if (!checklistId) return NextResponse.json({ error: "checklistId is required" }, { status: 400 });

    const checklist = await prisma.qaChecklist.findUnique({
      where: { id: checklistId },
      include: { client: { select: { name: true, aiReportInstructions: true } } },
    });
    if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

    const marketingChecks = JSON.parse(checklist.marketingChecks) as Record<string, boolean>;
    const devChecks = JSON.parse(checklist.devChecks) as Record<string, boolean>;

    const marketingPassed = Object.values(marketingChecks).filter(Boolean).length;
    const marketingTotal = Object.keys(marketingChecks).length;
    const devPassed = Object.values(devChecks).filter(Boolean).length;
    const devTotal = Object.keys(devChecks).length;

    const failedMarketing = Object.entries(marketingChecks)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const failedDev = Object.entries(devChecks)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    const extraInstructions = checklist.client?.aiReportInstructions ?? "";

    const systemPrompt = `You are a senior digital agency QA lead writing a pre-launch sign-off report. Use British English. Be concise and professional. Write in plain paragraphs — do not use markdown headers or bullet symbols.`;

    const userPrompt = `Client: ${checklist.client?.name ?? "Unknown"}
Website: ${checklist.websiteUrl ?? "Not specified"}

Marketing QA: ${marketingPassed}/${marketingTotal} checks passed.
Outstanding marketing items: ${failedMarketing.length > 0 ? failedMarketing.join(", ") : "none"}.

Development QA: ${devPassed}/${devTotal} checks passed.
Outstanding development items: ${failedDev.length > 0 ? failedDev.join(", ") : "none"}.

Overall status: ${checklist.status === "complete" ? "APPROVED FOR LAUNCH" : "IN PROGRESS — not yet approved"}.

Write a concise pre-launch QA sign-off summary (3–4 sentences). State the overall readiness, highlight any critical outstanding items, and make a clear recommendation.${extraInstructions ? `\n\nAdditional context: ${extraInstructions}` : ""}`;

    const openai = await getOpenAiClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.65,
      max_tokens: 600,
    });

    await logOpenAiUsage("qa-summary", response);

    const summary = response.choices[0]?.message?.content?.trim() ?? "";

    await prisma.qaChecklist.update({
      where: { id: checklistId },
      data: { aiSummary: summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("QA summary AI error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

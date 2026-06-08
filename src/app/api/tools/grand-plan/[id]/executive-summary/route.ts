import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        userId: true,
        prospectName: true,
        planDataJson: true,
        client: { select: { name: true } },
      },
    });

    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canRead =
      plan.userId === session.user.id || session.user.permissions.includes("grand_plan.edit_any");
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const planData = (
      plan.planDataJson ? JSON.parse(plan.planDataJson) : null
    ) as GrandPlanData | null;
    if (!planData) {
      return NextResponse.json({ error: "Plan has not been generated yet" }, { status: 400 });
    }

    const onePager =
      planData.sections.strategyIntelligence?.clientDelivery.executiveOnePager ??
      stripHtml(planData.sections.executiveSummary ?? "");

    const lines = [
      `# ${plan.title}`,
      ``,
      `Client: ${plan.client?.name ?? plan.prospectName ?? planData.clientName}`,
      `Generated: ${new Date(planData.generatedAt).toLocaleString("en-GB")}`,
      ``,
      `## One-Page Executive Summary`,
      onePager,
      ``,
      `## Win Narrative`,
      planData.sections.strategyIntelligence?.clientDelivery.winNarrative ??
        "A structured 90-day delivery plan aligned to commercial outcomes.",
      ``,
      `## Meeting Prep`,
      ...(
        planData.sections.strategyIntelligence?.clientDelivery.meetingPrepPack ?? [
          "Confirm objectives and decision criteria.",
          "Agree first 30-day milestones.",
        ]
      ).map((item) => `- ${item}`),
    ];

    const markdown = lines.join("\n");
    const format = request.nextUrl.searchParams.get("format") ?? "json";

    if (format === "markdown") {
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="grand-plan-${id}-executive-summary.md"`,
        },
      });
    }

    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: plan.client?.name ?? plan.prospectName ?? planData.clientName,
      generatedAt: planData.generatedAt,
      onePager,
      winNarrative: planData.sections.strategyIntelligence?.clientDelivery.winNarrative ?? null,
      meetingPrepPack: planData.sections.strategyIntelligence?.clientDelivery.meetingPrepPack ?? [],
      markdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("grand-plan executive summary export error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

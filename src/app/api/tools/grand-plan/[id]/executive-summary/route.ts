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

function escHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExecutiveSummaryHtml(args: {
  title: string;
  clientName: string;
  generatedAt: string;
  onePager: string;
  winNarrative: string;
  meetingPrepPack: string[];
}): string {
  const meetingPrep = args.meetingPrepPack.map((item) => `<li>${escHtml(item)}</li>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(args.title)} — Executive Summary</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .page {
      max-width: 960px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: .16em;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 32px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      color: #475569;
      font-size: 14px;
      margin-bottom: 28px;
    }
    .panel {
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 20px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 18px;
      line-height: 1.25;
    }
    p { margin: 0; line-height: 1.7; color: #1e293b; }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 0 0 8px; line-height: 1.6; }
    .muted { color: #64748b; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border: none; border-radius: 0; }
      .panel { break-inside: avoid; }
      @page { size: A4; margin: 14mm; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="eyebrow">Executive Summary</div>
    <h1>${escHtml(args.title)}</h1>
    <div class="meta">
      <span><strong>Client:</strong> ${escHtml(args.clientName)}</span>
      <span><strong>Generated:</strong> ${escHtml(new Date(args.generatedAt).toLocaleString("en-GB"))}</span>
    </div>
    <section class="panel">
      <h2>One-Page Summary</h2>
      <p>${escHtml(args.onePager)}</p>
    </section>
    <section class="panel">
      <h2>Win Narrative</h2>
      <p>${escHtml(args.winNarrative)}</p>
    </section>
    <section class="panel">
      <h2>Meeting Prep</h2>
      <ul>${meetingPrep}</ul>
    </section>
    <p class="muted">Prepared for internal and client-facing use.</p>
  </main>
</body>
</html>`;
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

    if (format === "html") {
      return new NextResponse(
        buildExecutiveSummaryHtml({
          title: plan.title,
          clientName: plan.client?.name ?? plan.prospectName ?? planData.clientName,
          generatedAt: planData.generatedAt,
          onePager,
          winNarrative:
            planData.sections.strategyIntelligence?.clientDelivery.winNarrative ??
            "A structured 90-day delivery plan aligned to commercial outcomes.",
          meetingPrepPack: planData.sections.strategyIntelligence?.clientDelivery
            .meetingPrepPack ?? [
            "Confirm objectives and decision criteria.",
            "Agree first 30-day milestones.",
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="grand-plan-${id}-executive-summary.html"`,
          },
        },
      );
    }

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

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";
import { notifyAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      approvalStatus: string;
      approvalNotes?: string;
    };

    if (!data.approvalStatus) {
      return NextResponse.json({ error: "approvalStatus is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "approved", "changes_requested"];
    if (!validStatuses.includes(data.approvalStatus)) {
      return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const updated = await prisma.report.update({
      where: { id },
      data: {
        approvalStatus: data.approvalStatus,
        approvalNotes: data.approvalNotes ?? null,
        approvedBy: data.approvalStatus === "approved" ? session.user.id : null,
        approvedAt: data.approvalStatus === "approved" ? new Date() : null,
      },
    });

    // ── P3.6: Auto-extract action items from approved report ──────────────
    if (data.approvalStatus === "approved") {
      extractActionsFromReport(report.id, report.clientId).catch((err) =>
        console.error("[approve] Action extraction failed:", err)
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approve report error:", error);
    return NextResponse.json({ error: "Failed to update approval status" }, { status: 500 });
  }
}

// ─── P3.6: Extract action items from approved report using AI ─────────────────

async function extractActionsFromReport(reportId: string, clientId: string) {
  // Fetch report sections with commentary
  const sections = await prisma.reportSection.findMany({
    where: { reportId, enabled: true },
    select: { sectionType: true, title: true, commentary: true },
    orderBy: { orderIndex: "asc" },
  });

  const commentaries = sections
    .filter((s) => s.commentary)
    .map((s) => `[${s.title}]\n${s.commentary}`)
    .join("\n\n");

  if (!commentaries) return;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  });

  const openai = await getOpenAiClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: `Review this approved report for ${client?.name ?? "the client"} and extract concrete action items.

Report Sections:
${commentaries}

Extract 3-8 specific, actionable items. For each action, identify:
1. A clear, specific title (e.g. "Increase Google Ads budget for Brand campaign by 20%")
2. A brief description with context from the report
3. Priority: "urgent", "high", "medium", or "low"
4. The platform it relates to (e.g. "google_ads", "meta", "seo", "ga4", "general")

Return JSON:
{
  "actions": [
    { "title": "...", "description": "...", "priority": "high", "platform": "google_ads" }
  ]
}`,
    }],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1500,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { actions?: { title: string; description: string; priority: string; platform: string }[] } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (!parsed.actions?.length) return;

  // Create ActionItem records
  const validPriorities = ["low", "medium", "high", "urgent"];
  const created = await Promise.allSettled(
    parsed.actions.map((action) =>
      prisma.actionItem.create({
        data: {
          clientId,
          title: action.title,
          description: action.description,
          priority: validPriorities.includes(action.priority) ? action.priority : "medium",
          sourceType: "ai_recommendation",
          sourceRef: reportId,
        },
      })
    )
  );

  const successCount = created.filter((r) => r.status === "fulfilled").length;

  // Notify admins about new actions
  if (successCount > 0) {
    await notifyAdmins({
      clientId,
      type: "report_ready",
      severity: "low",
      title: `${successCount} action items created from approved report`,
      body: `AI extracted ${successCount} action items from the approved ${client?.name ?? ""} report. Review them in the Actions tab.`,
      metadata: { reportId, actionCount: successCount },
    });
  }
}

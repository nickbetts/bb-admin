import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

// POST /api/tools/grand-plan/[id]/refine — iterative AI refinement of a grand plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!plan.planDataJson) {
    return NextResponse.json({ error: "Plan has not been generated yet" }, { status: 400 });
  }

  try {
    const body = await request.json() as {
      prompt: string;
      sections?: string[];
    };

    if (!body.prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const planData: GrandPlanData = JSON.parse(plan.planDataJson);
    const anthropic = await getAnthropicClient();

    // Build prompt telling the AI which sections to update
    const targetSections = body.sections?.length
      ? body.sections
      : Object.keys(planData.sections).filter(
          (k) => planData.sections[k as keyof typeof planData.sections] != null
        );

    const sectionContext = targetSections
      .map((key) => {
        const value = planData.sections[key as keyof typeof planData.sections];
        if (!value) return null;
        const preview = typeof value === "string"
          ? value.slice(0, 500)
          : JSON.stringify(value).slice(0, 500);
        return `### ${key}\n${preview}...`;
      })
      .filter(Boolean)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `You are an expert marketing strategist refining a grand plan document for "${planData.clientName}".

The plan currently has these sections that the user wants to refine:
${sectionContext}

The user will tell you what to change. Return a JSON object with ONLY the sections you modified.

For text sections (executiveSummary), return the updated HTML string.
For structured sections (googleAdsCampaigns, metaCampaigns, etc.), return the updated JSON structure.

Only include sections you actually changed. Keep the same data shape as the original.
Return ONLY valid JSON, no markdown fencing.

User request: ${body.prompt}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";
    let updates: Partial<GrandPlanData["sections"]>;
    try {
      // Strip markdown fencing if present
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      updates = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try a simpler prompt." },
        { status: 422 }
      );
    }

    // Merge updates into plan data
    const updatedPlanData: GrandPlanData = {
      ...planData,
      sections: { ...planData.sections, ...updates },
    };

    const html = renderGrandPlanHtml(updatedPlanData);

    // Save version
    const latestVersion = plan.versions[0];
    const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

    const [version] = await prisma.$transaction([
      prisma.grandPlanVersion.create({
        data: {
          grandPlanId: id,
          versionNumber: nextVersion,
          generatedHtml: html,
          planDataJson: JSON.stringify(updatedPlanData),
          prompt: body.prompt,
        },
      }),
      prisma.grandPlan.update({
        where: { id },
        data: {
          generatedHtml: html,
          planDataJson: JSON.stringify(updatedPlanData),
        },
      }),
    ]);

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "grand_plan_refined",
      resourceType: "GrandPlan",
      resourceId: id,
      description: `Refined grand plan v${version.versionNumber}: ${body.prompt.slice(0, 100)}`,
    });

    return NextResponse.json({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        prompt: version.prompt,
        createdAt: version.createdAt,
      },
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generatePresentation,
  type PresentationData,
} from "@/lib/grand-plan-presentation-generator";
import { renderPresentationHtml } from "@/lib/grand-plan-presentation-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // single Anthropic call, ~10–25s typical

/**
 * GET — return the latest stored presentation HTML for iframe rendering.
 * Returns 404 if no presentation has been generated yet.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { presentationHtml: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!plan.presentationHtml) {
    return NextResponse.json({ error: "Presentation not generated" }, { status: 404 });
  }
  return new NextResponse(plan.presentationHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * POST — generate (or regenerate) the presentation deck for this Grand Plan.
 * Reads `planDataJson`, distils to a PresentationData object via Anthropic,
 * renders the HTML and persists both alongside a generation timestamp.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      planDataJson: true,
      configJson: true,
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.status !== "complete") {
    return NextResponse.json(
      { error: "Plan must be complete before generating a presentation" },
      { status: 400 }
    );
  }
  if (!plan.planDataJson) {
    return NextResponse.json(
      { error: "Plan has no structured data — regenerate the plan first" },
      { status: 400 }
    );
  }

  let planData: GrandPlanData;
  try {
    planData = JSON.parse(plan.planDataJson) as GrandPlanData;
  } catch {
    return NextResponse.json({ error: "Plan data is corrupted" }, { status: 500 });
  }

  // Detect plan mode from configJson (defaults to "annual")
  let planMode: "annual" | "sprint90" = "annual";
  try {
    const config = JSON.parse(plan.configJson || "{}") as { planMode?: string };
    if (config.planMode === "sprint90") planMode = "sprint90";
  } catch {
    /* ignore */
  }

  try {
    const startedAt = Date.now();
    const presentation: PresentationData = await generatePresentation(planData, { planMode });
    const html = renderPresentationHtml(presentation);
    const elapsedMs = Date.now() - startedAt;

    await prisma.grandPlan.update({
      where: { id },
      data: {
        presentationHtml: html,
        presentationDataJson: JSON.stringify(presentation),
        presentationGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      slideCount: presentation.slides.length,
      elapsedMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[grand-plan:${id}] presentation error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

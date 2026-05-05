import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { jsonrepair } from "jsonrepair";
import {
  type PresentationData,
  type PresentationSlide,
  summariseSourcePlan,
} from "@/lib/grand-plan-presentation-generator";
import { renderPresentationHtml } from "@/lib/grand-plan-presentation-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/tools/grand-plan/[id]/presentation/refine-slide
// Body: { slideIndex: number; prompt: string }
// Uses Claude to regenerate a single slide based on the user's instruction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { slideIndex?: number; prompt?: string };

  if (typeof body.slideIndex !== "number" || !body.prompt?.trim()) {
    return NextResponse.json({ error: "slideIndex and prompt are required" }, { status: 400 });
  }

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { userId: true, presentationDataJson: true, planDataJson: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!plan.presentationDataJson) return NextResponse.json({ error: "No presentation data" }, { status: 400 });

  let presData: PresentationData;
  try {
    presData = JSON.parse(plan.presentationDataJson) as PresentationData;
  } catch {
    return NextResponse.json({ error: "Corrupted presentation data" }, { status: 400 });
  }

  const { slideIndex, prompt } = body;
  const slide = presData.slides[slideIndex];
  if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });

  // Build full plan context so the AI can pull in real specifics
  let planContext = "";
  if (plan.planDataJson) {
    try {
      const planData = JSON.parse(plan.planDataJson) as GrandPlanData;
      planContext = summariseSourcePlan(planData);
    } catch {
      /* fall through with empty context */
    }
  }

  const systemPrompt = `You are editing a single slide in a client-facing strategy presentation deck. You have access to the full grand plan context so you can pull in real specifics — actual audiences, keywords, channels, investment figures, positioning, and campaign details. Return ONLY the updated slide as valid JSON — no markdown, no prose, no code fences. Keep the same \`id\` and \`kind\`. Apply the instruction faithfully, in British English. Keep content concise and impactful — this is a presentation slide, not a document.`;

  const userMessage = `GRAND PLAN CONTEXT:
${planContext || "(no plan data available)"}

CURRENT SLIDE JSON:
${JSON.stringify(slide, null, 2)}

INSTRUCTION: ${prompt.trim()}

Return the updated slide JSON only.`;

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.text as string)
    .join("");

  // Strip markdown fences if present
  const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  let updatedSlide: PresentationSlide;
  try {
    updatedSlide = JSON.parse(jsonrepair(cleaned)) as PresentationSlide;
  } catch {
    try {
      updatedSlide = JSON.parse(cleaned) as PresentationSlide;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON — try again" }, { status: 422 });
    }
  }

  // Enforce id and kind immutability
  updatedSlide.id = slide.id;
  updatedSlide.kind = slide.kind;

  presData.slides[slideIndex] = updatedSlide;
  const html = renderPresentationHtml(presData);

  await prisma.grandPlan.update({
    where: { id },
    data: {
      presentationHtml: html,
      presentationDataJson: JSON.stringify(presData),
    },
  });

  return NextResponse.json({
    ok: true,
    slide: updatedSlide,
    presentationDataJson: JSON.stringify(presData),
  });
}

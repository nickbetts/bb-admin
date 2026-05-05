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

const TAG = "[refine-slide]";

// POST /api/tools/grand-plan/[id]/presentation/refine-slide
// Body: { slideIndex: number; prompt: string }
// Uses Claude to regenerate a single slide based on the user's instruction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "(not yet resolved)";
  try {
    const session = await getSession();
    console.log(`${TAG} session:`, session ? `userId=${session.user?.id} email=${session.user?.email}` : "null");

    if (!session) {
      console.warn(`${TAG} no session — returning 401`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    id = (await params).id;
    console.log(`${TAG} planId=${id}`);

    let body: { slideIndex?: number; prompt?: string };
    try {
      body = await request.json() as { slideIndex?: number; prompt?: string };
    } catch (parseErr) {
      console.error(`${TAG} body parse error:`, parseErr);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    console.log(`${TAG} body: slideIndex=${body.slideIndex} prompt="${body.prompt?.slice(0, 80)}"`);

    if (typeof body.slideIndex !== "number" || !body.prompt?.trim()) {
      console.warn(`${TAG} validation failed — slideIndex=${body.slideIndex} prompt="${body.prompt}"`);
      return NextResponse.json({ error: "slideIndex and prompt are required" }, { status: 400 });
    }

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: { userId: true, presentationDataJson: true, planDataJson: true },
    });

    console.log(`${TAG} plan found:`, plan ? `userId=${plan.userId} hasPres=${!!plan.presentationDataJson}` : "null");

    if (!plan) {
      console.warn(`${TAG} plan not found — returning 404`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (plan.userId !== session.user.id && session.user.role !== "admin") {
      console.error(
        `${TAG} ownership mismatch — plan.userId="${plan.userId}" session.user.id="${session.user.id}" role="${session.user.role}"`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!plan.presentationDataJson) {
      console.warn(`${TAG} no presentationDataJson`);
      return NextResponse.json({ error: "No presentation data" }, { status: 400 });
    }

    let presData: PresentationData;
    try {
      presData = JSON.parse(plan.presentationDataJson) as PresentationData;
    } catch (err) {
      console.error(`${TAG} presentationDataJson parse error:`, err);
      return NextResponse.json({ error: "Corrupted presentation data" }, { status: 400 });
    }

    const { slideIndex, prompt } = body;
    const slide = presData.slides[slideIndex];
    if (!slide) {
      console.warn(`${TAG} slide ${slideIndex} not found — slides.length=${presData.slides.length}`);
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    console.log(`${TAG} refining slide ${slideIndex} kind=${slide.kind} title="${slide.title}"`);

    // Build full plan context so the AI can pull in real specifics
    let planContext = "";
    if (plan.planDataJson) {
      try {
        const planData = JSON.parse(plan.planDataJson) as GrandPlanData;
        planContext = summariseSourcePlan(planData);
        console.log(`${TAG} planContext built — ${planContext.length} chars`);
      } catch (err) {
        console.warn(`${TAG} planDataJson parse error (continuing without context):`, err);
      }
    }

    const systemPrompt = `You are editing a single slide in a client-facing strategy presentation deck. You have access to the full grand plan context so you can pull in real specifics — actual audiences, keywords, channels, investment figures, positioning, and campaign details. Return ONLY the updated slide as valid JSON — no markdown, no prose, no code fences. Keep the same \`id\` and \`kind\`. Apply the instruction faithfully, in British English. Keep content concise and impactful — this is a presentation slide, not a document.`;

    const userMessage = `GRAND PLAN CONTEXT:
${planContext || "(no plan data available)"}

CURRENT SLIDE JSON:
${JSON.stringify(slide, null, 2)}

INSTRUCTION: ${prompt.trim()}

Return the updated slide JSON only.`;

    console.log(`${TAG} calling Anthropic...`);
    let anthropic;
    try {
      anthropic = await getAnthropicClient();
    } catch (err) {
      console.error(`${TAG} getAnthropicClient error:`, err);
      return NextResponse.json({ error: "Failed to initialise AI client" }, { status: 500 });
    }

    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      console.log(`${TAG} Anthropic response — stop_reason=${response.stop_reason} blocks=${response.content.length}`);
    } catch (err) {
      console.error(`${TAG} Anthropic call error:`, err);
      return NextResponse.json({ error: "AI call failed — try again" }, { status: 502 });
    }

    const rawText = response.content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text as string)
      .join("");

    console.log(`${TAG} rawText length=${rawText.length} preview="${rawText.slice(0, 120)}"`);

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let updatedSlide: PresentationSlide;
    try {
      updatedSlide = JSON.parse(jsonrepair(cleaned)) as PresentationSlide;
    } catch {
      try {
        updatedSlide = JSON.parse(cleaned) as PresentationSlide;
      } catch (err) {
        console.error(`${TAG} JSON parse error — cleaned="${cleaned.slice(0, 200)}"`, err);
        return NextResponse.json({ error: "AI returned invalid JSON — try again" }, { status: 422 });
      }
    }

    // Enforce id and kind immutability
    updatedSlide.id = slide.id;
    updatedSlide.kind = slide.kind;

    presData.slides[slideIndex] = updatedSlide;

    let html: string;
    try {
      html = renderPresentationHtml(presData);
    } catch (err) {
      console.error(`${TAG} renderPresentationHtml error:`, err);
      return NextResponse.json({ error: "Failed to render updated presentation" }, { status: 500 });
    }

    try {
      await prisma.grandPlan.update({
        where: { id },
        data: {
          presentationHtml: html,
          presentationDataJson: JSON.stringify(presData),
        },
      });
    } catch (err) {
      console.error(`${TAG} DB update error:`, err);
      return NextResponse.json({ error: "Failed to save — try again" }, { status: 500 });
    }

    console.log(`${TAG} done — slide ${slideIndex} refined successfully`);
    return NextResponse.json({
      ok: true,
      slide: updatedSlide,
      presentationDataJson: JSON.stringify(presData),
    });

  } catch (err) {
    console.error(`${TAG} unhandled error (planId=${id}):`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { jsonrepair } from "jsonrepair";
import {
  type PresentationData,
  summariseSourcePlan,
} from "@/lib/grand-plan-presentation-generator";
import { renderPresentationHtml } from "@/lib/grand-plan-presentation-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/tools/grand-plan/[id]/presentation/refine-all
// Body: { prompt: string }
// Uses Claude to improve the whole deck based on a single instruction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { prompt?: string };
  try {
    body = await request.json() as { prompt?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { userId: true, presentationDataJson: true, planDataJson: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!plan.presentationDataJson) {
    return NextResponse.json({ error: "No presentation data" }, { status: 400 });
  }

  let presData: PresentationData;
  try {
    presData = JSON.parse(plan.presentationDataJson) as PresentationData;
  } catch {
    return NextResponse.json({ error: "Corrupted presentation data" }, { status: 400 });
  }

  let planContext = "";
  if (plan.planDataJson) {
    try {
      const planData = JSON.parse(plan.planDataJson) as GrandPlanData;
      planContext = summariseSourcePlan(planData);
    } catch {
      /* fall through with empty context */
    }
  }

  const systemPrompt = `You are refining a complete client-facing strategy presentation deck.
You will receive the full deck JSON and a refinement instruction. Apply the instruction across the whole deck, keeping slides coherent and consistent with each other.

RULES:
- Return ONLY the complete updated presentation JSON — no markdown, no prose, no code fences.
- Keep the same top-level shape: { cover: {...}, slides: [...] }
- Keep every slide's \`id\` and \`kind\` unchanged.
- British English. No em dashes. No semicolons.
- Concise copy — this is a presentation, not a document.

VALID SLIDE FIELDS BY KIND (only use fields listed):
kind="headline"  → title, eyebrow, headline, subhead (≤30 words)
kind="pillars"   → title, eyebrow, headline (opt), subhead (opt, ≤30 words), pillars: [{title, body ≤40 words}] (3–5)
kind="outcome"   → title, eyebrow, headline, subhead, metric: {value, label}
kind="channels"  → title, eyebrow, channels: [{name, role ≤25 words}] (up to 8)
kind="timeline"  → title, eyebrow, phases: [{label, items: [string]}] (3–4 phases)
kind="investment"→ title, eyebrow, investment: {headlineFigure, breakdown: [{label, amount, percentage}]}
kind="audience"  → title, eyebrow, audiences: [{name, insight ≤35 words}] (up to 6)
kind="next-steps"→ title, eyebrow, steps: [{title, detail ≤35 words}] (3–5)

NEVER use: "subheading", "description", "content", "bullets", "items" or any unlisted field.`;

  const userMessage = `GRAND PLAN CONTEXT:
${planContext || "(no plan data available)"}

FULL PRESENTATION JSON:
${JSON.stringify(presData, null, 2)}

INSTRUCTION: ${body.prompt.trim()}

Return the complete updated presentation JSON only.`;

  let anthropic;
  try {
    anthropic = await getAnthropicClient();
  } catch (err) {
    console.error("[refine-all] getAnthropicClient error:", err);
    return NextResponse.json({ error: "Failed to initialise AI client" }, { status: 500 });
  }

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    console.error("[refine-all] Anthropic call error:", err);
    return NextResponse.json({ error: "AI call failed — try again" }, { status: 502 });
  }

  const rawText = response.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.text as string)
    .join("");

  const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  let updatedPres: PresentationData;
  try {
    updatedPres = JSON.parse(jsonrepair(cleaned)) as PresentationData;
  } catch {
    try {
      updatedPres = JSON.parse(cleaned) as PresentationData;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON — try again" }, { status: 422 });
    }
  }

  if (!updatedPres.slides || updatedPres.slides.length === 0) {
    return NextResponse.json({ error: "AI returned no slides — try again" }, { status: 422 });
  }

  // Restore id and kind from original slides (by position) as a safety net
  updatedPres.slides = updatedPres.slides.map((s, i) => ({
    ...s,
    id: presData.slides[i]?.id ?? s.id,
    kind: presData.slides[i]?.kind ?? s.kind,
  }));

  const html = renderPresentationHtml(updatedPres);

  await prisma.grandPlan.update({
    where: { id },
    data: {
      presentationHtml: html,
      presentationDataJson: JSON.stringify(updatedPres),
    },
  });

  return NextResponse.json({
    ok: true,
    presentationDataJson: JSON.stringify(updatedPres),
  });
}

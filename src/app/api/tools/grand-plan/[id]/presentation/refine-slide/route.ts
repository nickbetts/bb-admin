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

    if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) {
      console.error(
        `${TAG} ownership mismatch — plan.userId="${plan.userId}" session.user.id="${session.user.id}" permissions=${JSON.stringify(session.user.permissions)}`
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

    const systemPrompt = `You are editing a single slide in a client-facing strategy presentation deck.
You have access to the full grand plan context so you can pull in real specifics — actual audiences, keywords, channels, investment figures, positioning, and campaign details.

RULES:
- Return ONLY the updated slide as valid JSON — no markdown, no prose, no code fences.
- Keep the same \`id\` and \`kind\` values exactly.
- Use British English. No em dashes. No semicolons.
- Keep copy concise — this is a presentation slide, not a document.

VALID FIELDS BY KIND (only use fields listed for the slide's kind, plus the SHARED OPTIONAL fields):

kind="headline"  → title, eyebrow, headline (big statement), subhead (≤30 words)
kind="pillars"   → title, eyebrow, headline (optional), subhead (optional intro ≤30 words), pillars: [{title, body (≤40 words)}] (3–5 pillars)
kind="outcome"   → title, eyebrow, headline, subhead, metric: {value, label}
kind="channels"  → title, eyebrow, channels: [{name, role (≤25 words)}] (up to 8)
kind="timeline"  → title, eyebrow, phases: [{label, items: [string]}] (3–4 phases, 3–5 items each)
kind="investment"→ title, eyebrow, investment: {headlineFigure, breakdown: [{label, amount, percentage}]}
kind="audience"  → title, eyebrow, audiences: [{name, insight (≤35 words)}] (up to 6)
kind="next-steps"→ title, eyebrow, steps: [{title, detail (≤35 words)}] (3–5 steps)
kind="content"   → title, eyebrow, headline (optional, ≤14 words), subhead (optional ≤30 words), bullets: [string] (3–7 bullets, ≤18 words each)
kind="bullets"   → title, eyebrow, subhead (optional ≤25 words), bullets: [string] (3–8 bullets, ≤18 words each)

SHARED OPTIONAL FIELDS (any kind may include these):
- bullets: [string] — supplementary bullet list rendered below the main body
- image: {url, alt, position} — KEEP the existing image object on the slide unless the user explicitly asks to remove or change it. NEVER invent a new image url. position is one of "left" | "right" | "top" | "background"
- images: [{url, alt}] — multi-image gallery (max 5). Same rules as image: KEEP existing URLs, never invent new ones. You may rewrite alt text and reorder the array; do not drop entries unless the user asked.
- imagesPosition: "left" | "right" | "top" | "background" — placement of the gallery (defaults to "right")
- density: "compact" | "regular" — set to "compact" when copy is heavy and you want smaller type to fit cleanly

LAYOUT JUDGEMENT:
- If the slide has an image, prefer position "right" or "left" with bullets/short copy that flows beside the image.
- If the user adds heavy content (long bullets, many pillars, dense audience cards), set density="compact" so type scales down. The renderer will also auto-fit, but density is a stronger signal.
- If the slide is "content" or "bullets" and the user mentions "summarise", "list", "checklist" or "key points" — produce 3–7 punchy bullets.

NEVER use: "subheading", "description", "content", "items" or any field not listed above.
For a subheading / intro sentence on a pillars slide use the field "subhead", not "subheading".`;

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

    // Normalise common AI field-name mistakes before saving
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = updatedSlide as any;
    if (s.subheading !== undefined && s.subhead === undefined) { s.subhead = s.subheading; delete s.subheading; }
    if (s.description !== undefined && s.subhead === undefined) { s.subhead = s.description; delete s.description; }
    if (s.subtitle !== undefined && s.subhead === undefined) { s.subhead = s.subtitle; delete s.subtitle; }
    if (s.summary !== undefined && s.subhead === undefined) { s.subhead = s.summary; delete s.summary; }
    // items/points → bullets for content/bullets kinds
    if ((s.kind === "content" || s.kind === "bullets") && !Array.isArray(s.bullets)) {
      if (Array.isArray(s.items)) { s.bullets = s.items; delete s.items; }
      else if (Array.isArray(s.points)) { s.bullets = s.points; delete s.points; }
    }
    // bullets/items arrays on pillars slides → convert to pillars (only if no real bullets supplied)
    if (s.kind === "pillars" && !s.pillars && Array.isArray(s.items)) {
      s.pillars = (s.items as string[]).map((b: string) => ({ title: b, body: "" }));
      delete s.items;
    }
    // Coerce bullets to string[] if it came back as objects
    if (Array.isArray(s.bullets)) {
      s.bullets = s.bullets.map((b: unknown) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object") {
          const obj = b as Record<string, unknown>;
          return String(obj.text ?? obj.label ?? obj.title ?? obj.body ?? "").trim();
        }
        return String(b ?? "").trim();
      }).filter((x: string) => x.length > 0);
    }
    // Reject AI-invented image URLs — only keep image if it matches what was already on the slide
    if (s.image && (!slide.image || s.image.url !== slide.image.url)) {
      // Allow the AI to keep or remove the original image, but don't accept a new url
      if (slide.image) s.image = { ...slide.image, ...s.image, url: slide.image.url };
      else delete s.image;
    }
    // Same guard for the multi-image gallery — preserve URLs and order, accept alt/position changes only
    if (Array.isArray(s.images)) {
      const existingImages = Array.isArray(slide.images) ? slide.images : [];
      const existingUrls = new Set(existingImages.map((img: { url: string }) => img.url));
      const cleaned: { url: string; alt?: string }[] = [];
      const seen = new Set<string>();
      // Preserve AI's order, but only keep URLs that already existed on the slide
      for (const img of s.images as Array<{ url?: unknown; alt?: unknown }>) {
        if (!img || typeof img !== "object") continue;
        const url = typeof img.url === "string" ? img.url : "";
        if (!existingUrls.has(url) || seen.has(url)) continue;
        seen.add(url);
        const alt = typeof img.alt === "string" ? img.alt : undefined;
        cleaned.push({ url, alt });
      }
      // Re-attach any images the AI dropped, in their original order
      for (const img of existingImages) {
        if (!seen.has(img.url)) cleaned.push({ url: img.url, alt: img.alt });
      }
      s.images = cleaned.length > 0 ? cleaned : undefined;
    } else if (Array.isArray(slide.images) && slide.images.length > 0) {
      // AI returned no images field but the slide had a gallery — restore it
      s.images = slide.images.map((img: { url: string; alt?: string }) => ({ url: img.url, alt: img.alt }));
    }
    // Preserve gallery position metadata if AI didn't return it
    if (s.imagesPosition === undefined && slide.imagesPosition) s.imagesPosition = slide.imagesPosition;

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

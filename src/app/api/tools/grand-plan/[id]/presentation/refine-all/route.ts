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

  const systemPrompt = `You are a strategic editor for client-facing strategy presentation decks.

You will receive the full grand plan context, the current deck JSON, and an instruction from the user.
Reason about what the instruction is actually asking for, then return the full updated deck.

Your edit may involve any combination of:
- Editing copy on existing slides
- Adding new slides (if the instruction calls for more content or a missing section)
- Removing slides that are no longer relevant
- Reordering slides for better narrative flow
- Changing a slide's kind if a different layout better suits the content

RULES:
- Return ONLY the complete updated presentation JSON — no markdown, no prose, no code fences.
- Top-level shape must be: { cover: {...}, slides: [...] }
- KEEP existing slide ids for slides you retain (edited or unchanged).
- NEW slides you create must have a unique descriptive id slug (e.g. "slide-google-strategy", "slide-meta-audiences-2").
- British English. No em dashes. No semicolons.
- Concise copy — this is a presentation, not a document.

VALID SLIDE KINDS AND THEIR FIELDS (only use the fields listed for the slide's kind, plus the SHARED OPTIONAL fields below):
kind="headline"   → title, eyebrow, headline (big statement), subhead (≤30 words)
kind="pillars"    → title, eyebrow, headline (opt), subhead (opt ≤30 words), pillars: [{title, body ≤40 words}] (3–5 pillars)
kind="outcome"    → title, eyebrow, headline, subhead, metric: {value, label}
kind="channels"   → title, eyebrow, channels: [{name, role ≤25 words}] (up to 8)
kind="timeline"   → title, eyebrow, phases: [{label, items: [string]}] (3–4 phases, 3–5 items each)
kind="investment" → title, eyebrow, investment: {headlineFigure, breakdown: [{label, amount, percentage}]}
kind="audience"   → title, eyebrow, audiences: [{name, insight ≤35 words}] (up to 6)
kind="next-steps" → title, eyebrow, steps: [{title, detail ≤35 words}] (3–5 steps)
kind="content"    → title, eyebrow, headline (opt ≤14 words), subhead (opt ≤30 words), bullets: [string] (3–7 bullets ≤18 words each)
kind="bullets"    → title, eyebrow, subhead (opt ≤25 words), bullets: [string] (3–8 bullets ≤18 words each)

SHARED OPTIONAL FIELDS (any kind may include these):
- bullets: [string] — supplementary bullets rendered below the main body of any non-content slide
- image: {url, alt, position} — KEEP existing image objects on slides that already have one. Do NOT invent or change image URLs. position is "left" | "right" | "top" | "background"
- images: [{url, alt}] — multi-image gallery (max 5). Same rule: KEEP existing URLs, never invent new ones. You may rewrite alt text and reorder.
- imagesPosition: "left" | "right" | "top" | "background" — placement of the gallery
- density: "compact" | "regular" — set "compact" on slides that carry heavy copy so the renderer scales type down

LAYOUT JUDGEMENT:
- If a slide has an image, prefer "left" or "right" position so bullets sit beside the image.
- If you add lots of content to a slide, set density="compact".
- Use the new "content" or "bullets" kinds when the user asks for a free-form text slide, a checklist, or "just bullets".

NEVER use: "subheading", "description", "content" (the JSON field), "items" (except inside a phase) or any unlisted field.
For a subheading / intro sentence on a pillars slide use the field "subhead", not "subheading".`;

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
      max_tokens: 8000,
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

  const VALID_KINDS = new Set(["headline", "pillars", "outcome", "channels", "timeline", "investment", "audience", "next-steps", "content", "bullets"]);

  // Build lookups of existing images keyed by slide id so we can preserve
  // them and reject any AI-invented image URLs.
  const existingImagesById = new Map<string, PresentationData["slides"][number]["image"]>();
  const existingGalleryById = new Map<string, NonNullable<PresentationData["slides"][number]["images"]>>();
  const existingPositionById = new Map<string, NonNullable<PresentationData["slides"][number]["imagesPosition"]>>();
  for (const slide of presData.slides) {
    if (!slide.id) continue;
    if (slide.image) existingImagesById.set(slide.id, slide.image);
    if (slide.images && slide.images.length > 0) existingGalleryById.set(slide.id, slide.images);
    if (slide.imagesPosition) existingPositionById.set(slide.id, slide.imagesPosition);
  }

  // Ensure every slide has a valid id and kind — don't restore by position so
  // Claude can freely add, remove, and reorder slides.
  updatedPres.slides = updatedPres.slides.map((s, i) => {
    const id = s.id?.trim() ? s.id : `slide-${Date.now()}-${i}`;
    const kind = VALID_KINDS.has(s.kind) ? s.kind : "headline";
    let image = s.image;
    const existing = existingImagesById.get(id);
    if (image && existing && image.url !== existing.url) {
      // AI tried to swap the URL — keep the original asset, accept any new alt/position
      image = { ...existing, alt: image.alt ?? existing.alt, position: image.position ?? existing.position };
    } else if (image && !existing) {
      // AI invented an image on a slide that didn't have one — reject the URL
      delete (s as PresentationData["slides"][number]).image;
      image = undefined;
    }
    // Same guard for the multi-image gallery: only allow URLs that existed on the slide
    let images = s.images;
    const existingGallery = existingGalleryById.get(id);
    if (Array.isArray(images)) {
      const existingUrls = new Set(existingGallery?.map((img) => img.url) ?? []);
      const cleaned: { url: string; alt?: string }[] = [];
      const seen = new Set<string>();
      for (const img of images) {
        if (!img || typeof img !== "object") continue;
        const url = typeof img.url === "string" ? img.url : "";
        if (!existingUrls.has(url) || seen.has(url)) continue;
        seen.add(url);
        cleaned.push({ url, alt: typeof img.alt === "string" ? img.alt : undefined });
      }
      // Restore any gallery items the AI dropped, in their original order
      if (existingGallery) {
        for (const img of existingGallery) {
          if (!seen.has(img.url)) cleaned.push({ url: img.url, alt: img.alt });
        }
      }
      images = cleaned.length > 0 ? cleaned : undefined;
    } else if (existingGallery) {
      // AI returned no images field but the slide had a gallery — restore it
      images = existingGallery.map((img) => ({ url: img.url, alt: img.alt }));
    }
    const imagesPosition = s.imagesPosition ?? existingPositionById.get(id);
    // Coerce bullets to plain strings
    let bullets = s.bullets;
    if (Array.isArray(bullets)) {
      bullets = bullets
        .map((b: unknown) => {
          if (typeof b === "string") return b;
          if (b && typeof b === "object") {
            const obj = b as Record<string, unknown>;
            return String(obj.text ?? obj.label ?? obj.title ?? obj.body ?? "").trim();
          }
          return String(b ?? "").trim();
        })
        .filter((x) => x.length > 0);
    }
    return { ...s, id, kind, image, images, imagesPosition, bullets };
  });

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

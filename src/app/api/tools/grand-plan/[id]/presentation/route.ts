import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generatePresentation,
  type PresentationData,
  type PresentationSlide,
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

/**
 * PATCH — edit presentation data: update text fields, reorder/delete slides,
 * add/remove items within slides (pillars, steps, audiences, channels, etc.)
 *
 * Body: { action, ...actionPayload }
 * Actions: cover | slide-field | slide-delete | slide-move |
 *          item-update | item-add | item-delete
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const { action } = body;
  if (typeof action !== "string") return NextResponse.json({ error: "action required" }, { status: 400 });

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { userId: true, presentationDataJson: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!plan.presentationDataJson) return NextResponse.json({ error: "No presentation data" }, { status: 400 });

  let presData: PresentationData;
  try {
    presData = JSON.parse(plan.presentationDataJson) as PresentationData;
  } catch {
    return NextResponse.json({ error: "Corrupted presentation data" }, { status: 400 });
  }

  switch (action) {
    case "cover": {
      const field = body.field as string;
      const value = body.value as string;
      if (!field) return NextResponse.json({ error: "field required" }, { status: 400 });
      (presData.cover as Record<string, string>)[field] = value ?? "";
      break;
    }
    case "slide-field": {
      const idx = body.slideIndex as number;
      const field = body.field as string;
      const value = body.value as string | undefined;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      const slideAny = slide as unknown as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const obj = (slideAny[parent] as Record<string, string>) ?? {};
        obj[child] = value ?? "";
        slideAny[parent] = obj;
      } else {
        slideAny[field] = value || undefined;
      }
      break;
    }
    case "slide-delete": {
      const idx = body.slideIndex as number;
      if (idx < 0 || idx >= presData.slides.length) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      presData.slides.splice(idx, 1);
      break;
    }
    case "slide-move": {
      const idx = body.slideIndex as number;
      const dir = body.direction as string;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= presData.slides.length) break;
      [presData.slides[idx], presData.slides[newIdx]] = [presData.slides[newIdx], presData.slides[idx]];
      break;
    }
    case "slide-add": {
      const afterIndex = typeof body.afterIndex === "number" ? body.afterIndex : presData.slides.length - 1;
      const kind = (body.kind as PresentationSlide["kind"]) ?? "headline";
      const title = (body.title as string) ?? "New slide";
      const newSlide: PresentationSlide = {
        id: `slide-${Date.now()}`,
        title,
        kind,
        eyebrow: "",
      };
      // Seed sensible defaults so the new slide renders something visible.
      if (kind === "content" || kind === "bullets") {
        newSlide.bullets = ["First point", "Second point", "Third point"];
      } else if (kind === "pillars") {
        newSlide.pillars = [{ title: "Pillar one", body: "" }, { title: "Pillar two", body: "" }, { title: "Pillar three", body: "" }];
      } else if (kind === "audience") {
        newSlide.audiences = [{ name: "Audience name", insight: "" }];
      } else if (kind === "channels") {
        newSlide.channels = [{ name: "Channel", role: "" }];
      } else if (kind === "next-steps") {
        newSlide.steps = [{ title: "Step one", detail: "" }];
      } else if (kind === "timeline") {
        newSlide.phases = [{ label: "Phase 1", items: [] }];
      }
      presData.slides.splice(afterIndex + 1, 0, newSlide);
      break;
    }
    case "slide-duplicate": {
      const idx = body.slideIndex as number;
      const source = presData.slides[idx];
      if (!source) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      const duplicate: PresentationSlide = {
        ...JSON.parse(JSON.stringify(source)) as PresentationSlide,
        id: `slide-${Date.now()}`,
        title: `${source.title} (copy)`,
      };
      presData.slides.splice(idx + 1, 0, duplicate);
      break;
    }
    case "item-update": {
      const idx = body.slideIndex as number;
      const itemType = body.itemType as string;
      const itemIndex = body.itemIndex as number;
      const field = body.field as string;
      const value = body.value as string;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      const slideAny2 = slide as unknown as Record<string, Record<string, string>[]>;
      const arr = slideAny2[itemType];
      if (arr?.[itemIndex]) arr[itemIndex][field] = value;
      break;
    }
    case "item-add": {
      const idx = body.slideIndex as number;
      const itemType = body.itemType as string;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      const defaults: Record<string, Record<string, string>> = {
        pillars: { title: "New pillar", body: "" },
        steps: { title: "New step", detail: "" },
        audiences: { name: "New audience", insight: "" },
        channels: { name: "New channel", role: "" },
        phases: { label: "New phase", items: "[]" },
      };
      const slideAny3 = slide as unknown as Record<string, unknown[]>;
      const existing = slideAny3[itemType];
      if (Array.isArray(existing)) {
        existing.push(defaults[itemType] ?? { label: "New item" });
      } else {
        slideAny3[itemType] = [defaults[itemType] ?? { label: "New item" }];
      }
      break;
    }
    case "item-delete": {
      const idx = body.slideIndex as number;
      const itemType = body.itemType as string;
      const itemIndex = body.itemIndex as number;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      const slideAny4 = slide as unknown as Record<string, unknown[]>;
      const arr4 = slideAny4[itemType];
      if (Array.isArray(arr4)) arr4.splice(itemIndex, 1);
      break;
    }
    case "image-set": {
      const idx = body.slideIndex as number;
      const url = (body.url as string | undefined)?.trim();
      const alt = (body.alt as string | undefined) ?? "";
      const positionRaw = body.position as string | undefined;
      const allowed = ["left", "right", "top", "background"] as const;
      const position = (allowed as readonly string[]).includes(positionRaw ?? "")
        ? (positionRaw as typeof allowed[number])
        : "right";
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      if (!url) {
        delete slide.image;
      } else {
        slide.image = { url, alt, position };
      }
      break;
    }
    case "image-clear": {
      const idx = body.slideIndex as number;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      delete slide.image;
      delete slide.images;
      delete slide.imagesPosition;
      break;
    }
    case "images-add": {
      const idx = body.slideIndex as number;
      const url = (body.url as string | undefined)?.trim();
      const alt = (body.alt as string | undefined) ?? "";
      if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      // Migrate the legacy single-image field into the gallery on first add.
      if (!Array.isArray(slide.images) || slide.images.length === 0) {
        slide.images = slide.image
          ? [{ url: slide.image.url, alt: slide.image.alt }]
          : [];
        if (slide.image && !slide.imagesPosition) slide.imagesPosition = slide.image.position;
        delete slide.image;
      }
      if (slide.images.length >= 5) {
        return NextResponse.json({ error: "Maximum of 5 images per slide" }, { status: 400 });
      }
      slide.images.push({ url, alt });
      if (!slide.imagesPosition) slide.imagesPosition = "right";
      break;
    }
    case "images-remove": {
      const idx = body.slideIndex as number;
      const imageIndex = body.imageIndex as number;
      const slide = presData.slides[idx];
      if (!slide || !Array.isArray(slide.images)) {
        return NextResponse.json({ error: "Slide or gallery not found" }, { status: 404 });
      }
      slide.images.splice(imageIndex, 1);
      if (slide.images.length === 0) {
        delete slide.images;
        delete slide.imagesPosition;
      }
      break;
    }
    case "images-reorder": {
      const idx = body.slideIndex as number;
      const fromIndex = body.fromIndex as number;
      const direction = body.direction as string;
      const slide = presData.slides[idx];
      if (!slide || !Array.isArray(slide.images)) {
        return NextResponse.json({ error: "Slide or gallery not found" }, { status: 404 });
      }
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= slide.images.length) break;
      [slide.images[fromIndex], slide.images[toIndex]] = [slide.images[toIndex], slide.images[fromIndex]];
      break;
    }
    case "images-alt": {
      const idx = body.slideIndex as number;
      const imageIndex = body.imageIndex as number;
      const alt = (body.alt as string) ?? "";
      const slide = presData.slides[idx];
      if (!slide || !Array.isArray(slide.images) || !slide.images[imageIndex]) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }
      slide.images[imageIndex].alt = alt;
      break;
    }
    case "images-position": {
      const idx = body.slideIndex as number;
      const positionRaw = body.position as string | undefined;
      const allowed = ["left", "right", "top", "background"] as const;
      const position = (allowed as readonly string[]).includes(positionRaw ?? "")
        ? (positionRaw as typeof allowed[number])
        : "right";
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      slide.imagesPosition = position;
      // Mirror onto the legacy image.position so single-image slides also update.
      if (slide.image) slide.image.position = position;
      break;
    }
    case "bullet-update": {
      const idx = body.slideIndex as number;
      const bulletIndex = body.bulletIndex as number;
      const value = (body.value as string) ?? "";
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      if (!slide.bullets) slide.bullets = [];
      if (bulletIndex >= 0 && bulletIndex < slide.bullets.length) slide.bullets[bulletIndex] = value;
      break;
    }
    case "bullet-add": {
      const idx = body.slideIndex as number;
      const value = (body.value as string) ?? "New bullet";
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      if (!slide.bullets) slide.bullets = [];
      slide.bullets.push(value);
      break;
    }
    case "bullet-delete": {
      const idx = body.slideIndex as number;
      const bulletIndex = body.bulletIndex as number;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      if (Array.isArray(slide.bullets)) slide.bullets.splice(bulletIndex, 1);
      break;
    }
    case "density-set": {
      const idx = body.slideIndex as number;
      const density = body.density as "compact" | "regular" | undefined;
      const slide = presData.slides[idx];
      if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      if (density === "compact" || density === "regular") slide.density = density;
      else delete slide.density;
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const html = renderPresentationHtml(presData);

  await prisma.grandPlan.update({
    where: { id },
    data: { presentationHtml: html, presentationDataJson: JSON.stringify(presData) },
  });

  return NextResponse.json({ ok: true, presentationDataJson: JSON.stringify(presData) });
}

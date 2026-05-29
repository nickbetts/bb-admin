import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { toFile } from "openai";
import { getSession, hasPermission } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import {
  enforceMetaAssassinImageGuardrail,
  logMetaAssassinImageUsage,
  screenImagePrompt,
} from "@/lib/meta-assassin-image-guardrails";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/tools/meta-audience-scraper/refine-image
// Body: {
//   originalUrl?: string;          // existing blob URL — used as the source for image edit
//   originalPrompt?: string;        // text prompt that produced the original
//   refinement: string;             // user's freeform direction ("make the lighting warmer", "add a person")
//   aspect?: "square" | "portrait" | "landscape";
//   quality?: "low" | "medium" | "high";
// }
//
// Two modes:
//  - If originalUrl is provided we run images.edit() with the original as the
//    source so the refinement is applied as a true edit.
//  - Otherwise we run images.generate() with a fused prompt.

const ASPECT_TO_SIZE: Record<string, "1024x1024" | "1024x1536" | "1536x1024"> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      originalUrl?: string;
      originalPrompt?: string;
      refinement?: string;
      aspect?: "square" | "portrait" | "landscape";
      quality?: "low" | "medium" | "high";
    };

    const refinement = (body.refinement ?? "").trim();
    if (!refinement) return NextResponse.json({ error: "refinement is required" }, { status: 400 });
    if (refinement.length > 2000) {
      return NextResponse.json(
        { error: "refinement must be 2000 characters or fewer" },
        { status: 400 },
      );
    }

    const guardrail = await enforceMetaAssassinImageGuardrail(session.user.id, "refine");
    if (!guardrail.ok) {
      return NextResponse.json(
        {
          error: guardrail.error,
          limits: {
            remainingHour: guardrail.remainingHour,
            remainingDay: guardrail.remainingDay,
          },
        },
        { status: 429 },
      );
    }

    const size = ASPECT_TO_SIZE[body.aspect ?? "square"] ?? "1024x1024";
    const quality: "low" | "medium" | "high" = body.quality ?? "medium";

    const openai = await getOpenAiClient();

    const policy = await screenImagePrompt(
      openai,
      [body.originalPrompt, refinement].filter(Boolean).join("\n\n"),
    );
    if (!policy.ok) {
      return NextResponse.json(
        { error: policy.error, flaggedCategories: policy.flaggedCategories },
        { status: 400 },
      );
    }

    let b64: string | undefined;

    if (body.originalUrl) {
      // Pull the original image bytes from the blob and run images.edit
      const imageRes = await fetch(body.originalUrl);
      if (!imageRes.ok) throw new Error(`Failed to fetch original image: ${imageRes.status}`);
      const arrayBuf = await imageRes.arrayBuffer();
      const sourceFile = await toFile(Buffer.from(arrayBuf), "source.png", { type: "image/png" });

      const fusedPrompt = body.originalPrompt
        ? `Original concept: ${body.originalPrompt}\n\nApply this refinement: ${refinement}`
        : refinement;

      const result = await openai.images.edit({
        model: "gpt-image-1",
        image: sourceFile,
        prompt: fusedPrompt,
        size,
        quality,
        n: 1,
      });

      b64 = result.data?.[0]?.b64_json;
    } else {
      const fusedPrompt = body.originalPrompt
        ? `${body.originalPrompt}\n\nRefinement to apply: ${refinement}`
        : refinement;

      const result = await openai.images.generate({
        model: "gpt-image-1",
        prompt: fusedPrompt,
        size,
        quality,
        n: 1,
      });

      b64 = result.data?.[0]?.b64_json;
    }

    if (!b64) return NextResponse.json({ error: "No image returned" }, { status: 502 });

    const buffer = Buffer.from(b64, "base64");
    const path = `meta-audience-scraper/${session.user.id}/${Date.now()}-refined.png`;
    const blob = await put(path, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    });

    await logMetaAssassinImageUsage("refine");

    return NextResponse.json({
      url: blob.url,
      prompt: refinement,
      aspect: body.aspect ?? "square",
      quality,
      limits: {
        remainingHour: guardrail.remainingHour,
        remainingDay: guardrail.remainingDay,
      },
    });
  } catch (error) {
    console.error("meta-audience-scraper refine-image error:", error);
    const message = error instanceof Error ? error.message : "Image refinement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

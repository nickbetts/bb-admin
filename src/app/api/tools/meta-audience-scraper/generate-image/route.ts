import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession, hasPermission } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/tools/meta-audience-scraper/generate-image
// Body: { prompt: string; aspect?: "square" | "portrait" | "landscape"; quality?: "low" | "medium" | "high" }
//
// Generates a single image with gpt-image-1 and uploads it to Vercel Blob.
// Returns { url, prompt }.

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
      prompt?: string;
      aspect?: "square" | "portrait" | "landscape";
      quality?: "low" | "medium" | "high";
    };

    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const size = ASPECT_TO_SIZE[body.aspect ?? "square"] ?? "1024x1024";
    const quality = body.quality ?? "medium";

    const openai = await getOpenAiClient();

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "No image returned" }, { status: 502 });

    const buffer = Buffer.from(b64, "base64");
    const path = `meta-audience-scraper/${session.user.id}/${Date.now()}.png`;
    const blob = await put(path, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url, prompt, aspect: body.aspect ?? "square", quality });
  } catch (error) {
    console.error("meta-audience-scraper generate-image error:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

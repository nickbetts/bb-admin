import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// POST /api/tools/landing-pages/upload-image
// Accepts a single image file, uploads to Vercel Blob, and returns the public URL.
// The LP generator wizard uses this to upload reference images before generation.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF and WebP images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5 MB" }, { status: 400 });
    }

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `lp-images/${Date.now()}-${sanitisedName}`;
    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP image upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

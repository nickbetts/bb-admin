import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// POST /api/tools/grand-plan/[id]/upload-image
// Accepts a single image file, uploads to Vercel Blob, returns the public URL.
// Used by the presentation editor for adding images to slides.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id && !session.user.permissions.includes("grand_plan.edit_any")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, WebP and SVG images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 8 MB" }, { status: 400 });
    }

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `grand-plan/${id}/slide-images/${Date.now()}-${sanitisedName}`;
    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[grand-plan:${id}] image upload error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

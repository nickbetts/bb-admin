import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    // Upload file to Vercel Blob
    const filename = `uploads/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(filename, file, { access: "public" });

    // Use timestamp as orderIndex — avoids collision when two uploads arrive concurrently
    const orderIndex = Date.now();

    let screenshot;
    try {
      screenshot = await prisma.screenshot.create({
        data: {
          reportId: id,
          filename: blob.pathname,
          url: blob.url,
          caption,
          orderIndex,
        },
      });
    } catch (dbError) {
      // DB write failed — remove the uploaded blob so it doesn't become orphaned storage
      try { await del(blob.url); } catch { /* ignore blob cleanup errors */ }
      throw dbError;
    }

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error("Upload screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to upload screenshot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const screenshotId = searchParams.get("screenshotId");

    if (!screenshotId) {
      return NextResponse.json({ error: "screenshotId is required" }, { status: 400 });
    }

    const screenshot = await prisma.screenshot.findUnique({
      where: { id: screenshotId },
    });

    if (screenshot) {
      // Delete from Vercel Blob if it's a blob URL
      if (new URL(screenshot.url).hostname.endsWith(VERCEL_BLOB_HOSTNAME)) {
        try {
          await del(screenshot.url);
        } catch {
          // Ignore blob deletion errors
        }
      }
      await prisma.screenshot.delete({ where: { id: screenshotId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to delete screenshot" },
      { status: 500 }
    );
  }
}

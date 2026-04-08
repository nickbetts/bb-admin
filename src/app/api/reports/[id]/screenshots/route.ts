import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const sectionId = (formData.get("sectionId") as string | null) || null;

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

    // Validate file size (4 MB — client should compress before sending)
    const MAX_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 4 MB. Please use a smaller or compressed image." },
        { status: 400 }
      );
    }

    // Convert to base64 data URL and store directly in the database
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const orderIndex = Date.now();
    const screenshot = await prisma.screenshot.create({
      data: {
        reportId: id,
        sectionId,
        filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
        url: dataUrl,
        caption,
        orderIndex,
      },
    });

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error("Upload screenshot error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload screenshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { screenshotId, caption } = data as { screenshotId?: string; caption?: string | null };

    if (!screenshotId) {
      return NextResponse.json({ error: "screenshotId is required" }, { status: 400 });
    }

    const screenshot = await prisma.screenshot.update({
      where: { id: screenshotId },
      data: { caption: caption ?? null },
    });

    return NextResponse.json(screenshot);
  } catch (error) {
    console.error("Update screenshot error:", error);
    return NextResponse.json({ error: "Failed to update screenshot" }, { status: 500 });
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

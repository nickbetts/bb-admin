import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    // Save file to public directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", id);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/${id}/${filename}`;

    // Get next order index
    const count = await prisma.screenshot.count({ where: { reportId: id } });

    const screenshot = await prisma.screenshot.create({
      data: {
        reportId: id,
        filename,
        url,
        caption,
        orderIndex: count,
      },
    });

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    await prisma.screenshot.delete({ where: { id: screenshotId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to delete screenshot" },
      { status: 500 }
    );
  }
}

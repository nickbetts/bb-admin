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

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    // Delete existing logo from blob if present
    const existing = await prisma.client.findUnique({ where: { id }, select: { logoUrl: true } });
    if (existing?.logoUrl) {
      try {
        const u = new URL(existing.logoUrl);
        if (u.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) await del(existing.logoUrl);
      } catch { /* ignore */ }
    }

    const filename = `logos/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const blob = await put(filename, file, { access: "public" });

    const client = await prisma.client.update({ where: { id }, data: { logoUrl: blob.url } });

    return NextResponse.json({ logoUrl: client.logoUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

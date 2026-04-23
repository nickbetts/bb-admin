import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "client_files")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, fileId } = await params;
    const file = await prisma.clientFile.findFirst({ where: { id: fileId, clientId: id }, select: { id: true } });
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const data = await request.json() as { description?: string | null; fileName?: string };
    const updates: { description?: string | null; fileName?: string } = {};
    if (typeof data.description !== "undefined") updates.description = data.description?.trim() || null;
    if (typeof data.fileName === "string" && data.fileName.trim()) updates.fileName = data.fileName.trim();

    const updated = await prisma.clientFile.update({
      where: { id: fileId },
      data: updates,
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update client file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "client_files")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, fileId } = await params;
    const file = await prisma.clientFile.findFirst({ where: { id: fileId, clientId: id }, select: { id: true, blobUrl: true } });
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    try {
      const u = new URL(file.blobUrl);
      if (u.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) await del(file.blobUrl);
    } catch {
      // ignore — proceed
    }

    await prisma.clientFile.delete({ where: { id: fileId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client file error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

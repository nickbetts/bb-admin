import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/json",
]);

const attachmentInclude = {
  uploadedBy: { select: { id: true, name: true, email: true } },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const attachments = await prisma.taskAttachment.findMany({
      where: { actionItemId: actionId },
      include: attachmentInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(attachments);
  } catch (error) {
    console.error("List task attachments error:", error);
    return NextResponse.json({ error: "Failed to list attachments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.upload")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, actionId } = await params;
    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const commentId = (formData.get("commentId") as string | null) || null;

    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    if (commentId) {
      const comment = await prisma.taskComment.findFirst({ where: { id: commentId, actionItemId: actionId }, select: { id: true } });
      if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `tasks/${actionId}/${Date.now()}-${safeName}`;
    const blob = await put(path, file, { access: "public" });

    const attachment = await prisma.taskAttachment.create({
      data: {
        actionItemId: actionId,
        commentId: commentId ?? undefined,
        uploadedById: session.user.id,
        blobUrl: blob.url,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
      include: attachmentInclude,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create task attachment error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

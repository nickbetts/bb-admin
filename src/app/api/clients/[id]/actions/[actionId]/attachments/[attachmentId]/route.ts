import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string; attachmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.upload")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, actionId, attachmentId } = await params;
    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, actionItemId: actionId, actionItem: { clientId: id } },
      select: { id: true, blobUrl: true },
    });
    if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    try {
      const u = new URL(attachment.blobUrl);
      if (u.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) await del(attachment.blobUrl);
    } catch {
      // ignore — proceed to delete row
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task attachment error:", error);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}

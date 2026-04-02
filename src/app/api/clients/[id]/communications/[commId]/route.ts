import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, commId } = await params;
    const data = await request.json() as {
      type?: string;
      subject?: string;
      body?: string;
      direction?: string;
      status?: string;
      sentAt?: string;
      metadata?: string;
    };

    const existing = await prisma.clientCommunication.findFirst({ where: { id: commId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Communication not found" }, { status: 404 });

    const comm = await prisma.clientCommunication.update({
      where: { id: commId },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.direction !== undefined && { direction: data.direction }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sentAt !== undefined && { sentAt: data.sentAt ? new Date(data.sentAt) : null }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    return NextResponse.json(comm);
  } catch (error) {
    console.error("Update communication error:", error);
    return NextResponse.json({ error: "Failed to update communication" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, commId } = await params;
    const existing = await prisma.clientCommunication.findFirst({ where: { id: commId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Communication not found" }, { status: 404 });

    await prisma.clientCommunication.delete({ where: { id: commId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete communication error:", error);
    return NextResponse.json({ error: "Failed to delete communication" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const checklist = await prisma.qaChecklist.findUnique({ where: { id } });
    if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

    return NextResponse.json(checklist);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get QA checklist error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      marketingChecks?: Record<string, boolean>;
      devChecks?: Record<string, boolean>;
      status?: string;
      notes?: string;
      aiSummary?: string;
      websiteUrl?: string;
    };

    const existing = await prisma.qaChecklist.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

    const checklist = await prisma.qaChecklist.update({
      where: { id },
      data: {
        ...(data.marketingChecks !== undefined && {
          marketingChecks: JSON.stringify(data.marketingChecks),
        }),
        ...(data.devChecks !== undefined && {
          devChecks: JSON.stringify(data.devChecks),
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.aiSummary !== undefined && { aiSummary: data.aiSummary }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Update QA checklist error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.qaChecklist.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

    await prisma.qaChecklist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete QA checklist error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const checklists = await prisma.qaChecklist.findMany({
      where: { clientId },
      select: {
        id: true,
        clientId: true,
        websiteUrl: true,
        status: true,
        marketingChecks: true,
        devChecks: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List QA checklists error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json() as { clientId: string; websiteUrl?: string };

    if (!data.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const checklist = await prisma.qaChecklist.create({
      data: {
        clientId: data.clientId,
        websiteUrl: data.websiteUrl ?? null,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create QA checklist error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

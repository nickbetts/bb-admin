import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// GET /api/tools/proposals — list all proposals for current user
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await prisma.proposal.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      clientName: true,
      website: true,
      shareToken: true,
      viewCount: true,
      lastViewedAt: true,
      researchId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { enquiries: true } },
    },
  });

  return NextResponse.json({ proposals });
}

// POST /api/tools/proposals — create a proposal record (called by generate-proposal route)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    clientName: string;
    website?: string;
    title: string;
    html: string;
    services?: unknown[];
    timeline?: unknown[];
    researchId?: string;
  };

  const { clientName, website, title, html, services, timeline, researchId } = body;

  if (!clientName || !title || !html) {
    return NextResponse.json({ error: "clientName, title and html are required" }, { status: 400 });
  }

  const proposal = await prisma.proposal.create({
    data: {
      userId: session.user.id,
      clientName,
      website: website ?? "",
      title,
      html,
      servicesJson: JSON.stringify(services ?? []),
      timelineJson: JSON.stringify(timeline ?? []),
      researchId: researchId ?? null,
    },
  });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? undefined,
    action: "proposal_created",
    resourceType: "proposal",
    resourceId: proposal.id,
    clientName,
    description: `Generated proposal "${title}" for ${clientName}`,
  });

  return NextResponse.json({ proposal });
}

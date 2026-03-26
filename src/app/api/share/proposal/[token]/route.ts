import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/share/proposal/[token] — public, no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({ where: { shareToken: token } });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return safe public data only (no userId, no internal IDs)
  return NextResponse.json({
    proposal: {
      title: proposal.title,
      clientName: proposal.clientName,
      website: proposal.website,
      proposalDataJson: proposal.proposalDataJson,
      services: JSON.parse(proposal.servicesJson),
      timeline: JSON.parse(proposal.timelineJson),
      updatedAt: proposal.updatedAt,
    },
  });
}

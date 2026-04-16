import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/grand-plan/sources?clientId=xxx — discover available records for a client
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    const [proposals, keywordResearch, contentStrategies, mediaPlans] =
      await Promise.all([
        prisma.proposal.findMany({
          where: { clientId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            clientName: true,
            website: true,
            createdAt: true,
          },
        }),
        prisma.keywordPlannerResearch.findMany({
          where: { clientId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            website: true,
            brief: true,
            createdAt: true,
          },
        }),
        prisma.contentStrategy.findMany({
          where: { clientId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            period: true,
            generationStatus: true,
            createdAt: true,
          },
        }),
        prisma.mediaPlan.findMany({
          where: { clientId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            objective: true,
            totalBudget: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    return NextResponse.json({
      proposals,
      keywordResearch,
      contentStrategies,
      mediaPlans,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan sources error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/keyword-planner/saved — list researches for current user (optionally filter by clientId)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const researches = await prisma.keywordPlannerResearch.findMany({
    where: {
      userId,
      ...(clientId && { clientId }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      website: true,
      clientId: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ researches });
}

// POST /api/tools/keyword-planner/saved — create a new saved research
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const body = await request.json();
  const { title, website, brief, location, adGroups, selectedKws, ideas, maxCpc, monthlyBudget, conversionRate, websiteContext, proposedServices, clientId } = body;

  if (!title || !website) {
    return NextResponse.json({ error: "title and website are required" }, { status: 400 });
  }

  const research = await prisma.keywordPlannerResearch.create({
    data: {
      userId,
      clientId: clientId ?? null,
      title,
      website: website ?? "",
      brief: brief ?? "",
      location: location ?? "2826",
      adGroups: JSON.stringify(adGroups ?? []),
      selectedKws: JSON.stringify(selectedKws ?? []),
      ideas: JSON.stringify(ideas ?? []),
      maxCpc: maxCpc ?? "",
      monthlyBudget: monthlyBudget ?? "",
      conversionRate: conversionRate ?? "3",
      ...(websiteContext !== undefined && { websiteContext }),
      ...(proposedServices !== undefined && { proposedServices: JSON.stringify(proposedServices) }),
    },
  });

  return NextResponse.json({ research });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/llm-generator/generations
// List saved llm.txt generations (most recent first). Optional ?clientId= filter.
// The output field is omitted from the list payload to keep it lightweight.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");

  const generations = await prisma.llmGeneration.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      clientId: true,
      createdByEmail: true,
      title: true,
      website: true,
      templateName: true,
      sector: true,
      pagesCrawled: true,
      deadUrlsRemoved: true,
      usedWebSearchFallback: true,
      authorityDataUsed: true,
      socialProfilesFound: true,
      generationMs: true,
      shareToken: true,
      viewCount: true,
      lastViewedAt: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ generations });
}

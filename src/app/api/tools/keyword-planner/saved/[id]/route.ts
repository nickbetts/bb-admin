import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/keyword-planner/saved/[id] — load full research data
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const research = await prisma.keywordPlannerResearch.findUnique({ where: { id } });

  if (!research || research.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    research: {
      ...research,
      adGroups: JSON.parse(research.adGroups),
      selectedKws: JSON.parse(research.selectedKws),
      ideas: JSON.parse(research.ideas),
    },
  });
}

// PATCH /api/tools/keyword-planner/saved/[id] — update title or full data
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.keywordPlannerResearch.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, website, brief, location, adGroups, selectedKws, ideas, maxCpc, monthlyBudget, conversionRate } = body;

  const research = await prisma.keywordPlannerResearch.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(website !== undefined && { website }),
      ...(brief !== undefined && { brief }),
      ...(location !== undefined && { location }),
      ...(adGroups !== undefined && { adGroups: JSON.stringify(adGroups) }),
      ...(selectedKws !== undefined && { selectedKws: JSON.stringify(selectedKws) }),
      ...(ideas !== undefined && { ideas: JSON.stringify(ideas) }),
      ...(maxCpc !== undefined && { maxCpc }),
      ...(monthlyBudget !== undefined && { monthlyBudget }),
      ...(conversionRate !== undefined && { conversionRate }),
    },
  });

  return NextResponse.json({ research });
}

// DELETE /api/tools/keyword-planner/saved/[id] — delete a research
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.keywordPlannerResearch.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.keywordPlannerResearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

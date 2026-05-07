import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/meta-audience-scraper/plans
// Lists the current user's saved plans, most recently updated first.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.metaAssassinPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, clientId: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ plans: rows });
}

// POST /api/tools/meta-audience-scraper/plans
// Body: { title: string; clientId?: string; state: object }
// Creates a new saved plan.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { title?: string; clientId?: string | null; state?: unknown };
    const title = (body.title ?? "").trim().slice(0, 200) || "Untitled plan";
    if (!body.state) return NextResponse.json({ error: "state is required" }, { status: 400 });

    const row = await prisma.metaAssassinPlan.create({
      data: {
        userId: session.user.id,
        clientId: body.clientId || null,
        title,
        state: JSON.stringify(body.state),
      },
      select: { id: true, title: true, clientId: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ plan: row });
  } catch (error) {
    console.error("meta-assassin plans create error:", error);
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

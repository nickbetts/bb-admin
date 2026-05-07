import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET, PATCH, DELETE /api/tools/meta-audience-scraper/plans/[id]
// All gated by ownership: users only see/edit/delete their own plans.

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const row = await prisma.metaAssassinPlan.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let state: unknown = null;
  try { state = JSON.parse(row.state); } catch { state = null; }

  return NextResponse.json({
    plan: {
      id: row.id,
      title: row.title,
      clientId: row.clientId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      state,
    },
  });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.metaAssassinPlan.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as { title?: string; clientId?: string | null; state?: unknown };
    const data: { title?: string; clientId?: string | null; state?: string } = {};
    if (typeof body.title === "string") data.title = body.title.trim().slice(0, 200) || "Untitled plan";
    if (body.clientId !== undefined) data.clientId = body.clientId || null;
    if (body.state !== undefined) data.state = JSON.stringify(body.state);

    const row = await prisma.metaAssassinPlan.update({
      where: { id },
      data,
      select: { id: true, title: true, clientId: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ plan: row });
  } catch (error) {
    console.error("meta-assassin plan update error:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.metaAssassinPlan.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.metaAssassinPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

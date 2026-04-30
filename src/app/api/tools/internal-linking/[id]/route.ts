/**
 * GET    /api/tools/internal-linking/[id] — fetch full plan
 * PATCH  /api/tools/internal-linking/[id] — update title / share token / portal
 * DELETE /api/tools/internal-linking/[id] — delete plan
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  try {
    const plan = await prisma.internalLinkingPlan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal linking fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  try {
    const plan = await prisma.internalLinkingPlan.findUnique({
      where: { id },
      select: { id: true, userId: true, shareToken: true },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as {
      title?: unknown;
      generateShareToken?: unknown;
      revokeShareToken?: unknown;
      portalPublished?: unknown;
    };

    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }

    if (body.generateShareToken === true && !plan.shareToken) {
      updates.shareToken = crypto.randomBytes(24).toString("base64url");
    }

    if (body.revokeShareToken === true) {
      updates.shareToken = null;
    }

    if (body.portalPublished === true) {
      updates.portalPublishedAt = new Date();
      updates.portalPublishedBy = session.user.name ?? session.user.email;
    }
    if (body.portalPublished === false) {
      updates.portalPublishedAt = null;
      updates.portalPublishedBy = null;
    }

    const updated = await prisma.internalLinkingPlan.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal linking update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  try {
    const plan = await prisma.internalLinkingPlan.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.internalLinkingPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal linking delete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

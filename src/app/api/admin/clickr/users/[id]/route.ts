import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const user = await prisma.clickrUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        planTier: true,
        planStatus: true,
        lpsThisMonth: true,
        billingPeriodStart: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
        landingPages: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, publicSlug: true, status: true, viewCount: true, createdAt: true },
        },
        _count: { select: { sessions: true, landingPages: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr admin user detail error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { planTier?: string; lpsThisMonth?: number; planStatus?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.planTier !== undefined) {
    if (!["free", "starter", "pro"].includes(body.planTier)) {
      return NextResponse.json({ error: "Invalid planTier" }, { status: 400 });
    }
    data.planTier = body.planTier;
  }
  if (body.lpsThisMonth !== undefined) {
    if (typeof body.lpsThisMonth !== "number" || body.lpsThisMonth < 0) {
      return NextResponse.json({ error: "Invalid lpsThisMonth" }, { status: 400 });
    }
    data.lpsThisMonth = body.lpsThisMonth;
  }
  if (body.planStatus !== undefined) {
    if (!["active", "past_due", "cancelled", "disabled"].includes(body.planStatus)) {
      return NextResponse.json({ error: "Invalid planStatus" }, { status: 400 });
    }
    data.planStatus = body.planStatus;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const user = await prisma.clickrUser.update({
      where: { id },
      data,
      select: { id: true, email: true, planTier: true, planStatus: true, lpsThisMonth: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr admin user patch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

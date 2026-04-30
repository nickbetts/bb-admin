import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const tier = searchParams.get("tier") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));

  const where: Record<string, unknown> = {};
  if (search) {
    where.email = { contains: search, mode: "insensitive" };
  }
  if (tier && ["free", "starter", "pro"].includes(tier)) {
    where.planTier = tier;
  }

  try {
    const [users, total] = await Promise.all([
      prisma.clickrUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          planTier: true,
          planStatus: true,
          lpsThisMonth: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { landingPages: true } },
        },
      }),
      prisma.clickrUser.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr admin users error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

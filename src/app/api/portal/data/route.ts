import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalContext, unauthorized } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getPortalContext();
    if (!ctx) return unauthorized();

    const { portalUser, permissions } = ctx;
    const clientId = portalUser.clientId;

    // Reports must be explicitly published to the portal AND have a share token (so the link works).
    const reports = permissions.includes("reports")
      ? await prisma.report.findMany({
          where: { clientId, portalPublishedAt: { not: null }, shareToken: { not: null } },
          orderBy: { portalPublishedAt: "desc" },
          take: 10,
          select: {
            id: true, title: true, period: true, shareToken: true,
            createdAt: true, portalPublishedAt: true, status: true,
          },
        })
      : [];

    const grandPlans = permissions.includes("grand_plans")
      ? await prisma.grandPlan.findMany({
          where: { clientId, portalPublishedAt: { not: null }, shareToken: { not: null } },
          orderBy: { portalPublishedAt: "desc" },
          take: 10,
          select: {
            id: true, title: true, purpose: true, shareToken: true,
            createdAt: true, portalPublishedAt: true,
          },
        })
      : [];

    const contentStrategies = permissions.includes("content_strategies")
      ? await prisma.contentStrategy.findMany({
          where: { clientId, portalPublishedAt: { not: null }, shareToken: { not: null } },
          orderBy: { portalPublishedAt: "desc" },
          take: 10,
          select: {
            id: true, title: true, period: true, shareToken: true,
            createdAt: true, portalPublishedAt: true,
          },
        })
      : [];

    const landingPages = permissions.includes("landing_pages")
      ? await prisma.landingPage.findMany({
          where: { clientId, portalPublishedAt: { not: null }, shareToken: { not: null } },
          orderBy: { portalPublishedAt: "desc" },
          take: 10,
          select: {
            id: true, title: true, shareToken: true, publicSlug: true,
            updatedAt: true, portalPublishedAt: true,
          },
        })
      : [];

    return NextResponse.json({ reports, grandPlans, contentStrategies, landingPages });
  } catch (error) {
    console.error("Portal data error:", error);
    return NextResponse.json({ error: "Failed to get portal data" }, { status: 500 });
  }
}

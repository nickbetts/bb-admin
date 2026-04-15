import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// POST /api/tools/landing-pages/[id]/share — generate share token
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({ where: { id } });
  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (landingPage.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If already shared, return existing token
  if (landingPage.shareToken) {
    return NextResponse.json({
      shareToken: landingPage.shareToken,
      publicSlug: (landingPage as Record<string, unknown>).publicSlug ?? null,
    });
  }

  const shareToken = crypto.randomBytes(32).toString("hex");

  // Generate a pretty public slug from the LP slug
  const publicSlug = landingPage.slug + "-" + shareToken.slice(0, 8);

  await prisma.landingPage.update({
    where: { id },
    data: { shareToken, publicSlug },
  });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    action: "landing_page_shared",
    resourceType: "LandingPage",
    resourceId: id,
    description: `Shared landing page "${landingPage.title}"`,
  });

  return NextResponse.json({ shareToken });
}

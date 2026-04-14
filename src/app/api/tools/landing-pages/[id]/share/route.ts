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
    return NextResponse.json({ shareToken: landingPage.shareToken });
  }

  const shareToken = crypto.randomBytes(32).toString("hex");

  await prisma.landingPage.update({
    where: { id },
    data: { shareToken },
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

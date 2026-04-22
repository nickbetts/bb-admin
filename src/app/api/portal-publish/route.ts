import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ResourceType = "report" | "grand_plan" | "content_strategy" | "landing_page";

const RESOURCES: Record<ResourceType, "report" | "grandPlan" | "contentStrategy" | "landingPage"> = {
  report: "report",
  grand_plan: "grandPlan",
  content_strategy: "contentStrategy",
  landing_page: "landingPage",
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admins implicitly have all permissions; non-admins need the explicit perm.
  if (!hasPermission(session, "publish_to_portal")) {
    return NextResponse.json({ error: "Forbidden — you do not have permission to publish to the client portal." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    resourceType?: ResourceType;
    resourceId?: string;
    publish?: boolean;
  } | null;

  if (!body || !body.resourceType || !body.resourceId || typeof body.publish !== "boolean") {
    return NextResponse.json({ error: "resourceType, resourceId and publish are required" }, { status: 400 });
  }

  if (!(body.resourceType in RESOURCES)) {
    return NextResponse.json({ error: `Unknown resourceType: ${body.resourceType}` }, { status: 400 });
  }

  const data = body.publish
    ? { portalPublishedAt: new Date(), portalPublishedBy: session.user.id }
    : { portalPublishedAt: null, portalPublishedBy: null };

  try {
    switch (body.resourceType) {
      case "report":
        await prisma.report.update({ where: { id: body.resourceId }, data });
        break;
      case "grand_plan":
        await prisma.grandPlan.update({ where: { id: body.resourceId }, data });
        break;
      case "content_strategy":
        await prisma.contentStrategy.update({ where: { id: body.resourceId }, data });
        break;
      case "landing_page":
        await prisma.landingPage.update({ where: { id: body.resourceId }, data });
        break;
    }
    return NextResponse.json({ ok: true, published: body.publish });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("portal-publish error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const setupId = searchParams.get("setupId");

    interface WhereClause {
      id?: string;
      clientId?: string;
    }

    const whereClause: WhereClause = {};

    if (setupId) {
      whereClause.id = setupId;
    } else if (clientId) {
      whereClause.clientId = clientId;
    } else {
      return NextResponse.json({ error: "setupId or clientId is required" }, { status: 400 });
    }

    const setup = await prisma.trackingSetup.findFirst({
      where: whereClause,
      include: {
        events: true,
      },
    });

    if (!setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }
    // Fetch recent audits separately using clientId
    const recentAudits = await prisma.trackingAudit.findMany({
      where: { clientId: setup.clientId },
      orderBy: { auditedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      ...setup,
      audits: recentAudits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching setup:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      clientId,
      gtmAccountId,
      gtmContainerApiId,
      gtmContainerId,
      gtmWorkspaceId,
      ga4PropertyId,
      metaPixelId,
      googleAdsConversionId,
      status = "DRAFT",
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if setup already exists for this client
    const existingSetup = await prisma.trackingSetup.findFirst({
      where: { clientId },
    });

    let setup;
    if (existingSetup) {
      // Update existing setup
      setup = await prisma.trackingSetup.update({
        where: { id: existingSetup.id },
        data: {
          ...(gtmAccountId !== undefined && { gtmAccountId }),
          ...(gtmContainerApiId !== undefined && { gtmContainerApiId }),
          ...(gtmContainerId !== undefined && { gtmContainerId }),
          ...(gtmWorkspaceId !== undefined && { gtmWorkspaceId }),
          ...(ga4PropertyId !== undefined && { ga4PropertyId }),
          ...(metaPixelId !== undefined && { metaPixelId }),
          ...(googleAdsConversionId !== undefined && { googleAdsConversionId }),
          ...(status !== undefined && { status }),
        },
      });
    } else {
      // Create new setup
      setup = await prisma.trackingSetup.create({
        data: {
          clientId,
          gtmAccountId: gtmAccountId || null,
          gtmContainerApiId: gtmContainerApiId || null,
          gtmContainerId: gtmContainerId || null,
          gtmWorkspaceId: gtmWorkspaceId || "1",
          ga4PropertyId: ga4PropertyId || null,
          metaPixelId: metaPixelId || null,
          googleAdsConversionId: googleAdsConversionId || null,
          status,
        },
      });
    }

    return NextResponse.json(setup, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating/updating setup:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      setupId,
      gtmAccountId,
      gtmContainerApiId,
      gtmContainerId,
      gtmWorkspaceId,
      ga4PropertyId,
      metaPixelId,
      googleAdsConversionId,
      status,
    } = body;

    if (!setupId) {
      return NextResponse.json({ error: "setupId is required" }, { status: 400 });
    }

    const updateData: Record<string, string | null | undefined> = {};
    if (gtmAccountId !== undefined) updateData.gtmAccountId = gtmAccountId;
    if (gtmContainerApiId !== undefined) updateData.gtmContainerApiId = gtmContainerApiId;
    if (gtmContainerId !== undefined) updateData.gtmContainerId = gtmContainerId;
    if (gtmWorkspaceId !== undefined) updateData.gtmWorkspaceId = gtmWorkspaceId;
    if (ga4PropertyId !== undefined) updateData.ga4PropertyId = ga4PropertyId;
    if (metaPixelId !== undefined) updateData.metaPixelId = metaPixelId;
    if (googleAdsConversionId !== undefined)
      updateData.googleAdsConversionId = googleAdsConversionId;
    if (status !== undefined) updateData.status = status;

    const setup = await prisma.trackingSetup.update({
      where: { id: setupId },
      data: updateData,
    });

    return NextResponse.json(setup);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating setup:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const setupId = searchParams.get("setupId");

    if (!setupId) {
      return NextResponse.json({ error: "setupId is required" }, { status: 400 });
    }

    await prisma.trackingSetup.delete({
      where: { id: setupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting setup:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

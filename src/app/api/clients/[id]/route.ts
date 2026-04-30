import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Get client error:", error);
    return NextResponse.json({ error: "Failed to get client" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        website: data.website,
        semrushDomain: data.semrushDomain,
        semrushProjectId: data.semrushProjectId != null ? Number(data.semrushProjectId) : null,
        semrushCampaignIds: data.semrushCampaignIds !== undefined ? data.semrushCampaignIds : undefined,
        ga4PropertyId: data.ga4PropertyId,
        ga4PropertyName: data.ga4PropertyName,
        metaAccountId: data.metaAccountId,
        metaAccountName: data.metaAccountName,
        metaAccessToken: data.metaAccessToken,
        logoUrl: data.logoUrl,
        googleAdsCustomerId: data.googleAdsCustomerId,
        googleAdsAccountName: data.googleAdsAccountName,
        searchConsoleSiteUrl: data.searchConsoleSiteUrl,
        aiReportInstructions: data.aiReportInstructions,
        woocommerceUrl: data.woocommerceUrl || null,
        woocommerceKey: data.woocommerceKey || null,
        woocommerceSecret: data.woocommerceSecret || null,
        shopifyStoreDomain: data.shopifyStoreDomain || null,
        shopifyAccessToken: data.shopifyAccessToken || null,
        contractedHours: data.contractedHours !== undefined ? data.contractedHours : undefined,
        tiktokAdvertiserId: data.tiktokAdvertiserId || null,
        tiktokAccessToken: data.tiktokAccessToken || null,
        microsoftAdsAccountId: data.microsoftAdsAccountId || null,
        microsoftAdsAccountName: data.microsoftAdsAccountName || null,
        cwvUrl: data.cwvUrl || null,
        notifyEmail: data.notifyEmail || null,
        reportSchedule: data.reportSchedule !== undefined ? data.reportSchedule : undefined,
        linkedinAccountId: data.linkedinAccountId || null,
        linkedinAccountName: data.linkedinAccountName || null,
        linkedinAccessToken: data.linkedinAccessToken || null,
        klaviyoApiKey: data.klaviyoApiKey || null,
        klaviyoAccountName: data.klaviyoAccountName || null,
        contactEmails: data.contactEmails !== undefined ? data.contactEmails : undefined,
        signalConfig: data.signalConfig !== undefined ? data.signalConfig : undefined,
        defaultAnalyticsConfig: data.defaultAnalyticsConfig !== undefined
          ? (typeof data.defaultAnalyticsConfig === "string"
              ? data.defaultAnalyticsConfig
              : JSON.stringify(data.defaultAnalyticsConfig))
          : undefined,
        status: data.status !== undefined
          ? (["active", "lead", "qualifying", "proposal_sent", "negotiating", "churned", "lost"].includes(data.status) ? data.status : undefined)
          : undefined,
      },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "client_updated",
      resourceType: "client",
      resourceId: id,
      clientId: id,
      clientName: client.name,
      description: `Updated client "${client.name}"`,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && !hasPermission(session, "clients.delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.client.delete({ where: { id } });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "client_deleted",
      resourceType: "client",
      resourceId: id,
      clientId: id,
      clientName: client.name,
      description: `Deleted client "${client.name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}

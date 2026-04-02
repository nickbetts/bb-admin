import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      },
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

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMicrosoftAdsOverview, getMicrosoftAdsCampaigns } from "@/lib/microsoft-ads";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "clientId, startDate, and endDate are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { microsoftAdsAccountId: true },
    });

    if (!client?.microsoftAdsAccountId) {
      return NextResponse.json({ error: "Client Microsoft Ads not configured" }, { status: 404 });
    }

    const [overview, campaigns] = await Promise.all([
      getMicrosoftAdsOverview(client.microsoftAdsAccountId, startDate, endDate),
      getMicrosoftAdsCampaigns(client.microsoftAdsAccountId, startDate, endDate),
    ]);

    return NextResponse.json({ overview, campaigns });
  } catch (error) {
    console.error("Microsoft Ads GET error:", error);
    return NextResponse.json({ error: "Failed to fetch Microsoft Ads data" }, { status: 500 });
  }
}

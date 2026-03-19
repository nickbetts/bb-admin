import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetaAdsOverview, getMetaCampaigns, getMetaCampaignsEnriched, getMetaDailyData } from "@/lib/meta";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "2024-01-01";
    const endDate = searchParams.get("endDate") ?? new Date().toISOString().split("T")[0];

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Fetch client to get accountId and accessToken server-side
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { metaAccountId: true, metaAccessToken: true },
    });

    if (!client?.metaAccountId) {
      return NextResponse.json({ error: "Client Meta account not configured" }, { status: 404 });
    }

    const accessToken = client.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";

    switch (type) {
      case "overview":
        return NextResponse.json(
          await getMetaAdsOverview(client.metaAccountId, accessToken, startDate, endDate)
        );
      case "campaigns":
        return NextResponse.json(
          await getMetaCampaigns(client.metaAccountId, accessToken, startDate, endDate)
        );
      case "campaigns-enriched":
        return NextResponse.json(
          await getMetaCampaignsEnriched(client.metaAccountId, accessToken, startDate, endDate)
        );
      case "daily":
        return NextResponse.json(
          await getMetaDailyData(client.metaAccountId, accessToken, startDate, endDate)
        );
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Meta API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Meta Ads data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

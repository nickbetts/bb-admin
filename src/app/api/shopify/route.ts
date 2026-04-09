import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopifyStats, getShopifyCustomerData } from "@/lib/shopify";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type") ?? "overview";

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "clientId, startDate, and endDate are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.shopifyStoreDomain || !client.shopifyAccessToken) {
      return NextResponse.json({ error: "Shopify not configured for this client" }, { status: 503 });
    }

    switch (type) {
      case "overview": {
        const stats = await withApiCache(`shopify:${clientId}:${startDate}:${endDate}`, 4, () =>
          getShopifyStats(client.shopifyStoreDomain!, client.shopifyAccessToken!, startDate, endDate)
        );
        return NextResponse.json(stats);
      }
      case "customers": {
        const customerData = await withApiCache(`shopify:customers:${clientId}:${startDate}:${endDate}`, 4, () =>
          getShopifyCustomerData(client.shopifyStoreDomain!, client.shopifyAccessToken!, startDate, endDate)
        );
        return NextResponse.json(customerData);
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Shopify API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Shopify data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

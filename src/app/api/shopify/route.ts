import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopifyStats } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    const stats = await getShopifyStats(
      client.shopifyStoreDomain,
      client.shopifyAccessToken,
      startDate,
      endDate
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Shopify API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Shopify data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWooCommerceStats } from "@/lib/woocommerce";

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

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "clientId, startDate, and endDate are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.woocommerceUrl || !client.woocommerceKey || !client.woocommerceSecret) {
      return NextResponse.json({ error: "WooCommerce not configured for this client" }, { status: 503 });
    }

    const stats = await getWooCommerceStats(
      client.woocommerceUrl,
      client.woocommerceKey,
      client.woocommerceSecret,
      startDate,
      endDate
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("WooCommerce API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch WooCommerce data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

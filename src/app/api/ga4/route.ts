import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getGA4Overview,
  getGA4DailyData,
  getGA4TrafficSources,
  getGA4TopPages,
} from "@/lib/ga4";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "30daysAgo";
    const endDate = searchParams.get("endDate") ?? "today";

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (!process.env.GA4_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "GA4 not configured. Please add GA4_ACCESS_TOKEN to environment." },
        { status: 503 }
      );
    }

    switch (type) {
      case "overview":
        return NextResponse.json(await getGA4Overview(propertyId, startDate, endDate));
      case "daily":
        return NextResponse.json(await getGA4DailyData(propertyId, startDate, endDate));
      case "sources":
        return NextResponse.json(await getGA4TrafficSources(propertyId, startDate, endDate));
      case "pages":
        return NextResponse.json(await getGA4TopPages(propertyId, startDate, endDate));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GA4 API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch GA4 data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

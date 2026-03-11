import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getDomainOverview,
  getTopOrganicKeywords,
  getDomainRankHistory,
  getKeywordPositionDistribution,
} from "@/lib/semrush";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const type = searchParams.get("type") ?? "overview";
    const database = searchParams.get("database") ?? "uk";

    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    if (!process.env.SEMRUSH_API_KEY) {
      return NextResponse.json(
        { error: "SemRush API key not configured" },
        { status: 503 }
      );
    }

    switch (type) {
      case "overview":
        return NextResponse.json(await getDomainOverview(domain, database));
      case "keywords":
        return NextResponse.json(await getTopOrganicKeywords(domain, database, 20));
      case "history":
        return NextResponse.json(await getDomainRankHistory(domain, database));
      case "distribution":
        return NextResponse.json(await getKeywordPositionDistribution(domain, database));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("SemRush API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch SemRush data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

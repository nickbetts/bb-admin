import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import {
  searchTargetingCategories,
  searchInterests,
  suggestSimilarInterests,
} from "@/lib/meta-targeting";

export const dynamic = "force-dynamic";

// POST /api/tools/meta-audience-scraper/search
// Body: { query: string; mode?: "all" | "interests" | "suggest"; seedNames?: string[]; limit?: number }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      query?: string;
      mode?: "all" | "interests" | "suggest";
      seedNames?: string[];
      limit?: number;
    };

    const mode = body.mode ?? "all";
    const limit = Math.min(Math.max(body.limit ?? 30, 1), 50);

    if (mode === "suggest") {
      const seeds = (body.seedNames ?? []).filter((s) => typeof s === "string" && s.trim());
      if (!seeds.length) {
        return NextResponse.json({ error: "seedNames required for suggest mode" }, { status: 400 });
      }
      const results = await suggestSimilarInterests(seeds, { limit });
      return NextResponse.json({ results });
    }

    const q = (body.query ?? "").trim();
    if (!q) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const results = mode === "interests"
      ? await searchInterests(q, { limit })
      : await searchTargetingCategories(q, { limit });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("meta-audience-scraper search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

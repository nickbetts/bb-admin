import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { getDomainAuthority, getMozLinkIntersect } from "@/lib/domain-authority";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// Moz DA/PA metrics update monthly — 30-day TTL is appropriate.
const MOZ_CACHE_TTL_HOURS = 720;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const type = searchParams.get("type") ?? "domain-authority";

    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    switch (type) {
      case "domain-authority": {
        const cacheKey = `moz:da:${domain}`;
        return NextResponse.json(await withApiCache(cacheKey, MOZ_CACHE_TTL_HOURS, () => getDomainAuthority(domain)));
      }
      case "link-intersect": {
        const competitors = (searchParams.get("competitors") ?? "").split(",").map((c) => c.trim()).filter(Boolean);
        if (competitors.length === 0) {
          return NextResponse.json({ error: "competitors parameter is required for link-intersect" }, { status: 400 });
        }
        const cacheKey = `moz:link-intersect:${domain}:${competitors.join(",")}`;
        return NextResponse.json(await withApiCache(cacheKey, MOZ_CACHE_TTL_HOURS, () => getMozLinkIntersect(domain, competitors)));
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Moz API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Moz data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

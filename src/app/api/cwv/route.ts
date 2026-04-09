import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getCoreWebVitals,
  getCoreWebVitalsForPage,
  getCoreWebVitalsByDevice,
  getCoreWebVitalsHistory,
} from "@/lib/core-web-vitals";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// GET /api/cwv — fetch Core Web Vitals for a URL
// ?url=example.com&type=overview|page|by-device|history
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = request.nextUrl.searchParams.get("url");
    const type = request.nextUrl.searchParams.get("type") ?? "overview";
    if (!url) return NextResponse.json({ error: "url parameter is required" }, { status: 400 });

    switch (type) {
      case "overview":
        return NextResponse.json(await withApiCache(`cwv:${url}`, 6, () => getCoreWebVitals(url)));
      case "page":
        return NextResponse.json(await withApiCache(`cwv:page:${url}`, 6, () => getCoreWebVitalsForPage(url)));
      case "by-device":
        return NextResponse.json(await withApiCache(`cwv:by-device:${url}`, 6, () => getCoreWebVitalsByDevice(url)));
      case "history":
        return NextResponse.json(await withApiCache(`cwv:history:${url}`, 6, () => getCoreWebVitalsHistory(url)));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("CWV GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Core Web Vitals" },
      { status: 500 }
    );
  }
}

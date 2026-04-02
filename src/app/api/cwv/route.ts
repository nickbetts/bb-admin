import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { getCoreWebVitals } from "@/lib/core-web-vitals";

export const dynamic = "force-dynamic";

// GET /api/cwv — fetch Core Web Vitals for a URL
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = request.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "url parameter is required" }, { status: 400 });

    const data = await getCoreWebVitals(url);
    return NextResponse.json(data);
  } catch (error) {
    console.error("CWV GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Core Web Vitals" },
      { status: 500 }
    );
  }
}

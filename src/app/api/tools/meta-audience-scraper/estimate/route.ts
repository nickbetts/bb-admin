import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getDeliveryEstimate, type MetaTargetingSpec } from "@/lib/meta-targeting";

export const dynamic = "force-dynamic";

// POST /api/tools/meta-audience-scraper/estimate
// Body: { accountId: string; targeting: MetaTargetingSpec }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { accountId?: string; targeting?: MetaTargetingSpec };
    const accountId = (body.accountId ?? "").trim();
    if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    if (!body.targeting) return NextResponse.json({ error: "targeting is required" }, { status: 400 });

    const estimate = await getDeliveryEstimate(accountId, body.targeting);
    return NextResponse.json({ estimate });
  } catch (error) {
    console.error("meta-audience-scraper estimate error:", error);
    const message = error instanceof Error ? error.message : "Estimate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

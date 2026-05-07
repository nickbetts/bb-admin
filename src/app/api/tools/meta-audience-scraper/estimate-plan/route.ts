import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getDeliveryEstimate, type MetaTargetingSpec } from "@/lib/meta-targeting";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/tools/meta-audience-scraper/estimate-plan
// Body: {
//   accountId: string;
//   adSets: Array<{
//     adSetIndex: number;             // index inside its campaign
//     campaignIndex: number;
//     geoCountries?: string[];        // ISO country codes
//     ageMin: number;
//     ageMax: number;
//     genders: "all" | "female" | "male";
//     interestIds?: { id: string }[]; // typed targeting option splits
//     behaviorIds?: { id: string }[];
//     advantageAudience?: boolean;    // if true, we send a flexible_spec instead of a constrained one
//   }>
// }
//
// Calls the Meta delivery_estimate endpoint per ad set in parallel and
// returns a map of estimates keyed by `${campaignIndex}-${adSetIndex}`.

interface AdSetInput {
  campaignIndex: number;
  adSetIndex: number;
  geoCountries?: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: "all" | "female" | "male";
  interestIds?: { id: string }[];
  behaviorIds?: { id: string }[];
  advantageAudience?: boolean;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { accountId?: string; adSets?: AdSetInput[] };
    const accountId = (body.accountId ?? "").trim();
    if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    if (!Array.isArray(body.adSets) || body.adSets.length === 0) {
      return NextResponse.json({ error: "adSets is required" }, { status: 400 });
    }

    const tasks = body.adSets.map(async (a) => {
      const key = `${a.campaignIndex}-${a.adSetIndex}`;
      try {
        const spec: MetaTargetingSpec = {
          age_min: a.ageMin ?? 18,
          age_max: a.ageMax ?? 65,
          ...(a.genders === "female" ? { genders: [2] } : a.genders === "male" ? { genders: [1] } : {}),
          ...(a.geoCountries && a.geoCountries.length > 0
            ? { geo_locations: { countries: a.geoCountries } }
            : { geo_locations: { countries: ["GB"] } }),
        };
        if (a.interestIds && a.interestIds.length > 0) {
          spec.interests = a.interestIds;
        }
        if (a.behaviorIds && a.behaviorIds.length > 0) {
          spec.behaviors = a.behaviorIds;
        }
        const estimate = await getDeliveryEstimate(accountId, spec, { optimization_goal: "REACH" });
        return [key, { ok: true as const, estimate }] as const;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Estimate failed";
        return [key, { ok: false as const, error: message }] as const;
      }
    });

    const settled = await Promise.all(tasks);
    const estimates: Record<string, { ok: true; estimate: { estimatedDauLower: number; estimatedDauUpper: number; estimatedMauLower: number; estimatedMauUpper: number } } | { ok: false; error: string }> = {};
    for (const [key, value] of settled) estimates[key] = value;

    return NextResponse.json({ estimates });
  } catch (error) {
    console.error("meta-audience-scraper estimate-plan error:", error);
    const message = error instanceof Error ? error.message : "Estimates failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";

// GET /api/semrush/campaigns?projectId=123456
// Fetches the list of Position Tracking campaigns for a given SEMrush project.
// The campaign ID (e.g. "103580023_16852") is what the position tracking API requires.
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SEMRUSH_API_KEY not configured" }, { status: 503 });

  type RawTarget = {
    id: string;
    url?: string;
    domain?: string;
    type?: string;
    engine?: string;
    location?: { name?: string; code?: string } | string;
    device?: string;
    language?: string;
    lang_name?: string;
    location_name?: string;
    keywords_count?: number;
  };

  function parseTargets(raw: unknown): RawTarget[] {
    if (Array.isArray(raw)) return raw as RawTarget[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const arr = obj.targets ?? obj.campaigns ?? obj.data;
      if (Array.isArray(arr)) return arr as RawTarget[];
    }
    return [];
  }

  function mapTarget(t: RawTarget) {
    const loc =
      typeof t.location === "object" && t.location !== null
        ? (t.location.name ?? t.location.code ?? t.location_name ?? "Unknown")
        : (t.location_name ?? String(t.location ?? "Unknown"));
    const displayUrl = t.url ?? t.domain ?? "";
    return {
      id: t.id,
      url: displayUrl,
      device: t.device ?? "desktop",
      location: loc,
      language: t.lang_name ?? t.language ?? "",
      keywordsCount: t.keywords_count ?? 0,
      label: `${displayUrl} — ${t.device ?? "desktop"} / ${loc}`,
    };
  }

  try {
    // Primary: /tracking/campaigns endpoint
    const primaryUrl = `https://api.semrush.com/management/v1/projects/${projectId}/tracking/campaigns?key=${encodeURIComponent(apiKey)}`;
    const primaryRes = await fetch(primaryUrl);

    if (primaryRes.ok) {
      const raw = await primaryRes.json();
      const targets = parseTargets(raw);
      if (targets.length > 0) {
        return NextResponse.json(targets.map(mapTarget));
      }
      // Empty from primary — try fallback before returning []
    }

    // Fallback: root /tracking/ endpoint which returns full config incl. targets
    const fallbackUrl = `https://api.semrush.com/management/v1/projects/${projectId}/tracking/?key=${encodeURIComponent(apiKey)}`;
    const fallbackRes = await fetch(fallbackUrl);
    if (fallbackRes.ok) {
      const raw = await fallbackRes.json();
      const targets = parseTargets(raw);
      return NextResponse.json(targets.map(mapTarget));
    }

    // Both endpoints returned nothing — surface the primary status for diagnosis
    if (!primaryRes.ok) {
      const body = await primaryRes.text().catch(() => "");
      return NextResponse.json({ error: `SEMrush API error (${primaryRes.status}): ${body.slice(0, 200)}` }, { status: primaryRes.status });
    }

    return NextResponse.json([]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("SEMrush campaigns fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

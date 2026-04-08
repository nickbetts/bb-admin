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

  try {
    const url = `https://api.semrush.com/management/v1/projects/${projectId}/tracking/campaigns?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `SEMrush API error (${res.status}): ${body.slice(0, 200)}` }, { status: res.status });
    }
    const data = await res.json() as {
      targets?: Array<{
        id: string;
        url: string;
        type: string;
        engine: string;
        location?: { name: string; code: string };
        device: string;
        language: string;
        keywords_count: number;
      }>;
    };

    const campaigns = (data.targets ?? []).map((t) => ({
      id: t.id,               // e.g. "103580023_16852"
      url: t.url,
      device: t.device,
      location: t.location?.name ?? t.location?.code ?? "Unknown",
      language: t.language,
      keywordsCount: t.keywords_count,
      label: `${t.url} — ${t.device} / ${t.location?.name ?? t.location?.code ?? "Unknown"}`,
    }));

    return NextResponse.json(campaigns);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("SEMrush campaigns fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

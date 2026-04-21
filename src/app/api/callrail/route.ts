import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const MOCK_CALLRAIL_DATA = {
  configured: true,
  summary: {
    totalCalls: 142,
    answeredCalls: 118,
    missedCalls: 24,
    answeredPct: 83.1,
    avgDuration: "4:12",
    avgDurationSeconds: 252,
  },
  bySource: [
    { source: "Google Ads", calls: 58, pct: 40.8 },
    { source: "Organic Search", calls: 34, pct: 23.9 },
    { source: "Direct", calls: 28, pct: 19.7 },
    { source: "Social", calls: 14, pct: 9.9 },
    { source: "Other", calls: 8, pct: 5.6 },
  ],
  calls: [
    { id: "c1", callerNumber: "+44 7700 900123", source: "Google Ads", duration: "6:24", answered: true, date: "2025-01-20T10:30:00Z" },
    { id: "c2", callerNumber: "+44 7700 900456", source: "Organic", duration: "2:15", answered: true, date: "2025-01-20T11:15:00Z" },
    { id: "c3", callerNumber: "+44 7700 900789", source: "Direct", duration: "0:00", answered: false, date: "2025-01-20T14:22:00Z" },
    { id: "c4", callerNumber: "+44 7700 900321", source: "Google Ads", duration: "8:42", answered: true, date: "2025-01-21T09:45:00Z" },
    { id: "c5", callerNumber: "+44 7700 900654", source: "Social", duration: "3:58", answered: true, date: "2025-01-21T16:10:00Z" },
  ],
  keywords: [
    { keyword: "plumber near me", count: 18 },
    { keyword: "emergency plumbing", count: 12 },
    { keyword: "boiler repair", count: 7 },
  ],
  utmSources: [
    { utmSource: "google", count: 58 },
    { utmSource: "facebook", count: 14 },
    { utmSource: "bing", count: 8 },
  ],
  hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    calls: h >= 8 && h <= 18 ? Math.round(8 + Math.random() * 10) : Math.round(Math.random() * 3),
  })),
  callerBreakdown: {
    firstTime: 98,
    repeat: 44,
    uniqueCallers: 98,
  },
};

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { callrailAccountId: true, callrailApiKey: true },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.callrailAccountId || !client.callrailApiKey) {
      return NextResponse.json({ configured: false });
    }

    if (client.callrailAccountId === "demo") {
      return NextResponse.json(MOCK_CALLRAIL_DATA);
    }

    const cacheKey = `callrail:${clientId}:${startDate ?? "default"}:${endDate ?? "default"}`;
    const data = await withApiCache(cacheKey, 4, async () => {

    // Build date range filter if provided
    const dateParams = new URLSearchParams();
    if (startDate) dateParams.set("start_date", startDate);
    if (endDate) dateParams.set("end_date", endDate);
    const dateQueryString = dateParams.toString() ? `&${dateParams.toString()}` : "";

    // Fetch summary with source breakdown
    const summaryRes = await fetch(
      `https://api.callrail.com/v3/a/${client.callrailAccountId}/calls/summary.json?group_by=source_name${dateQueryString}`,
      {
        headers: {
          Authorization: `Token token="${client.callrailApiKey}"`,
          "Content-Type": "application/json",
        },
      }
    );

    // Fetch recent calls (up to 250 to aggregate source data accurately)
    const callsUrl = `https://api.callrail.com/v3/a/${client.callrailAccountId}/calls.json?fields=answered,duration,source,caller_number,start_time,keywords,utm_source,utm_medium,utm_campaign,utm_term&per_page=250${dateQueryString}`;
    const callsRes = await fetch(callsUrl, {
      headers: {
        Authorization: `Token token="${client.callrailApiKey}"`,
        "Content-Type": "application/json",
      },
    });

    if (!callsRes.ok) {
      return NextResponse.json({ configured: true, error: "CallRail API error" }, { status: 502 });
    }

    const callsData = await callsRes.json() as {
      calls: Array<{
        id: string;
        caller_number: string;
        source: string;
        duration: number;
        answered: boolean;
        start_time: string;
        keywords: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        utm_term: string | null;
      }>;
      total_records: number;
    };

    const calls = callsData.calls.map((c) => ({
      id: c.id,
      callerNumber: c.caller_number,
      source: c.source ?? "Unknown",
      duration: c.duration,
      durationFormatted: `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}`,
      answered: c.answered,
      date: c.start_time,
    }));

    const answeredCalls = calls.filter((c) => c.answered).length;
    const totalDuration = callsData.calls.reduce((s, c) => s + (c.duration ?? 0), 0);
    const avgDurationSeconds = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    // Build source breakdown from summary API if available, otherwise aggregate from calls
    let bySource: Array<{ source: string; calls: number; pct: number }> = [];

    if (summaryRes.ok) {
      try {
        const summaryData = await summaryRes.json() as {
          data?: Array<{ source_name?: string; total_calls?: number }>;
        };
        const totalFromSummary = (summaryData.data ?? []).reduce((s, r) => s + (r.total_calls ?? 0), 0);
        bySource = (summaryData.data ?? [])
          .filter((r) => r.total_calls && r.total_calls > 0)
          .map((r) => ({
            source: r.source_name ?? "Unknown",
            calls: r.total_calls ?? 0,
            pct: totalFromSummary > 0 ? Math.round(((r.total_calls ?? 0) / totalFromSummary) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.calls - a.calls);
      } catch { /* fall through to aggregate from calls */ }
    }

    // Fallback: aggregate source breakdown from fetched calls
    if (bySource.length === 0 && calls.length > 0) {
      const sourceMap = new Map<string, number>();
      for (const call of calls) {
        const src = call.source || "Unknown";
        sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
      }
      const total = calls.length;
      bySource = [...sourceMap.entries()]
        .map(([source, count]) => ({
          source,
          calls: count,
          pct: Math.round((count / total) * 1000) / 10,
        }))
        .sort((a, b) => b.calls - a.calls);
    }

    // ── Keyword / UTM attribution ──────────────────────────────────────────
    const keywordMap = new Map<string, number>();
    const utmSourceMap = new Map<string, number>();
    for (const call of callsData.calls) {
      if (call.keywords) keywordMap.set(call.keywords, (keywordMap.get(call.keywords) ?? 0) + 1);
      if (call.utm_source) utmSourceMap.set(call.utm_source, (utmSourceMap.get(call.utm_source) ?? 0) + 1);
    }
    const keywords = [...keywordMap.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
    const utmSources = [...utmSourceMap.entries()]
      .map(([utmSource, count]) => ({ utmSource, count }))
      .sort((a, b) => b.count - a.count);

    // ── Hourly distribution ─────────────────────────────────────────────
    const hourly = new Array<number>(24).fill(0);
    for (const call of callsData.calls) {
      const hour = new Date(call.start_time).getHours();
      hourly[hour]++;
    }
    const hourlyDistribution = hourly.map((count, hour) => ({ hour, calls: count }));

    // ── First-time vs repeat callers ────────────────────────────────────
    const callerNumbers = callsData.calls.map((c) => c.caller_number);
    const uniqueCallers = new Set(callerNumbers).size;
    const callerBreakdown = {
      firstTime: uniqueCallers,
      repeat: callsData.calls.length - uniqueCallers,
      uniqueCallers,
    };

      return {
        configured: true,
        summary: {
          totalCalls: callsData.total_records,
          answeredCalls,
          missedCalls: calls.length - answeredCalls,
          answeredPct: calls.length ? Math.round((answeredCalls / calls.length) * 1000) / 10 : 0,
          avgDuration: `${Math.floor(avgDurationSeconds / 60)}:${String(avgDurationSeconds % 60).padStart(2, "0")}`,
          avgDurationSeconds,
        },
        bySource,
        calls: calls.slice(0, 25),
        keywords,
        utmSources,
        hourlyDistribution,
        callerBreakdown,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("CallRail error:", error);
    return NextResponse.json({ error: "Failed to fetch CallRail data" }, { status: 500 });
  }
  });
}

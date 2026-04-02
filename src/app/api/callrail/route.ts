import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
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

    // Real CallRail API call
    const res = await fetch(
      `https://api.callrail.com/v3/a/${client.callrailAccountId}/calls.json?fields=answered,duration,source,caller_number,start_time&per_page=25`,
      {
        headers: {
          Authorization: `Token token="${client.callrailApiKey}"`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ configured: true, error: "CallRail API error" }, { status: 502 });
    }

    const data = await res.json() as {
      calls: Array<{
        id: string;
        caller_number: string;
        source: string;
        duration: number;
        answered: boolean;
        start_time: string;
      }>;
      total_records: number;
    };

    const calls = data.calls.map((c) => ({
      id: c.id,
      callerNumber: c.caller_number,
      source: c.source,
      duration: `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}`,
      answered: c.answered,
      date: c.start_time,
    }));

    const answeredCalls = calls.filter((c) => c.answered).length;
    return NextResponse.json({
      configured: true,
      summary: {
        totalCalls: data.total_records,
        answeredCalls,
        missedCalls: calls.length - answeredCalls,
        answeredPct: calls.length ? Math.round((answeredCalls / calls.length) * 100 * 10) / 10 : 0,
      },
      bySource: [],
      calls,
    });
  } catch (error) {
    console.error("CallRail error:", error);
    return NextResponse.json({ error: "Failed to fetch CallRail data" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const snapshots = await prisma.competitorSnapshot.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    // Return latest snapshot per domain
    const byDomain = new Map<string, (typeof snapshots)[0]>();
    for (const snap of snapshots) {
      if (!byDomain.has(snap.domain)) byDomain.set(snap.domain, snap);
    }

    return NextResponse.json(Array.from(byDomain.values()));
  } catch (error) {
    console.error("Competitor intelligence GET error:", error);
    return NextResponse.json({ error: "Failed to get competitor data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json() as {
      clientId: string;
      domain: string;
      periodStart: string;
      periodEnd: string;
    };

    if (!data.clientId || !data.domain || !data.periodStart || !data.periodEnd) {
      return NextResponse.json({ error: "clientId, domain, periodStart, periodEnd are required" }, { status: 400 });
    }

    let metrics: Record<string, unknown> = {};
    let insights: string | null = null;

    if (process.env.SEMRUSH_API_KEY) {
      try {
        const { getDomainOverview } = await import("@/lib/semrush");
        const overview = await getDomainOverview(data.domain, "uk");
        metrics = overview as unknown as Record<string, unknown>;
      } catch (err) {
        console.warn("SemRush fetch failed, storing empty metrics:", err);
      }
    }

    // Generate AI insights if OpenAI configured
    if (process.env.OPENAI_API_KEY && Object.keys(metrics).length > 0) {
      try {
        const OpenAI = (await import("openai")).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Analyse these SEO metrics for competitor domain "${data.domain}" and provide 2-3 sentence insights about their organic search performance:\n${JSON.stringify(metrics, null, 2)}`,
            },
          ],
          max_tokens: 200,
        });
        insights = completion.choices[0]?.message?.content ?? null;
      } catch (err) {
        console.warn("OpenAI insights failed:", err);
      }
    }

    const snapshot = await prisma.competitorSnapshot.create({
      data: {
        clientId: data.clientId,
        domain: data.domain,
        metrics: JSON.stringify(metrics),
        insights,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Competitor intelligence POST error:", error);
    return NextResponse.json({ error: "Failed to create competitor snapshot" }, { status: 500 });
  }
}

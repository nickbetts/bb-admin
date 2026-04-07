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

    // Fetch client name and their own SEO domain for comparison context
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { name: true, semrushDomain: true },
    });

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

    // Generate AI insights if we have metric data
    if (Object.keys(metrics).length > 0) {
      try {
        // Fetch all competitor snapshots for cross-competitor comparison
        const allCompetitorSnapshots = await prisma.competitorSnapshot.findMany({
          where: { clientId: data.clientId },
          orderBy: { createdAt: "desc" },
        });
        const latestByDomain = new Map<string, (typeof allCompetitorSnapshots)[0]>();
        for (const snap of allCompetitorSnapshots) {
          if (!latestByDomain.has(snap.domain)) latestByDomain.set(snap.domain, snap);
        }
        const otherCompetitors = [...latestByDomain.values()]
          .filter(s => s.domain !== data.domain && s.metrics)
          .map(s => {
            try {
              const m = JSON.parse(s.metrics) as Record<string, unknown>;
              return `• ${s.domain}: organic traffic ${m.organicTraffic?.toLocaleString() ?? "n/a"}, keywords ${m.organicKeywords?.toLocaleString() ?? "n/a"}, traffic value £${typeof m.organicCost === "number" ? m.organicCost.toLocaleString() : "n/a"}`;
            } catch { return null; }
          })
          .filter(Boolean)
          .slice(0, 5);

        const { getOpenAiClient } = await import("@/lib/openai-client");
        const openai = await getOpenAiClient();
        const clientContext = client ? `Client: ${client.name}${client.semrushDomain ? ` (domain: ${client.semrushDomain})` : ""}` : "";
        const competitorContext = otherCompetitors.length > 0
          ? `\n\nOther tracked competitors for context:\n${otherCompetitors.join("\n")}`
          : "";

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a senior SEO and competitive intelligence analyst at a UK digital marketing agency. Write in British English. Be specific and actionable — cite actual numbers from the data.",
            },
            {
              role: "user",
              content: `${clientContext}\nAnalyse these SEO metrics for competitor domain "${data.domain}" and provide specific insights about their organic search performance, what they're likely doing well, what threatens ${client?.name ?? "the client"}, and one concrete action ${client?.name ?? "the client"} should take in response.${competitorContext}\n\nCompetitor data for ${data.domain}:\n${JSON.stringify(metrics, null, 2)}`,
            },
          ],
          max_tokens: 600,
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

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateContentStrategy,
  detectCompetitors,
  estimateApiUnits,
  type StrategyModel,
} from "@/lib/content-strategy-generator";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientId, brief, period, database, action, model } = body as {
      clientId: string;
      brief?: string;
      period?: string;
      database?: string;
      action?: string;
      model?: StrategyModel;
    };

    if (!clientId) {
      return NextResponse.json(
        { error: "Client is required" },
        { status: 400 },
      );
    }

    // Look up client to get domain
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        semrushDomain: true,
        searchConsoleSiteUrl: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.semrushDomain) {
      return NextResponse.json(
        {
          error:
            "This client has no SEMrush domain configured. Please set it in client settings first.",
        },
        { status: 400 },
      );
    }

    const domain = client.semrushDomain;
    const db = database || "uk";

    // ── Action: detect competitors ────────────────────────────────────────
    if (action === "detect-competitors") {
      const competitors = await detectCompetitors(domain, db);
      return NextResponse.json({ competitors });
    }

    // ── Action: estimate cost ─────────────────────────────────────────────
    if (action === "estimate-cost") {
      const competitors = body.competitors as string[] | undefined;
      const estimate = estimateApiUnits(
        Array.isArray(competitors) && competitors.length > 0,
        !!client.searchConsoleSiteUrl,
      );
      return NextResponse.json(estimate);
    }

    // ── Default action: generate strategy ─────────────────────────────────
    const competitors = (body.competitors as string[] | undefined) || [];
    const finalPeriod =
      period ||
      new Date().toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });

    const { data, autoCompetitors } = await generateContentStrategy(
      domain,
      client.name,
      brief || "",
      competitors,
      db,
      client.searchConsoleSiteUrl,
      model === "claude-opus-4-5" ? "claude-opus-4-5" : "gpt-4o",
    );

    data.clientName = client.name;
    data.period = finalPeriod;

    return NextResponse.json({
      strategyData: data,
      competitors: autoCompetitors,
      domain,
      clientName: client.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy generation error:", error);

    // Handle SEMrush quota errors
    if (message.includes("BALANCE IS ZERO") || message.includes("ERROR 132")) {
      return NextResponse.json(
        { error: "SEMrush API quota exhausted. Please try again later." },
        { status: 402 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

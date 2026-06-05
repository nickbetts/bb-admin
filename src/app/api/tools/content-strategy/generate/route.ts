import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateContentStrategy,
  detectCompetitors,
  validateCompetitor,
  estimateApiUnits,
  type StrategyModel,
  type ContentStrategyLimits,
  type CompetitorPageContext,
} from "@/lib/content-strategy-generator";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientId, brief, period, database, action, model, limits } = body as {
      clientId: string;
      brief?: string;
      period?: string;
      database?: string;
      action?: string;
      model?: StrategyModel;
      limits?: ContentStrategyLimits;
    };

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    // Look up client to get domain
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        website: true,
        searchConsoleSiteUrl: true,
        contentStrategyLimits: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.website) {
      return NextResponse.json(
        {
          error:
            "This client has no SEO domain configured. Please set it in client settings first.",
        },
        { status: 400 },
      );
    }

    const domain = client.website;
    const db = database || "uk";

    // ── Action: detect competitors ────────────────────────────────────────
    if (action === "detect-competitors") {
      const competitors = await detectCompetitors(domain, db);
      return NextResponse.json({ competitors });
    }

    // ── Action: validate a manually-added competitor ──────────────────────
    if (action === "validate-competitor") {
      const competitor = (body.competitor as string | undefined)
        ?.trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "");
      if (!competitor) {
        return NextResponse.json({ error: "competitor is required" }, { status: 400 });
      }
      const result = await validateCompetitor(domain, competitor, db);
      return NextResponse.json(result);
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
    const competitorContexts =
      (body.competitorContexts as
        | { domain: string; pageContext: CompetitorPageContext }[]
        | undefined) || [];
    const finalPeriod =
      period ||
      new Date().toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });

    // Merge: use request-supplied limits if provided, else fall back to saved client limits
    const savedLimits: ContentStrategyLimits = client.contentStrategyLimits
      ? JSON.parse(client.contentStrategyLimits)
      : {};
    const activeLimits: ContentStrategyLimits = limits ?? savedLimits;

    // Persist limits back to the client so they're reused next time
    if (limits) {
      await prisma.client.update({
        where: { id: clientId },
        data: { contentStrategyLimits: JSON.stringify(limits) },
      });
    }

    const genStart = Date.now();
    const { data, autoCompetitors } = await generateContentStrategy(
      domain,
      client.name,
      brief || "",
      competitors,
      db,
      client.searchConsoleSiteUrl,
      model === "claude-opus-4-6" ? "claude-opus-4-6" : "gpt-5.4",
      activeLimits,
      competitorContexts.length > 0 ? competitorContexts : undefined,
    );
    const generationMs = Date.now() - genStart;

    data.clientName = client.name;
    data.period = finalPeriod;

    return NextResponse.json({
      strategyData: data,
      competitors: autoCompetitors,
      domain,
      clientName: client.name,
      generationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy generation error:", error);

    // Handle SEO quota errors
    if (message.includes("BALANCE IS ZERO") || message.includes("ERROR 132")) {
      return NextResponse.json(
        { error: "Keyword data API quota exhausted. Please try again later." },
        { status: 402 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

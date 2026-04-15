import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type StrategyModel,
  type ContentStrategyLimits,
  type CompetitorPageContext,
} from "@/lib/content-strategy-generator";

// This handler just creates the stub record and hands off to run-generation.
// It only needs a short timeout — run-generation gets its own 300s budget.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      clientId,
      brief,
      period,
      database,
      model,
      limits,
      competitors,
      competitorContexts,
    } = body as {
      clientId: string;
      brief?: string;
      period?: string;
      database?: string;
      model?: StrategyModel;
      limits?: ContentStrategyLimits;
      competitors?: string[];
      competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[];
    };

    if (!clientId)
      return NextResponse.json({ error: "Client is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        semrushDomain: true,
        searchConsoleSiteUrl: true,
        contentStrategyLimits: true,
      },
    });

    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.semrushDomain)
      return NextResponse.json(
        { error: "This client has no SEMrush domain configured. Please set it in client settings first." },
        { status: 400 },
      );

    const db = database || "uk";
    const finalPeriod =
      period ||
      new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const title = `${client.name} Content Strategy (${finalPeriod})`;

    // Merge and persist output limits
    const savedLimits: ContentStrategyLimits = client.contentStrategyLimits
      ? JSON.parse(client.contentStrategyLimits)
      : {};
    const activeLimits: ContentStrategyLimits = limits ?? savedLimits;

    if (limits) {
      await prisma.client.update({
        where: { id: clientId },
        data: { contentStrategyLimits: JSON.stringify(limits) },
      });
    }

    // Create a stub record immediately — it appears in the table straight away
    const record = await prisma.contentStrategy.create({
      data: {
        clientId,
        title,
        period: finalPeriod,
        createdBy: session.user.name,
        spreadsheetData: "{}",
        generatedHtml: "",
        generationStatus: "generating",
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET ?? "";

    // Use after() to fire the run-generation request AFTER the response is sent.
    // after() keeps this lambda alive just long enough to initiate the HTTP request.
    // run-generation runs in a completely separate function invocation with its own
    // 300-second timeout budget.
    after(async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/tools/content-strategy/run-generation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cronSecret}`,
            },
            body: JSON.stringify({
              recordId: record.id,
              clientId,
              brief: brief || "",
              period: finalPeriod,
              database: db,
              model,
              limits: activeLimits,
              competitors: competitors || [],
              competitorContexts: competitorContexts || [],
            }),
          },
        );
        // Discard the response body — run-generation is running independently
        await res.body?.cancel();
      } catch (err) {
        console.error("Failed to dispatch run-generation:", err);
        await prisma.contentStrategy
          .update({
            where: { id: record.id },
            data: {
              generationStatus: "failed",
              generationError: "Failed to start background generation worker.",
            },
          })
          .catch(() => {});
      }
    });

    return NextResponse.json({ id: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("start-async error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

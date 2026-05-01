import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";
import { getDomainOverview, getTopOrganicKeywords } from "@/lib/semrush";
import { detectCompetitors, validateCompetitor } from "@/lib/competitor-research";
import { generateIdeas } from "@/lib/content-generator";
import type { ContentType, CompetitorContext } from "@/lib/content-generator";

export const dynamic = "force-dynamic";

// POST /api/tools/content-generator/research
// Runs SemRush research + competitor scraping + Claude idea generation.
// Body: { id, competitors?: string[], database?: string }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      id: string;
      competitors?: string[];
      database?: string;
    };

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const record = await prisma.contentGenerator.findUnique({
      where: { id: body.id },
      include: { client: { select: { name: true, website: true, semrushDomain: true, aiReportInstructions: true } } },
    });

    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Mark as researching
    await prisma.contentGenerator.update({
      where: { id: body.id },
      data: { status: "researching", statusMessage: "Gathering keyword data…" },
    });

    const db = body.database ?? "uk";
    const rawDomain = (record.client.semrushDomain || record.client.website || record.websiteUrl || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    // ── SemRush research ────────────────────────────────────────────────────
    const [domainOverview, topKeywords] = await Promise.all([
      rawDomain
        ? withApiCache(`cg:domain-overview:${rawDomain}:${db}`, 48, () => getDomainOverview(rawDomain, db)).catch(() => null)
        : Promise.resolve(null),
      rawDomain
        ? withApiCache(`cg:top-keywords:${rawDomain}:${db}`, 48, () => getTopOrganicKeywords(rawDomain, db, 30)).catch(() => [])
        : Promise.resolve([]),
    ]);

    const semrushContext = {
      domain: rawDomain || undefined,
      organicKeywords: domainOverview?.organicKeywords,
      organicTraffic: domainOverview?.organicTraffic,
      topKeywords: (topKeywords as { keyword: string; searchVolume: number; position: number }[]).map((k) => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        position: k.position,
      })),
    };

    // ── Competitor research ─────────────────────────────────────────────────
    await prisma.contentGenerator.update({
      where: { id: body.id },
      data: { statusMessage: "Researching competitors…" },
    });

    let competitorData: CompetitorContext[] = [];

    if (rawDomain) {
      // Auto-detect via SemRush (up to 5)
      const autoDetected = await detectCompetitors(rawDomain, db).catch(() => []);
      competitorData = autoDetected.map((c) => ({
        domain: c.domain,
        commonKeywords: c.commonKeywords,
        pageContext: c.pageContext,
      }));
    }

    // Validate manually-entered competitors and merge
    if (body.competitors?.length) {
      const validated = await Promise.all(
        body.competitors.map(async (comp) => {
          const clean = comp.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
          if (!clean) return null;
          if (competitorData.some((c) => c.domain === clean)) return null; // already present
          const result = await validateCompetitor(rawDomain, clean, db).catch(() => null);
          return result
            ? { domain: clean, commonKeywords: result.commonKeywords, pageContext: result.pageContext }
            : null;
        }),
      );
      competitorData.push(...(validated.filter((c) => c !== null) as CompetitorContext[]));
    }

    const competitorsJson = JSON.stringify(competitorData);

    // ── Generate ideas ──────────────────────────────────────────────────────
    await prisma.contentGenerator.update({
      where: { id: body.id },
      data: { statusMessage: "Generating content ideas…", competitorsJson, keywordResearchJson: JSON.stringify(semrushContext) },
    });

    const contentTypes = JSON.parse(record.contentTypes) as ContentType[];

    const ideas = await generateIdeas({
      brief: record.brief,
      contentTypes,
      semrushContext,
      competitors: competitorData,
      clientName: record.client.name,
      clientWebsite: rawDomain || record.websiteUrl || undefined,
      clientInstructions: record.client.aiReportInstructions || undefined,
    });

    await prisma.contentGenerator.update({
      where: { id: body.id },
      data: {
        ideasJson: JSON.stringify(ideas),
        status: "ideas_ready",
        statusMessage: null,
      },
    });

    return NextResponse.json({ ideas, semrushContext, competitors: competitorData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator research error:", error);
    // Mark as failed so the UI doesn't hang
    try {
      const body = (await request.clone().json()) as { id?: string };
      if (body.id) {
        await prisma.contentGenerator.update({
          where: { id: body.id },
          data: { status: "failed", generationError: message, statusMessage: null },
        });
      }
    } catch { /* ignore */ }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refineLandingPage, HtmlValidationError } from "@/lib/lp-generator";
import { fetchPageSignals } from "@/lib/landing-page-analyzer";
import type { BrandContext } from "@/lib/brand-extractor";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
// Vercel Pro caps function duration at 800 s; fall back to 300 s on Hobby.
export const maxDuration = 300;

// POST /api/tools/landing-pages/[id]/refine — iterative AI refinement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await request.json() as {
      prompt: string;
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      referenceHtml?: string;
      imageUrls?: string[];
      crawlUrls?: string[];
    };

    if (!body.prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    // Scrape user-supplied reference URLs for additional context (failures silently dropped)
    let additionalContext: string | undefined;
    const crawlUrls = (body.crawlUrls ?? [])
      .filter((u) => { try { new URL(u); return true; } catch { return false; } })
      .slice(0, 3);

    if (crawlUrls.length > 0) {
      const results = await Promise.allSettled(crawlUrls.map((u) => fetchPageSignals(u)));
      const chunks: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && !r.value.fetchError) {
          const s = r.value;
          const parts: string[] = [];
          if (s.title) parts.push(`Title: ${s.title}`);
          if (s.metaDescription) parts.push(`Description: ${s.metaDescription}`);
          if (s.h1Tags.length) parts.push(`H1: ${s.h1Tags.join(" | ")}`);
          if (s.h2Texts.length) parts.push(`Headings: ${s.h2Texts.join(" | ")}`);
          if (s.bodySnippets.length) parts.push(s.bodySnippets.join(" "));
          if (parts.length) chunks.push(`[${s.url}]\n${parts.join("\n")}`);
        }
      }
      if (chunks.length) additionalContext = chunks.join("\n\n").slice(0, 4000);
    }

    // Call AI to refine the LP
    const html = await refineLandingPage({
      currentHtml: landingPage.currentHtml,
      prompt: body.prompt,
      brandContext,
      conversationHistory: body.conversationHistory,
      referenceHtml: body.referenceHtml,
      imageUrls: body.imageUrls,
      additionalContext,
    });

    // Determine next version number
    const latestVersion = landingPage.versions[0];
    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    // Save new version + update current HTML
    const [version] = await prisma.$transaction([
      prisma.landingPageVersion.create({
        data: {
          landingPageId: id,
          versionNumber: nextVersionNumber,
          html,
          prompt: body.prompt,
          createdByUserId: session.user.id,
          createdByEmail: session.user.email,
        },
      }),
      prisma.landingPage.update({
        where: { id },
        data: { currentHtml: html },
      }),
    ]);

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "landing_page_refined",
      resourceType: "LandingPage",
      resourceId: id,
      description: `Refined landing page v${version.versionNumber}: ${body.prompt.slice(0, 100)}`,
    });

    return NextResponse.json({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        prompt: version.prompt,
        createdAt: version.createdAt,
      },
      html,
    });
  } catch (error) {
    if (error instanceof HtmlValidationError) {
      console.warn("LP refine validation:", error.message);
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

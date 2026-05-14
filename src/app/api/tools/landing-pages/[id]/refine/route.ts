import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refineLandingPage, HtmlValidationError } from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
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

    // Scrape user-supplied reference URLs using the same full pipeline as LP generation
    let additionalContext: string | undefined;
    const crawlWarnings: string[] = [];
    const crawlUrls = (body.crawlUrls ?? [])
      .filter((u) => { try { new URL(u); return true; } catch { return false; } })
      .slice(0, 3);

    if (crawlUrls.length > 0) {
      const results = await Promise.allSettled(crawlUrls.map((u) => extractPageContentFromUrl(u)));
      const chunks: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const url = crawlUrls[i];
        if (r.status === "fulfilled" && r.value) {
          const pc = r.value;
          const parts: string[] = [`### ${pc.sourceUrl}`];
          if (pc.metaTitle) parts.push(`Title: ${pc.metaTitle}`);
          if (pc.h1) parts.push(`H1: ${pc.h1}`);
          if (pc.headings.length) parts.push(`Headings: ${pc.headings.slice(0, 60).join(" | ")}`);
          if (pc.ctaTexts.length) parts.push(`CTAs: ${pc.ctaTexts.join(" | ")}`);
          if (pc.listItems?.length) parts.push(`List items:\n${pc.listItems.slice(0, 300).map((item) => `  • ${item}`).join("\n")}`);
          if (pc.numericStats?.length) parts.push(`Stats: ${pc.numericStats.slice(0, 60).join(" | ")}`);
          if (pc.bodyCopy.length) parts.push(`Body copy:\n${pc.bodyCopy.slice(0, 40).map((p) => `  "${p}"`).join("\n")}`);
          if (pc.allBodyText) parts.push(`Full page text:\n${pc.allBodyText.slice(0, 40000)}`);
          if (pc.imageryUrls.length) parts.push(`Images: ${pc.imageryUrls.slice(0, 30).join(", ")}`);
          chunks.push(parts.join("\n"));
        } else {
          crawlWarnings.push(`Could not scrape ${url} — changes applied without this reference`);
        }
      }
      if (chunks.length) additionalContext = chunks.join("\n\n---\n\n");
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
      crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
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

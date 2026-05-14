import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatAboutLandingPage } from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext } from "@/lib/brand-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/tools/landing-pages/[id]/chat — conversational discussion (no HTML generation)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true, currentHtml: true, brandContextJson: true },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await request.json() as {
      message: string;
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      referenceHtml?: string;
      imageUrls?: string[];
      crawlUrls?: string[];
    };

    if (!body.message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
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
          crawlWarnings.push(`Could not scrape ${url}`);
        }
      }
      if (chunks.length) additionalContext = chunks.join("\n\n---\n\n");
    }

    const result = await chatAboutLandingPage({
      currentHtml: landingPage.currentHtml,
      message: body.message,
      brandContext,
      conversationHistory: body.conversationHistory,
      referenceHtml: body.referenceHtml,
      imageUrls: body.imageUrls,
      additionalContext,
    });

    return NextResponse.json({ ...result, crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP chat error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

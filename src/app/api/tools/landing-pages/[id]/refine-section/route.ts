import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refineSectionHtml, HtmlValidationError } from "@/lib/lp-generator";
import { fetchPageSignals } from "@/lib/landing-page-analyzer";
import type { BrandContext } from "@/lib/brand-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/tools/landing-pages/[id]/refine-section
// Refines a single section with Opus, returning just the updated section HTML.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, userId: true, brandContextJson: true },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (landingPage.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      sectionHtml: string;
      prompt: string;
      pageContext: string;
      imageUrls?: string[];
      crawlUrls?: string[];
    };

    if (!body.sectionHtml || !body.prompt) {
      return NextResponse.json({ error: "sectionHtml and prompt are required" }, { status: 400 });
    }

    // Crawl user-supplied URLs for additional context (failures are silently dropped)
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
      if (chunks.length) {
        additionalContext = chunks.join("\n\n").slice(0, 4000);
      }
    }

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    const html = await refineSectionHtml({
      sectionHtml: body.sectionHtml,
      prompt: body.prompt,
      pageContext: body.pageContext ?? "",
      brandContext,
      imageUrls: body.imageUrls?.length ? body.imageUrls : undefined,
      additionalContext,
    });

    return NextResponse.json({ html });
  } catch (error) {
    if (error instanceof HtmlValidationError) {
      console.warn("LP section refine validation:", error.message);
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP section refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

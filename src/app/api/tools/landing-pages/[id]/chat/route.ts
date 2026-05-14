import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatAboutLandingPage } from "@/lib/lp-generator";
import { fetchReferenceContent } from "@/lib/landing-page-analyzer";
import type { BrandContext } from "@/lib/brand-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    // Scrape user-supplied reference URLs for additional context
    let additionalContext: string | undefined;
    const crawlWarnings: string[] = [];
    const crawlUrls = (body.crawlUrls ?? [])
      .filter((u) => { try { new URL(u); return true; } catch { return false; } })
      .slice(0, 3);

    if (crawlUrls.length > 0) {
      const results = await Promise.allSettled(crawlUrls.map((u) => fetchReferenceContent(u)));
      const chunks: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          if (r.value.fetchError) {
            crawlWarnings.push(`Could not scrape ${r.value.url}: ${r.value.fetchError}`);
          } else {
            const label = r.value.title ? `[${r.value.url} — ${r.value.title}]` : `[${r.value.url}]`;
            chunks.push(`${label}\n${r.value.text}`);
          }
        } else {
          crawlWarnings.push(`Failed to scrape a reference URL`);
        }
      }
      if (chunks.length) additionalContext = chunks.join("\n\n---\n\n").slice(0, 12000);
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

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamRefineLandingPage, extractAndValidateHtml, HtmlValidationError } from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext } from "@/lib/brand-extractor";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
// Streaming SSE response keeps the connection alive while the model generates.
// Vercel Pro allows up to 800 s; set to 800 to accommodate very large pages.
export const maxDuration = 800;

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
          if (pc.allBodyText) parts.push(`Full page text:\n${pc.allBodyText.slice(0, 80000)}`);
          if (pc.imageryUrls.length) parts.push(`Images: ${pc.imageryUrls.slice(0, 30).join(", ")}`);
          chunks.push(parts.join("\n"));
        } else {
          crawlWarnings.push(`Could not scrape ${url} — changes applied without this reference`);
        }
      }
      if (chunks.length) additionalContext = chunks.join("\n\n---\n\n");
    }

    const anthropicStream = await streamRefineLandingPage({
      currentHtml: landingPage.currentHtml,
      prompt: body.prompt,
      brandContext,
      conversationHistory: body.conversationHistory,
      referenceHtml: body.referenceHtml,
      imageUrls: body.imageUrls,
      additionalContext,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
              );
            }
          }

          // Validate the assembled HTML
          let html: string;
          try {
            html = extractAndValidateHtml(fullText);
          } catch (err) {
            const msg = err instanceof HtmlValidationError
              ? err.message
              : "The model returned an incomplete response. Please try again.";
            console.warn("LP refine validation:", msg);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: msg, status: 422 })}\n\n`),
            );
            controller.close();
            return;
          }

          // Compute next version number atomically inside the transaction to
          // avoid races when two refine requests run in parallel.
          const agg = await prisma.landingPageVersion.aggregate({
            where: { landingPageId: id },
            _max: { versionNumber: true },
          });
          const nextVersionNumber = (agg._max.versionNumber ?? 0) + 1;

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

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                html,
                version: {
                  id: version.id,
                  versionNumber: version.versionNumber,
                  prompt: version.prompt,
                  createdAt: version.createdAt,
                },
                crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("LP refine streaming error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

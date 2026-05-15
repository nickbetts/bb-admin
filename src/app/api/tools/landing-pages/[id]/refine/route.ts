import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  streamRefineLandingPage,
  refineLandingPage,
  extractAndValidateHtml,
  HtmlValidationError,
  findMissingImportedImageUrls,
  auditReferenceAlignmentAfterRefine,
  buildSecondPassRefinePrompt,
} from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext } from "@/lib/brand-extractor";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
// Streaming SSE response keeps the connection alive while the model generates.
// Vercel Pro allows up to 800 s; set to 800 to accommodate very large pages.
export const maxDuration = 800;

const SINGLE_PASS_URL_LIMIT = 3;
const DOUBLE_PASS_URL_LIMIT = 10;
const SINGLE_PASS_TOTAL_CONTEXT_BUDGET = 60_000;
const DOUBLE_PASS_TOTAL_CONTEXT_BUDGET = 95_000;
const SINGLE_PASS_PER_URL_BUDGET = 22_000;
const DOUBLE_PASS_PER_URL_BUDGET = 14_000;

type RefinementMode = "single-pass" | "double-pass";

type ReferencePageDigest = {
  sourceUrl: string;
  metaTitle?: string;
  h1?: string;
  headings: string[];
  ctaTexts: string[];
  listItems: string[];
  numericStats: string[];
  bodyCopy: string[];
  allBodyText: string;
  imageryUrls: string[];
};

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

function buildReferenceDigest(
  pages: ReferencePageDigest[],
  opts: { perUrlBudget: number; totalBudget: number },
): string {
  const chunks: string[] = [];
  let usedChars = 0;

  for (const page of pages) {
    if (usedChars >= opts.totalBudget) break;

    const parts: string[] = [`### ${page.sourceUrl}`];
    if (page.metaTitle) parts.push(`Title: ${truncate(page.metaTitle, 160)}`);
    if (page.h1) parts.push(`H1: ${truncate(page.h1, 200)}`);
    if (page.headings.length > 0) parts.push(`Headings: ${page.headings.slice(0, 40).join(" | ")}`);
    if (page.ctaTexts.length > 0) parts.push(`CTAs: ${page.ctaTexts.slice(0, 20).join(" | ")}`);
    if (page.listItems.length > 0) parts.push(`List items:\n${page.listItems.slice(0, 80).map((item) => `  • ${truncate(item, 220)}`).join("\n")}`);
    if (page.numericStats.length > 0) parts.push(`Stats: ${page.numericStats.slice(0, 40).join(" | ")}`);
    if (page.bodyCopy.length > 0) parts.push(`Body copy:\n${page.bodyCopy.slice(0, 25).map((paragraph) => `  \"${truncate(paragraph, 280)}\"`).join("\n")}`);
    if (page.allBodyText) parts.push(`Full page text:\n${truncate(page.allBodyText, 7000)}`);
    if (page.imageryUrls.length > 0) parts.push(`Images: ${page.imageryUrls.slice(0, 30).join(", ")}`);

    let chunk = parts.join("\n");
    if (chunk.length > opts.perUrlBudget) {
      chunk = truncate(chunk, opts.perUrlBudget);
    }

    const remaining = opts.totalBudget - usedChars;
    if (remaining <= 0) break;

    if (chunk.length > remaining) {
      chunks.push(truncate(chunk, remaining));
      usedChars = opts.totalBudget;
      break;
    }

    chunks.push(chunk);
    usedChars += chunk.length;
  }

  return chunks.join("\n\n---\n\n");
}

async function saveRefinedVersion(opts: {
  landingPageId: string;
  html: string;
  prompt: string;
  userId: string;
  userEmail: string;
}) {
  const agg = await prisma.landingPageVersion.aggregate({
    where: { landingPageId: opts.landingPageId },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (agg._max.versionNumber ?? 0) + 1;

  const [version] = await prisma.$transaction([
    prisma.landingPageVersion.create({
      data: {
        landingPageId: opts.landingPageId,
        versionNumber: nextVersionNumber,
        html: opts.html,
        prompt: opts.prompt,
        createdByUserId: opts.userId,
        createdByEmail: opts.userEmail,
      },
    }),
    prisma.landingPage.update({
      where: { id: opts.landingPageId },
      data: { currentHtml: opts.html },
    }),
  ]);

  return version;
}

// POST /api/tools/landing-pages/[id]/refine - iterative AI refinement
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
      refinementMode?: RefinementMode;
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

    const refinementMode: RefinementMode = body.refinementMode === "double-pass" ? "double-pass" : "single-pass";
    const crawlUrlLimit = refinementMode === "double-pass" ? DOUBLE_PASS_URL_LIMIT : SINGLE_PASS_URL_LIMIT;
    const perUrlBudget = refinementMode === "double-pass" ? DOUBLE_PASS_PER_URL_BUDGET : SINGLE_PASS_PER_URL_BUDGET;
    const totalContextBudget = refinementMode === "double-pass" ? DOUBLE_PASS_TOTAL_CONTEXT_BUDGET : SINGLE_PASS_TOTAL_CONTEXT_BUDGET;

    const crawlWarnings: string[] = [];
    const crawlUrls = [...new Set((body.crawlUrls ?? []).filter((u) => isValidHttpUrl(u)).map((u) => u.trim()))]
      .slice(0, crawlUrlLimit);
    const importedImageUrls = [...new Set((body.imageUrls ?? []).filter((u) => isValidHttpUrl(u)).map((u) => u.trim()))];

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          send({ progress: refinementMode === "double-pass" ? "Double-pass refinement enabled." : "Applying refinement..." });

          let additionalContext: string | undefined;
          if (crawlUrls.length > 0) {
            send({ progress: `Scraping ${crawlUrls.length} reference URL${crawlUrls.length === 1 ? "" : "s"}...` });

            const results = await Promise.allSettled(crawlUrls.map((url) => extractPageContentFromUrl(url)));
            const digests: ReferencePageDigest[] = [];

            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              const url = crawlUrls[i];
              if (result.status === "fulfilled" && result.value) {
                digests.push(result.value);
              } else {
                crawlWarnings.push(`Could not scrape ${url}, changes were applied without this reference.`);
              }
            }

            if (digests.length > 0) {
              additionalContext = buildReferenceDigest(digests, {
                perUrlBudget,
                totalBudget: totalContextBudget,
              });
            }
          }

          if (refinementMode === "single-pass") {
            send({ progress: "Generating updated page..." });

            const anthropicStream = await streamRefineLandingPage({
              currentHtml: landingPage.currentHtml,
              prompt: body.prompt,
              brandContext,
              conversationHistory: body.conversationHistory,
              referenceHtml: body.referenceHtml,
              imageUrls: importedImageUrls,
              additionalContext,
            });

            let fullText = "";
            for await (const event of anthropicStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                const chunk = event.delta.text;
                fullText += chunk;
                send({ content: chunk });
              }
            }

            let html: string;
            try {
              html = extractAndValidateHtml(fullText);
            } catch (err) {
              const message = err instanceof HtmlValidationError
                ? err.message
                : "The model returned an incomplete response. Please try again.";
              console.warn("LP refine validation:", message);
              send({ error: message, status: 422 });
              controller.close();
              return;
            }

            send({ progress: "Saving updated version..." });
            const version = await saveRefinedVersion({
              landingPageId: id,
              html,
              prompt: body.prompt,
              userId: session.user.id,
              userEmail: session.user.email,
            });

            logActivity({
              userId: session.user.id,
              userEmail: session.user.email,
              action: "landing_page_refined",
              resourceType: "LandingPage",
              resourceId: id,
              description: `Refined landing page v${version.versionNumber}: ${body.prompt.slice(0, 100)}`,
            });

            send({
              done: true,
              html,
              version: {
                id: version.id,
                versionNumber: version.versionNumber,
                prompt: version.prompt,
                createdAt: version.createdAt,
              },
              crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
            });

            controller.close();
            return;
          }

          send({ progress: "Pass 1 of 2: applying requested changes..." });
          const passOnePrompt = importedImageUrls.length > 0
            ? `${body.prompt}\n\nImportant: if attached/imported images are used, preserve each image URL exactly as provided in src/background URLs.`
            : body.prompt;

          const passOneHtml = await refineLandingPage({
            currentHtml: landingPage.currentHtml,
            prompt: passOnePrompt,
            brandContext,
            conversationHistory: body.conversationHistory,
            referenceHtml: body.referenceHtml,
            imageUrls: importedImageUrls,
            additionalContext,
          });

          let validatedPassOneHtml: string;
          try {
            validatedPassOneHtml = extractAndValidateHtml(passOneHtml);
          } catch (err) {
            const message = err instanceof HtmlValidationError
              ? err.message
              : "The first pass returned incomplete HTML. Please try again.";
            console.warn("LP double-pass validation (pass 1):", message);
            send({ error: message, status: 422 });
            controller.close();
            return;
          }

          send({ progress: "Audit: checking imported image URLs and reference alignment..." });
          const missingImportedImageUrls = findMissingImportedImageUrls(validatedPassOneHtml, importedImageUrls);
          const referenceFindings = await auditReferenceAlignmentAfterRefine({
            html: validatedPassOneHtml,
            userPrompt: body.prompt,
            referenceDigest: additionalContext,
            maxFindings: 8,
          });

          send({
            progress: `Pass 2 of 2: applying ${missingImportedImageUrls.length + referenceFindings.length} targeted fixes...`,
          });

          const passTwoPrompt = buildSecondPassRefinePrompt({
            originalPrompt: body.prompt,
            missingImportedImageUrls,
            referenceFindings,
          });

          const passTwoHtml = await refineLandingPage({
            currentHtml: validatedPassOneHtml,
            prompt: passTwoPrompt,
            brandContext,
            conversationHistory: body.conversationHistory,
            referenceHtml: body.referenceHtml,
            imageUrls: importedImageUrls,
            additionalContext,
          });

          let finalHtml: string;
          try {
            finalHtml = extractAndValidateHtml(passTwoHtml);
          } catch (err) {
            const message = err instanceof HtmlValidationError
              ? err.message
              : "The second pass returned incomplete HTML. Please try again.";
            console.warn("LP double-pass validation (pass 2):", message);
            send({ error: message, status: 422 });
            controller.close();
            return;
          }

          send({ progress: "Saving updated version..." });
          const version = await saveRefinedVersion({
            landingPageId: id,
            html: finalHtml,
            prompt: `${body.prompt}\n\n[Double-pass refinement]`,
            userId: session.user.id,
            userEmail: session.user.email,
          });

          logActivity({
            userId: session.user.id,
            userEmail: session.user.email,
            action: "landing_page_refined",
            resourceType: "LandingPage",
            resourceId: id,
            description: `Refined landing page v${version.versionNumber} (double-pass): ${body.prompt.slice(0, 100)}`,
          });

          send({
            done: true,
            html: finalHtml,
            version: {
              id: version.id,
              versionNumber: version.versionNumber,
              prompt: version.prompt,
              createdAt: version.createdAt,
            },
            crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
          });

          controller.close();
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("LP refine streaming error:", err);
          send({ error: message });
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

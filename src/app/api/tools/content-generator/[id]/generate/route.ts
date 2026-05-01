import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { generateContent, buildHtmlDeliverable } from "@/lib/content-generator";
import type { ContentIdea, GeneratedContent } from "@/lib/content-generator";

export const dynamic = "force-dynamic";

// POST /api/tools/content-generator/[id]/generate
// Generates full copy for all selected ideas. Max 3 concurrent Claude calls.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const record = await prisma.contentGenerator.findUnique({
      where: { id },
      include: { client: { select: { name: true, aiReportInstructions: true } } },
    });

    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Use selectedIdeasJson if saved, otherwise fall back to ideasJson (all ideas marked selected)
    const rawIdeas = record.selectedIdeasJson || record.ideasJson;
    if (!rawIdeas) return NextResponse.json({ error: "No ideas to generate — run research first" }, { status: 400 });

    const allIdeas = JSON.parse(rawIdeas) as ContentIdea[];
    const selectedIdeas = allIdeas.filter((i) => i.selected);

    if (!selectedIdeas.length) return NextResponse.json({ error: "No ideas selected" }, { status: 400 });

    // Mark generating
    await prisma.contentGenerator.update({
      where: { id },
      data: { status: "generating", statusMessage: `Generating ${selectedIdeas.length} piece${selectedIdeas.length !== 1 ? "s" : ""}…` },
    });

    const clientInstructions = record.client.aiReportInstructions ?? "";

    // Generate with max concurrency of 3
    const results: GeneratedContent[] = [];
    const chunks: ContentIdea[][] = [];
    for (let i = 0; i < selectedIdeas.length; i += 3) {
      chunks.push(selectedIdeas.slice(i, i + 3));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((idea) => generateContent(idea, clientInstructions)),
      );
      results.push(...chunkResults);

      // Update progress after each chunk
      await prisma.contentGenerator.update({
        where: { id },
        data: { statusMessage: `Generated ${results.length} of ${selectedIdeas.length}…` },
      });
    }

    // Build HTML deliverable and upload to Vercel Blob
    const generatedHtml = buildHtmlDeliverable({
      items: results,
      clientName: record.client.name,
      brief: record.brief,
    });

    const htmlBlob = await put(
      `content-generator/${id}/deliverable.html`,
      Buffer.from(generatedHtml, "utf-8"),
      { access: "public", contentType: "text/html", addRandomSuffix: false },
    );

    await prisma.contentGenerator.update({
      where: { id },
      data: {
        generatedContentJson: JSON.stringify(results),
        generatedHtmlUrl: htmlBlob.url,
        generatedHtml: null,
        status: "complete",
        statusMessage: null,
        generationError: null,
      },
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator generate error:", error);
    await prisma.contentGenerator.update({
      where: { id },
      data: { status: "failed", generationError: message, statusMessage: null },
    }).catch(() => { /* ignore */ });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

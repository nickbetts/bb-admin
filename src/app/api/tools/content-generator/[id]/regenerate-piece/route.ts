import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { generateContent, buildHtmlDeliverable } from "@/lib/content-generator";
import type { ContentIdea, GeneratedContent } from "@/lib/content-generator";

export const dynamic = "force-dynamic";

// POST /api/tools/content-generator/[id]/regenerate-piece
// Regenerates a single content piece by ideaId.
// Body: { ideaId: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = (await request.json()) as { ideaId: string };
    if (!body.ideaId) return NextResponse.json({ error: "ideaId is required" }, { status: 400 });

    const record = await prisma.contentGenerator.findUnique({
      where: { id },
      include: { client: { select: { name: true, aiReportInstructions: true } } },
    });

    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!record.generatedContentJson) return NextResponse.json({ error: "No generated content — run generation first" }, { status: 400 });

    // Find the idea
    const rawIdeas = record.selectedIdeasJson || record.ideasJson;
    if (!rawIdeas) return NextResponse.json({ error: "No ideas found" }, { status: 400 });

    const allIdeas = JSON.parse(rawIdeas) as ContentIdea[];
    const idea = allIdeas.find((i) => i.id === body.ideaId);
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });

    const clientInstructions = record.client.aiReportInstructions ?? "";

    // Regenerate the single piece
    const newPiece = await generateContent(idea, clientInstructions);

    // Replace the old piece in generatedContentJson
    const existing = JSON.parse(record.generatedContentJson) as GeneratedContent[];
    const updated = existing.map((p) => (p.ideaId === body.ideaId ? newPiece : p));
    // If this idea wasn't in the list before, append it
    if (!existing.some((p) => p.ideaId === body.ideaId)) {
      updated.push(newPiece);
    }

    // Rebuild and upload HTML deliverable
    const generatedHtml = buildHtmlDeliverable({
      items: updated,
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
        generatedContentJson: JSON.stringify(updated),
        generatedHtmlUrl: htmlBlob.url,
        generatedHtml: null,
      },
    });

    return NextResponse.json({ piece: newPiece, htmlUrl: htmlBlob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content generator regenerate-piece error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { strategyId, itemType, title, url, keywords, currentNotes, cluster } = await request.json();

    if (!strategyId || !itemType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get client name from the strategy record
    const strategy = await prisma.contentStrategy.findUnique({
      where: { id: strategyId },
      select: { title: true, client: { select: { name: true, aiReportInstructions: true } } },
    });
    if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

    const clientName =
      strategy.client?.name ||
      strategy.title?.replace(/\s*Content Strategy.*$/i, "").trim() ||
      "the client";

    const openai = await getOpenAiClient();

    const keywordList = (Array.isArray(keywords) ? keywords : []).slice(0, 5).join(", ");
    const clusterNote = cluster ? ` (part of the "${cluster}" content cluster)` : "";
    const extraInstructions = strategy.client?.aiReportInstructions ?? "";

    let itemDesc: string;
    let userPrompt: string;

    if (itemType === "page-opt") {
      itemDesc = `page optimisation for ${url || "an existing page"}`;
      userPrompt = `Write a replacement recommendation for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious recommendation: "${currentNotes || "none"}"\n\nProvide a clearly different angle or specific action. One paragraph, 2–3 sentences.`;
    } else if (itemType === "landing") {
      itemDesc = `proposed landing page: "${title}"`;
      userPrompt = `Write a replacement description for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious description: "${currentNotes || "none"}"\n\nProvide a clearly different angle or value proposition. One paragraph, 2–3 sentences.`;
    } else if (itemType === "blog") {
      itemDesc = `blog post titled "${title}"${clusterNote}`;
      userPrompt = `Write a replacement description for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious description: "${currentNotes || "none"}"\n\nProvide a clearly different angle or approach. One paragraph, 2–3 sentences.`;
    } else if (itemType === "quick-win") {
      itemDesc = `quick win page optimisation for ${url || "an existing page"}`;
      userPrompt = `Write a replacement recommendation for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious recommendation: "${currentNotes || "none"}"\n\nProvide a clearly different quick-win action. One paragraph, 2–3 sentences.`;
    } else {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    const systemPrompt = `You are an expert SEO content strategist at a UK digital marketing agency. Write in British English. You are creating a replacement suggestion for a content strategy document for ${clientName}. Write from the agency's perspective, as if speaking to the client: "we will do this for you", not "you should do this". Be specific, confident, and action-oriented.${extraInstructions ? `\n\nAdditional context: ${extraInstructions}` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 250,
    });

    const notes = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy regen error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

  try {
    const { strategyId, action, itemType, title, url, keywords, currentNotes, cluster, existing } = await request.json();

    if (!strategyId || !itemType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get client name and stored keyword data from the strategy record
    const strategy = await prisma.contentStrategy.findUnique({
      where: { id: strategyId },
      select: { title: true, spreadsheetData: true, client: { select: { name: true, aiReportInstructions: true } } },
    });
    if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

    // Parse stored keyword data for richer AI context
    type SdItem = { url?: string; title?: string; keywords?: Array<{ keyword: string; volume: number }>; notes?: string };
    let sd: { pageOptimisations?: SdItem[]; landingPages?: SdItem[]; blogPosts?: SdItem[] } = {};
    try { sd = JSON.parse(strategy.spreadsheetData ?? "{}"); } catch { /* leave sd empty */ }

    // Top keywords across the full strategy (volume-sorted, deduped)
    const _kwMap = new Map<string, number>();
    for (const item of [...(sd.pageOptimisations ?? []), ...(sd.landingPages ?? []), ...(sd.blogPosts ?? [])]) {
      for (const k of (item.keywords ?? [])) {
        const _key = k.keyword.toLowerCase();
        if (!_kwMap.has(_key) || (_kwMap.get(_key) ?? 0) < k.volume) _kwMap.set(_key, k.volume);
      }
    }
    const topKwList = [..._kwMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([kw, vol]) => `${kw} (${vol.toLocaleString()} searches/mo)`)
      .join(", ");
    const kwNote = topKwList
      ? `\n\nKeywords from the SEMrush data underpinning this strategy: ${topKwList}.`
      : "";

    // Sibling item titles for a section (for add-another context)
    const siblingContext = (items: SdItem[] | undefined): string => {
      if (!items || items.length === 0) return "";
      return items
        .slice(0, 10)
        .map(item => {
          const name = item.title ?? item.url ?? "";
          const topKw = item.keywords?.[0]?.keyword ?? "";
          return topKw ? `"${name}" (targeting: ${topKw})` : `"${name}"`;
        })
        .join("; ");
    };

    const clientName =
      strategy.client?.name ||
      strategy.title?.replace(/\s*Content Strategy.*$/i, "").trim() ||
      "the client";

    const openai = await getOpenAiClient();
    const extraInstructions = strategy.client?.aiReportInstructions ?? "";

    const systemPrompt = `You are an expert SEO content strategist at a UK digital marketing agency. Write in British English. You are creating suggestions for a content strategy document for ${clientName}. Write from the agency's perspective: "we will do this for you", not "you should do this". Be specific, confident, and action-oriented.${extraInstructions ? `\n\nAdditional context: ${extraInstructions}` : ""}`;

    // ── Add a brand-new item to a section ───────────────────────────────────
    if (action === "add") {
      const existingList = Array.isArray(existing) ? existing.slice(0, 15) : [];
      const avoidStr = existingList.length > 0 ? `\n\nAlready covered (do NOT suggest these again):\n${existingList.map(e => `- ${e}`).join("\n")}` : "";

      const blogSiblings = siblingContext(sd.blogPosts);
      const landingSiblings = siblingContext(sd.landingPages);
      const pageOptSiblings = siblingContext(sd.pageOptimisations);

      let addPrompt: string;
      if (itemType === "blog") {
        const sibNote = blogSiblings ? `\n\nBlog posts already in this strategy: ${blogSiblings}.` : "";
        addPrompt = `Suggest one additional blog post for ${clientName}. Return JSON with keys "title" (concise, SEO-friendly post title) and "notes" (1–2 sentence agency-voice description of what we will write and why it matters).${kwNote}${sibNote}${avoidStr}`;
      } else if (itemType === "landing") {
        const sibNote = landingSiblings ? `\n\nLanding pages already in this strategy: ${landingSiblings}.` : "";
        addPrompt = `Suggest one additional landing page for ${clientName}'s website. Return JSON with keys "title" (page name), "notes" (1–2 sentence agency-voice description), and "keywords" (array of 2–3 target keywords drawn from the keyword data above).${kwNote}${sibNote}${avoidStr}`;
      } else if (itemType === "page-opt") {
        const sibNote = pageOptSiblings ? `\n\nPage optimisations already in this strategy: ${pageOptSiblings}.` : "";
        addPrompt = `Suggest one additional page optimisation opportunity for ${clientName}. Return JSON with keys "title" (brief label for the recommendation), "notes" (1–2 sentence agency-voice description of what we will improve and why).${kwNote}${sibNote}${avoidStr}`;
      } else {
        addPrompt = `Suggest one additional quick-win content improvement for ${clientName}. Return JSON with keys "title" (brief label) and "notes" (1–2 sentence agency-voice description).${kwNote}${avoidStr}`;
      }

      const addResponse = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: addPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_completion_tokens: 200,
      });

      let result: { title?: string; notes?: string; keywords?: string[] } = {};
      try {
        result = JSON.parse(addResponse.choices[0]?.message?.content ?? "{}");
      } catch {}

      return NextResponse.json({
        title: result.title ?? "",
        notes: result.notes ?? "",
        keywords: Array.isArray(result.keywords) ? result.keywords : [],
      });
    }

    // ── Replace an existing item's description ──────────────────────────────
    const keywordList = (Array.isArray(keywords) ? keywords : []).slice(0, 5).join(", ");
    const clusterNote = cluster ? ` (part of the "${cluster}" content cluster)` : "";

    let itemDesc: string;
    let userPrompt: string;

    if (itemType === "page-opt") {
      itemDesc = `page optimisation for ${url || "an existing page"}`;
      userPrompt = `Write a replacement recommendation for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious recommendation: "${currentNotes || "none"}"\n\nProvide a clearly different angle or specific action. One paragraph, 2–3 sentences.${kwNote}`;
    } else if (itemType === "landing") {
      itemDesc = `proposed landing page: "${title}"`;
      userPrompt = `Write a replacement description for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious description: "${currentNotes || "none"}"\n\nProvide a clearly different angle or value proposition. One paragraph, 2–3 sentences.${kwNote}`;
    } else if (itemType === "blog") {
      itemDesc = `blog post titled "${title}"${clusterNote}`;
      userPrompt = `Write a replacement description for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious description: "${currentNotes || "none"}"\n\nProvide a clearly different angle or approach. One paragraph, 2–3 sentences.${kwNote}`;
    } else if (itemType === "quick-win") {
      itemDesc = `quick win page optimisation for ${url || "an existing page"}`;
      userPrompt = `Write a replacement recommendation for a ${itemDesc}. Target keywords: ${keywordList || "not specified"}.\n\nPrevious recommendation: "${currentNotes || "none"}"\n\nProvide a clearly different quick-win action. One paragraph, 2–3 sentences.${kwNote}`;
    } else {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_completion_tokens: 250,
    });

    const notes = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy regen error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

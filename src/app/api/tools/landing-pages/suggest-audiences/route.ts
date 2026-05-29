import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";

const MODEL = "claude-opus-4-8";

// Suggest a target audience for a PPC landing page from the brief.
// Each landing page targets ONE audience, so this returns a small set
// of options the user picks from (or edits manually).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      brief: string;
      campaignType?: string;
      targetOffering?: string;
      clientId?: string;
      clientName?: string;
    };

    const brief = body.brief?.trim();
    if (!brief || brief.length < 20) {
      return NextResponse.json(
        {
          error: "brief is required and should describe the campaign in at least a sentence or two",
        },
        { status: 400 },
      );
    }

    let clientName = body.clientName || "the client";
    let extraInstructions = "";
    if (body.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
        select: { name: true, aiReportInstructions: true },
      });
      if (client) {
        clientName = client.name;
        extraInstructions = client.aiReportInstructions ?? "";
      }
    }

    const campaignType = body.campaignType?.trim() || "lead-gen";
    const targetOffering = body.targetOffering?.trim() || "";

    const anthropic = await getAnthropicClient();
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a strategist at i3media drafting target audience options for a PPC landing page.

Read the brief below for ${clientName} and propose 3-5 distinct, addressable audience options the user can choose ONE of as the page's target. PPC landing pages convert best when laser-focused on a single, narrow audience — so make each option specific and tight, not a broad persona.

Campaign type: ${campaignType}${targetOffering ? `\nTarget offering (the ONE thing this page sells — every audience must plausibly buy THIS specific offering, not the company's wider range): ${targetOffering}` : ""}
- lead-gen → audiences likely to fill in a form (high-intent researchers, comparison shoppers)
- event → time-sensitive audiences with urgency triggers
- product-launch → early-adopters or audiences with the specific problem the new product solves
- service → audiences with an active need for that service right now
- ecommerce → ready-to-buy audiences with clear purchase intent

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "audiences": [
    { "name": string, "description": string }
  ]
}

Rules:
- name: one concrete line describing WHO this audience is — demographic + intent (e.g. "Parents of GCSE-age children in the UK searching for online tutoring", not "Parents")
- description: one short sentence on WHY this audience fits this campaign and what makes them likely to convert
- 3-5 audiences, all DISTINCT — no near-duplicates
- British English, plain language, no AI jargon, no platitudes
${extraInstructions ? `\nClient-specific instructions: ${extraInstructions}` : ""}

Brief:
${brief}`,
        },
      ],
    });

    const textBlock = res.content.find((c) => c.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: { audiences?: { name?: string; description?: string }[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI response could not be parsed", raw: cleaned },
        { status: 502 },
      );
    }

    const seen = new Set<string>();
    const audiences = Array.isArray(parsed.audiences)
      ? parsed.audiences
          .filter((a) => a && typeof a.name === "string" && a.name.trim())
          .map((a) => ({
            name: String(a.name).trim(),
            description: String(a.description ?? "").trim(),
          }))
          .filter((a) => {
            const key = a.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 5)
      : [];

    return NextResponse.json({ audiences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("landing-pages suggest-audiences error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

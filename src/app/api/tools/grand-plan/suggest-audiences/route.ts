import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";

const MODEL = "claude-opus-4-8";

// Suggest target audiences from the brief.
// Used by the Grand Plan creation form to pre-populate the audience chip list
// — the user can then add/remove/edit before saving the plan.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      brief: string;
      clientId?: string;
      sector?: string;
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

    const anthropic = await getAnthropicClient();
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a strategist at Betts & Burton drafting target audiences for a marketing plan.

Read the brief below for ${clientName} and propose 3-6 distinct target audiences. Each audience should be a real, addressable segment that a media buyer or content team could plan against — not a vague persona.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "audiences": [
    { "name": string, "description": string, "primaryPain": string, "decisionTrigger": string }
  ]
}

Rules:
- name: 2-5 words, specific (e.g. "First-time London homebuyers" not "Homebuyers")
- description: one sentence, what defines this group demographically/behaviourally
- primaryPain: the single biggest frustration that brings them into ${clientName}'s market
- decisionTrigger: what specifically makes them choose a provider
- British English, no AI jargon, no platitudes
- Audiences must be DISTINCT — no near-duplicates
${body.sector ? `\nSector: ${body.sector}` : ""}
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
    let parsed: {
      audiences?: {
        name?: string;
        description?: string;
        primaryPain?: string;
        decisionTrigger?: string;
      }[];
    } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Defensive — return raw if parsing fails so the UI can show an error toast.
      return NextResponse.json(
        { error: "AI response could not be parsed", raw: cleaned },
        { status: 502 },
      );
    }

    const audiences = Array.isArray(parsed.audiences)
      ? parsed.audiences
          .filter((a) => a && typeof a.name === "string" && a.name.trim())
          .slice(0, 6)
          .map((a) => ({
            name: String(a.name).trim(),
            description: String(a.description ?? "").trim(),
            primaryPain: String(a.primaryPain ?? "").trim(),
            decisionTrigger: String(a.decisionTrigger ?? "").trim(),
          }))
      : [];

    return NextResponse.json({ audiences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("grand-plan suggest-audiences error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

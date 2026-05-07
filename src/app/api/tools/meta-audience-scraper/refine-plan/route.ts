import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-7";

// POST /api/tools/meta-audience-scraper/refine-plan
// Body: { plan: object; feedback: string; brief?: string; clientName?: string }
//
// Takes an existing campaign plan + freeform user feedback, returns a refined
// version of the plan. Same JSON shape as campaign-plan.

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      plan?: unknown;
      feedback?: string;
      brief?: string;
      clientName?: string;
    };

    const feedback = (body.feedback ?? "").trim();
    if (!body.plan) return NextResponse.json({ error: "plan is required" }, { status: 400 });
    if (!feedback) return NextResponse.json({ error: "feedback is required" }, { status: 400 });

    const anthropic = await getAnthropicClient();

    const prompt = `You are revising an existing Meta campaign plan based on user feedback. Apply the feedback faithfully but keep everything else strong: do not regress decisions the user did not ask you to change.

Return ONLY valid JSON matching the SAME shape as the input plan (campaigns, adSets, creatives, etc.) — no markdown, no commentary. Use British English.

If the feedback changes budget or structure, update budgets so they sum correctly. Update "why" fields to reflect any new decisions.

${body.clientName ? `Client: ${body.clientName}\n` : ""}${body.brief ? `Brief:\n${body.brief}\n\n` : ""}
User feedback:
${feedback}

Existing plan:
${JSON.stringify(body.plan)}`;

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = res.content.find((c) => c.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let plan: unknown;
    try {
      plan = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse refined plan", raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("meta-audience-scraper refine-plan error:", error);
    const message = error instanceof Error ? error.message : "Refine failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

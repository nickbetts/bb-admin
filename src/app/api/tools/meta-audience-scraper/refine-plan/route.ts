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

    const prompt = `ROLE
You are a senior Meta Ads specialist with 10+ years of in-the-platform experience. You are revising an existing campaign plan based on direct feedback from the team. Apply the feedback faithfully and confidently — but keep every other decision intact unless the change forces a recalculation. Do not water down strong calls or regress decisions the user did not ask you to change.

INSTRUCTIONS
- Return ONLY valid JSON matching the SAME shape as the input plan (summary, structureRationale, campaigns, adSets, creatives, creativeTestingFramework, weekByWeek, measurement, risks, scaleUp). No markdown fences, no commentary.
- If the feedback changes the budget or campaign count, update budgets so they sum correctly across campaigns and ad sets.
- Update the relevant "why" fields with 2-3 sentences of expert reasoning that reflects the new decision — don't leave stale rationale behind.
- British English throughout.
- If a creative is replaced, regenerate the hooks, headlines, primaryTexts, copyAngle and imagePrompt — don't just tweak surface words.
- If the feedback is wrong-headed (e.g. asking for an action that breaks Meta's learning phase), apply it but call out the trade-off in the relevant "why" field.

${body.clientName ? `CLIENT: ${body.clientName}\n` : ""}${body.brief ? `BRIEF:\n${body.brief}\n\n` : ""}
USER FEEDBACK
${feedback}

EXISTING PLAN
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

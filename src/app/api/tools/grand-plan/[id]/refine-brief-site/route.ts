import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
import { getOpenAiClient, logOpenAiUsage } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/tools/grand-plan/[id]/refine-brief-site
 *
 * Crawls the client website for high-signal page context, asks OpenAI to
 * distil it into a strategist-ready brief addendum, and appends that block to
 * the plan's `clientBrief` so subsequent generation steps have richer inputs.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        clientBrief: true,
        targetAudiences: true,
        prospectName: true,
        prospectWebsite: true,
        client: {
          select: {
            name: true,
            website: true,
          },
        },
      },
    });

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    if (
      plan.userId !== session.user.id &&
      !session.user.permissions.includes("grand_plan.edit_any")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const websiteRaw = (plan.client?.website ?? plan.prospectWebsite ?? "").trim();
    if (!websiteRaw) {
      return NextResponse.json(
        { error: "No website is saved for this plan. Add one and try again." },
        { status: 400 },
      );
    }

    const websiteWithScheme = /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`;

    let website: string;
    try {
      website = new URL(websiteWithScheme).href;
    } catch {
      return NextResponse.json({ error: "Website URL is invalid" }, { status: 400 });
    }

    const crawl = await crawlSiteForKeywordContext(website, 8);
    if (crawl.contextLines.length === 0) {
      return NextResponse.json(
        {
          error:
            crawl.homepageError ?? "Could not extract enough website context to refine the brief.",
        },
        { status: 422 },
      );
    }

    const crawlContext = crawl.contextLines.join("\n").slice(0, 24_000);
    const existingBrief = (plan.clientBrief ?? "").trim();

    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are a senior agency strategist. Produce concise, practical strategy input in British English. Avoid fluff and AI jargon. Return plain text only.",
        },
        {
          role: "user",
          content: `Create a website-derived brief addendum for this marketing plan.

Client: ${plan.client?.name ?? plan.prospectName ?? "Client"}
Plan title: ${plan.title}
Current target audiences:\n${plan.targetAudiences ?? "(not provided)"}

Output requirements:
- 8-12 concise bullet points.
- Focus on: offer clarity, audience cues, trust signals, conversion paths, key pages, likely objections, and message angles.
- Include specific language from page headings or CTAs where useful.
- If evidence is weak or conflicting, say so explicitly in one bullet.
- Keep this as strategist input for campaign planning, not final marketing copy.

Current brief (for context):
${existingBrief || "(empty)"}

Website crawl context:
${crawlContext}`,
        },
      ],
    });
    await logOpenAiUsage("grand-plan-refine-brief-site", completion);

    const refinement = completion.choices[0]?.message?.content?.trim();
    if (!refinement) {
      return NextResponse.json({ error: "AI did not return a brief refinement" }, { status: 502 });
    }

    const dateStamp = new Date().toISOString().split("T")[0];
    const header = `\n\n--- Website crawl brief refinement (${dateStamp}) ---\n`;
    const updatedBrief = `${existingBrief}${header}${refinement}`.trim();

    await prisma.grandPlan.update({
      where: { id: plan.id },
      data: { clientBrief: updatedBrief },
    });

    return NextResponse.json({
      ok: true,
      website,
      pagesCrawled: crawl.pagesCrawled.length,
      appendedChars: refinement.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("grand-plan refine-brief-site error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

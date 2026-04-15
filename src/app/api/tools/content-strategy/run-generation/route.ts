import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import {
  generateContentStrategy,
  type StrategyModel,
  type ContentStrategyLimits,
  type CompetitorPageContext,
} from "@/lib/content-strategy-generator";
import { generateHtml, buildDataSummary } from "../route";

// This route runs the actual generation with its own full timeout budget.
// It responds 202 immediately and does the work in after() so the caller
// (start-async) can confirm the hand-off and return quickly.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    recordId,
    clientId,
    brief,
    period,
    database,
    model,
    limits,
    competitors,
    competitorContexts,
  } = body as {
    recordId: string;
    clientId: string;
    brief?: string;
    period?: string;
    database?: string;
    model?: StrategyModel;
    limits?: ContentStrategyLimits;
    competitors?: string[];
    competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[];
  };

  if (!recordId || !clientId)
    return NextResponse.json({ error: "recordId and clientId are required" }, { status: 400 });

  // Schedule the heavy work to run after this 202 response is sent.
  // This gives run-generation's lambda a fresh 300-second window starting now.
  after(async () => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          semrushDomain: true,
          searchConsoleSiteUrl: true,
        },
      });

      if (!client || !client.semrushDomain) {
        await prisma.contentStrategy.update({
          where: { id: recordId },
          data: { generationStatus: "failed", generationError: "Client or domain not found." },
        });
        return;
      }

      const domain = client.semrushDomain;
      const db = (database as string | undefined) || "uk";
      const finalPeriod =
        (period as string | undefined) ||
        new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      const activeLimits: ContentStrategyLimits = (limits as ContentStrategyLimits) ?? {};
      const competitorsList = (competitors as string[] | undefined) || [];
      const competitorContextsList =
        Array.isArray(competitorContexts) && competitorContexts.length > 0
          ? (competitorContexts as { domain: string; pageContext: CompetitorPageContext }[])
          : undefined;

      const genStart = Date.now();

      const { data } = await generateContentStrategy(
        domain,
        client.name,
        (brief as string | undefined) || "",
        competitorsList,
        db,
        client.searchConsoleSiteUrl,
        (model as StrategyModel) === "claude-opus-4-6" ? "claude-opus-4-6" : ("gpt-5.4" as StrategyModel),
        activeLimits,
        competitorContextsList,
      );

      const generationMs = Date.now() - genStart;
      data.clientName = client.name;
      data.period = finalPeriod;

      // Generate AI narrative descriptions for the HTML document
      let aiContent: Record<string, string> = {};
      try {
        const anthropic = await getAnthropicClient();
        const dataSummary = buildDataSummary(data as Parameters<typeof buildDataSummary>[0]);

        const aiResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: `You are an expert SEO content strategist at a UK digital marketing agency. You write in British English. You are creating descriptions for a content strategy document for a client called "${client.name}". This is a document the agency will present to the client — write everything from the agency's perspective ("we will do this for you", not "you should do this").

Your task is to write short, punchy descriptions for each section and content piece. Each description should:
- Be 1–2 sentences maximum
- Explain WHY we are doing this and what result it aims to achieve
- Sound confident and professional without being jargon-heavy
- Be written so the client understands what we're delivering for them

Return your response as valid JSON with the following keys:
- "overviewOpportunity": 1–2 sentences about the search opportunity we've identified
- "overviewPlan": 1–2 sentences about what this strategy delivers
- "overviewPriority": 1–2 sentences about what we'll work on first and why
- "overviewScope": 1–2 sentences about the total keyword and content scope
- "sectionDescOpts": 1–2 sentences explaining the page optimisations we'll carry out
- "sectionDescLanding": 1–2 sentences explaining the new landing pages we'll create
- "sectionDescBlog": 1–2 sentences explaining the blog content we'll produce
- "sectionDescLinks": 1–2 sentences explaining the link-building outreach we'll conduct
- For each landing page, a key like "landing_PageTitle": 1–2 sentence description of what we'll build and why
- For each blog post, a key like "blog_PostTitle": 1–2 sentence description of the angle we'll take and who it targets`,
          messages: [
            {
              role: "user",
              content: `Here is the content strategy data for ${client.name} (${finalPeriod}):\n\n${dataSummary}\n\nPlease generate the descriptions as JSON.`,
            },
          ],
        });

        const textBlock = aiResponse.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") {
          let jsonStr = textBlock.text;
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          aiContent = JSON.parse(jsonStr.trim());
        }
      } catch (aiError) {
        console.error("AI description generation failed, using defaults:", aiError);
      }

      // Generate HTML and inject the real record ID
      const html = generateHtml(data as Parameters<typeof generateHtml>[0], aiContent);
      const finalHtml = html.replace("'__CS_ID__'", `'${recordId}'`);

      const title = `${client.name} Content Strategy (${finalPeriod})`;
      await prisma.contentStrategy.update({
        where: { id: recordId },
        data: {
          title,
          period: finalPeriod,
          spreadsheetData: JSON.stringify(data),
          generatedHtml: finalHtml,
          generationMs,
          generationStatus: "complete",
        },
      });
    } catch (genError) {
      const message = genError instanceof Error ? genError.message : "Unknown error";
      console.error("run-generation after() error:", genError);

      let userMessage = message;
      if (message.includes("BALANCE IS ZERO") || message.includes("ERROR 132")) {
        userMessage = "SEMrush API quota exhausted. Please try again later.";
      }

      await prisma.contentStrategy
        .update({
          where: { id: recordId },
          data: { generationStatus: "failed", generationError: userMessage },
        })
        .catch(() => {});
    }
  });

  // Respond immediately — the generation is running in the background via after()
  return NextResponse.json({ ok: true }, { status: 202 });
}

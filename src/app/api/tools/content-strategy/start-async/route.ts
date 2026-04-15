import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import {
  generateContentStrategy,
  type StrategyModel,
  type ContentStrategyLimits,
  type CompetitorPageContext,
} from "@/lib/content-strategy-generator";
import { generateHtml, buildDataSummary } from "../route";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      clientId,
      brief,
      period,
      database,
      model,
      limits,
      competitors,
      competitorContexts,
    } = body as {
      clientId: string;
      brief?: string;
      period?: string;
      database?: string;
      model?: StrategyModel;
      limits?: ContentStrategyLimits;
      competitors?: string[];
      competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[];
    };

    if (!clientId)
      return NextResponse.json({ error: "Client is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        semrushDomain: true,
        searchConsoleSiteUrl: true,
        contentStrategyLimits: true,
      },
    });

    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.semrushDomain)
      return NextResponse.json(
        { error: "This client has no SEMrush domain configured. Please set it in client settings first." },
        { status: 400 },
      );

    const domain = client.semrushDomain;
    const db = database || "uk";
    const finalPeriod =
      period ||
      new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const title = `${client.name} Content Strategy (${finalPeriod})`;

    // Merge output limits
    const savedLimits: ContentStrategyLimits = client.contentStrategyLimits
      ? JSON.parse(client.contentStrategyLimits)
      : {};
    const activeLimits: ContentStrategyLimits = limits ?? savedLimits;

    if (limits) {
      await prisma.client.update({
        where: { id: clientId },
        data: { contentStrategyLimits: JSON.stringify(limits) },
      });
    }

    // Create a stub record immediately — visible in the table straight away
    const record = await prisma.contentStrategy.create({
      data: {
        clientId,
        title,
        period: finalPeriod,
        createdBy: session.user.name,
        spreadsheetData: "{}",
        generatedHtml: "",
        generationStatus: "generating",
      },
    });

    const createdBy = session.user.name;

    // Run the full generation after the response is sent, so the browser can navigate away
    after(async () => {
      try {
        const genStart = Date.now();

        const { data } = await generateContentStrategy(
          domain,
          client.name,
          brief || "",
          competitors || [],
          db,
          client.searchConsoleSiteUrl,
          model === "claude-opus-4-6" ? "claude-opus-4-6" : ("gpt-5.4" as StrategyModel),
          activeLimits,
          competitorContexts && competitorContexts.length > 0 ? competitorContexts : undefined,
        );

        const generationMs = Date.now() - genStart;
        data.clientName = client.name;
        data.period = finalPeriod;

        // Generate AI narrative descriptions for the HTML document
        let aiContent: Record<string, string> = {};
        try {
          const anthropic = await getAnthropicClient();
          const dataSummary = buildDataSummary(
            data as Parameters<typeof buildDataSummary>[0],
          );

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
        const finalHtml = html.replace("'__CS_ID__'", `'${record.id}'`);

        // Update the stub record with the completed strategy
        await prisma.contentStrategy.update({
          where: { id: record.id },
          data: {
            title,
            period: finalPeriod,
            createdBy,
            spreadsheetData: JSON.stringify(data),
            generatedHtml: finalHtml,
            generationMs,
            generationStatus: "complete",
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Background content strategy generation error:", error);

        let userMessage = message;
        if (
          message.includes("BALANCE IS ZERO") ||
          message.includes("ERROR 132")
        ) {
          userMessage = "SEMrush API quota exhausted. Please try again later.";
        }

        await prisma.contentStrategy.update({
          where: { id: record.id },
          data: { generationStatus: "failed", generationError: userMessage },
        });
      }
    });

    return NextResponse.json({ id: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("start-async error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

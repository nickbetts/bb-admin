import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import {
  generateContentStrategy,
  runOnPageAudit,
  type StrategyModel,
  type ContentStrategyLimits,
  type CompetitorPageContext,
} from "@/lib/content-strategy-generator";
import { generateHtml, buildDataSummary } from "../route";

// 300 s so the after() callback has a full budget for the heavy AI work.
// The HTTP response is sent immediately (~1 s); after() runs in the same
// lambda but the browser is no longer waiting for it.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientId, brief, period, database, model, limits, competitors, competitorContexts } =
      body as {
        clientId: string;
        brief?: string;
        period?: string;
        database?: string;
        model?: StrategyModel;
        limits?: ContentStrategyLimits;
        competitors?: string[];
        competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[];
      };

    if (!clientId) return NextResponse.json({ error: "Client is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        website: true,
        searchConsoleSiteUrl: true,
        contentStrategyLimits: true,
      },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.website)
      return NextResponse.json(
        {
          error:
            "This client has no SEO domain configured. Please set it in client settings first.",
        },
        { status: 400 },
      );

    const db = database || "uk";
    const finalPeriod =
      period || new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const title = `${client.name} Content Strategy (${finalPeriod})`;

    // Merge and persist output limits
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

    // Create a stub record immediately so it appears in the table straight away
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

    // Snapshot values needed inside after() (closures are fine, but let's be explicit)
    const recordId = record.id;
    const clientName = client.name;
    const searchConsoleSiteUrl = client.searchConsoleSiteUrl;

    // Run the heavy work AFTER the HTTP response is sent.
    // The browser receives {id} immediately and can navigate away safely.
    // This lambda stays alive (up to maxDuration) to complete the work.
    after(async () => {
      try {
        const genStart = Date.now();

        // Skip the on-page audit inside the generator — we'll run it in
        // parallel with the narrative AI call below to keep the lambda
        // well under the 300 s Vercel limit without sacrificing quality.
        const { data } = await generateContentStrategy(
          client.website!,
          clientName,
          brief || "",
          competitors || [],
          db,
          searchConsoleSiteUrl,
          model === "claude-opus-4-6" ? "claude-opus-4-6" : ("gpt-5.4" as StrategyModel),
          activeLimits,
          competitorContexts && competitorContexts.length > 0 ? competitorContexts : undefined,
          true, // skipAudit — run separately in parallel
        );

        data.clientName = clientName;
        data.period = finalPeriod;

        // Kick off audit and narrative AI in parallel. The narrative call
        // does not need the audit data — it summarises the structured
        // strategy, so both can run concurrently.
        const auditPromise = runOnPageAudit(client.website!, data.pageOptimisations).catch(
          (err) => {
            console.warn("On-page audit failed (continuing without audit data):", err);
          },
        );

        const narrativePromise = (async (): Promise<Record<string, string>> => {
          try {
            const anthropic = await getAnthropicClient();
            const dataSummary = buildDataSummary(data as Parameters<typeof buildDataSummary>[0]);

            const aiResponse = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 4000,
              system: `You are an expert SEO content strategist at a UK digital marketing agency. You write in British English. You are creating descriptions for a content strategy document for a client called "${clientName}". This is a document the agency will present to the client — write everything from the agency's perspective ("we will do this for you", not "you should do this").

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
                  content: `Here is the content strategy data for ${clientName} (${finalPeriod}):\n\n${dataSummary}\n\nPlease generate the descriptions as JSON.`,
                },
              ],
            });

            const textBlock = aiResponse.content.find((b) => b.type === "text");
            if (textBlock && textBlock.type === "text") {
              let jsonStr = textBlock.text;
              const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) jsonStr = jsonMatch[1];
              return JSON.parse(jsonStr.trim()) as Record<string, string>;
            }
          } catch (aiError) {
            console.error("AI description generation failed, using defaults:", aiError);
          }
          return {};
        })();

        const [, aiContent] = await Promise.all([auditPromise, narrativePromise]);

        const generationMs = Date.now() - genStart;

        // Generate HTML and inject the real record ID
        const html = generateHtml(data as Parameters<typeof generateHtml>[0], aiContent);
        const finalHtml = html.replace("'__CS_ID__'", `'${recordId}'`);

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
        console.error("Content strategy generation error:", genError);

        let userMessage = message;
        if (message.includes("BALANCE IS ZERO") || message.includes("ERROR 132")) {
          userMessage = "Keyword data API quota exhausted. Please try again later.";
        }

        await prisma.contentStrategy
          .update({
            where: { id: recordId },
            data: { generationStatus: "failed", generationError: userMessage },
          })
          .catch(() => {});
      }
    });

    return NextResponse.json({ id: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("start-async error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

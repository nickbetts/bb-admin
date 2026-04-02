import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/ai/chat — conversational AI for client data queries
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, message, conversationHistory } = await request.json() as {
      clientId: string;
      message: string;
      conversationHistory?: { role: string; content: string }[];
    };

    if (!clientId || !message) {
      return NextResponse.json({ error: "clientId and message are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, website: true, aiReportInstructions: true, ga4PropertyId: true, googleAdsCustomerId: true, metaAccountId: true, searchConsoleSiteUrl: true, semrushDomain: true, woocommerceUrl: true, shopifyStoreDomain: true, tiktokAdvertiserId: true, microsoftAdsAccountId: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch recent metric snapshots for context
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Build context from snapshots
    const snapshotContext = snapshots.map((s) => {
      const metrics = JSON.parse(s.metrics);
      return `[${s.sectionType}] ${s.periodStart} to ${s.periodEnd}: ${JSON.stringify(metrics)}`;
    }).join("\n");

    // Store user message
    await prisma.clientConversation.create({
      data: { clientId, userId: session.user.id, role: "user", content: message },
    });

    const openai = await getOpenAiClient();

    // Build conversation messages
    const systemPrompt = `You are an expert digital marketing analyst for ${client.name}. You have access to their marketing performance data across multiple channels.

Available data context:
${snapshotContext || "No historical snapshots available yet. Answer based on general marketing knowledge."}

Client details:
- Name: ${client.name}
- Website: ${client.website || "Not set"}
- Connected platforms: ${[
  client.ga4PropertyId && "GA4",
  client.googleAdsCustomerId && "Google Ads",
  client.metaAccountId && "Meta Ads",
  client.searchConsoleSiteUrl && "Search Console",
  client.semrushDomain && "SemRush",
  client.woocommerceUrl && "WooCommerce",
  client.shopifyStoreDomain && "Shopify",
  client.tiktokAdvertiserId && "TikTok Ads",
  client.microsoftAdsAccountId && "Microsoft Ads",
].filter(Boolean).join(", ") || "None"}

Instructions:
- Answer questions about the client's marketing performance using the available data
- Provide specific numbers and trends when data is available
- Give actionable recommendations backed by the data
- Format responses clearly with bullet points and sections where appropriate
- If data is insufficient, say so and suggest what data would help
- Be concise but thorough${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory?.length) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    // Store assistant message
    await prisma.clientConversation.create({
      data: { clientId, userId: session.user.id, role: "assistant", content: reply },
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI chat failed" },
      { status: 500 }
    );
  }
}

// GET /api/ai/chat — retrieve conversation history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    const messages = await prisma.clientConversation.findMany({
      where: { clientId, userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("AI chat GET error:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}

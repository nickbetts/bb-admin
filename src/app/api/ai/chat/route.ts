import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getOpenAiClient } from "@/lib/openai-client";
import { logActivity } from "@/lib/activity-logger";

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

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, website: true, aiReportInstructions: true, contractedHours: true, ga4PropertyId: true, googleAdsCustomerId: true, metaAccountId: true, searchConsoleSiteUrl: true, semrushDomain: true, woocommerceUrl: true, shopifyStoreDomain: true, tiktokAdvertiserId: true, microsoftAdsAccountId: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch recent metric snapshots for context
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Build context from snapshots — format metrics as human-readable text rather than raw JSON
    const snapshotContext = snapshots.map((s) => {
      let metrics: Record<string, unknown>;
      try { metrics = JSON.parse(s.metrics); } catch { metrics = {}; }
      const metricLines = Object.entries(metrics)
        .filter(([, v]) => v !== null && v !== undefined && typeof v === "number")
        .map(([k, v]) => {
          const n = v as number;
          const key = k.toLowerCase();
          if (key.includes("rate") || key === "ctr" || key === "engagementrate" || key === "conversionrate" || key === "bouncerate") {
            return `  ${k}: ${(n * (n <= 1 ? 100 : 1)).toFixed(2)}%`;
          }
          if (key === "roas") return `  ${k}: ${n.toFixed(2)}x`;
          if (key.includes("spend") || key.includes("cost") || key.includes("revenue") || key.includes("value") || key === "cpa" || key === "cpm" || key === "cpc" || key === "aov" || key === "averageordervalue") {
            return `  ${k}: £${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return `  ${k}: ${n.toLocaleString("en-GB")}`;
        })
        .join("\n");
      return `[${s.sectionType}] ${s.periodStart} to ${s.periodEnd}:\n${metricLines || "  (no numeric metrics)"}`;
    }).join("\n\n");

    // Fetch open/in-progress actions for context
    const actions = await prisma.actionItem.findMany({
      where: { clientId, status: { in: ["open", "in_progress"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, description: true, status: true, priority: true, dueDate: true, assignedTo: true },
    });
    const actionsContext = actions.length > 0
      ? "\n\nOPEN ACTIONS:\n" + actions.map((a) =>
          `  [${a.priority.toUpperCase()}] ${a.title}${a.description ? ` — ${a.description}` : ""}${a.dueDate ? ` (due ${a.dueDate})` : ""}${a.assignedTo ? ` — assigned to ${a.assignedTo}` : ""}`
        ).join("\n")
      : "";

    // Fetch recent communications for context
    const comms = await prisma.clientCommunication.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { type: true, direction: true, subject: true, sentAt: true, createdAt: true },
    });
    const commsContext = comms.length > 0
      ? "\n\nRECENT COMMUNICATIONS:\n" + comms.map((c) => {
          const date = (c.sentAt ?? c.createdAt).toISOString().split("T")[0];
          return `  [${date}] ${c.direction} ${c.type}: "${c.subject}"`;
        }).join("\n")
      : "";

    // Parse contracted hours if available
    let contractsContext = "";
    if (client.contractedHours) {
      try {
        const contracts = JSON.parse(client.contractedHours) as { service: string; hoursPerMonth: number }[];
        if (contracts.length > 0) {
          contractsContext = "\n\nCONTRACTED SERVICES:\n" +
            contracts.map((c) => `  ${c.service}: ${c.hoursPerMonth}h/month`).join("\n");
        }
      } catch { /* ignore */ }
    }

    // Read most recently cached GA4 demographics and AI referrals (from ApiCache, written when those tabs are loaded)
    let demographicsContext = "";
    let aiReferralsContext = "";
    if (client.ga4PropertyId) {
      const [demoCache, aiRefCache] = await Promise.allSettled([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).apiCache.findFirst({
          where: { key: { startsWith: `ga4:demographics:${client.ga4PropertyId}:` } },
          orderBy: { fetchedAt: "desc" },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).apiCache.findFirst({
          where: { key: { startsWith: `ga4:ai-referrals:${client.ga4PropertyId}:` } },
          orderBy: { fetchedAt: "desc" },
        }),
      ]);
      if (demoCache.status === "fulfilled" && demoCache.value) {
        try {
          const d = JSON.parse(demoCache.value.data) as { ageGroups?: { range: string; users: number }[]; genderSplit?: { gender: string; users: number }[] };
          const totalUsers = (d.ageGroups ?? []).reduce((s, g) => s + g.users, 0);
          if (totalUsers > 0) {
            demographicsContext = "\n\nAUDIENCE DEMOGRAPHICS (GA4):\n  Age: " +
              (d.ageGroups ?? []).map((g) => `${g.range}: ${Math.round((g.users / totalUsers) * 100)}%`).join(", ") +
              "\n  Gender: " + (d.genderSplit ?? []).map((g) => `${g.gender}: ${Math.round((g.users / totalUsers) * 100)}%`).join(", ");
          }
        } catch { /* ignore */ }
      }
      if (aiRefCache.status === "fulfilled" && aiRefCache.value) {
        try {
          const refs = JSON.parse(aiRefCache.value.data) as { source: string; sessions: number }[];
          if (refs.length > 0) {
            const total = refs.reduce((s, r) => s + r.sessions, 0);
            aiReferralsContext = `\n\nAI SEARCH REFERRALS: ${total.toLocaleString()} sessions from AI tools (` +
              refs.slice(0, 5).map((r) => `${r.source}: ${r.sessions}`).join(", ") + ")";
          }
        } catch { /* ignore */ }
      }
    }

    // Store user message
    await prisma.clientConversation.create({
      data: { clientId, userId: session.user.id, role: "user", content: message },
    });

    const openai = await getOpenAiClient();

    // Build conversation messages
    const systemPrompt = `You are an expert digital marketing analyst for ${client.name}. You have access to their marketing performance data across multiple channels.

Available data context:
${snapshotContext || "No historical snapshots available yet. Answer based on general marketing knowledge."}${demographicsContext}${aiReferralsContext}${actionsContext}${commsContext}${contractsContext}

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
      model: "gpt-5.4-nano",
      messages,
      temperature: 0.3,
      max_completion_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    // Store assistant message
    await prisma.clientConversation.create({
      data: { clientId, userId: session.user.id, role: "assistant", content: reply },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "ai_chat_message",
      clientId,
      clientName: client.name,
      description: `Sent AI chat message for ${client.name}`,
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

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { validateAiJson } from "@/lib/ai/schemas";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, logAnthropicUsage } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TrackingActionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum([
    "update_setup",
    "create_event",
    "activate_event",
    "delete_event",
    "create_gtm_event_tag",
    "publish_workspace",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  reasoning: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
});

const TrackingAiResponseSchema = z.object({
  reply: z.string().min(1),
  proposedActions: z.array(TrackingActionSchema).default([]),
});

type TrackingAction = z.infer<typeof TrackingActionSchema> & { id: string };

function formatTrackingSetup(
  setup: {
    gtmAccountId: string | null;
    gtmContainerApiId: string | null;
    gtmContainerId: string | null;
    gtmWorkspaceId: string | null;
    ga4PropertyId: string | null;
    metaPixelId: string | null;
    googleAdsConversionId: string | null;
    status: string;
  } | null,
) {
  if (!setup) {
    return "No tracking setup exists yet for this client.";
  }

  return [
    `Status: ${setup.status}`,
    `GTM account: ${setup.gtmAccountId ?? "not set"}`,
    `GTM container API ID: ${setup.gtmContainerApiId ?? "not set"}`,
    `GTM container public ID: ${setup.gtmContainerId ?? "not set"}`,
    `GTM workspace: ${setup.gtmWorkspaceId ?? "not set"}`,
    `GA4 property: ${setup.ga4PropertyId ?? "not set"}`,
    `Meta pixel: ${setup.metaPixelId ?? "not set"}`,
    `Google Ads conversion: ${setup.googleAdsConversionId ?? "not set"}`,
  ].join("\n");
}

function formatRecentEvents(
  events: Array<{ eventName: string; eventCategory: string | null; status: string }>,
) {
  if (events.length === 0) return "No tracking events exist yet.";

  return events
    .map((event) =>
      [
        `- ${event.eventName}`,
        event.eventCategory ? `  category: ${event.eventCategory}` : null,
        `  status: ${event.status}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}

function formatRecentAudits(audits: Array<{ auditType: string; status: string; auditedAt: Date }>) {
  if (audits.length === 0) return "No recent tracking audits.";

  return audits
    .map((audit) => `- ${audit.auditType} (${audit.status}) at ${audit.auditedAt.toISOString()}`)
    .join("\n");
}

function stripConversationMessages(
  conversationHistory: Array<{ role: string; content: string }> | undefined,
) {
  return (conversationHistory ?? [])
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({ role: item.role as "user" | "assistant", content: item.content }));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.permissions.includes("manage_tracking")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = enforceAiRateLimit(session.user.id, { scope: "tracking-guru", limit: 12 });
    if (!rl.ok) return rl.response!;

    const body = (await request.json()) as {
      clientId?: string;
      message?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    if (!body.clientId || !body.message) {
      return NextResponse.json({ error: "clientId and message are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: {
        id: true,
        name: true,
        website: true,
        aiReportInstructions: true,
        trackingSetups: {
          select: {
            id: true,
            gtmAccountId: true,
            gtmContainerApiId: true,
            gtmContainerId: true,
            gtmWorkspaceId: true,
            ga4PropertyId: true,
            metaPixelId: true,
            googleAdsConversionId: true,
            status: true,
            events: {
              select: {
                id: true,
                eventName: true,
                eventCategory: true,
                status: true,
              },
              orderBy: { createdAt: "desc" },
              take: 8,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        trackingAudits: {
          select: {
            auditType: true,
            status: true,
            auditedAt: true,
          },
          orderBy: { auditedAt: "desc" },
          take: 3,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const setup = client.trackingSetups[0] ?? null;
    const recentEvents = setup?.events ?? [];
    const recentAudits = client.trackingAudits ?? [];

    const systemPrompt = [
      `You are Tracking Guru, an expert analytics implementation assistant for ${client.name}.`,
      "Your job is to help the user audit, configure, and improve this client's tracking setup.",
      "Return JSON only. Do not wrap the response in markdown fences.",
      "The JSON shape must be { reply: string, proposedActions: Array<{ id?: string, type, title, description, reasoning, params }> }.",
      "Only propose write actions when they are genuinely needed. Never execute changes yourself.",
      "Allowed action types are: update_setup, create_event, activate_event, delete_event, create_gtm_event_tag, publish_workspace.",
      "When tracking configuration is missing, suggest explicit setup changes rather than generic advice.",
      "Use British English spelling.",
      client.aiReportInstructions ? `Client-specific guidance: ${client.aiReportInstructions}` : "",
      "\nCurrent tracking setup:",
      formatTrackingSetup(setup),
      "\nRecent tracking events:",
      formatRecentEvents(recentEvents),
      "\nRecent tracking audits:",
      formatRecentAudits(recentAudits),
    ]
      .filter(Boolean)
      .join("\n");

    const anthropic = await getAnthropicClient();
    const messages = [
      ...stripConversationMessages(body.conversationHistory),
      { role: "user" as const, content: body.message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      system: systemPrompt,
      messages,
      max_tokens: 1200,
      temperature: 0.3,
    });

    await logAnthropicUsage("tracking-guru-ai", response);

    const text = response.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter((part) => part.trim().length > 0)
      .join("\n");

    const parsed = validateAiJson(TrackingAiResponseSchema, text);
    if (!parsed.ok) {
      return NextResponse.json({
        reply: text.trim() || "I could not format a tracking plan for that request.",
        proposedActions: [],
      });
    }

    const proposedActions = (parsed.data.proposedActions ?? []).map((action) => ({
      ...action,
      id: action.id ?? randomUUID(),
    })) as TrackingAction[];

    return NextResponse.json({
      reply: parsed.data.reply,
      proposedActions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking AI route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

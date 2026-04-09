import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const PORTAL_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

function verifyPortalToken(token: string): {
  valid: boolean;
  userId?: string;
} {
  const parts = token.split("|");
  if (parts.length !== 4) return { valid: false };

  const [expiresAt, userId, nonce, signature] = parts;
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const expected = createHmac("sha256", PORTAL_SECRET)
    .update(payload)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex")
      )
    ) {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }

  if (Date.now() >= parseInt(expiresAt, 10)) return { valid: false };
  return { valid: true, userId };
}

const PLATFORMS = ["ga4", "googleads", "meta", "searchconsole", "seo"] as const;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = verifyPortalToken(token);
    if (!result.valid || !result.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portalUser = await prisma.clientPortalUser.findUnique({
      where: { id: result.userId },
    });

    if (!portalUser || !portalUser.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = portalUser.clientId;
    const cacheKey = `portal-summary:${clientId}`;

    const summary = await withApiCache(cacheKey, 12, async () => {
      const [snapshots, goals, anomalies, client] = await Promise.all([
        prisma.metricSnapshot.findMany({
          where: {
            clientId,
            sectionType: { in: [...PLATFORMS] },
          },
          orderBy: { periodEnd: "desc" },
        }),
        prisma.clientGoal.findMany({
          where: { clientId, status: "active" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.detectedAnomaly.findMany({
          where: {
            clientId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.client.findUnique({
          where: { id: clientId },
          select: { name: true, aiReportInstructions: true },
        }),
      ]);

      // Take only the latest snapshot per platform
      const latestByPlatform: Record<string, typeof snapshots[number]> = {};
      for (const snap of snapshots) {
        if (
          !latestByPlatform[snap.sectionType] ||
          snap.periodEnd > latestByPlatform[snap.sectionType].periodEnd
        ) {
          latestByPlatform[snap.sectionType] = snap;
        }
      }

      const metricsContext = Object.entries(latestByPlatform)
        .map(([platform, snap]) => {
          return `${platform} (${snap.periodStart} to ${snap.periodEnd}): ${snap.metrics}`;
        })
        .join("\n");

      const goalsContext = goals.length
        ? goals
            .map(
              (g) =>
                `- ${g.title}: target ${g.targetValue}${g.unit ?? ""} by ${g.targetDate}, current ${g.currentValue ?? "not yet measured"}`
            )
            .join("\n")
        : "No active goals set.";

      const anomalyContext = anomalies.length
        ? anomalies
            .slice(0, 10)
            .map(
              (a) =>
                `- [${a.severity}] ${a.platform}: ${a.metric} went ${a.direction} ${a.changePercent.toFixed(1)}% — ${a.detail}`
            )
            .join("\n")
        : "No anomalies detected in the last 30 days.";

      const extraInstructions = client?.aiReportInstructions ?? "";

      const systemPrompt = `You are a friendly marketing consultant writing a plain-English performance summary for a client who is not a marketer. Address the client directly ("Your website…"). Use British English throughout. Avoid jargon — explain any technical terms simply. Be honest but constructive. The summary must be 3–5 concise paragraphs covering:
1. Website performance (traffic, engagement)
2. Paid advertising results (spend efficiency, conversions)
3. SEO and search visibility progress
4. Progress towards their business goals
5. Any alerts or concerns worth noting

If data for a section is unavailable, briefly note that and move on. Do not invent numbers.${extraInstructions ? `\n\nAdditional client-specific instructions: ${extraInstructions}` : ""}`;

      const userPrompt = `Here is the latest data for ${client?.name ?? "this client"}:

PLATFORM METRICS:
${metricsContext || "No metric snapshots available yet."}

ACTIVE GOALS:
${goalsContext}

RECENT ALERTS (last 30 days):
${anomalyContext}

Please write the summary now.`;

      const openai = await getOpenAiClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.65,
        max_tokens: 800,
      });

      return response.choices[0]?.message?.content?.trim() ?? "";
    });

    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Portal summary error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/tools/internal-linking/share/[token]
 *
 * Public-facing share endpoint — no auth required.
 * Returns the plan's public data (result + metadata). Increments viewCount.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const plan = await prisma.internalLinkingPlan.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        targetUrl: true,
        targetSource: true,
        domain: true,
        targetWordCount: true,
        moneyPageUrls: true,
        resultJson: true,
        generationStatus: true,
        createdAt: true,
        viewCount: true,
      },
    });

    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Increment view count asynchronously (fire and forget)
    prisma.internalLinkingPlan
      .update({
        where: { shareToken: token },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => {
        // Non-critical — ignore errors
      });

    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Share link fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

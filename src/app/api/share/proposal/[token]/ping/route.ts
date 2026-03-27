import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/share/proposal/[token]/ping — public, no auth
// Increments view count and updates lastViewedAt. Called by the client page on mount.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) return NextResponse.json({ ok: false });

  try {
    await prisma.proposal.updateMany({
      where: { shareToken: token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  } catch {
    // Non-critical — ignore DB errors silently
  }

  return NextResponse.json({ ok: true });
}

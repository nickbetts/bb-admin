import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/tools/email-verifier/jobs/[id] — full job + results (used for polling + table). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const job = await prisma.emailVerificationJob.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        results: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier get job error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/tools/email-verifier/jobs/[id] — removes job + cascades results. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const job = await prisma.emailVerificationJob.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.emailVerificationJob.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier delete job error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRefineState } from "@/lib/lp-refine-jobs";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/[id]/refine/jobs/[jobId]
// Returns current job status for polling or reconnect.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, jobId } = await params;

  try {
    const job = await prisma.landingPageRefineJob.findFirst({
      where: {
        id: jobId,
        landingPageId: id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        refinementMode: true,
        progressMessage: true,
        progressPercent: true,
        errorMessage: true,
        finalHtml: true,
        resultVersionId: true,
        stateJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const state = parseRefineState(job.stateJson);
    const version = job.resultVersionId
      ? await prisma.landingPageVersion.findUnique({
          where: { id: job.resultVersionId },
          select: {
            id: true,
            versionNumber: true,
            prompt: true,
            createdAt: true,
          },
        })
      : null;

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        refinementMode: job.refinementMode,
        phase: state.phase,
        progressMessage: job.progressMessage,
        progressPercent: job.progressPercent,
        errorMessage: job.errorMessage,
        crawlWarnings: state.crawlWarnings,
        finalHtml: job.finalHtml,
        version,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP refine job get error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

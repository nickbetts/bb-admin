import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyBatch, getZeroBounceKey, type VerificationResult } from "@/lib/email-verifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel Pro

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 50;

/**
 * POST /api/tools/email-verifier/jobs/[id]/run?batch=N
 * Processes the next batch of unknowns. Client polls until status === "complete".
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const batchSize = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, parseInt(searchParams.get("batch") ?? "", 10) || DEFAULT_BATCH_SIZE),
    );

    const job = await prisma.emailVerificationJob.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, totalCount: true, processedCount: true },
    });
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (job.status === "complete") {
      return NextResponse.json({ status: "complete", processedCount: job.processedCount, totalCount: job.totalCount });
    }

    // Resolve API key once up-front so a missing key fails the job cleanly.
    let apiKey: string;
    try {
      apiKey = await getZeroBounceKey();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Missing ZeroBounce API key";
      await prisma.emailVerificationJob.update({
        where: { id },
        data: { status: "failed", errorMessage: message },
      });
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Pull the next batch of unprocessed rows.
    const pending = await prisma.emailVerificationResult.findMany({
      where: { jobId: id, processedAt: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
      select: { id: true, email: true },
    });

    if (pending.length === 0) {
      await prisma.emailVerificationJob.update({
        where: { id },
        data: { status: "complete" },
      });
      return NextResponse.json({ status: "complete", processedCount: job.totalCount, totalCount: job.totalCount });
    }

    // Mark job as running on first batch.
    if (job.status === "pending") {
      await prisma.emailVerificationJob.update({ where: { id }, data: { status: "running" } });
    }

    const results = await verifyBatch(
      pending.map((p) => p.email),
      { apiKey, concurrency: 5 },
    );

    // Persist each result + tally counts.
    const counts = freshCounts();
    const now = new Date();
    await prisma.$transaction(
      results.map((res, idx) => {
        bumpCounts(counts, res.status);
        return prisma.emailVerificationResult.update({
          where: { id: pending[idx].id },
          data: {
            status: res.status || "unknown",
            subStatus: res.subStatus,
            account: res.account,
            domain: res.domain,
            mxFound: res.mxFound,
            mxRecord: res.mxRecord,
            smtpProvider: res.smtpProvider,
            didYouMean: res.didYouMean,
            freeEmail: res.freeEmail,
            role: res.role,
            disposable: res.disposable,
            toxic: res.toxic,
            errorMessage: res.errorMessage,
            processedAt: now,
          },
        });
      }),
    );

    const updated = await prisma.emailVerificationJob.update({
      where: { id },
      data: {
        processedCount: { increment: results.length },
        validCount: { increment: counts.valid },
        invalidCount: { increment: counts.invalid },
        catchAllCount: { increment: counts.catchAll },
        unknownCount: { decrement: results.length },
        // unknownCount started equal to totalCount; net = totalCount - processedCount once subtracting all
        // (we add back any that came back "unknown" below).
        abuseCount: { increment: counts.abuse },
        spamtrapCount: { increment: counts.spamtrap },
        doNotMailCount: { increment: counts.doNotMail },
      },
      select: { processedCount: true, totalCount: true },
    });

    // Re-add any results whose final status is still "unknown" (we just decremented unknownCount
    // by the full batch size above for simplicity — restore for genuine unknowns).
    if (counts.unknown > 0) {
      await prisma.emailVerificationJob.update({
        where: { id },
        data: { unknownCount: { increment: counts.unknown } },
      });
    }

    const isComplete = updated.processedCount >= updated.totalCount;
    if (isComplete) {
      await prisma.emailVerificationJob.update({ where: { id }, data: { status: "complete" } });
    }

    return NextResponse.json({
      status: isComplete ? "complete" : "running",
      processedCount: updated.processedCount,
      totalCount: updated.totalCount,
      batchProcessed: results.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier run batch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface BatchCounts {
  valid: number;
  invalid: number;
  catchAll: number;
  unknown: number;
  abuse: number;
  spamtrap: number;
  doNotMail: number;
}

function freshCounts(): BatchCounts {
  return { valid: 0, invalid: 0, catchAll: 0, unknown: 0, abuse: 0, spamtrap: 0, doNotMail: 0 };
}

function bumpCounts(counts: BatchCounts, status: VerificationResult["status"]) {
  switch (status) {
    case "valid": counts.valid++; break;
    case "invalid": counts.invalid++; break;
    case "catch-all": counts.catchAll++; break;
    case "abuse": counts.abuse++; break;
    case "spamtrap": counts.spamtrap++; break;
    case "do_not_mail": counts.doNotMail++; break;
    default: counts.unknown++; break;
  }
}

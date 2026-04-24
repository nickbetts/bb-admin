import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface VerifiedResult {
  email: string;
  status: string;
  subStatus: string | null;
  account: string | null;
  domain: string | null;
  mxFound: boolean;
  mxRecord: string | null;
  smtpProvider: string | null;
  didYouMean: string | null;
  freeEmail: boolean;
  role: boolean;
  disposable: boolean;
  toxic: boolean;
  errorMessage: string | null;
}

/**
 * POST /api/tools/email-verifier/jobs/quick
 * Persists a set of already-verified quick-check results as a completed job.
 * Body: { results: VerifiedResult[], title?: string, clientId?: string | null }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      results?: VerifiedResult[];
      title?: string;
      clientId?: string | null;
    };

    const results = body.results ?? [];
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "results array is required" }, { status: 400 });
    }

    const title = body.title?.trim() || `Quick check — ${results.length} email${results.length > 1 ? "s" : ""}`;
    const clientId = body.clientId ?? null;

    // Compute counters from results.
    let validCount = 0;
    let invalidCount = 0;
    let catchAllCount = 0;
    let unknownCount = 0;
    let abuseCount = 0;
    let spamtrapCount = 0;
    let doNotMailCount = 0;

    for (const r of results) {
      switch (r.status) {
        case "valid": validCount++; break;
        case "invalid": invalidCount++; break;
        case "catch-all": catchAllCount++; break;
        case "abuse": abuseCount++; break;
        case "spamtrap": spamtrapCount++; break;
        case "do_not_mail": doNotMailCount++; break;
        default: unknownCount++;
      }
    }

    const now = new Date();

    const job = await prisma.emailVerificationJob.create({
      data: {
        userId: session.user.id,
        clientId: clientId || null,
        title,
        status: "complete",
        totalCount: results.length,
        processedCount: results.length,
        validCount,
        invalidCount,
        catchAllCount,
        unknownCount,
        abuseCount,
        spamtrapCount,
        doNotMailCount,
        results: {
          create: results.map((r) => ({
            email: r.email,
            status: r.status,
            subStatus: r.subStatus ?? null,
            account: r.account ?? null,
            domain: r.domain ?? null,
            mxFound: r.mxFound,
            mxRecord: r.mxRecord ?? null,
            smtpProvider: r.smtpProvider ?? null,
            didYouMean: r.didYouMean ?? null,
            freeEmail: r.freeEmail,
            role: r.role,
            disposable: r.disposable,
            toxic: r.toxic,
            errorMessage: r.errorMessage ?? null,
            processedAt: now,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ jobId: job.id, totalCount: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier quick persist error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

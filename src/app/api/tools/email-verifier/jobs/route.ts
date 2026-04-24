import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSyntacticallyValidEmail } from "@/lib/email-verifier";

export const dynamic = "force-dynamic";

const MAX_EMAILS_PER_JOB = 10000;

/** GET /api/tools/email-verifier/jobs — list current user's jobs (optionally by client). */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const jobs = await prisma.emailVerificationJob.findMany({
      where: {
        userId: session.user.id,
        ...(clientId ? { clientId } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        totalCount: true,
        processedCount: true,
        validCount: true,
        invalidCount: true,
        catchAllCount: true,
        unknownCount: true,
        abuseCount: true,
        spamtrapCount: true,
        doNotMailCount: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier list jobs error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/tools/email-verifier/jobs
 * Accepts JSON `{ emails: string[], title?: string, clientId?: string | null }`
 * or multipart/form-data with `file` (csv/xlsx/xls) plus optional `title`, `clientId`.
 * Creates a job + one EmailVerificationResult per unique address (status: unknown).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";
    let emails: string[] = [];
    let title = "";
    let clientId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      title = String(formData.get("title") ?? "").trim();
      const rawClientId = String(formData.get("clientId") ?? "").trim();
      clientId = rawClientId ? rawClientId : null;

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      try {
        const wb = XLSX.read(buffer, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          return NextResponse.json({ error: "Spreadsheet has no sheets" }, { status: 400 });
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
        emails = extractEmailsFromRows(rows);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to parse file";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (!title) title = file.name || "Bulk verification";
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        emails?: unknown;
        title?: string;
        clientId?: string | null;
      };
      if (!Array.isArray(body.emails)) {
        return NextResponse.json({ error: "emails must be an array" }, { status: 400 });
      }
      emails = body.emails.map((e) => String(e ?? ""));
      title = (body.title ?? "").trim() || `Bulk verification — ${new Date().toISOString().slice(0, 10)}`;
      clientId = body.clientId ? String(body.clientId) : null;
    }

    const cleaned = dedupeEmails(emails);
    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid email addresses found" }, { status: 400 });
    }
    if (cleaned.length > MAX_EMAILS_PER_JOB) {
      return NextResponse.json(
        { error: `Maximum ${MAX_EMAILS_PER_JOB} emails per job (received ${cleaned.length})` },
        { status: 400 },
      );
    }

    if (clientId) {
      const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!exists) clientId = null;
    }

    const job = await prisma.emailVerificationJob.create({
      data: {
        userId: session.user.id,
        clientId,
        title: title.slice(0, 200),
        status: "pending",
        totalCount: cleaned.length,
        unknownCount: cleaned.length,
      },
      select: { id: true, totalCount: true, status: true },
    });

    // Bulk-insert result rows.
    await prisma.emailVerificationResult.createMany({
      data: cleaned.map((email) => ({ jobId: job.id, email, status: "unknown" })),
    });

    return NextResponse.json({ jobId: job.id, totalCount: job.totalCount, status: job.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier create job error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Extract email addresses from spreadsheet rows. Detects an `email` column header,
 * otherwise scans all cells row-by-row. */
function extractEmailsFromRows(rows: unknown[][]): string[] {
  if (rows.length === 0) return [];
  const header = rows[0];
  let emailColumnIndex = -1;
  if (Array.isArray(header)) {
    emailColumnIndex = header.findIndex((cell) =>
      typeof cell === "string" && /e[\W_]?mail/i.test(cell.trim()),
    );
  }

  const out: string[] = [];
  const startRow = emailColumnIndex >= 0 ? 1 : 0;
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    if (emailColumnIndex >= 0) {
      const cell = row[emailColumnIndex];
      if (typeof cell === "string") out.push(cell);
      else if (cell != null) out.push(String(cell));
    } else {
      for (const cell of row) {
        if (typeof cell === "string" && cell.includes("@")) out.push(cell);
      }
    }
  }
  return out;
}

function dedupeEmails(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const trimmed = String(raw ?? "").trim().toLowerCase();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    if (!isSyntacticallyValidEmail(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/client?clientId=...
 *
 * Returns a per-client financial snapshot:
 *   - active retainer (monthly fee, contracted hours)
 *   - revenue YTD (sum of paid invoices in current calendar year)
 *   - hours logged in the current month
 *   - simple utilisation = hoursLogged / contractedHours
 *
 * Bet A (Agency Financials) — foundation only. Margin/profitability and
 * dashboard UI come in a follow-up; this endpoint exists so retainers,
 * invoices, and time entries can be exercised end-to-end.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [retainer, invoices, timeEntries] = await Promise.all([
      prisma.clientRetainer.findFirst({
        where: { clientId, OR: [{ endDate: null }, { endDate: { gte: now.toISOString().split("T")[0] } }] },
        orderBy: { startDate: "desc" },
      }),
      prisma.clientInvoice.findMany({
        where: { clientId, paidDate: { not: null, gte: yearStart } },
        select: { amount: true, paidDate: true },
      }),
      prisma.agencyTimeEntry.findMany({
        where: { clientId, date: { gte: monthStart } },
        select: { hours: true, billable: true, category: true },
      }),
    ]);

    const revenueYtd = invoices.reduce((s, i) => s + i.amount, 0);
    const hoursThisMonth = timeEntries.reduce((s, t) => s + t.hours, 0);
    const billableHoursThisMonth = timeEntries.filter((t) => t.billable).reduce((s, t) => s + t.hours, 0);
    const utilisation =
      retainer?.contractedHours && retainer.contractedHours > 0
        ? Number((hoursThisMonth / retainer.contractedHours).toFixed(2))
        : null;

    return NextResponse.json({
      clientId,
      retainer,
      revenueYtd,
      hoursThisMonth,
      billableHoursThisMonth,
      utilisation,
      invoiceCountYtd: invoices.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Financials error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

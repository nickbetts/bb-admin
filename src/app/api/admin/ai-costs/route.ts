import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getCostsByTool, getCostsByProvider, getTotalCost } from "@/lib/ai-cost-logger";

/**
 * GET /api/admin/ai-costs
 *
 * Query params:
 * - startDate: ISO date (default: 30 days ago)
 * - endDate: ISO date (default: today)
 * - groupBy: "tool" | "provider" | "total" (default: "tool")
 *
 * Returns cost breakdown for the specified date range
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, "users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupBy = (searchParams.get("groupBy") ?? "tool") as "tool" | "provider" | "total";

    // Parse dates
    const endDateParam = searchParams.get("endDate");
    const startDateParam = searchParams.get("startDate");

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    let startDate: Date;

    if (startDateParam) {
      startDate = new Date(startDateParam);
    } else {
      // Default to 30 days ago
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Ensure times are correct (start = midnight, end = end of day)
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    let result;

    if (groupBy === "tool") {
      result = await getCostsByTool(startDate, endDate);
    } else if (groupBy === "provider") {
      result = await getCostsByProvider(startDate, endDate);
    } else {
      result = await getTotalCost(startDate, endDate);
    }

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Cost API] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

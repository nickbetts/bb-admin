import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { refreshMetaAccessToken } from "@/lib/meta-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/meta-token-refresh
 *
 * Re-exchanges the current Meta long-lived access token for a fresh 60-day
 * token and stores it in AppSetting. Triggered weekly by Vercel Cron so the
 * token never lapses (Meta tokens expire after ~60 days).
 *
 * Also callable manually by a signed-in user via this route, or with the
 * CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await refreshMetaAccessToken();

    if (!result.refreshed) {
      console.error("Meta token refresh skipped:", result.reason);
      return NextResponse.json(result, { status: 200 });
    }

    console.log(
      `Meta token refreshed — valid for ~${result.expiresInDays} days (until ${result.expiresAt})`,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meta token refresh error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetaTokenStatus, refreshMetaAccessToken } from "@/lib/meta-token";

export const dynamic = "force-dynamic";

/** GET — current Meta token health (expiry, last refresh). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await getMetaTokenStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meta token status error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — manually trigger a token refresh from the Settings UI. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await refreshMetaAccessToken();
    const status = await getMetaTokenStatus();
    return NextResponse.json({ ...result, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meta token manual refresh error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

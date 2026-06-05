import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGSCSites } from "@/lib/search-console";
import { getGoogleUserAccessToken, hasGoogleServiceAccountCredentials } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await getGSCSites();

    if (hasGoogleServiceAccountCredentials()) {
      return NextResponse.json(sites, {
        headers: { "x-google-auth-source": "service-account" },
      });
    }

    try {
      const { email } = await getGoogleUserAccessToken();
      return NextResponse.json(sites, {
        headers: {
          "x-google-auth-source": "user-oauth",
          "x-google-auth-email": email,
        },
      });
    } catch {
      return NextResponse.json(sites);
    }
  } catch (error) {
    console.error("Search Console sites error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch sites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

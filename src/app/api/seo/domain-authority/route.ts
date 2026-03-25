import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDomainAuthority } from "@/lib/domain-authority";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.MOZ_ACCESS_ID || !process.env.MOZ_SECRET_KEY) {
      return NextResponse.json(
        { error: "Domain Authority is not configured. Set MOZ_ACCESS_ID and MOZ_SECRET_KEY." },
        { status: 503 }
      );
    }

    const domain = new URL(request.url).searchParams.get("domain");
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const result = await getDomainAuthority(domain);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Domain Authority API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch domain authority";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

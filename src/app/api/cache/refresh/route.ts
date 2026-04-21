import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { invalidateApiCachePrefix } from "@/lib/api-cache";

/**
 * POST /api/cache/refresh
 *
 * Body: { prefixes: string[] }
 *
 * Wipes ApiCache entries whose key starts with any supplied prefix. The
 * caller is then expected to refetch the data, which will hit the upstream
 * API and write a fresh entry. Restricted to authenticated users — the
 * `prefixes` array can target any client's data, so further per-client
 * permission checks should be added if multi-tenant agencies need to share
 * a single deployment.
 *
 * Example payload to refresh a client's Meta + Google Ads data:
 * ```json
 * { "prefixes": ["meta:", "googleads:"] }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { prefixes?: unknown };
    const raw = body.prefixes;
    if (!Array.isArray(raw) || raw.some((p) => typeof p !== "string" || !p.length)) {
      return NextResponse.json(
        { error: "prefixes must be a non-empty string[]" },
        { status: 400 }
      );
    }
    const prefixes = raw as string[];

    // Defensive cap — a single call should never invalidate hundreds of distinct prefixes.
    if (prefixes.length > 50) {
      return NextResponse.json(
        { error: "Too many prefixes — pass at most 50 per call." },
        { status: 400 }
      );
    }

    await Promise.all(prefixes.map((p) => invalidateApiCachePrefix(p)));

    return NextResponse.json({
      ok: true,
      invalidated: prefixes.length,
      prefixes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Cache refresh error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

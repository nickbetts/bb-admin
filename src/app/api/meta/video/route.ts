import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Video proxy — fetches a Meta ad video server-side and streams it to the
 * browser, bypassing CORS restrictions on fbcdn.net CDN URLs.
 *
 * Usage: GET /api/meta/video?videoId=<id>&clientId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const clientId = searchParams.get("clientId");

    if (!videoId || !clientId) {
      return NextResponse.json({ error: "videoId and clientId are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { metaAccessToken: true },
    });

    const token = client?.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
    if (!token) {
      return NextResponse.json({ error: "Meta access token not configured" }, { status: 503 });
    }

    // Step 1: Resolve the signed CDN source URL from Meta
    const metaResp = await fetch(
      `https://graph.facebook.com/v19.0/${videoId}?fields=source&access_token=${token}`,
      { cache: "no-store" }
    );

    if (!metaResp.ok) {
      return NextResponse.json({ error: "Failed to resolve video URL" }, { status: 502 });
    }

    const metaData = await metaResp.json();
    const sourceUrl: string | undefined = metaData.source;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Video source URL not available" }, { status: 404 });
    }

    // Step 2: Stream the video from Meta's CDN, forwarding range requests for
    // seeking support (important for video players).
    const rangeHeader = request.headers.get("range");
    const videoResp = await fetch(sourceUrl, {
      headers: rangeHeader ? { range: rangeHeader } : {},
      cache: "no-store",
    });

    if (!videoResp.ok && videoResp.status !== 206) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: 502 });
    }

    const headers = new Headers();
    const contentType = videoResp.headers.get("content-type") ?? "video/mp4";
    const contentLength = videoResp.headers.get("content-length");
    const contentRange = videoResp.headers.get("content-range");

    headers.set("content-type", contentType);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "private, max-age=3600");
    if (contentLength) headers.set("content-length", contentLength);
    if (contentRange) headers.set("content-range", contentRange);

    return new NextResponse(videoResp.body, {
      status: videoResp.status,
      headers,
    });
  } catch (error) {
    console.error("Meta video proxy error:", error);
    return NextResponse.json({ error: "Video proxy error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MOCK_YOUTUBE_DATA = {
  configured: true,
  channel: {
    id: "UCdemo123",
    title: "Demo Brand Channel",
    subscriberCount: 12400,
    viewCount: 845200,
    videoCount: 87,
    watchTimeHours: 28500,
  },
  analytics: {
    views: 18420,
    watchTimeHours: 1240,
    subscribers: 320,
    avgViewDuration: "3:42",
    ctr: 4.8,
  },
  videos: [
    { id: "v1", title: "How to Get Started with Our Product", views: 4200, likes: 312, ctr: 6.2, duration: "8:24" },
    { id: "v2", title: "Top 10 Tips for Success", views: 3800, likes: 287, ctr: 5.9, duration: "12:15" },
    { id: "v3", title: "Behind the Scenes — Our Process", views: 2900, likes: 201, ctr: 4.4, duration: "6:50" },
    { id: "v4", title: "Customer Success Story", views: 2400, likes: 178, ctr: 4.1, duration: "5:32" },
    { id: "v5", title: "Product Update: New Features", views: 1980, likes: 143, ctr: 3.8, duration: "4:18" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { youtubeChannelId: true, youtubeChannelName: true },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.youtubeChannelId) {
      return NextResponse.json({ configured: false });
    }

    if (client.youtubeChannelId === "demo") {
      return NextResponse.json(MOCK_YOUTUBE_DATA);
    }

    // Real YouTube Data API call (requires access token from OAuth — not stored currently)
    // Return mock-like structure with channel info from stored metadata
    return NextResponse.json({
      configured: true,
      channel: {
        id: client.youtubeChannelId,
        title: client.youtubeChannelName ?? "YouTube Channel",
        subscriberCount: null,
        viewCount: null,
        videoCount: null,
        watchTimeHours: null,
      },
      analytics: null,
      videos: [],
      message: "Connect YouTube Analytics API to see live data",
    });
  } catch (error) {
    console.error("YouTube error:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube data" }, { status: 500 });
  }
}

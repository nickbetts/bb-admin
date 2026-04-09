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
  trafficSources: [
    { source: "YT_SEARCH", views: 7200, estimatedMinutesWatched: 4800 },
    { source: "BROWSE", views: 4600, estimatedMinutesWatched: 3100 },
    { source: "EXT_URL", views: 3100, estimatedMinutesWatched: 1900 },
    { source: "SUGGESTED", views: 2400, estimatedMinutesWatched: 1600 },
    { source: "NOTIFICATION", views: 1120, estimatedMinutesWatched: 640 },
  ],
  demographics: [
    { ageGroup: "age18-24", gender: "male", viewerPercentage: 14.2 },
    { ageGroup: "age18-24", gender: "female", viewerPercentage: 10.8 },
    { ageGroup: "age25-34", gender: "male", viewerPercentage: 22.1 },
    { ageGroup: "age25-34", gender: "female", viewerPercentage: 18.4 },
    { ageGroup: "age35-44", gender: "male", viewerPercentage: 12.6 },
    { ageGroup: "age35-44", gender: "female", viewerPercentage: 9.3 },
    { ageGroup: "age45-54", gender: "male", viewerPercentage: 5.8 },
    { ageGroup: "age45-54", gender: "female", viewerPercentage: 3.9 },
    { ageGroup: "age55-64", gender: "male", viewerPercentage: 1.7 },
    { ageGroup: "age55-64", gender: "female", viewerPercentage: 1.2 },
  ],
  searchTerms: [
    { term: "product tutorial", views: 1840 },
    { term: "how to get started", views: 1420 },
    { term: "demo brand review", views: 980 },
    { term: "top tips success", views: 740 },
    { term: "behind the scenes", views: 520 },
  ],
};

/** Format an ISO 8601 duration string (e.g. "PT8M24S") to "M:SS" */
function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] ?? "0");
  const minutes = parseInt(match[2] ?? "0") + hours * 60;
  const seconds = parseInt(match[3] ?? "0");
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
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
        message: "GOOGLE_API_KEY is not configured",
      });
    }

    // ── Channel statistics via YouTube Data API v3 ──────────────────────────
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(client.youtubeChannelId)}&key=${apiKey}`,
      { cache: "no-store" }
    );

    let channelData: {
      id: string;
      title: string;
      subscriberCount: number | null;
      viewCount: number | null;
      videoCount: number | null;
      watchTimeHours: null; // requires OAuth Analytics API
    } = {
      id: client.youtubeChannelId,
      title: client.youtubeChannelName ?? "YouTube Channel",
      subscriberCount: null,
      viewCount: null,
      videoCount: null,
      watchTimeHours: null,
    };

    if (channelRes.ok) {
      try {
        const cData = await channelRes.json() as {
          items?: Array<{
            id: string;
            snippet?: { title?: string };
            statistics?: {
              subscriberCount?: string;
              viewCount?: string;
              videoCount?: string;
              hiddenSubscriberCount?: boolean;
            };
          }>;
        };
        const item = cData.items?.[0];
        if (item) {
          channelData = {
            id: item.id,
            title: item.snippet?.title ?? client.youtubeChannelName ?? "YouTube Channel",
            subscriberCount: item.statistics?.hiddenSubscriberCount
              ? null
              : parseInt(item.statistics?.subscriberCount ?? "0") || null,
            viewCount: parseInt(item.statistics?.viewCount ?? "0") || null,
            videoCount: parseInt(item.statistics?.videoCount ?? "0") || null,
            watchTimeHours: null,
          };
        }
      } catch { /* use defaults */ }
    }

    // ── Top videos by view count ────────────────────────────────────────────
    const videos: Array<{
      id: string;
      title: string;
      views: number;
      likes: number;
      ctr: number | null;
      duration: string;
      publishedAt: string | null;
    }> = [];

    try {
      // Search for the channel's top videos by view count
      const searchParams2 = new URLSearchParams({
        part: "id",
        channelId: client.youtubeChannelId,
        order: "viewCount",
        type: "video",
        maxResults: "10",
        key: apiKey,
      });
      if (startDate) searchParams2.set("publishedAfter", `${startDate}T00:00:00Z`);
      if (endDate) searchParams2.set("publishedBefore", `${endDate}T23:59:59Z`);

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams2}`,
        { cache: "no-store" }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json() as {
          items?: Array<{ id?: { videoId?: string } }>;
        };
        const videoIds = (searchData.items ?? [])
          .map((i) => i.id?.videoId)
          .filter((id): id is string => !!id);

        if (videoIds.length > 0) {
          const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`,
            { cache: "no-store" }
          );
          if (videosRes.ok) {
            const videosData = await videosRes.json() as {
              items?: Array<{
                id: string;
                snippet?: { title?: string; publishedAt?: string };
                statistics?: { viewCount?: string; likeCount?: string };
                contentDetails?: { duration?: string };
              }>;
            };
            for (const v of (videosData.items ?? [])) {
              videos.push({
                id: v.id,
                title: v.snippet?.title ?? "Unknown",
                views: parseInt(v.statistics?.viewCount ?? "0"),
                likes: parseInt(v.statistics?.likeCount ?? "0"),
                ctr: null, // CTR requires YouTube Analytics API (OAuth)
                duration: formatDuration(v.contentDetails?.duration ?? "PT0S"),
                publishedAt: v.snippet?.publishedAt ?? null,
              });
            }
          }
        }
      }
    } catch { /* non-critical */ }

    // ── YouTube Analytics via stored Google OAuth token (best-effort) ───────
    // Analytics API requires user OAuth with yt-analytics scope — try with
    // stored Google Ads refresh tokens if the scope was granted.
    let analytics: {
      views: number;
      watchTimeHours: number;
      subscribers: number;
      avgViewDuration: string;
      ctr: number | null;
    } | null = null;

    try {
      let accessToken: string | null = null;

      // Try stored Google connections first, then env var
      const connections = await prisma.googleConnection.findMany({ orderBy: { createdAt: "asc" }, take: 3 }).catch(() => []);
      const refreshTokens: string[] = [];
      if (process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()) refreshTokens.push(process.env.GOOGLE_ADS_REFRESH_TOKEN.trim());
      for (const conn of connections) {
        if (!refreshTokens.includes(conn.refreshToken)) refreshTokens.push(conn.refreshToken);
      }

      for (const refreshToken of refreshTokens) {
        try {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
              refresh_token: refreshToken,
              grant_type: "refresh_token",
            }),
            cache: "no-store",
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json() as { access_token?: string; scope?: string };
            // Only use if the token scope includes YouTube Analytics
            if (tokenData.access_token && (tokenData.scope ?? "").includes("youtube")) {
              accessToken = tokenData.access_token;
              break;
            }
          }
        } catch { /* try next token */ }
      }

      if (accessToken) {
        const ytStartDate = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const ytEndDate = endDate ?? new Date().toISOString().split("T")[0];

        const analyticsRes = await fetch(
          `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${client.youtubeChannelId}&startDate=${ytStartDate}&endDate=${ytEndDate}&metrics=views,estimatedMinutesWatched,subscribersGained,averageViewDuration,annotationClickThroughRate&dimensions=&maxResults=1`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          }
        );

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json() as {
            rows?: Array<[number, number, number, number, number]>;
            columnHeaders?: Array<{ name: string }>;
          };
          const row = analyticsData.rows?.[0];
          if (row) {
            const [views, estimatedMinutes, subscribers, avgViewDurationSecs, ctr] = row;
            const watchTimeHours = Math.round(estimatedMinutes / 60);
            const avgSecs = Math.round(avgViewDurationSecs ?? 0);
            analytics = {
              views: views ?? 0,
              watchTimeHours,
              subscribers: subscribers ?? 0,
              avgViewDuration: `${Math.floor(avgSecs / 60)}:${String(avgSecs % 60).padStart(2, "0")}`,
              ctr: ctr != null ? Math.round(ctr * 1000) / 10 : null,
            };
          }
        }
      }
    } catch { /* analytics are best-effort */ }

    // ── Traffic sources, demographics, search terms (YouTube Analytics) ────
    let trafficSources: Array<{ source: string; views: number; estimatedMinutesWatched: number }> = [];
    let demographics: Array<{ ageGroup: string; gender: string; viewerPercentage: number }> = [];
    let searchTerms: Array<{ term: string; views: number }> = [];

    try {
      let analyticsToken: string | null = null;

      // Re-acquire an OAuth token with YouTube Analytics scope
      const ytConnections = await prisma.googleConnection.findMany({ orderBy: { createdAt: "asc" }, take: 3 }).catch(() => []);
      const ytRefreshTokens: string[] = [];
      if (process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()) ytRefreshTokens.push(process.env.GOOGLE_ADS_REFRESH_TOKEN.trim());
      for (const conn of ytConnections) {
        if (!ytRefreshTokens.includes(conn.refreshToken)) ytRefreshTokens.push(conn.refreshToken);
      }

      for (const refreshToken of ytRefreshTokens) {
        try {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
              refresh_token: refreshToken,
              grant_type: "refresh_token",
            }),
            cache: "no-store",
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json() as { access_token?: string; scope?: string };
            if (tokenData.access_token && (tokenData.scope ?? "").includes("youtube")) {
              analyticsToken = tokenData.access_token;
              break;
            }
          }
        } catch { /* try next token */ }
      }

      if (analyticsToken) {
        const ytStart = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const ytEnd = endDate ?? new Date().toISOString().split("T")[0];
        const authHeaders = { Authorization: `Bearer ${analyticsToken}` };
        const channelFilter = `channel==${client.youtubeChannelId}`;

        // Traffic sources
        try {
          const tsRes = await fetch(
            `https://youtubeanalytics.googleapis.com/v2/reports?ids=${channelFilter}&startDate=${ytStart}&endDate=${ytEnd}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views`,
            { headers: authHeaders, cache: "no-store" }
          );
          if (tsRes.ok) {
            const tsData = await tsRes.json() as { rows?: Array<[string, number, number]> };
            trafficSources = (tsData.rows ?? []).map(([source, views, mins]) => ({
              source,
              views,
              estimatedMinutesWatched: mins,
            }));
          }
        } catch { /* non-critical */ }

        // Demographics
        try {
          const demoRes = await fetch(
            `https://youtubeanalytics.googleapis.com/v2/reports?ids=${channelFilter}&startDate=${ytStart}&endDate=${ytEnd}&metrics=viewerPercentage&dimensions=ageGroup,gender`,
            { headers: authHeaders, cache: "no-store" }
          );
          if (demoRes.ok) {
            const demoData = await demoRes.json() as { rows?: Array<[string, string, number]> };
            demographics = (demoData.rows ?? []).map(([ageGroup, gender, pct]) => ({
              ageGroup,
              gender,
              viewerPercentage: pct,
            }));
          }
        } catch { /* non-critical */ }

        // Top search terms
        try {
          const stRes = await fetch(
            `https://youtubeanalytics.googleapis.com/v2/reports?ids=${channelFilter}&startDate=${ytStart}&endDate=${ytEnd}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=25`,
            { headers: authHeaders, cache: "no-store" }
          );
          if (stRes.ok) {
            const stData = await stRes.json() as { rows?: Array<[string, number]> };
            searchTerms = (stData.rows ?? []).map(([term, views]) => ({
              term,
              views,
            }));
          }
        } catch { /* non-critical */ }
      }
    } catch { /* analytics expansions are best-effort */ }

    return NextResponse.json({
      configured: true,
      channel: channelData,
      analytics,
      videos,
      trafficSources,
      demographics,
      searchTerms,
    });
  } catch (error) {
    console.error("YouTube error:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube data" }, { status: 500 });
  }
}

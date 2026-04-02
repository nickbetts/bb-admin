"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Eye, Clock, Users, ThumbsUp, Loader2, AlertCircle } from "lucide-react";

interface YouTubeVideo {
  id: string;
  title: string;
  views: number;
  likes: number;
  ctr: number;
  duration: string;
}

interface YouTubeData {
  configured: boolean;
  channel?: {
    id: string;
    title: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    watchTimeHours: number;
  };
  analytics?: {
    views: number;
    watchTimeHours: number;
    subscribers: number;
    avgViewDuration: string;
    ctr: number;
  };
  videos?: YouTubeVideo[];
  error?: string;
}

interface YouTubeSectionProps {
  clientId: string;
}

export function YouTubeSection({ clientId }: YouTubeSectionProps) {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) setData(await res.json() as YouTubeData);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-3)" }}>
        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading YouTube data…</span>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <AlertCircle style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block" }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>YouTube not connected</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Add your YouTube Channel ID in client settings.</p>
      </div>
    );
  }

  const { analytics, videos, channel } = data;

  return (
    <div>
      {/* Channel summary */}
      {channel && (
        <div style={{ marginBottom: 20, padding: "14px 16px", background: "#ff000008", border: "1px solid #ff000020", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Play style={{ width: 18, height: 18, color: "white", fill: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{channel.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              {channel.subscriberCount.toLocaleString()} subscribers · {channel.videoCount} videos
            </p>
          </div>
        </div>
      )}

      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Views", value: analytics.views.toLocaleString(), icon: <Eye style={{ width: 13, height: 13 }} />, color: "#ef4444" },
            { label: "Watch Time", value: `${analytics.watchTimeHours.toLocaleString()}h`, icon: <Clock style={{ width: 13, height: 13 }} />, color: "#6366f1" },
            { label: "New Subs", value: `+${analytics.subscribers.toLocaleString()}`, icon: <Users style={{ width: 13, height: 13 }} />, color: "#22c55e" },
            { label: "Avg Duration", value: analytics.avgViewDuration, icon: <Play style={{ width: 13, height: 13 }} />, color: "#f59e0b" },
            { label: "Click-Through Rate", value: `${analytics.ctr}%`, icon: <ThumbsUp style={{ width: 13, height: 13 }} />, color: "#3b82f6" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20`, borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
              <div style={{ color: stat.color, marginBottom: 5 }}>{stat.icon}</div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {videos && videos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Top Videos</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Title", "Views", "Likes", "CTR", "Duration"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {videos.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < videos.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{v.views.toLocaleString()}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{v.likes.toLocaleString()}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{v.ctr}%</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-3)" }}>{v.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

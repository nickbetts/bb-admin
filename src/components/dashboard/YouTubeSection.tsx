"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Eye, Clock, Users, ThumbsUp } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface YouTubeVideo {
  id: string;
  title: string;
  views: number;
  likes: number;
  ctr: number;
  duration: string;
}

interface YouTubeTrafficSource {
  sourceType: string;
  views: number;
  watchTimeHours: number;
}

interface YouTubeDemographic {
  ageGroup: string;
  gender: string;
  viewerPercentage: number;
}

interface YouTubeSearchTerm {
  term: string;
  views: number;
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
  trafficSources?: YouTubeTrafficSource[];
  demographics?: YouTubeDemographic[];
  searchTerms?: YouTubeSearchTerm[];
  error?: string;
}

interface YouTubeSectionProps {
  clientId: string;
  clientName: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
}

export function YouTubeSection({ clientId, clientName, crossPlatformContext, visibleBlocks }: YouTubeSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
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

  if (loading) return <SectionLoading color="#ff0000" message="Loading YouTube data…" />;

  if (!data?.configured) {
    return (
      <EmptyState
        icon={<Play style={{ width: 24, height: 24 }} />}
        title="YouTube not connected"
        description="Add your YouTube Channel ID in client settings."
      />
    );
  }

  const { analytics, videos, channel } = data;

  return (
    <div>
      {/* Channel summary */}
      {show("kpis") && channel && (
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

      {show("kpis") && analytics && (
        <MetricGrid cols={5} className="mb-5">
          <MetricCard title="Views" value={analytics.views.toLocaleString()} icon={<Eye style={{ width: 13, height: 13 }} />} channel="youtube" />
          <MetricCard title="Watch Time" value={`${analytics.watchTimeHours.toLocaleString()}h`} icon={<Clock style={{ width: 13, height: 13 }} />} channel="youtube" />
          <MetricCard title="New Subs" value={`+${analytics.subscribers.toLocaleString()}`} icon={<Users style={{ width: 13, height: 13 }} />} channel="youtube" />
          <MetricCard title="Avg Duration" value={analytics.avgViewDuration} icon={<Play style={{ width: 13, height: 13 }} />} channel="youtube" />
          <MetricCard title="Click-Through Rate" value={`${analytics.ctr}%`} icon={<ThumbsUp style={{ width: 13, height: 13 }} />} channel="youtube" />
        </MetricGrid>
      )}

      {show("videos") && videos && videos.length > 0 && (
        <DataTable<YouTubeVideo>
          data={videos}
          columns={[
            { key: "title", label: "Title", minWidth: "200px", render: (_v, row) => <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 280 }}>{row.title}</span> },
            { key: "views", label: "Views", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.views.toLocaleString()}</span> },
            { key: "likes", label: "Likes", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.likes.toLocaleString()}</span> },
            { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.ctr}%</span> },
            { key: "duration", label: "Duration", render: (_v, row) => <span style={{ color: "var(--text-3)" }}>{row.duration}</span> },
          ]}
          pageSize={10}
          exportable
          exportFilename="youtube-videos"
        />
      )}

      {/* Traffic Sources */}
      {data.trafficSources && data.trafficSources.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Traffic Sources</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.trafficSources.map((src) => {
              const maxViews = Math.max(...data.trafficSources!.map(s => s.views), 1);
              const pct = (src.views / maxViews) * 100;
              return (
                <div key={src.sourceType}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--text-2)" }}>{src.sourceType}</span>
                    <span style={{ color: "var(--text-3)" }}>{src.views.toLocaleString()} views · {src.watchTimeHours.toLocaleString()}h</span>
                  </div>
                  <div style={{ height: 5, background: "var(--border)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--danger)", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Demographics */}
      {data.demographics && data.demographics.length > 0 && (
        <DataTable<YouTubeDemographic>
          data={data.demographics}
          columns={[
            { key: "ageGroup", label: "Age Group" },
            { key: "gender", label: "Gender", render: (_v, row) => <span style={{ textTransform: "capitalize" }}>{row.gender}</span> },
            { key: "viewerPercentage", label: "Viewer %", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.viewerPercentage.toFixed(1)}%</span> },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* Search Terms */}
      {data.searchTerms && data.searchTerms.length > 0 && (
        <DataTable<YouTubeSearchTerm>
          data={data.searchTerms}
          columns={[
            { key: "term", label: "Search Term", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.term}</span> },
            { key: "views", label: "Views", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.views.toLocaleString()}</span> },
          ]}
          pageSize={10}
          searchable
          className="mt-5"
        />
      )}

      {/* Full Journey Analysis */}
      {analytics && (
        <SuperSummary
          sectionType="youtube"
          metrics={{
            views: analytics.views,
            watchTimeHours: analytics.watchTimeHours,
            subscribers: analytics.subscribers,
            ctr: analytics.ctr,
          }}
          campaignData={(videos ?? []).slice(0, 10).map(v => ({ name: v.title, views: v.views, likes: v.likes, ctr: v.ctr, duration: v.duration }))}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {analytics && (
        <AiInsightsPanel
          sectionType="youtube"
          metrics={{
            views: analytics.views,
            watchTimeHours: analytics.watchTimeHours,
            subscribers: analytics.subscribers,
            ctr: analytics.ctr,
          }}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}

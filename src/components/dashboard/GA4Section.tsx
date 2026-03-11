"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, LoadingSpinner } from "@/components/ui/index";
import { formatNumber, formatPercent, formatDuration } from "@/lib/utils";
import { Users, Eye, MousePointer, Clock } from "lucide-react";

interface GA4SectionProps {
  propertyId: string;
  period: string;
}

interface GA4Overview {
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
}

interface DailyData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

interface TopPage {
  pagePath: string;
  pageTitle: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}

const SOURCE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

export function GA4Section({ propertyId, period }: GA4SectionProps) {
  const [overview, setOverview] = useState<GA4Overview | null>(null);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = `/api/ga4?propertyId=${encodeURIComponent(propertyId)}`;
        const [ovRes, dailyRes, srcRes, pagesRes] = await Promise.all([
          fetch(`${base}&type=overview`),
          fetch(`${base}&type=daily`),
          fetch(`${base}&type=sources`),
          fetch(`${base}&type=pages`),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch GA4 data");
        }

        const [ov, d, s, p] = await Promise.all([
          ovRes.json(),
          dailyRes.json(),
          srcRes.json(),
          pagesRes.json(),
        ]);

        setOverview(ov);
        setDaily(Array.isArray(d) ? d : []);
        setSources(Array.isArray(s) ? s : []);
        setPages(Array.isArray(p) ? p : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load GA4 data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [propertyId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading GA4 data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 font-medium">Failed to load GA4 data</p>
        <p className="text-slate-400 text-sm mt-1">{error}</p>
        <p className="text-xs text-slate-500 mt-2">
          Ensure GA4_ACCESS_TOKEN is set in your environment
        </p>
      </div>
    );
  }

  if (!overview) return null;

  // Prepare pie chart data for traffic sources
  const sourceChartData = sources.slice(0, 6).map((s) => ({
    name: `${s.source} / ${s.medium}`,
    value: s.sessions,
  }));

  return (
    <div className="space-y-5">
      {/* Overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Sessions"
          value={formatNumber(overview.sessions)}
          subtitle="Total sessions"
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Users"
          value={formatNumber(overview.users)}
          subtitle={`${formatNumber(overview.newUsers)} new`}
          icon={<Users className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Bounce Rate"
          value={formatPercent(overview.bounceRate)}
          subtitle="Lower is better"
          icon={<MousePointer className="h-5 w-5" />}
          color="orange"
        />
        <MetricCard
          title="Avg. Session"
          value={formatDuration(overview.avgSessionDuration)}
          subtitle="Time on site"
          icon={<Clock className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Daily sessions chart */}
      {daily.length > 0 && (
        <SectionCard title="Sessions Over Time" subtitle="Daily sessions trend">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#sessGrad)"
                name="Sessions"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#userGrad)"
                name="Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Traffic sources pie */}
        {sources.length > 0 && (
          <SectionCard title="Traffic Sources" subtitle="Top acquisition channels">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  formatter={(v) => [formatNumber(Number(v)), "Sessions"]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {value.length > 25 ? value.slice(0, 25) + "…" : value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Top pages table */}
        {pages.length > 0 && (
          <SectionCard title="Top Pages" subtitle="By sessions">
            <div className="space-y-2">
              {pages.slice(0, 6).map((page, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="text-xs text-slate-600 w-5 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{page.pagePath}</p>
                    <p className="text-xs text-slate-500 truncate">{page.pageTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-white">{formatNumber(page.sessions)}</p>
                    <p className="text-xs text-slate-500">sessions</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

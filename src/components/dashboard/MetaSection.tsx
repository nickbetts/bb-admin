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
  BarChart,
  Bar,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, LoadingSpinner } from "@/components/ui/index";
import { formatNumber, formatCurrency, formatPercent, formatDateDisplay } from "@/lib/utils";
import { DollarSign, MousePointer, Eye, TrendingUp } from "lucide-react";

interface MetaSectionProps {
  clientId: string;
  startDate: string;
  endDate: string;
}

interface MetaOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  totalConversions: number;
  avgRoas: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
}

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export function MetaSection({ clientId, startDate, endDate }: MetaSectionProps) {
  const [overview, setOverview] = useState<MetaOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = `/api/meta?clientId=${encodeURIComponent(clientId)}&startDate=${startDate}&endDate=${endDate}`;

        const [ovRes, campRes, dailyRes] = await Promise.all([
          fetch(`${base}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=campaigns`, { signal: controller.signal }),
          fetch(`${base}&type=daily`, { signal: controller.signal }),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch Meta Ads data");
        }

        const [ov, camp, d] = await Promise.all([
          ovRes.json(),
          campRes.json(),
          dailyRes.json(),
        ]);

        setOverview(ov);
        setCampaigns(Array.isArray(camp) ? camp : []);
        setDaily(Array.isArray(d) ? d : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Meta Ads data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [clientId, startDate, endDate]);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paid Social</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ad performance data via Meta Ads</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading Meta Ads data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load Meta Ads data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !overview ? null : (
        <>
      {/* Overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <MetricCard
          title="Total Spend"
          value={formatCurrency(overview.totalSpend)}
          subtitle="Period spend"
          icon={<DollarSign className="h-5 w-5" />}
          color="red"
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(overview.totalImpressions)}
          subtitle={`CPM: ${formatCurrency(overview.avgCpm)}`}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(overview.totalClicks)}
          subtitle={`CTR: ${formatPercent(overview.avgCtr)}`}
          icon={<MousePointer className="h-5 w-5" />}
          color="orange"
        />
        <MetricCard
          title="ROAS"
          value={`${overview.avgRoas.toFixed(2)}x`}
          subtitle={`${overview.totalConversions} conversions`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Spend chart */}
      {daily.length > 0 && (
        <SectionCard title="Daily Spend" subtitle="Spend over time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                }}
                labelStyle={{ color: "#64748b", fontSize: "11px" }}
                formatter={(v) => [formatCurrency(Number(v)), "Spend"]}
              />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#spendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clicks vs conversions */}
        {daily.length > 0 && (
          <SectionCard title="Clicks & Conversions" subtitle="Daily performance">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                />
                <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" radius={[2, 2, 0, 0]} />
                <Bar dataKey="conversions" fill="#10b981" name="Conversions" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Campaign table */}
        {campaigns.length > 0 && (
          <SectionCard title="Campaign Performance" subtitle="Active campaigns">
            <div className="divide-y divide-white/[0.05]">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-slate-800 font-medium truncate">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {campaign.impressions.toLocaleString()} impressions ·{" "}
                      {formatPercent(campaign.ctr)} CTR
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-800 font-medium">
                      {formatCurrency(campaign.spend)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {campaign.roas.toFixed(1)}x ROAS
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { SemrushSection } from "./SemrushSection";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";
import { GoogleAdsSection } from "./GoogleAdsSection";
import { getDateRange } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
}

interface ClientDashboardProps {
  client: Client;
  period: string;
}

const periods = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "6m", label: "6m" },
  { value: "custom", label: "Custom" },
];

type Tab = "seo" | "web" | "paid" | "googleads";

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDefaultTab(client: Client): Tab {
  if (client.semrushDomain) return "seo";
  if (client.ga4PropertyId) return "web";
  if (client.metaAccountId) return "paid";
  if (client.googleAdsCustomerId) return "googleads";
  return "seo";
}

export function ClientDashboard({ client, period: initialPeriod }: ClientDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>(() => getDefaultTab(client));

  const today = toDateInputValue(new Date());
  const thirtyDaysAgo = toDateInputValue(new Date(Date.now() - 30 * 86400000));
  const [customStart, setCustomStart] = useState(thirtyDaysAgo);
  const [customEnd, setCustomEnd] = useState(today);

  const { startDate, endDate } = useMemo(() => {
    if (period === "custom") return { startDate: customStart, endDate: customEnd };
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    { id: "seo", label: "SEO / SemRush", available: !!client.semrushDomain },
    { id: "web", label: "Web Analytics (GA4)", available: !!client.ga4PropertyId },
    { id: "paid", label: "Paid Social (Meta)", available: !!client.metaAccountId },
    { id: "googleads", label: "Paid Search (Google Ads)", available: !!client.googleAdsCustomerId },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs + date controls */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                  : tab.available
                  ? "text-slate-500 hover:text-slate-800 hover:bg-white/70"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              {tab.label}
              {!tab.available && (
                <span className="ml-1.5 text-[10px] opacity-50">not configured</span>
              )}
            </button>
          ))}
        </div>

        {/* Date controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  period === p.value
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/70"
                }`}
              >
                {p.value === "custom" && <Calendar className="h-3 w-3" />}
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
      {activeTab === "seo" && client.semrushDomain ? (
        <SemrushSection domain={client.semrushDomain} startDate={startDate} endDate={endDate} />
      ) : activeTab === "seo" ? (
        <NotConfigured
          name="SemRush"
          description="Add a SemRush domain in client settings to see SEO metrics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "web" && client.ga4PropertyId ? (
        <GA4Section propertyId={client.ga4PropertyId} startDate={startDate} endDate={endDate} />
      ) : activeTab === "web" ? (
        <NotConfigured
          name="Google Analytics 4"
          description="Add a GA4 Property ID in client settings to see web analytics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "paid" && client.metaAccountId ? (
        <MetaSection clientId={client.id} startDate={startDate} endDate={endDate} />
      ) : activeTab === "paid" ? (
        <NotConfigured
          name="Meta Ads"
          description="Add a Meta Ads account ID in client settings to see paid social metrics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "googleads" && client.googleAdsCustomerId ? (
        <GoogleAdsSection customerId={client.googleAdsCustomerId} startDate={startDate} endDate={endDate} />
      ) : activeTab === "googleads" ? (
        <NotConfigured
          name="Google Ads"
          description="Add a Google Ads customer ID in client settings to see PPC metrics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}
      </div>
    </div>
  );
}

function NotConfigured({
  name,
  description,
  settingsHref,
}: {
  name: string;
  description: string;
  settingsHref: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
      <p className="text-slate-800 font-semibold text-base">{name} not configured</p>
      <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">{description}</p>
      <a
        href={settingsHref}
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
      >
        Configure settings
      </a>
    </div>
  );
}

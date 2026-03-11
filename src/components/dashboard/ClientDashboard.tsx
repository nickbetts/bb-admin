"use client";

import { useState } from "react";
import { SemrushSection } from "./SemrushSection";
import { GA4Section } from "./GA4Section";
import { MetaSection } from "./MetaSection";

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  metaAccessToken: string | null;
}

interface ClientDashboardProps {
  client: Client;
  period: string;
}

const periods = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "6m", label: "6 months" },
];

type Tab = "seo" | "web" | "paid";

export function ClientDashboard({ client, period: initialPeriod }: ClientDashboardProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [activeTab, setActiveTab] = useState<Tab>("seo");

  const tabs: { id: Tab; label: string; available: boolean }[] = [
    {
      id: "seo",
      label: "SEO / SemRush",
      available: !!client.semrushDomain,
    },
    {
      id: "web",
      label: "Web Analytics (GA4)",
      available: !!client.ga4PropertyId,
    },
    {
      id: "paid",
      label: "Paid Social (Meta)",
      available: !!client.metaAccountId,
    },
  ];

  return (
    <div>
      {/* Period selector + tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white"
                  : tab.available
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-slate-600 cursor-not-allowed"
              }`}
            >
              {tab.label}
              {!tab.available && (
                <span className="ml-1 text-[10px] opacity-60">(not configured)</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                period === p.value
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === "seo" && client.semrushDomain ? (
        <SemrushSection domain={client.semrushDomain} period={period} />
      ) : activeTab === "seo" ? (
        <NotConfigured
          name="SemRush"
          description="Add a SemRush domain in client settings to see SEO metrics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "web" && client.ga4PropertyId ? (
        <GA4Section propertyId={client.ga4PropertyId} period={period} />
      ) : activeTab === "web" ? (
        <NotConfigured
          name="Google Analytics 4"
          description="Add a GA4 Property ID in client settings to see web analytics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}

      {activeTab === "paid" && client.metaAccountId ? (
        <MetaSection
          accountId={client.metaAccountId}
          accessToken={client.metaAccessToken ?? ""}
          period={period}
        />
      ) : activeTab === "paid" ? (
        <NotConfigured
          name="Meta Ads"
          description="Add a Meta Ads account ID in client settings to see paid social metrics"
          settingsHref={`/clients/${client.slug}/settings`}
        />
      ) : null}
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
    <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
      <p className="text-white font-medium">{name} not configured</p>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
      <a
        href={settingsHref}
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition"
      >
        Configure settings
      </a>
    </div>
  );
}

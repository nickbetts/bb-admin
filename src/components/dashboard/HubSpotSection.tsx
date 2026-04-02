"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, DollarSign, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";

interface HubSpotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  lifecycleStage: string;
}

interface HubSpotDeal {
  id: string;
  dealname: string;
  amount: number;
  dealstage: string;
  closedate: string;
}

interface HubSpotData {
  configured: boolean;
  contacts?: HubSpotContact[];
  deals?: HubSpotDeal[];
  summary?: { totalContacts: number; openDeals: number; pipelineValue: number; closedWonValue: number };
  error?: string;
}

interface HubSpotSectionProps {
  clientId: string;
  clientName: string;
  crossPlatformContext?: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

export function HubSpotSection({ clientId, clientName, crossPlatformContext }: HubSpotSectionProps) {
  const [data, setData] = useState<HubSpotData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hubspot?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) setData(await res.json() as HubSpotData);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-3)" }}>
        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading HubSpot data…</span>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <AlertCircle style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block" }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>HubSpot not connected</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Add your HubSpot access token in client settings.</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ padding: 24, color: "#ef4444", fontSize: 13 }}>Error: {data.error}</div>
    );
  }

  const summary = data.summary;

  return (
    <div>
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Contacts", value: summary.totalContacts, icon: <Users style={{ width: 14, height: 14 }} />, color: "#6366f1" },
            { label: "Open Deals", value: summary.openDeals, icon: <TrendingUp style={{ width: 14, height: 14 }} />, color: "#f59e0b" },
            { label: "Pipeline Value", value: formatCurrency(summary.pipelineValue), icon: <DollarSign style={{ width: 14, height: 14 }} />, color: "#3b82f6" },
            { label: "Closed Won", value: formatCurrency(summary.closedWonValue), icon: <DollarSign style={{ width: 14, height: 14 }} />, color: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20`, borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: stat.color }}>{stat.icon}</div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {data.deals && data.deals.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Recent Deals</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Deal Name", "Amount", "Stage", "Close Date"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.deals.map((deal) => (
                <tr key={deal.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)" }}>{deal.dealname}</td>
                  <td style={{ padding: "10px 16px", color: "#22c55e", fontWeight: 600 }}>{formatCurrency(deal.amount)}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)", textTransform: "capitalize" }}>{deal.dealstage.replace(/([a-z])([A-Z])/g, "$1 $2")}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-3)" }}>{deal.closedate ? new Date(deal.closedate).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Insights */}
      {summary && (
        <AiInsightsPanel
          sectionType="hubspot"
          metrics={{
            totalContacts: summary.totalContacts,
            openDeals: summary.openDeals,
            pipelineValue: summary.pipelineValue,
            closedWonValue: summary.closedWonValue,
          }}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}

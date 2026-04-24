"use client";

import { Plus, RefreshCw } from "lucide-react";
import { PageHeader, MockupBanner, Section, Tag, AIInsight } from "../../_components/PillarUI";
import { INTEGRATIONS } from "../../_data/extendedData";

const statusTone = (s: string) => (s === "connected" ? "emerald" : s === "needs-attention" ? "amber" : "neutral") as const;

export default function IntegrationsPage() {
  const grouped = INTEGRATIONS.reduce<Record<string, typeof INTEGRATIONS>>((acc, i) => {
    acc[i.category] = acc[i.category] || [];
    acc[i.category].push(i);
    return acc;
  }, {});

  const counts = {
    connected: INTEGRATIONS.filter((i) => i.status === "connected").length,
    attention: INTEGRATIONS.filter((i) => i.status === "needs-attention").length,
    disconnected: INTEGRATIONS.filter((i) => i.status === "disconnected").length,
  };

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Integrations"
        title="Connected data sources"
        description="Pillar pulls data from your fundraising stack in near real time. Charges from Stripe and GoCardless, conversions from Meta and Google, conversations from Twilio and CallRail, compliance from HMRC. One supporter view across the board."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><RefreshCw className="h-3.5 w-3.5" /> Sync now</button>
            <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> Add integration</button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Tag label={`${counts.connected} connected`} tone="emerald" />
        <Tag label={`${counts.attention} need attention`} tone="amber" />
        <Tag label={`${counts.disconnected} not connected`} tone="neutral" />
      </div>

      <AIInsight title="Suggested next connection" tone="teal">
        Connecting <strong>HMRC Charities Online</strong> end-to-end (currently manual) would auto-submit your Gift Aid batches and unlock <strong>£84k</strong> already-claimable revenue with zero staff time.
      </AIInsight>

      {Object.entries(grouped).map(([category, items]) => (
        <Section key={category} title={category} subtitle={`${items.length} integration${items.length === 1 ? "" : "s"}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {items.map((i) => (
              <div key={i.id} style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 10, background: "var(--surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{i.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{i.name}</div>
                  </div>
                  <Tag label={i.status === "needs-attention" ? "Action needed" : i.status === "connected" ? "Connected" : "Not connected"} tone={statusTone(i.status)} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 12, minHeight: 36 }}>{i.description}</div>
                {i.lastSync && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                    Last sync: <strong style={{ color: "var(--text-2)" }}>{i.lastSync}</strong>
                    {i.recordsSynced && <div>{i.recordsSynced}</div>}
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>Configure</button>
                  {i.status !== "connected" && <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>Connect</button>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section title="Webhooks & API" subtitle="Pillar exposes its own API for downstream tools">
        <div className="grid-2">
          <div style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Outgoing webhooks</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>Push every donation, supporter update and journey transition to your warehouse or Slack.</div>
            <code style={{ display: "block", fontSize: 11, padding: 10, background: "var(--bg)", borderRadius: 6, color: "var(--text-2)", overflowX: "auto" }}>POST https://warehouse.muslimaid.org/pillar-events</code>
          </div>
          <div style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>API access</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>Read supporter, donation and campaign data via REST or GraphQL. Use scoped keys per integration.</div>
            <code style={{ display: "block", fontSize: 11, padding: 10, background: "var(--bg)", borderRadius: 6, color: "var(--text-2)", overflowX: "auto" }}>curl -H &quot;Authorization: Bearer pk_live_…&quot; https://api.pillar.io/v1/supporters</code>
          </div>
        </div>
      </Section>
    </div>
  );
}

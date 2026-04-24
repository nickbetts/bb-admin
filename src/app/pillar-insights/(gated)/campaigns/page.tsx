"use client";

import { Plus, Filter } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, Progress, BarChart } from "../../_components/PillarUI";
import { CAMPAIGNS, CHANNEL_BREAKDOWN } from "../../_data/mockData";

const statusBadge = (status: string) => {
  if (status === "active") return "badge-green";
  if (status === "completed") return "badge-slate";
  return "badge-blue";
};

export default function CampaignsPage() {
  const totalRaised = CAMPAIGNS.reduce((s, c) => s + c.raised, 0);
  const totalBudget = CAMPAIGNS.reduce((s, c) => s + c.budget, 0);
  const totalDonors = CAMPAIGNS.reduce((s, c) => s + c.donors, 0);
  const roi = totalRaised / totalBudget;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Campaigns"
        title="Campaign intelligence"
        description="Every appeal carries full metadata — channel, medium, audience, theme, fund and budget. Pillar attributes every charge automatically and reports ROI per pound spent."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Filter className="h-3.5 w-3.5" /> Filter</button>
            <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> New campaign</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Total raised (active + closed)" value={`£${(totalRaised / 1000).toFixed(0)}k`} delta="22.4%" positive hint="vs prior year" />
        <Stat label="Marketing spend" value={`£${(totalBudget / 1000).toFixed(1)}k`} delta="6.8%" positive hint="MoM" />
        <Stat label="ROI" value={`${roi.toFixed(1)}×`} delta="14%" positive hint="raised per £1 spent" />
        <Stat label="Donors reached" value={totalDonors.toLocaleString()} delta="9.1%" positive hint="rolling 30d" />
      </div>

      <div className="grid-2" style={{ marginTop: 28 }}>
        <Section title="Revenue by channel" subtitle="Where your campaigns are driving giving">
          <BarChart
            data={CHANNEL_BREAKDOWN}
            height={200}
            format={(v) => `£${(v / 1000).toFixed(0)}k`}
            color="#14b8a6"
            color2="#6366f1"
          />
        </Section>
        <AIInsight title="Pillar AI — campaign optimisation" tone="indigo">
          Your <strong>Sponsor a Child — April Drive</strong> is converting <strong>2.1%</strong>, below the
          historical sponsorship benchmark of 3.4%. Pillar suggests testing a softer ask amount of <strong>£25/month</strong>{" "}
          for first-time sponsors and pairing it with the Mariam orphan story creative — predicted lift <strong>+38%</strong>.
        </AIInsight>
      </div>

      <Section title="All campaigns" subtitle="Active, completed and scheduled" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Campaign", "Type", "Channel / medium", "Audience", "Progress", "Goal", "Donors", "CVR", "Avg gift", "ROI", "Status"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Goal", "Donors", "CVR", "Avg gift", "ROI"].includes(h) ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => {
                const pct = c.goal ? (c.raised / c.goal) * 100 : 0;
                const cRoi = c.budget ? c.raised / c.budget : 0;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "16px 18px", maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {c.id} · {c.appealTheme} · {c.startDate} → {c.endDate}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px" }}><span className="badge badge-purple">{c.type}</span></td>
                    <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.channel}</div>
                      <div style={{ color: "var(--text-3)" }}>{c.medium}</div>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: 12 }}>
                      <span className="badge badge-slate">{c.audience}</span>
                    </td>
                    <td style={{ padding: "16px 18px", width: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Progress value={pct} color="#14b8a6" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                        £{c.raised.toLocaleString()} raised
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                      £{(c.goal / 1000).toFixed(0)}k
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                      {c.donors.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                      {c.conversionRate ? `${c.conversionRate.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                      {c.averageGift ? `£${c.averageGift.toFixed(0)}` : "—"}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: cRoi >= 5 ? "#10b981" : "var(--text)" }}>
                      {cRoi ? `${cRoi.toFixed(1)}×` : "—"}
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Campaign metadata model" subtitle="Required fields for advanced analytics & AI">
        <div className="grid-3">
          {[
            ["campaign_id", "Unique identifier — joins charges to campaigns"],
            ["campaign_type", "emergency_appeal · zakat · seasonal · event"],
            ["channel / medium", "email / klaviyo · paid_search / google_ads · social / facebook"],
            ["audience_segment", "recent_donors · lapsed_donors · sponsors · lookalikes"],
            ["appeal_theme", "water · education · food · emergency · zakat"],
            ["fund_id", "Destination restricted fund (compliance-critical)"],
            ["budget", "Marketing spend used to compute ROI and CPA"],
            ["landing_page", "Donation form URL or slug for attribution"],
            ["creative_id", "Pairs every charge to the asset that drove it"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                padding: 14,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.6)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", fontFamily: "monospace" }}>{k}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

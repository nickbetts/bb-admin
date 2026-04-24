"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Pause, Copy, Download } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Section,
  Stat,
  Tag,
  Tabs,
  KeyValue,
  AIInsight,
  LineChart,
  Funnel,
  Progress,
} from "../../../_components/PillarUI";
import { CAMPAIGNS } from "../../../_data/mockData";
import { getCampaignDailyRevenue, getCampaignVariants, getCampaignFunnel } from "../../../_data/extendedData";

const statusTone = (s: string) => (s === "active" ? "emerald" : s === "scheduled" ? "indigo" : "neutral") as const;

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const campaign = CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0];
  const daily = getCampaignDailyRevenue(campaign.id);
  const variants = getCampaignVariants(campaign.id);
  const funnel = getCampaignFunnel(campaign.id);
  const [tab, setTab] = useState("overview");

  const pct = campaign.goal ? (campaign.raised / campaign.goal) * 100 : 0;
  const roi = campaign.budget ? campaign.raised / campaign.budget : 0;
  const cpa = campaign.donors ? campaign.budget / campaign.donors : 0;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <Link href="/pillar-insights/campaigns" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 16 }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to campaigns
      </Link>

      <PageHeader
        eyebrow={`${campaign.id} · ${campaign.appealTheme}`}
        title={campaign.name}
        description={`${campaign.type} running ${campaign.startDate} → ${campaign.endDate} via ${campaign.channel} (${campaign.medium}). Audience: ${campaign.audience}.`}
        actions={
          <>
            <Tag label={campaign.status} tone={statusTone(campaign.status)} />
            <button className="btn btn-secondary btn-sm"><Sparkles className="h-3.5 w-3.5" /> AI optimise</button>
            <button className="btn btn-secondary btn-sm"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
            <button className="btn btn-secondary btn-sm"><Pause className="h-3.5 w-3.5" /> Pause</button>
            <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export report</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Raised" value={`£${campaign.raised.toLocaleString()}`} delta={`${pct.toFixed(0)}% of goal`} positive hint={`Goal £${(campaign.goal / 1000).toFixed(0)}k`} />
        <Stat label="Donors" value={campaign.donors.toLocaleString()} delta="9.4%" positive hint="vs prior 7 days" />
        <Stat label="ROI" value={`${roi.toFixed(1)}×`} delta="14%" positive hint={`Spend £${(campaign.budget / 1000).toFixed(1)}k`} />
        <Stat label="Cost per acquired donor" value={`£${cpa.toFixed(2)}`} delta="-8%" positive hint="trending down" />
      </div>

      <Section title="Goal progress">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Progress value={pct} color="#14b8a6" />
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              £{campaign.raised.toLocaleString()} raised of £{campaign.goal.toLocaleString()} goal · {pct.toFixed(1)}%
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }} className="gradient-text">{pct.toFixed(0)}%</div>
        </div>
      </Section>

      <div style={{ marginTop: 28 }}>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "creative", label: "Creative variants", count: variants.length },
            { id: "funnel", label: "Funnel" },
            { id: "donors", label: "Donors", count: campaign.donors },
            { id: "metadata", label: "Metadata" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <>
            <Section title="Daily revenue - last 30 days" subtitle="Hover datapoints to inspect daily totals">
              <LineChart
                series={[
                  { name: "Revenue (£)", data: daily.map((d) => d.revenue), color: "#14b8a6" },
                  { name: "Gifts (count × 50)", data: daily.map((d) => d.gifts * 50), color: "#6366f1" },
                ]}
                height={240}
                format={(v) => `£${v.toLocaleString()}`}
                labels={["1 Apr", "8 Apr", "15 Apr", "22 Apr", "29 Apr"]}
              />
            </Section>

            <div className="grid-2">
              <AIInsight title="What is working" tone="teal">
                The Gaza child carousel creative (V-A) is your top performer with a <strong>2.84% CTR</strong> and
                <strong> £14.20 CPA</strong>. Consider shifting an additional 18% of remaining budget into this variant for the final 14 days.
              </AIInsight>
              <AIInsight title="What to watch" tone="amber">
                Last 3 days saw a 9% drop in average gift size. Likely driven by share-of-mobile climbing to 78%.
                Test a default donation amount of <strong>£35</strong> on mobile to recover average gift.
              </AIInsight>
            </div>
          </>
        )}

        {tab === "creative" && (
          <Section title="Creative variants" subtitle="Performance by ad variant - identify the winner" padded={false}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                    {["Variant", "Channel", "Impressions", "CTR", "Conversions", "CPA", "Revenue", "Status"].map((h) => (
                      <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Impressions", "CTR", "Conversions", "CPA", "Revenue"].includes(h) ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{v.id} · {v.format}</div>
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-2)" }}>{v.channel}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{v.impressions.toLocaleString()}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{v.ctr}%</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{v.conversions.toLocaleString()}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>£{v.cpa.toFixed(2)}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>£{v.revenue.toLocaleString()}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <Tag label={v.status} tone={v.status === "winning" ? "emerald" : v.status === "live" ? "teal" : "neutral"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {tab === "funnel" && (
          <div className="grid-2">
            <Section title="Donation funnel" subtitle="From paid impression to completed donation">
              <Funnel steps={funnel} />
            </Section>
            <AIInsight title="Drop-off diagnosis" tone="rose">
              Largest leak is between <strong>donate page view → form started</strong> (44% drop). The donate form&apos;s
              first field (title) accounts for 31% of abandons on mobile. Suggested experiment:
              remove title, lead with amount selector.
            </AIInsight>
          </div>
        )}

        {tab === "donors" && (
          <Section title="Top donors to this campaign" subtitle={`${campaign.donors.toLocaleString()} unique donors - showing top 10 by gift size`} padded={false}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                    {["Donor", "Gifts to campaign", "Total", "First gift", "Latest gift", "Method"].map((h) => (
                      <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: h === "Total" || h === "Gifts to campaign" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "C-21134", name: "Aisha Siddiqui", count: 3, total: 1450, first: "2026-04-02", last: "2026-04-22", method: "Card" },
                    { id: "C-20917", name: "Fatima Begum", count: 1, total: 2400, first: "2026-04-08", last: "2026-04-08", method: "Bank transfer" },
                    { id: "C-21448", name: "Abdullah Mirza", count: 4, total: 1200, first: "2026-04-01", last: "2026-04-21", method: "Card" },
                    { id: "C-20841", name: "Ibrahim Al-Hassan", count: 5, total: 985, first: "2026-04-01", last: "2026-04-23", method: "DD" },
                    { id: "C-21048", name: "Mohammed Yusuf", count: 2, total: 850, first: "2026-04-04", last: "2026-04-18", method: "Apple Pay" },
                  ].map((d) => (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <Link href={`/pillar-insights/contacts/${d.id}`} style={{ color: "var(--text)", fontWeight: 600, textDecoration: "none" }}>{d.name}</Link>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{d.id}</div>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{d.count}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>£{d.total.toLocaleString()}</td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{d.first}</td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{d.last}</td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-2)" }}>{d.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {tab === "metadata" && (
          <Section title="Campaign metadata">
            <KeyValue
              columns={3}
              items={[
                { label: "Campaign ID", value: campaign.id },
                { label: "Type", value: campaign.type },
                { label: "Theme", value: campaign.appealTheme },
                { label: "Audience", value: campaign.audience },
                { label: "Channel", value: campaign.channel },
                { label: "Medium / source", value: campaign.medium },
                { label: "Start", value: campaign.startDate },
                { label: "End", value: campaign.endDate },
                { label: "Goal", value: `£${campaign.goal.toLocaleString()}` },
                { label: "Budget", value: `£${campaign.budget.toLocaleString()}` },
                { label: "Restricted fund_id", value: campaign.appealTheme.includes("Zakat") ? "ZKT-26-A" : campaign.appealTheme.includes("Qurbani") ? "QUR-26-A" : "—" },
                { label: "UTM tag", value: `utm_campaign=${campaign.id.toLowerCase()}` },
              ]}
            />
          </Section>
        )}
      </div>
    </div>
  );
}

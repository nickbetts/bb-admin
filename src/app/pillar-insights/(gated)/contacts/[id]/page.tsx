"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageSquare, Sparkles, Download, Tag as TagIcon } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Avatar,
  Tag,
  Tabs,
  Timeline,
  KeyValue,
  AIInsight,
  Spark,
  Progress,
  ScoreRing,
} from "../../../_components/PillarUI";
import { SUPPORTERS } from "../../../_data/mockData";
import { getSupporterTimeline, getSupporterCharges } from "../../../_data/extendedData";

export default function SupporterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supporter = SUPPORTERS.find((s) => s.id === id) ?? SUPPORTERS[0];
  const timeline = getSupporterTimeline(supporter.id);
  const charges = getSupporterCharges(supporter.id);
  const [tab, setTab] = useState("overview");

  const totalGiven = charges.filter((c) => c.status === "succeeded").reduce((s, c) => s + c.amount, 0);
  const giftAidEligible = charges.filter((c) => c.giftAid && c.status === "succeeded").reduce((s, c) => s + c.amount * 0.25, 0);

  return (
    <div className="page animate-in">
      <MockupBanner />

      <Link href="/pillar-insights/contacts" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 16 }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to supporters
      </Link>

      {/* Header card */}
      <div className="card" style={{ padding: 24, display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Avatar name={supporter.name} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title gradient-text" style={{ fontSize: 28, margin: 0 }}>{supporter.name}</h1>
            <Tag label={supporter.segment} tone={supporter.segment === "Champion" ? "emerald" : supporter.segment === "At Risk" ? "amber" : "indigo"} />
            {supporter.recurring && <Tag label="Recurring monthly" tone="teal" />}
            {supporter.affinity.includes("Zakat") && <Tag label="Zakat eligible" tone="indigo" />}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            {supporter.email} · {supporter.country} · ID {supporter.id} · Joined {supporter.joined}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm"><Mail className="h-3.5 w-3.5" /> Email supporter</button>
            <button className="btn btn-secondary btn-sm"><Phone className="h-3.5 w-3.5" /> Call</button>
            <button className="btn btn-secondary btn-sm"><MessageSquare className="h-3.5 w-3.5" /> SMS / WhatsApp</button>
            <button className="btn btn-secondary btn-sm"><Sparkles className="h-3.5 w-3.5" /> Run AI next-best-action</button>
            <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export profile</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <ScoreRing value={supporter.churnRisk} label="Churn" color={supporter.churnRisk >= 60 ? "#ef4444" : "#f59e0b"} size={72} />
          <ScoreRing value={supporter.upgradeScore} label="Upgrade" color="#6366f1" size={72} />
          <ScoreRing value={Math.min(100, Math.round(supporter.lifetimeRevenue / 10))} label="LTV" color="#14b8a6" size={72} />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid-4 stat-card-grid" style={{ marginTop: 24 }}>
        <Stat label="Lifetime giving" value={`£${supporter.lifetimeRevenue.toLocaleString()}`} hint={`${supporter.charges} successful gifts`} />
        <Stat label="Predicted 12m LTV" value={`£${supporter.predictedLTV.toLocaleString()}`} delta="9.2%" positive hint="model confidence 84%" />
        <Stat label="Gift Aid uplift available" value={`£${Math.round(giftAidEligible).toLocaleString()}`} hint={`${charges.filter((c) => c.giftAid).length} of ${charges.length} eligible`} />
        <Stat label="Avg gift size" value={`£${supporter.averageGift.toFixed(2)}`} hint={supporter.recurring ? `Recurring £${supporter.averageGift.toFixed(0)}/mo` : "Single gifts"} />
      </div>

      <div style={{ marginTop: 28 }}>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "timeline", label: "Activity timeline", count: timeline.length },
            { id: "charges", label: "Donations", count: charges.length },
            { id: "journeys", label: "Journeys", count: 3 },
            { id: "comms", label: "Communications", count: 12 },
            { id: "giftaid", label: "Gift Aid" },
            { id: "consent", label: "Consent & GDPR" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <>
            <div className="grid-2">
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text)" }}>Profile</div>
                <KeyValue
                  items={[
                    { label: "Country", value: supporter.country },
                    { label: "Acquisition channel", value: "Meta Ads · /palestine carousel" },
                    { label: "Preferred channel", value: "Email + WhatsApp" },
                    { label: "Affinity themes", value: supporter.affinity },
                    { label: "Last gift", value: supporter.joined },
                    { label: "First gift", value: supporter.joined },
                    { label: "Mosque / community", value: "East London Mosque" },
                    { label: "Language", value: "English" },
                  ]}
                />
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <AIInsight title="Next best action - generated by Pillar AI" tone="teal">
                  <div style={{ marginBottom: 8 }}>
                    Based on {supporter.name.split(" ")[0]}&apos;s 3.1x affinity for orphan content and recent Ramadan giving pattern,
                    the highest-confidence action is to <strong>invite them to sponsor an orphan in Gaza at £30/month</strong>.
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    Predicted acceptance: <strong style={{ color: "#14b8a6" }}>62%</strong> · expected 12m revenue lift{" "}
                    <strong style={{ color: "#14b8a6" }}>+£284</strong> · best send window: Friday 09:00-11:00 BST
                  </div>
                </AIInsight>
                <AIInsight title="Risk signals" tone="amber">
                  Card on file expires in 41 days. Ramadan engagement was 18% below the same supporter&apos;s 2025 baseline.
                  Consider a personal stewardship call before the next Eid push.
                </AIInsight>
                <AIInsight title="Stewardship opportunity" tone="indigo">
                  Cumulative giving has crossed the <strong>£2,000 (12m)</strong> major-donor threshold.
                  Auto-suggested: enrol into <strong>Major donor stewardship</strong> journey (J-2181).
                </AIInsight>
              </div>
            </div>

            <Section title="Giving trend - last 12 months" subtitle="Monthly cumulative gift value">
              <div style={{ height: 64, display: "flex", alignItems: "flex-end" }}>
                <Spark data={supporter.spark} color="#14b8a6" width={800} height={64} />
              </div>
            </Section>
          </>
        )}

        {tab === "timeline" && (
          <Section title="Full activity timeline" subtitle="Every donation, message, journey step and tag - oldest at the bottom">
            <Timeline items={timeline} />
          </Section>
        )}

        {tab === "charges" && (
          <Section title="Donation history" subtitle={`${charges.length} charges - £${totalGiven.toLocaleString()} total`} padded={false}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                    {["Date", "Amount", "Fund", "Campaign", "Method", "Gift Aid", "Status"].map((h) => (
                      <th key={h} style={{ padding: "12px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--text-2)" }}>{c.date}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>£{c.amount.toFixed(2)}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--text-2)" }}>{c.fund}</td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{c.campaign}</td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-2)" }}>{c.method}</td>
                      <td style={{ padding: "14px 18px" }}>{c.giftAid ? <Tag label="Yes" tone="emerald" /> : <Tag label="No" tone="neutral" />}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <Tag label={c.status} tone={c.status === "succeeded" ? "emerald" : c.status === "refunded" ? "amber" : "rose"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {tab === "journeys" && (
          <div className="grid-2">
            {[
              { name: "Post-Ramadan reactivation", step: "Email 2a · sent", progress: 60, tone: "teal" as const },
              { name: "Major donor stewardship", step: "Awaiting stewardship call", progress: 40, tone: "indigo" as const },
              { name: "Orphan sponsorship invitation", step: "Scheduled for Friday 09:00", progress: 15, tone: "amber" as const },
            ].map((j) => (
              <div key={j.name} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{j.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{j.step}</div>
                  </div>
                  <Tag label="Active" tone={j.tone} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <Progress value={j.progress} color={j.tone === "teal" ? "#14b8a6" : j.tone === "indigo" ? "#6366f1" : "#f59e0b"} />
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{j.progress}% complete</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "comms" && (
          <Section title="Conversation history" subtitle="All inbound and outbound messages across email, SMS, WhatsApp, post and phone">
            <Timeline
              items={[
                { id: "c1", title: "Outbound · Email · Your Ramadan impact report", description: "Mailchimp · Open + clicked main CTA", date: "2026-04-23 11:30", tone: "indigo" },
                { id: "c2", title: "Inbound · Email · Increase my Palestine monthly to £75", description: "Auto-routed to Hira Ali. Marked high priority.", date: "2026-04-24 09:14", tone: "teal" },
                { id: "c3", title: "Outbound · SMS · Last 10 nights reminder", description: "Twilio · Delivered + clicked", date: "2026-03-30 18:00", tone: "indigo" },
                { id: "c4", title: "Inbound · WhatsApp · Receipt request for Zakat", description: "Resolved by Hira (sent receipt 9 minutes later)", date: "2026-04-23 09:02", tone: "emerald" },
                { id: "c5", title: "Outbound · Call · Stewardship intro", description: "Hira Ali · 4m 12s · Note: interested in water projects", date: "2026-03-22 14:18", tone: "amber" },
              ]}
            />
          </Section>
        )}

        {tab === "giftaid" && (
          <div className="grid-2">
            <Section title="Gift Aid declaration">
              <KeyValue
                items={[
                  { label: "Status", value: <Tag label="Active" tone="emerald" /> },
                  { label: "Signed on", value: "2024-11-04" },
                  { label: "Method", value: "Web - tick-box at donate page" },
                  { label: "UK taxpayer confirmation", value: "Yes" },
                  { label: "Eligible donations", value: `${charges.filter((c) => c.giftAid).length} of ${charges.length}` },
                  { label: "Total claim value", value: `£${Math.round(giftAidEligible).toLocaleString()}` },
                ]}
              />
            </Section>
            <Section title="Claim history">
              <Timeline
                items={[
                  { id: "g1", title: "Claim included in batch CGRX-2026-03", date: "2026-04-08", amount: "£62.50", tone: "emerald" },
                  { id: "g2", title: "Claim included in batch CGRX-2026-02", date: "2026-03-08", amount: "£28.75", tone: "emerald" },
                  { id: "g3", title: "Claim included in batch CGRX-2026-01", date: "2026-02-09", amount: "£18.50", tone: "emerald" },
                  { id: "g4", title: "Declaration signed", date: "2024-11-04", tone: "neutral" },
                ]}
              />
            </Section>
          </div>
        )}

        {tab === "consent" && (
          <Section title="Consent & GDPR">
            <KeyValue
              columns={3}
              items={[
                { label: "Email marketing", value: <Tag label="Opted in" tone="emerald" /> },
                { label: "SMS marketing", value: <Tag label="Opted in" tone="emerald" /> },
                { label: "WhatsApp", value: <Tag label="Opted in" tone="emerald" /> },
                { label: "Postal", value: <Tag label="Opted out" tone="neutral" /> },
                { label: "Telephone", value: <Tag label="Opted in" tone="emerald" /> },
                { label: "Last consent update", value: "2026-02-14" },
                { label: "Profiling consent", value: <Tag label="Granted" tone="emerald" /> },
                { label: "SAR requests", value: "0 in last 12 months" },
                { label: "Data retention review", value: "Due 2027-04" },
              ]}
            />
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm"><TagIcon className="h-3.5 w-3.5" /> Edit consent</button>
              <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export full record (SAR)</button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

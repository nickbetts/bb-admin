"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Heart, MapPin } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Tag,
  Avatar,
  Timeline,
  KeyValue,
  AIInsight,
  Progress,
} from "../../../_components/PillarUI";
import { SPONSORSHIPS } from "../../../_data/mockData";
import { getSponsorshipPayments, SPONSORSHIP_LETTERS } from "../../../_data/extendedData";

export default function SponsorshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = SPONSORSHIPS.find((x) => x.id === id) ?? SPONSORSHIPS[0];
  const payments = getSponsorshipPayments(s.id);
  const letters = SPONSORSHIP_LETTERS.default;

  const totalGiven = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const giftAidRaised = totalGiven * 0.25;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <Link href="/pillar-insights/sponsorships" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 16 }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sponsorships
      </Link>

      <div className="card" style={{ padding: 24, display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Avatar name={s.beneficiary} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title gradient-text" style={{ fontSize: 28, margin: 0 }}>{s.beneficiary}</h1>
            <Tag label={s.type} tone="indigo" />
            <Tag label={s.status} tone={s.status === "active" ? "emerald" : "amber"} />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            Sponsorship {s.id} · sponsored by <strong style={{ color: "var(--text-2)" }}>{s.sponsor}</strong> since {s.startDate}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm"><Mail className="h-3.5 w-3.5" /> Send sponsor update</button>
            <button className="btn btn-secondary btn-sm"><Heart className="h-3.5 w-3.5" /> Add field note</button>
            <button className="btn btn-secondary btn-sm"><MapPin className="h-3.5 w-3.5" /> View on map</button>
          </div>
        </div>
      </div>

      <div className="grid-4 stat-card-grid" style={{ marginTop: 24 }}>
        <Stat label="Monthly commitment" value={`£${s.monthly}`} hint={`${s.paymentsMade} successful payments`} />
        <Stat label="Lifetime sponsor giving" value={`£${totalGiven.toLocaleString()}`} delta={`+£${(giftAidRaised).toFixed(0)} Gift Aid`} positive hint="Direct Debit" />
        <Stat label="Failed attempts" value={s.failedAttempts.toString()} delta={s.failedAttempts > 0 ? "Action needed" : "All clear"} positive={s.failedAttempts === 0} hint="last 90 days" />
        <Stat label="Beneficiary review" value="Due Jul 2026" hint="annual safeguarding check" />
      </div>

      <div className="grid-2">
        <Section title="Beneficiary profile">
          <KeyValue
            items={[
              { label: "Name", value: s.beneficiary },
              { label: "Programme", value: s.type === "orphan" ? "Orphan Sponsorship" : s.type === "school" ? "Education programme" : "Community / Water programme" },
              { label: "Country office", value: "Muslim Aid field office · Gaza" },
              { label: "Field officer", value: "Yusuf (officer ID FO-118)" },
              { label: "Started", value: s.startDate },
              { label: "Annual disbursement", value: `£${s.monthly * 12}` },
              { label: "Last welfare check", value: "2026-02-14" },
              { label: "Last impact letter", value: "2026-04-08" },
            ]}
          />
        </Section>

        <Section title="Payment history" subtitle="Direct Debit + card retries">
          <Timeline
            items={payments.slice(0, 8).map((p, i) => ({
              id: `pay-${i}`,
              title: p.status === "paid" ? "Monthly payment collected" : p.status === "failed" ? "Payment failed - retry queued" : "Pending",
              description: p.method,
              date: p.date,
              tone: p.status === "paid" ? "emerald" : p.status === "failed" ? "rose" : "amber",
              amount: `£${p.amount}`,
            }))}
          />
        </Section>
      </div>

      <Section title="Field updates & impact letters" subtitle="Stewardship content delivered to the sponsor">
        <div className="grid-2">
          {letters.map((l, i) => (
            <div key={i} style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{l.from}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{l.date}</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{l.preview}</div>
              {l.image && (
                <div style={{ marginTop: 10, height: 80, background: "linear-gradient(135deg, rgb(20 184 166 / 0.20), rgb(99 102 241 / 0.20))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-3)" }}>
                  📷 Field photo attached
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <AIInsight title="Sponsor stewardship plan - generated by Pillar AI" tone="teal">
        {s.sponsor} has not received a personal phone call in 8 months. Their giving pattern (3 emergency top-ups in 12 months) suggests deeper engagement is welcome. Recommended next step: a 5-minute thank-you call from {s.sponsor === "Ibrahim Al-Hassan" ? "Yousuf" : "Hira"} this Friday morning, with the new Gaza field photos to share.
      </AIInsight>

      <Section title="Programme outcome contribution" subtitle="What this sponsorship is funding">
        <div className="grid-3">
          {[
            { label: "School fees", pct: 100 },
            { label: "Healthcare access", pct: 100 },
            { label: "Nutrition / food parcels", pct: 100 },
            { label: "Family support stipend", pct: 80 },
            { label: "Books and uniform", pct: 100 },
            { label: "Mental health programme", pct: 60 },
          ].map((o) => (
            <div key={o.label} style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{o.label}</span>
                <span style={{ fontSize: 12, color: "#14b8a6", fontWeight: 700 }}>{o.pct}%</span>
              </div>
              <Progress value={o.pct} color="#14b8a6" />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

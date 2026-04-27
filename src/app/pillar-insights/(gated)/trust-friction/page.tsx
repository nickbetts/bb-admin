"use client";

import { ShieldCheck, CreditCard, RefreshCw, CheckCircle } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Progress,
  ScoreRing,
} from "../../_components/PillarUI";
import { TRUST_SCORE, TRUST_SUB_SCORES, TRUST_EVENTS } from "../../_data/intelligenceData";

const eventSeverityColor = (s: string) =>
  s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#6366f1";

export default function TrustFrictionPage() {
  const compositeScore = TRUST_SCORE;
  const paymentSuccess = TRUST_SUB_SCORES.find((s) => s.label === "Payment success rate");

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Trust & Friction"
        title="Trust & friction score"
        description="Measures how easy it is for donors to give and how much they trust your payment experience. A composite score of payment success, form completion, repeat giving and time-to-confirm — with a live friction event log."
        actions={
          <button className="btn btn-secondary btn-sm">
            <CheckCircle className="h-3.5 w-3.5" /> View improvement plan
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, marginBottom: 24, alignItems: "start" }}>
        {/* Trust score ring */}
        <div
          style={{
            padding: "28px 32px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-lg)",
            background: "rgb(255 255 255 / 0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Trust Score
          </div>
          <ScoreRing
            value={compositeScore}
            color={compositeScore >= 80 ? "#10b981" : compositeScore >= 65 ? "#f59e0b" : "#ef4444"}
            size={120}
          />
          <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center", lineHeight: 1.5, maxWidth: 160 }}>
            <strong style={{ color: "var(--text)" }}>Score {compositeScore}/100</strong>
            <br />
            Moderate — donors find giving reasonably easy but mobile friction and failed payments are eroding trust.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="grid-4 stat-card-grid">
            <Stat
              label="Payment success rate"
              value={`${paymentSuccess?.value ?? 0}%`}
              delta="+0.8pts MoM"
              positive
              hint="cards, DD, digital wallets"
              icon={<CreditCard className="h-4 w-4" />}
            />
            <Stat
              label="Form completion rate"
              value="68.4%"
              delta="1.3pts below peer median"
              positive={false}
              hint="biggest improvement lever"
              icon={<RefreshCw className="h-4 w-4" />}
            />
            <Stat
              label="Repeat donation rate"
              value="58.4%"
              delta="+2.1pts YoY"
              positive
              hint="donors who give again"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <Stat
              label="Avg time-to-confirm"
              value="2.8 min"
              delta="Target: < 2 min"
              positive={false}
              hint="from form open to charge"
            />
          </div>

          <AIInsight title="Pillar AI – trust insight" tone="amber">
            Your trust score would improve by <strong>+8 points</strong> if you resolved two issues: reducing average form load time on mobile below 2 seconds
            (currently 3.4s) and adding Apple Pay / Google Pay as default payment options. These two changes alone could eliminate
            an estimated <strong>22,841 annual form abandons</strong> and lift your completion rate to sector median — representing
            £184k in recovered donations.
          </AIInsight>
        </div>
      </div>

      {/* Sub-scores */}
      <Section title="Trust sub-scores" subtitle="Weighted components of the composite trust score">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TRUST_SUB_SCORES.map((sub) => (
            <div
              key={sub.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 60px",
                gap: 20,
                alignItems: "center",
                padding: "14px 18px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.6)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{sub.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>Weight: {sub.weight}%</span>
                </div>
                <Progress value={sub.value} color={sub.color} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: sub.value >= 80 ? "#10b981" : sub.value >= 65 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {sub.value}%
                </div>
              </div>
              <ScoreRing value={sub.value} color={sub.color} size={48} />
            </div>
          ))}
        </div>
      </Section>

      {/* Friction event log */}
      <Section title="Friction event log" subtitle="Events actively eroding trust and donor completion — rolling 30 days" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Event", "Period", "Count", "Estimated impact", "Severity"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-3)",
                      textAlign: h === "Count" ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRUST_EVENTS.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{event.event}</td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-3)" }}>{event.date}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {event.count.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: eventSeverityColor(event.severity) }}>{event.impact}</td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: `${eventSeverityColor(event.severity)}15`,
                        color: eventSeverityColor(event.severity),
                      }}
                    >
                      {event.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields for the trust and friction composite score">
        <div className="grid-3">
          {[
            ["payment_success_rate", "Completed vs attempted charges — primary trust signal (weight: 30%)"],
            ["form_completion_rate", "Funnel data: forms opened vs charges completed — friction measure (25%)"],
            ["repeat_donation_rate", "Donors who give again within 12 months — loyalty/trust proxy (20%)"],
            ["time_to_confirm", "Frontend timing: form open to charge completion — UX speed signal (15%)"],
            ["mobile_ux_score", "Composite of mobile CVR, load time and form abandons (10%)"],
            ["AI approach", "Composite scoring (weighted formula) — optional AI for anomaly alerts on score drops"],
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

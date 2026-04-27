"use client";

import { Layers3, PoundSterling, TrendingUp, CheckCircle } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Progress,
  ScoreRing,
} from "../../_components/PillarUI";
import { FUND_FLOWS } from "../../_data/intelligenceData";

const fmtGBP = (n: number) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}M` : `£${(n / 1_000).toFixed(0)}k`;

const totalDonated = FUND_FLOWS.reduce((s, f) => s + f.donated, 0);
const totalDisbursed = FUND_FLOWS.reduce((s, f) => s + f.disbursed, 0);
const avgEfficiency = FUND_FLOWS.reduce((s, f) => s + f.outcomePerPound, 0) / FUND_FLOWS.length;

export default function FundFlowPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Fund Flow & Impact"
        title="Fund flow transparency & impact efficiency"
        description="Tracks money from donation through fund allocation to programme disbursement, with outcome-per-£ scores for every fund. Full financial transparency from gift to impact."
        actions={
          <button className="btn btn-secondary btn-sm">
            <CheckCircle className="h-3.5 w-3.5" /> Export fund report
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Total donated YTD"
          value={fmtGBP(totalDonated)}
          delta="24.7%"
          positive
          hint="across all funds"
          icon={<PoundSterling className="h-4 w-4" />}
        />
        <Stat
          label="Total disbursed"
          value={fmtGBP(totalDisbursed)}
          delta={`${((totalDisbursed / totalDonated) * 100).toFixed(0)}% of donated`}
          positive
          hint="to programmes"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Avg outcomes per £1"
          value={`£${avgEfficiency.toFixed(1)}`}
          delta="+0.4 vs last year"
          positive
          hint="weighted across funds"
          icon={<Layers3 className="h-4 w-4" />}
        />
        <Stat
          label="Best-performing fund"
          value="Water for All"
          delta="£6.4 outcomes per £1"
          positive
          hint="highest efficiency ratio"
        />
      </div>

      <AIInsight title="Pillar AI – fund flow insight" tone="teal">
        Your <strong>Water for All</strong> fund delivers <strong>£6.4 in outcomes per £1 donated</strong>, the highest in your portfolio and{" "}
        <strong>42% above the UK charity sector average</strong> for WASH programmes. However, the fund is under-subscribed
        relative to demand. The current disbursement pipeline has capacity for £280k more this year. Pillar suggests a targeted
        reallocation campaign for Sadaqah Jariyah donors currently giving to the general fund.
      </AIInsight>

      {/* Fund flow cards */}
      <Section title="Fund-by-fund flow & efficiency" subtitle="Donation → allocation → disbursement with outcomes per £">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FUND_FLOWS.map((fund) => {
            const allocationPct = (fund.allocated / fund.donated) * 100;
            const disbursePct = (fund.disbursed / fund.donated) * 100;
            return (
              <div
                key={fund.fund}
                style={{
                  padding: "20px 24px",
                  border: `1px solid ${fund.colour}25`,
                  borderLeft: `4px solid ${fund.colour}`,
                  borderRadius: "var(--r-lg)",
                  background: "rgb(255 255 255 / 0.7)",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 24, alignItems: "center", marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{fund.fund}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {fund.programmes.map((p) => (
                        <span key={p} style={{ fontSize: 11, padding: "2px 8px", background: `${fund.colour}12`, color: fund.colour, borderRadius: 99, fontWeight: 600 }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{fmtGBP(fund.donated)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>donated</div>
                  </div>
                  <ScoreRing
                    value={Math.round(fund.outcomePerPound * 12)}
                    label="Eff. score"
                    color={fund.colour}
                    size={60}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>
                      Allocated {allocationPct.toFixed(0)}%
                    </div>
                    <Progress value={allocationPct} color={fund.colour} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
                      {fmtGBP(fund.allocated)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>
                      Disbursed {disbursePct.toFixed(0)}%
                    </div>
                    <Progress value={disbursePct} color="#10b981" />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
                      {fmtGBP(fund.disbursed)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Undisbursed</div>
                    <Progress value={((fund.allocated - fund.disbursed) / fund.donated) * 100} color="#f59e0b" />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginTop: 4 }}>
                      {fmtGBP(fund.allocated - fund.disbursed)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: fund.colour,
                      }}
                    >
                      £{fund.outcomePerPound.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      per £1
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Impact efficiency comparison */}
      <Section title="Outcomes per £: fund comparison" subtitle="Efficiency benchmark across all active funds">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...FUND_FLOWS].sort((a, b) => b.outcomePerPound - a.outcomePerPound).map((fund) => (
            <div
              key={fund.fund}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 60px",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{fund.fund}</div>
              <Progress value={(fund.outcomePerPound / 7) * 100} color={fund.colour} />
              <div style={{ fontSize: 14, fontWeight: 700, color: fund.colour, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                £{fund.outcomePerPound.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields for fund flow transparency and impact efficiency">
        <div className="grid-3">
          {[
            ["fund_id", "Identifies the destination fund and joins the charge to its allocation record."],
            ["allocation_data", "Internal fund management records showing how donated money is divided"],
            ["disbursement_data", "Actual payment records to programmes, suppliers, partners"],
            ["campaign_linkage", "Links campaigns to funds, enabling per-campaign impact reporting."],
            ["project / outcome data", "Outcome metrics per programme (beneficiaries, wells built, meals delivered)"],
            ["AI approach", "Core reporting only. Optional AI layer for disbursement anomaly alerts."],
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

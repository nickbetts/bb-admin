"use client";

import { Trophy, Info } from "lucide-react";
import { PageHeader, MockupBanner, Section, AIInsight, Progress } from "../../_components/PillarUI";
import { BENCHMARKS } from "../../_data/mockData";

export default function BenchmarksPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Benchmarks"
        title="How you compare"
        description="Aggregated, anonymised performance from charities on Pillar — see how your fundraising stacks up against peers and the top quartile."
        actions={
          <span style={{ display: "inline-flex", gap: 6, fontSize: 12, color: "var(--text-3)", alignItems: "center" }}>
            <Info className="h-3.5 w-3.5" /> Peer cohort: UK charities, £1M–£5M annual income
          </span>
        }
      />

      <AIInsight title="Pillar AI — your edge" tone="teal">
        You&rsquo;re outperforming peers on <strong>4 of 6 metrics</strong>. Your strongest advantage is{" "}
        <strong>email conversion</strong> (+33% vs peers). Your biggest opportunity is closing the{" "}
        <strong>upgrade rate</strong> gap to the top quartile (+3.2 pts available, ≈ £18,400 in incremental ARR).
      </AIInsight>

      <Section title="Performance vs peers vs top 10%" padded>
        <div style={{ display: "grid", gap: 22 }}>
          {BENCHMARKS.map((b) => {
            const max = Math.max(b.you, b.peers, b.top) * 1.1;
            const youPct = (b.you / max) * 100;
            const peersPct = (b.peers / max) * 100;
            const topPct = (b.top / max) * 100;
            const beatsPeers = b.lowerIsBetter ? b.you < b.peers : b.you > b.peers;
            const beatsTop = b.lowerIsBetter ? b.you < b.top : b.you > b.top;
            return (
              <div key={b.metric}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{b.metric}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      {b.lowerIsBetter ? "Lower is better" : "Higher is better"}
                    </div>
                  </div>
                  <span className={beatsPeers ? "badge badge-emerald" : "badge badge-amber"}>
                    {beatsPeers ? (beatsTop ? "Top quartile" : "Above peers") : "Below peers"}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <Row label="You" value={`${b.unit === "£" ? "£" : ""}${b.you}${b.unit === "%" ? "%" : ""}`} pct={youPct} color="#14b8a6" highlight />
                  <Row label="Peer median" value={`${b.unit === "£" ? "£" : ""}${b.peers}${b.unit === "%" ? "%" : ""}`} pct={peersPct} color="#6366f1" />
                  <Row label="Top 10%" value={`${b.unit === "£" ? "£" : ""}${b.top}${b.unit === "%" ? "%" : ""}`} pct={topPct} color="#a855f7" />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Where you sit in the cohort" subtitle="Your overall Pillar Score across all benchmarked metrics">
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "conic-gradient(#14b8a6 0deg, #6366f1 280deg, var(--border-subtle) 280deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 14,
                borderRadius: "50%",
                background: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 700, color: "var(--text)", letterSpacing: "-1px" }}>78</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pillar score</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              <Trophy className="h-4 w-4" style={{ display: "inline", verticalAlign: "-3px", marginRight: 6, color: "#f59e0b" }} />
              Top 22% of UK mid-size charities
            </div>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 16 }}>
              You&rsquo;re ahead of the median on retention, email conversion and acquisition cost. Closing the gap on
              upgrade rate and average gift size would push you firmly into the top decile.
            </p>
            <button className="btn btn-primary btn-sm">View full benchmark report</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Row({ label, value, pct, color, highlight }: { label: string; value: string; pct: number; color: string; highlight?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 14, alignItems: "center" }}>
      <div style={{ fontSize: 12, fontWeight: highlight ? 700 : 500, color: highlight ? "var(--text)" : "var(--text-2)" }}>{label}</div>
      <Progress value={pct} color={color} />
      <div style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? "var(--text)" : "var(--text-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

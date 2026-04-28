"use client";

import { FlaskConical, Trophy } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, StatusBadge, Progress, PageStack } from "../../_components/PillarCommsUI";
import { AB_TESTS } from "../../_data/extendedData";

export default function ABTestsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a855f7", marginBottom: 8 }}>Outbound · A/B &amp; bandit tests</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #a855f7, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          A/B &amp; bandit tests
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Multi-armed bandits over subject lines, send times, channel mixes and creative variants - shifting traffic to winners while you sleep.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Tests running" value={AB_TESTS.filter((t) => t.status === "running" || t.status === "winner-detected").length.toString()} icon={<FlaskConical className="h-4 w-4" />} />
          <Stat label="Winners last 30d" value="14" hint="auto-promoted" />
          <Stat label="Avg open lift" value="+18%" hint="winners vs control" />
          <Stat label="Compute spent" value="£0" hint="bandits run on-edge" />
        </div>
        <AIInsight title="The Ramadan subject test reached significance in 3 hours" tone="indigo">
          Variant 5 (&quot;Tonight only - double impact for orphans&quot;) won at 97% confidence, lifting open rate +22%. The bandit has already shifted 92% of remaining traffic to the winner. <strong>Auto-promote to default template?</strong>
        </AIInsight>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
          {AB_TESTS.map((t) => (
            <div key={t.id} style={{ padding: 14, border: t.status === "winner-detected" ? "1px solid #10b98148" : "1px solid var(--border-subtle)", borderRadius: 10, background: t.status === "winner-detected" ? "rgb(16 185 129 / 0.04)" : "rgb(255 255 255 / 0.7)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.id} · {t.variants} variants</div>
                </div>
                <StatusBadge label={t.status} color={t.status === "winner-detected" ? "#10b981" : t.status === "completed" ? "#6366f1" : "#f59e0b"} />
              </div>
              {t.winner && (
                <div style={{ marginTop: 10, padding: 10, background: "rgb(16 185 129 / 0.08)", border: "1px solid rgb(16 185 129 / 0.20)", borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#10b981" }}>
                    <Trophy className="h-3 w-3" /> Winner: {t.winner}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>{t.lift}</div>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>
                  <span>Confidence</span>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{Math.round(t.confidence * 100)}%</span>
                </div>
                <Progress value={t.confidence * 100} color={t.confidence > 0.9 ? "#10b981" : t.confidence > 0.6 ? "#f59e0b" : "#94a3b8"} />
              </div>
              {!t.winner && (
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>{t.lift}</div>
              )}
            </div>
          ))}
        </div>
        <Section title="Bandit allocation · Ramadan subject test" subtitle="Live traffic % per variant">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { v: "V5 · Tonight only - double impact", pct: 92, color: "#10b981" },
              { v: "V1 · Just hours left to give before sunset", pct: 4, color: "#94a3b8" },
              { v: "V2 · Your Zakat can still reach Yemen tonight", pct: 2, color: "#94a3b8" },
              { v: "V3 · Ya {first_name}, the night of power is here", pct: 1, color: "#94a3b8" },
              { v: "V4 · One tap. One life. One night.", pct: 1, color: "#94a3b8" },
            ].map((b) => (
              <div key={b.v} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) 1fr 50px", gap: 12, alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--text-2)" }}>{b.v}</span>
                <Progress value={b.pct} color={b.color} />
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: b.color, textAlign: "right" }}>{b.pct}%</span>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

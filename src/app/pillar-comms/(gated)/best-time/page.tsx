"use client";

import { Clock } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, Heatmap, PageStack } from "../../_components/PillarCommsUI";
import { BEST_TIME_HEATMAP } from "../../_data/extendedData";

export default function BestTimePage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f59e0b", marginBottom: 8 }}>AI Layer · Send-time intelligence</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #f59e0b, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Send-time intelligence
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>The model learns each donor&apos;s personal best window - layered with religious calendar, prayer schedule and time-zone.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Donors profiled" value="84,210" hint="≥ 3 opens needed" icon={<Clock className="h-4 w-4" />} />
          <Stat label="Predicted open lift" value="+18%" hint="vs blast send" />
          <Stat label="Predicted click lift" value="+24%" hint="vs blast send" />
          <Stat label="Best global window" value="Wed 09:30" hint="for non-Ramadan periods" />
        </div>
        <AIInsight title="Ramadan flips the heatmap completely" tone="amber">
          During non-Ramadan, peak open hours are <strong>09:00-11:00</strong> weekdays. During Ramadan, opens shift to <strong>20:00-22:00</strong> (post-iftar) and <strong>03:00-04:00</strong> (suhoor). The model auto-detects the calendar and re-routes sends without you doing anything.
        </AIInsight>
        <Section title="Open density heatmap · 7 days × 24 hours" subtitle="Last 90 days · all channels">
          <Heatmap data={BEST_TIME_HEATMAP} weeks={24} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
            <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
            Brightest cell: <strong>Tue 09:00</strong> (9.0/10 density). Secondary peak: <strong>Wed 18:00</strong>. Notable trough: weekends 02:00-06:00.
          </div>
        </Section>
        <Section title="Per-channel optimum · this week" subtitle="Personalised send windows by channel">
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto auto", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Channel</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Best window</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Lift</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Confidence</div>
            {[
              { c: "Email", w: "Wed 09:30 BST", l: "+22%", conf: "0.94" },
              { c: "SMS", w: "Tue 18:00 BST", l: "+14%", conf: "0.88" },
              { c: "WhatsApp", w: "Thu 20:30 BST", l: "+28%", conf: "0.91" },
              { c: "Voice", w: "Wed 10:30-12:00 BST", l: "+18%", conf: "0.86" },
              { c: "Direct mail", w: "Mon delivery", l: "+11%", conf: "0.78" },
            ].map((r) => (
              <Row key={r.c} c={r.c} w={r.w} l={r.l} conf={r.conf} />
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ c, w, l, conf }: { c: string; w: string; l: string; conf: string }) {
  return (
    <>
      <span style={{ color: "var(--text)", fontWeight: 600 }}>{c}</span>
      <span style={{ color: "var(--text-2)" }}>{w}</span>
      <span style={{ fontWeight: 800, color: "#10b981" }}>{l}</span>
      <span style={{ color: "var(--text-3)" }}>{conf}</span>
    </>
  );
}

"use client";

import { GitBranch, Sparkles } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ChannelChip, Progress, PageStack } from "../../_components/PillarCommsUI";
import { CADENCES } from "../../_data/extendedData";

export default function CadencesPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#14b8a6", marginBottom: 8 }}>Outbound · Cadences</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #14b8a6, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Cadences &amp; journeys
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Multi-channel donor journeys with AI step-injection, waterfall fallbacks, and live performance.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Active cadences" value={CADENCES.length.toString()} icon={<GitBranch className="h-4 w-4" />} />
          <Stat label="Donors enrolled" value="84,420" hint="across all cadences" />
          <Stat label="Avg completion rate" value="62%" hint="+8 pts vs FY25" />
          <Stat label="Avg reply rate" value="34%" hint="2-way enabled" />
          <Stat label="Donation lift (vs control)" value="+51%" hint="AI-injected steps" />
        </div>
        <AIInsight title="The recurring-failure cadence is your highest-ROI journey" tone="teal">
          71% donation-recovery lift on £482 audience = ~£34k saved last 30 days. The model has identified 3 step modifications (move SMS from step 3 to step 2; soften voice script on first call; add WhatsApp template at step 5) that A/B tests predict will lift recovery another <strong>+18%</strong>.
        </AIInsight>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {CADENCES.map((c) => (
            <div key={c.id} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 10, background: "rgb(255 255 255 / 0.7)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{c.steps} steps · {c.audience.toLocaleString()} donors</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>{c.channels.map((ch) => <ChannelChip key={ch} channel={ch as "email" | "sms" | "whatsapp" | "voice" | "direct-mail"} />)}</div>
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Completion" value={`${c.completionRate}%`} pct={c.completionRate} color="#14b8a6" />
                <Row label="Reply rate" value={`${c.replyRate}%`} pct={c.replyRate} color="#6366f1" />
                {c.donationLift > 0 && <Row label="Donation lift" value={`+${c.donationLift}%`} pct={Math.min(100, c.donationLift)} color="#10b981" />}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <button className="btn btn-secondary btn-sm">Open</button>
                <button className="btn btn-secondary btn-sm"><Sparkles className="h-3 w-3" /> Optimise</button>
              </div>
            </div>
          ))}
        </div>
        <Section title="Journey canvas · Welcome series · first-time donor" subtitle="AI-injected steps highlighted">
          <div style={{ display: "flex", alignItems: "center", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {[
              { step: "Day 0", title: "Welcome email", channel: "email", ai: false },
              { step: "Day 1", title: "AI follow-up · sentiment-aware", channel: "email", ai: true },
              { step: "Day 3", title: "WhatsApp · field photo", channel: "whatsapp", ai: true },
              { step: "Day 7", title: "Impact report (PDF)", channel: "email", ai: false },
              { step: "Day 14", title: "AI ask · next-best-amount", channel: "email", ai: true },
            ].map((s) => (
              <div key={s.step} style={{ minWidth: 180, padding: 12, border: s.ai ? "1px solid #8b5cf650" : "1px solid var(--border-subtle)", borderRadius: 8, background: s.ai ? "rgb(139 92 246 / 0.05)" : "white" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.step}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 4, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <ChannelChip channel={s.channel as "email" | "sms" | "whatsapp" | "voice" | "direct-mail"} />
                  {s.ai && <Tag label="AI" tone="indigo" />}
                </div>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: "var(--text)" }}>{value}</span>
      </div>
      <Progress value={pct} color={color} />
    </div>
  );
}

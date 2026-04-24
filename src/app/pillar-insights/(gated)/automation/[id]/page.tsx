"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Copy, Sparkles } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Section,
  Stat,
  Tag,
  KeyValue,
  AIInsight,
  Funnel,
} from "../../../_components/PillarUI";
import { JOURNEYS } from "../../../_data/mockData";
import { getJourneySteps, type JourneyStep } from "../../../_data/extendedData";

const stepColours: Record<JourneyStep["type"], { bg: string; border: string; icon: string }> = {
  trigger: { bg: "rgb(99 102 241 / 0.10)", border: "#6366f1", icon: "⚡" },
  wait: { bg: "rgb(148 163 184 / 0.10)", border: "#94a3b8", icon: "⏱" },
  email: { bg: "rgb(20 184 166 / 0.10)", border: "#14b8a6", icon: "✉️" },
  sms: { bg: "rgb(20 184 166 / 0.10)", border: "#14b8a6", icon: "💬" },
  branch: { bg: "rgb(245 158 11 / 0.10)", border: "#f59e0b", icon: "⤴" },
  tag: { bg: "rgb(168 85 247 / 0.10)", border: "#a855f7", icon: "🏷" },
  exit: { bg: "rgb(244 63 94 / 0.10)", border: "#f43f5e", icon: "⏹" },
  task: { bg: "rgb(236 72 153 / 0.10)", border: "#ec4899", icon: "📋" },
};

export default function JourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const journey = JOURNEYS.find((j) => j.id === id) ?? JOURNEYS[0];
  const steps = getJourneySteps(journey.id);

  const totalSent = steps.reduce((s, step) => s + (step.metric?.sent ?? 0), 0);
  const totalConverted = steps.reduce((s, step) => s + (step.metric?.converted ?? 0), 0);

  const funnelSteps = steps
    .filter((s) => s.metric?.sent || s.metric?.converted)
    .map((s) => ({
      label: s.label,
      value: s.metric?.sent ?? s.metric?.converted ?? 0,
    }));

  return (
    <div className="page animate-in">
      <MockupBanner />
      <Link href="/pillar-insights/automation" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 16 }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to journeys
      </Link>

      <PageHeader
        eyebrow={`Journey · ${journey.id}`}
        title={journey.name}
        description={`Triggered when: ${journey.trigger}. Audience: ${journey.audience}. Channel: ${journey.channel}.`}
        actions={
          <>
            <Tag label={journey.status} tone={journey.status === "live" ? "emerald" : journey.status === "draft" ? "neutral" : "amber"} />
            <button className="btn btn-secondary btn-sm"><Sparkles className="h-3.5 w-3.5" /> AI optimise</button>
            <button className="btn btn-secondary btn-sm"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
            <button className="btn btn-secondary btn-sm"><Pause className="h-3.5 w-3.5" /> Pause</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Active in journey" value={journey.active.toLocaleString()} hint="right now" />
        <Stat label="Conversion rate" value={`${journey.conversion.toFixed(1)}%`} delta="+3.2pp" positive hint="vs last 30d" />
        <Stat label="Total messages sent" value={totalSent.toLocaleString()} hint="across all steps" />
        <Stat label="Conversions" value={totalConverted.toLocaleString()} hint="goal events" />
      </div>

      <Section title="Visual flow" subtitle="Drag-and-drop journey builder - boxes connect with conditional branches">
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "8px 0" }}>
          {steps.map((step, i) => {
            const c = stepColours[step.type];
            return (
              <div key={step.id}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "14px 16px",
                    border: `1.5px solid ${c.border}`,
                    background: c.bg,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 11, color: c.border, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{step.type}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{step.label}</div>
                        {step.description && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{step.description}</div>}
                      </div>
                      {step.metric && (
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-3)" }}>
                          {step.metric.sent !== undefined && <span><strong style={{ color: "var(--text-2)" }}>{step.metric.sent.toLocaleString()}</strong> sent</span>}
                          {step.metric.opened !== undefined && <span><strong style={{ color: "var(--text-2)" }}>{step.metric.opened.toLocaleString()}</strong> opened</span>}
                          {step.metric.clicked !== undefined && <span><strong style={{ color: "var(--text-2)" }}>{step.metric.clicked.toLocaleString()}</strong> clicked</span>}
                          {step.metric.converted !== undefined && <span><strong style={{ color: "#14b8a6" }}>{step.metric.converted.toLocaleString()}</strong> converted</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                    <div style={{ width: 2, height: 18, background: "var(--border-subtle)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid-2">
        <Section title="Step-by-step funnel" subtitle="Where supporters drop off">
          {funnelSteps.length > 0 ? <Funnel steps={funnelSteps} /> : <div style={{ color: "var(--text-3)", fontSize: 13 }}>No metric data yet.</div>}
        </Section>
        <div style={{ display: "grid", gap: 16 }}>
          <AIInsight title="Pillar AI suggestion" tone="teal">
            Email 2a is your strongest converting step (4.4% to gift). Test sending it to <strong>all</strong> branches (engaged + unengaged) instead of branching - simulated lift +18%.
          </AIInsight>
          <AIInsight title="Cohort impact" tone="indigo">
            Supporters who completed this journey gave on average <strong>£182</strong> in the following 12 months vs <strong>£64</strong> for non-enrolled controls. Net incremental revenue per enrolled supporter: <strong>£118</strong>.
          </AIInsight>
        </div>
      </div>

      <Section title="Configuration">
        <KeyValue
          columns={3}
          items={[
            { label: "Trigger", value: journey.trigger },
            { label: "Audience", value: journey.audience },
            { label: "Primary channel", value: journey.channel },
            { label: "Step count", value: journey.steps.toString() },
            { label: "Goal event", value: "Donation completed" },
            { label: "Cooldown", value: "60 days" },
            { label: "Quiet hours", value: "21:00 - 09:00 BST" },
            { label: "Throttle", value: "≤ 4 messages / week / supporter" },
            { label: "Owner", value: "Hira Ali" },
          ]}
        />
      </Section>
    </div>
  );
}

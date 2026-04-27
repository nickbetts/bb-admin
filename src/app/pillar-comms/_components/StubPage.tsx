"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MockupBanner, Section, AIInsight, Tag } from "./PillarCommsUI";

export interface StubFeature {
  title: string;
  description: string;
}

export function StubPage({
  eyebrow,
  title,
  subtitle,
  features,
  ai,
  related,
  accent = "#8b5cf6",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: StubFeature[];
  ai?: { title: string; body: string; tone?: "indigo" | "teal" | "amber" | "rose" };
  related?: { label: string; href: string }[];
  accent?: string;
}) {
  return (
    <div className="page animate-in">
      <MockupBanner />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, marginBottom: 8 }}>
          {eyebrow}
        </div>
        <h1
          className="page-title gradient-text"
          style={{
            fontSize: 30,
            margin: 0,
            background: `linear-gradient(135deg, ${accent}, #f43f5e)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title}
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>{subtitle}</p>
      </div>

      {ai && (
        <AIInsight title={ai.title} tone={ai.tone ?? "rose"}>
          {ai.body}
        </AIInsight>
      )}

      <Section title="What this surface delivers" subtitle="Mockup capabilities planned for this view">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 16,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-md)",
                background: "rgb(255 255 255 / 0.7)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${accent}, #f43f5e)`,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.title}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{f.description}</div>
            </div>
          ))}
        </div>
      </Section>

      {related && related.length > 0 && (
        <Section title="Related views" subtitle="Jump to a connected surface">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 99,
                  border: "1px solid var(--border-subtle)",
                  background: "rgb(255 255 255 / 0.7)",
                  textDecoration: "none",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {r.label} <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <Tag label="Mockup" />
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          Static preview - no live data fetched. Wired to mock fixtures only.
        </span>
      </div>
    </div>
  );
}

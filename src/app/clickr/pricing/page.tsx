"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, Zap } from "lucide-react";
import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";

const accent = "#f97316";
const accentDark = "#ea580c";
const accentLight = "#fdba74";
const accentGlow = "rgba(249,115,22,0.45)";

// ── Pricing data ──────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Try clickr with one real page. No card required.",
    cta: "Get started free",
    ctaHref: "/clickr/signup",
    featured: false,
    features: [
      "1 landing page, forever",
      "clickr.marketing subdomain",
      "Meridian AI generation",
      "CRO audit pass",
      "Lead capture form",
      "clickr watermark",
    ],
    limits: {
      pages: "1 forever",
      domain: "*.clickr.marketing",
      audits: "CRO only",
      chatEditor: false,
      abVariants: false,
      noWatermark: false,
      leadStorage: false,
      conversionTracking: false,
      versionHistory: false,
      crmIntegrations: false,
      notifications: false,
      webhooks: false,
      templates: false,
      support: "Community",
    },
  },
  {
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 15,
    description: "For agencies and freelancers running active campaigns.",
    cta: "Start free trial",
    ctaHref: "/clickr/signup?plan=starter",
    featured: true,
    features: [
      "10 landing pages / month",
      "Custom subdomain",
      "Full 3-pass audit (CRO, design, copy)",
      "Chat editor — refine with natural language",
      "A/B variant generation",
      "No watermark",
      "Lead capture + form submission storage",
      "Conversion tracking (GA4, Google Ads, Meta, TikTok)",
      "10 version history",
      "Email support",
    ],
    limits: {
      pages: "10 / month",
      domain: "Custom subdomain",
      audits: "CRO + Design + Copy",
      chatEditor: true,
      abVariants: true,
      noWatermark: true,
      leadStorage: true,
      conversionTracking: true,
      versionHistory: "10 versions",
      crmIntegrations: false,
      notifications: false,
      webhooks: false,
      templates: false,
      support: "Email",
    },
  },
  {
    name: "Pro",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "Unlimited pages, full integrations, and dedicated support.",
    cta: "Get Pro",
    ctaHref: "/clickr/signup?plan=pro",
    featured: false,
    features: [
      "Unlimited landing pages",
      "Custom subdomain",
      "Full 3-pass audit",
      "Chat editor",
      "A/B variant generation",
      "No watermark",
      "Lead capture + storage + routing",
      "All conversion tracking platforms",
      "Unlimited version history",
      "CRM integrations (HubSpot, Salesforce, Zoho, Pipedrive)",
      "Slack + Teams notifications",
      "Custom webhooks",
      "Template library",
      "Priority generation queue",
      "Dedicated onboarding",
    ],
    limits: {
      pages: "Unlimited",
      domain: "Custom subdomain",
      audits: "CRO + Design + Copy",
      chatEditor: true,
      abVariants: true,
      noWatermark: true,
      leadStorage: true,
      conversionTracking: true,
      versionHistory: "Unlimited",
      crmIntegrations: true,
      notifications: true,
      webhooks: true,
      templates: true,
      support: "Priority + Onboarding",
    },
  },
];

const comparisonRows: { label: string; key: keyof (typeof plans)[0]["limits"] }[] = [
  { label: "Landing pages",           key: "pages" },
  { label: "Subdomain",               key: "domain" },
  { label: "AI audit passes",         key: "audits" },
  { label: "Chat editor",             key: "chatEditor" },
  { label: "A/B variant generation",  key: "abVariants" },
  { label: "No clickr watermark",     key: "noWatermark" },
  { label: "Lead storage",            key: "leadStorage" },
  { label: "Conversion tracking",     key: "conversionTracking" },
  { label: "Version history",         key: "versionHistory" },
  { label: "CRM integrations",        key: "crmIntegrations" },
  { label: "Slack / Teams alerts",    key: "notifications" },
  { label: "Custom webhooks",         key: "webhooks" },
  { label: "Template library",        key: "templates" },
  { label: "Support",                 key: "support" },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel at any time from your billing portal. You keep access until the end of your billing period. No questions asked.",
  },
  {
    q: "What counts as a landing page?",
    a: "Each time you generate a new page from a brief, that counts as one landing page. Re-generating or editing an existing page using the chat editor does not count towards your limit.",
  },
  {
    q: "Do I keep my pages if I downgrade?",
    a: "Yes. Your published pages stay live. You won't be able to generate new pages beyond the Free plan's limit until you upgrade again.",
  },
  {
    q: "Can I use a custom domain?",
    a: "Starter and Pro plans get a custom subdomain at *.clickr.marketing. Full custom domains (e.g. landing.youragency.com) are on the Pro roadmap.",
  },
  {
    q: "How does the AI generation work?",
    a: "Meridian — i3MEDIA's proprietary marketing intelligence — scrapes your client's website for real brand context (colours, copy, services, testimonials), then builds a complete, conversion-optimised page. No placeholder copy. Real content from the first draft.",
  },
  {
    q: "What CRMs are supported on Pro?",
    a: "HubSpot, Salesforce, Zoho CRM, and Pipedrive at launch. Integrations via native API connections — no Zapier required. Additional CRMs are added based on user demand.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Starter includes a 14-day free trial. Pro includes a 7-day free trial. No card required to start.",
  },
  {
    q: "What happens to the watermark when I upgrade?",
    a: "The watermark is removed from all your pages instantly on the next page load, with no regeneration required.",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CellValue({ val }: { val: boolean | string }) {
  if (typeof val === "boolean") {
    return val
      ? <CheckCircle2 size={18} color="#22c55e" style={{ display: "block", margin: "0 auto" }} />
      : <XCircle size={18} color="rgba(255,255,255,0.15)" style={{ display: "block", margin: "0 auto" }} />;
  }
  return <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "4px 0",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "white",
          fontSize: 15,
          fontWeight: 600,
          textAlign: "left",
          gap: 16,
        }}
      >
        {q}
        <span style={{ color: accentLight, flexShrink: 0, fontSize: 20, lineHeight: 1 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 18, marginTop: 0 }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit", minHeight: "100vh" }}>
      <ClickrNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 120,
          paddingBottom: 80,
          paddingLeft: 40,
          paddingRight: 40,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "60%",
            paddingBottom: "30%",
            top: "-10%",
            left: "20%",
            pointerEvents: "none",
            background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 65%)",
          }}
        />
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: accentLight,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          Pricing
        </p>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            marginBottom: 18,
            color: "white",
          }}
        >
          Simple, transparent pricing.
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.48)", maxWidth: 500, margin: "0 auto 36px" }}>
          One tool. Every campaign. No per-integration fees, no hidden limits on features you actually use.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "8px 10px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={() => setAnnual(false)}
            style={{
              padding: "7px 20px",
              borderRadius: 30,
              fontSize: 13,
              fontWeight: 600,
              background: !annual ? "rgba(255,255,255,0.1)" : "transparent",
              color: !annual ? "white" : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              padding: "7px 20px",
              borderRadius: 30,
              fontSize: 13,
              fontWeight: 600,
              background: annual ? `rgba(249,115,22,0.18)` : "transparent",
              color: annual ? accentLight : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Annual
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 20,
                background: annual ? accent : "rgba(255,255,255,0.1)",
                color: "white",
                letterSpacing: "0.04em",
              }}
            >
              −20%
            </span>
          </button>
        </div>
      </section>

      {/* ── Pricing cards ────────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 100px" }}>
        <div
          style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
          className="pricing-cards-grid"
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.featured ? "rgba(249,115,22,0.07)" : "rgba(255,255,255,0.03)",
                border: plan.featured ? `1px solid rgba(249,115,22,0.35)` : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative",
                boxShadow: plan.featured ? `0 0 60px rgba(249,115,22,0.1)` : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {plan.featured && (
                <div
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "4px 16px",
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "white",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Most popular
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: accentLight, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  {plan.name}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", color: "white" }}>
                    {plan.monthlyPrice === 0 ? "£0" : `£${annual ? plan.annualPrice : plan.monthlyPrice}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>/ mo</span>
                  )}
                </div>
                {plan.monthlyPrice > 0 && annual && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                    Billed annually — save £{(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                  </p>
                )}
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{plan.description}</p>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 20px",
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  color: "white",
                  background: plan.featured
                    ? `linear-gradient(135deg, ${accent}, ${accentDark})`
                    : "rgba(255,255,255,0.07)",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: plan.featured ? `0 0 28px ${accentGlow}` : "none",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                {plan.cta} <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              textAlign: "center",
              marginBottom: 48,
              color: "white",
            }}
          >
            Compare all features
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 0", color: "rgba(255,255,255,0.35)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    Feature
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.name}
                      style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        color: p.featured ? accentLight : "white",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ label, key }) => (
                  <tr key={key}>
                    <td
                      style={{
                        padding: "14px 0",
                        color: "rgba(255,255,255,0.55)",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </td>
                    {plans.map((p) => (
                      <td
                        key={p.name}
                        style={{
                          padding: "14px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <CellValue val={p.limits[key] as boolean | string} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 40px 100px",
          background: "rgba(255,255,255,0.01)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 48,
              textAlign: "center",
              color: "white",
            }}
          >
            Frequently asked questions
          </h2>
          {faqs.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Zap size={16} color={accentLight} />
            <span style={{ fontSize: 13, color: accentLight, fontWeight: 600 }}>Still unsure?</span>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
            Talk to the team.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 32, lineHeight: 1.7 }}>
            We run paid campaigns for a living. Tell us about your setup and we&apos;ll recommend the right plan — or just show you the tool.
          </p>
          <a
            href="mailto:hello@i3media.co.uk"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 28px",
              borderRadius: 11,
              background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: `0 0 28px ${accentGlow}`,
            }}
          >
            hello@i3media.co.uk <ArrowRight size={15} />
          </a>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        @media (max-width: 860px) {
          .pricing-cards-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          h1 { font-size: 36px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  );
}

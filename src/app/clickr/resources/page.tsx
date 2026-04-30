"use client";

import { useState } from "react";
import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";
import { BookOpen, Download, FileText, Zap, ChevronRight, ArrowRight, CheckCircle2, BarChart2, Target, Globe } from "lucide-react";

const bg = "#09090f";
const accent = "#f97316";
const accentLight = "#fdba74";
const accentDark = "#ea580c";

const guides = [
  {
    slug: "agency-landing-page-playbook",
    badge: "PLAYBOOK",
    badgeColor: accent,
    title: "The Agency Landing Page Playbook",
    subtitle: "How to build, deliver, and charge for high-converting landing pages at scale.",
    description: "A 40-page operational guide for digital agencies. Covers briefing workflow, AI generation, client review process, conversion tracking setup, and how to price LP services. Includes templates and checklists.",
    readTime: "40 min read",
    pages: "40 pages",
    icon: <BookOpen size={20} />,
    topics: ["Briefing workflow", "Client review process", "Pricing & delivery", "CRO fundamentals", "Conversion tracking setup"],
  },
  {
    slug: "cro-checklist",
    badge: "CHECKLIST",
    badgeColor: "#818cf8",
    title: "The 50-Point Landing Page CRO Checklist",
    subtitle: "Everything that should be on every high-converting landing page, point by point.",
    description: "50 actionable items across headline clarity, above-the-fold design, form friction, trust signals, mobile performance, and pixel tracking. Vetted across 1,000+ campaign pages.",
    readTime: "15 min read",
    pages: "12 pages",
    icon: <CheckCircle2 size={20} />,
    topics: ["Headline & subhead structure", "Above-the-fold hierarchy", "Form design principles", "Trust signals & social proof", "Mobile-first layout"],
  },
  {
    slug: "conversion-tracking-guide",
    badge: "TECHNICAL",
    badgeColor: "#34d399",
    title: "Conversion Tracking for PPC Campaigns: The Complete Setup Guide",
    subtitle: "Set up Google Ads, Meta, TikTok, and LinkedIn conversion tracking properly — without firing misfires.",
    description: "Step-by-step instructions for setting up conversion tracking on landing pages. Covers Google Ads Enhanced Conversions, Meta CAPI, TikTok Pixel, LinkedIn Insight Tag, and GTM container setup. Includes test protocols.",
    readTime: "25 min read",
    pages: "22 pages",
    icon: <BarChart2 size={20} />,
    topics: ["Google Ads Enhanced Conversions", "Meta Conversions API", "TikTok Pixel setup", "LinkedIn Insight Tag", "GTM container best practices"],
  },
  {
    slug: "multilingual-landing-pages",
    badge: "STRATEGY",
    badgeColor: "#f59e0b",
    title: "Going Multilingual: How to Scale Paid Campaigns Across Markets",
    subtitle: "The practical guide to multilingual landing pages that maintain conversion rates across languages.",
    description: "Covers localisation strategy, translation QA, cultural CTA adaptation, currency and formatting rules, and how to structure campaigns for international markets without doubling your LP workload.",
    readTime: "20 min read",
    pages: "18 pages",
    icon: <Globe size={20} />,
    topics: ["Localisation vs. translation", "Cultural CTA differences", "International URL structure", "Currency & formatting", "Campaign structure for multilingual"],
  },
];

const featuredResources = [
  {
    icon: <Target size={18} />,
    title: "Landing Page Brief Template",
    desc: "The exact brief format clickr uses internally. Paste your client URL, select campaign type, fill in the brief — done.",
    badge: "FREE TEMPLATE",
    badgeColor: accent,
  },
  {
    icon: <FileText size={18} />,
    title: "Client Proposal Template",
    desc: "A ready-to-use proposal for selling landing page services to clients. Includes pricing table, scope of work, and FAQs.",
    badge: "FREE TEMPLATE",
    badgeColor: accent,
  },
  {
    icon: <Zap size={18} />,
    title: "PPC x LP Strategy Matrix",
    desc: "A spreadsheet mapping campaign objective → LP type → headline formula → CTA format for Google, Meta, TikTok, and LinkedIn.",
    badge: "FREE TOOL",
    badgeColor: "#818cf8",
  },
];

function LeadCaptureForm({ guideTitle, guideSlug }: { guideTitle: string; guideSlug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name) return;
    setLoading(true);
    try {
      await fetch("/api/clickr/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source: `guide:${guideSlug}`, notes: `Guide download: ${guideTitle}` }),
      });
    } catch {
      // fail silently — content still delivered
    }
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div style={{ padding: "22px 24px", borderRadius: 14, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", textAlign: "center" }}>
        <CheckCircle2 size={24} color={accentLight} style={{ margin: "0 auto 10px" }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 6 }}>You&apos;re all set!</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Check your inbox — the guide is on its way.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
      />
      <input
        type="email"
        placeholder="Work email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
      />
      <button type="submit" disabled={loading} style={{ padding: "12px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Download size={15} /> {loading ? "Sending…" : "Download free guide"}
      </button>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", margin: 0 }}>No spam. Unsubscribe any time.</p>
    </form>
  );
}

export default function ResourcesPage() {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  return (
    <div style={{ background: bg, color: "white", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <ClickrNav />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 40px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "70%", paddingBottom: "35%", top: "-10%", left: "15%", background: "radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", marginBottom: 28 }}>
            <BookOpen size={12} color={accentLight} />
            <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>Resources</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.045em", marginBottom: 22, color: "white", lineHeight: 1.05 }}>
            Everything you need to<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>run better campaigns.</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 0 }}>
            Free guides, checklists, templates, and tools from the clickr team. Built for performance marketers who want to improve conversion rates, not waste time on admin.
          </p>
        </div>
      </section>

      {/* ── GUIDES ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "20px 40px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Guides & Playbooks</p>
            <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", color: "white", marginBottom: 8 }}>In-depth guides for serious marketers.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>Download free — no paywall, no drip sequence, just the content.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }} className="guides-grid">
            {guides.map((guide) => (
              <div key={guide.slug} style={{ borderRadius: 20, border: `1px solid ${activeGuide === guide.slug ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.07)"}`, background: activeGuide === guide.slug ? "rgba(249,115,22,0.04)" : "rgba(255,255,255,0.02)", overflow: "hidden", transition: "border-color 0.25s ease, background 0.25s ease" }}>
                {/* Guide header */}
                <div style={{ padding: "28px 28px 24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", color: accentLight, flexShrink: 0 }}>
                      {guide.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: guide.badgeColor, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: `${guide.badgeColor}18`, border: `1px solid ${guide.badgeColor}30` }}>{guide.badge}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{guide.readTime}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>·</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{guide.pages}</span>
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 6 }}>{guide.title}</h3>
                      <p style={{ fontSize: 13, color: accentLight, margin: 0, fontWeight: 600 }}>{guide.subtitle}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 18 }}>{guide.description}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {guide.topics.map((topic, ti) => (
                      <span key={ti} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", padding: "3px 9px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>{topic}</span>
                    ))}
                  </div>
                  <button onClick={() => setActiveGuide(activeGuide === guide.slug ? null : guide.slug)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: activeGuide === guide.slug ? "rgba(249,115,22,0.15)" : `linear-gradient(135deg, ${accent}, ${accentDark})`, border: activeGuide === guide.slug ? "1px solid rgba(249,115,22,0.3)" : "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    {activeGuide === guide.slug ? "Hide form" : (<><Download size={14} /> Download free</>)}
                  </button>
                </div>

                {/* Lead capture form */}
                {activeGuide === guide.slug && (
                  <div style={{ padding: "0 28px 28px", borderTop: "1px solid rgba(249,115,22,0.12)" }}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 14, marginTop: 22 }}>Enter your details and we&apos;ll send the guide directly to your inbox.</p>
                    <LeadCaptureForm guideTitle={guide.title} guideSlug={guide.slug} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE TEMPLATES ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Free Templates & Tools</p>
            <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", color: "white" }}>Grab and use immediately.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="templates-3col">
            {featuredResources.map((r, i) => (
              <div key={i} style={{ padding: "26px 24px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>{r.icon}</div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: r.badgeColor, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 4, background: `${r.badgeColor}18`, border: `1px solid ${r.badgeColor}28`, marginBottom: 8, display: "inline-block" }}>{r.badge}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: 8 }}>{r.title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.43)", lineHeight: 1.65, margin: 0 }}>{r.desc}</p>
                </div>
                <a href="mailto:hello@i3media.co.uk?subject=Resource request" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: accentLight, textDecoration: "none" }}>
                  Request this <ArrowRight size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px 120px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16, color: "white" }}>
            Ready to build better pages?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 36 }}>
            Start generating fully branded, conversion-optimised landing pages from any URL in under 60 seconds.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 12, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 28px rgba(249,115,22,0.35)` }}>
              <Zap size={15} /> Try clickr free
            </a>
            <a href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
              Read the blog <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        @media (max-width: 900px) { .guides-grid { grid-template-columns: 1fr !important; } .templates-3col { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px) { .templates-3col { grid-template-columns: 1fr !important; } section { padding-left: 20px !important; padding-right: 20px !important; } h1 { font-size: 36px !important; } h2 { font-size: 26px !important; } }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";
import { Zap, ChevronRight, Filter } from "lucide-react";

const bg = "#09090f";
const accent = "#f97316";
const accentLight = "#fdba74";
const accentDark = "#ea580c";

type TemplateCategory = "All" | "Lead Gen" | "E-commerce" | "Events" | "SaaS" | "Local";

const templates = [
  {
    id: "lead-gen-professional-services",
    name: "Professional Services Lead Gen",
    category: "Lead Gen" as TemplateCategory,
    description: "Form-first layout optimised for solicitors, accountants, consultants, and financial services. Social proof above the fold, friction-free 3-field form, clear next-step CTA.",
    tags: ["B2B", "Form", "Trust signals"],
    convGoal: "Contact form submission",
    mockupLines: [
      { w: "60%", h: 14, color: "rgba(255,255,255,0.9)", mt: 0 },
      { w: "85%", h: 8, color: "rgba(255,255,255,0.4)", mt: 8 },
      { w: "40%", h: 8, color: "rgba(255,255,255,0.25)", mt: 4 },
      { w: "100%", h: 80, color: "rgba(249,115,22,0.07)", mt: 14, isForm: true },
      { w: "50%", h: 34, color: accent, mt: 10, isCta: true },
    ],
    accentColor: accent,
  },
  {
    id: "ecommerce-product-launch",
    name: "Product Launch — E-commerce",
    category: "E-commerce" as TemplateCategory,
    description: "Hero product shot (placeholder), scarcity element, benefit list, and urgency-driven CTA. Designed for Shopify and WooCommerce ad campaigns.",
    tags: ["DTC", "Scarcity", "Shopify"],
    convGoal: "Add to cart / shop now",
    mockupLines: [
      { w: "100%", h: 60, color: "rgba(255,255,255,0.04)", mt: 0, isImg: true },
      { w: "70%", h: 12, color: "rgba(255,255,255,0.85)", mt: 10 },
      { w: "45%", h: 8, color: "rgba(249,115,22,0.7)", mt: 5 },
      { w: "90%", h: 6, color: "rgba(255,255,255,0.25)", mt: 6 },
      { w: "60%", h: 30, color: "#ef4444", mt: 10, isCta: true },
    ],
    accentColor: "#ef4444",
  },
  {
    id: "event-registration",
    name: "Conference & Event Registration",
    category: "Events" as TemplateCategory,
    description: "Date/location prominence, speaker grid, agenda preview, and a two-step registration form. Optimised for paid social driving event sign-ups.",
    tags: ["Events", "Two-step form", "Urgency"],
    convGoal: "Event registration",
    mockupLines: [
      { w: "100%", h: 20, color: "rgba(249,115,22,0.12)", mt: 0 },
      { w: "65%", h: 12, color: "rgba(255,255,255,0.85)", mt: 10 },
      { w: "40%", h: 8, color: "rgba(255,255,255,0.4)", mt: 5 },
      { w: "100%", h: 36, color: "rgba(255,255,255,0.03)", mt: 10, isSpeakers: true },
      { w: "55%", h: 28, color: accent, mt: 10, isCta: true },
    ],
    accentColor: "#818cf8",
  },
  {
    id: "saas-free-trial",
    name: "SaaS Free Trial Sign-Up",
    category: "SaaS" as TemplateCategory,
    description: "Benefit-led hero, one-click OAuth-style CTA, feature proof points, and no-credit-card-required reassurance. Built to reduce friction for trial acquisition.",
    tags: ["SaaS", "Low-friction", "OAuth CTA"],
    convGoal: "Free trial sign-up",
    mockupLines: [
      { w: "75%", h: 14, color: "rgba(255,255,255,0.9)", mt: 0 },
      { w: "55%", h: 8, color: "rgba(255,255,255,0.4)", mt: 6 },
      { w: "60%", h: 32, color: "#3b82f6", mt: 12, isCta: true },
      { w: "40%", h: 6, color: "rgba(255,255,255,0.2)", mt: 6 },
      { w: "100%", h: 30, color: "rgba(255,255,255,0.02)", mt: 10, isFeatures: true },
    ],
    accentColor: "#3b82f6",
  },
  {
    id: "saas-demo-request",
    name: "Demo Request — B2B SaaS",
    category: "SaaS" as TemplateCategory,
    description: "Credibility-first layout with client logos, a multi-step booking form, and ROI proof points. Designed for enterprise-facing B2B software campaigns.",
    tags: ["B2B SaaS", "Demo", "Multi-step"],
    convGoal: "Demo booking",
    mockupLines: [
      { w: "70%", h: 14, color: "rgba(255,255,255,0.9)", mt: 0 },
      { w: "90%", h: 6, color: "rgba(255,255,255,0.3)", mt: 6 },
      { w: "100%", h: 16, color: "rgba(255,255,255,0.02)", mt: 10, isLogos: true },
      { w: "100%", h: 56, color: "rgba(249,115,22,0.06)", mt: 10, isForm: true },
      { w: "55%", h: 28, color: accent, mt: 8, isCta: true },
    ],
    accentColor: "#34d399",
  },
  {
    id: "local-services-lead-gen",
    name: "Local Services Lead Capture",
    category: "Local" as TemplateCategory,
    description: "Trusted by locals, Google reviews widget, phone-first CTA, and a service area map placeholder. Optimised for trades, dental, legal, and beauty.",
    tags: ["Local", "Reviews", "Phone CTA"],
    convGoal: "Phone call / contact",
    mockupLines: [
      { w: "80%", h: 14, color: "rgba(255,255,255,0.85)", mt: 0 },
      { w: "45%", h: 8, color: "rgba(255,255,255,0.35)", mt: 5 },
      { w: "70%", h: 32, color: "#22c55e", mt: 12, isCta: true },
      { w: "100%", h: 14, color: "rgba(255,255,255,0.02)", mt: 8, isReviews: true },
      { w: "50%", h: 6, color: "rgba(255,255,255,0.15)", mt: 4 },
    ],
    accentColor: "#22c55e",
  },
  {
    id: "webinar-signup",
    name: "Webinar & Online Event",
    category: "Events" as TemplateCategory,
    description: "Date countdown placeholder, host bio, agenda bullets, and a clean email capture. Optimised for paid social driving webinar registrations.",
    tags: ["Webinar", "Countdown", "Email capture"],
    convGoal: "Webinar registration",
    mockupLines: [
      { w: "100%", h: 18, color: "rgba(249,115,22,0.08)", mt: 0 },
      { w: "65%", h: 12, color: "rgba(255,255,255,0.88)", mt: 10 },
      { w: "50%", h: 8, color: "rgba(249,115,22,0.6)", mt: 5 },
      { w: "100%", h: 28, color: "rgba(255,255,255,0.02)", mt: 8, isCountdown: true },
      { w: "60%", h: 30, color: accent, mt: 10, isCta: true },
    ],
    accentColor: "#f59e0b",
  },
  {
    id: "charity-donation",
    name: "Charity & Fundraising",
    category: "Lead Gen" as TemplateCategory,
    description: "Impact-first storytelling, progress bar social proof, single-action donation CTA, and trust badges. Designed for paid social charity campaigns.",
    tags: ["Charity", "Donation", "Impact"],
    convGoal: "Donation / sign-up",
    mockupLines: [
      { w: "100%", h: 52, color: "rgba(255,255,255,0.03)", mt: 0, isImg: true },
      { w: "75%", h: 12, color: "rgba(255,255,255,0.88)", mt: 10 },
      { w: "85%", h: 8, color: "rgba(255,255,255,0.35)", mt: 5 },
      { w: "100%", h: 10, color: "rgba(249,115,22,0.25)", mt: 8, isProgress: true },
      { w: "50%", h: 30, color: accent, mt: 10, isCta: true },
    ],
    accentColor: "#f43f5e",
  },
  {
    id: "recruitment-job-ad",
    name: "Recruitment & Job Advertising",
    category: "Lead Gen" as TemplateCategory,
    description: "Role highlight, salary/benefits strip, company culture preview, and a direct-apply form. Optimised for Indeed, LinkedIn, and Google Jobs paid campaigns.",
    tags: ["Recruitment", "CV upload", "Apply CTA"],
    convGoal: "Job application / CV upload",
    mockupLines: [
      { w: "60%", h: 14, color: "rgba(255,255,255,0.9)", mt: 0 },
      { w: "45%", h: 8, color: "rgba(249,115,22,0.65)", mt: 5 },
      { w: "100%", h: 22, color: "rgba(255,255,255,0.02)", mt: 10, isBenefits: true },
      { w: "100%", h: 44, color: "rgba(255,255,255,0.02)", mt: 8, isForm: true },
      { w: "55%", h: 28, color: "#818cf8", mt: 8, isCta: true },
    ],
    accentColor: "#818cf8",
  },
];

const CATEGORIES: TemplateCategory[] = ["All", "Lead Gen", "E-commerce", "Events", "SaaS", "Local"];

function TemplateMockup({ lines, accentColor }: { lines: typeof templates[0]["mockupLines"]; accentColor: string }) {
  return (
    <div style={{ background: "#0d0d16", borderRadius: 10, padding: "14px 14px 12px", border: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden" }}>
      {/* Browser bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", marginLeft: 6 }} />
      </div>
      {/* LP mockup lines */}
      {lines.map((line, i) => (
        <div key={i} style={{ width: line.w, height: line.h, borderRadius: line.isCta ? 6 : 4, background: line.isCta ? `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` : line.color, marginTop: line.mt, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {line.isCta && <span style={{ fontSize: 9, fontWeight: 700, color: "white", opacity: 0.9 }}>CTA</span>}
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("All");

  const filtered = activeCategory === "All" ? templates : templates.filter(t => t.category === activeCategory);

  return (
    <div style={{ background: bg, color: "white", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <ClickrNav />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 40px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "60%", paddingBottom: "30%", top: "-5%", left: "20%", background: "radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", marginBottom: 28 }}>
            <Filter size={12} color={accentLight} />
            <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>{templates.length} Templates</span>
          </div>
          <h1 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.045em", marginBottom: 20, color: "white", lineHeight: 1.05 }}>
            Every campaign type.<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Perfectly optimised.</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.48)", lineHeight: 1.75, marginBottom: 0 }}>
            clickr generates each of these templates from your client&apos;s real brand. Select a campaign type, paste a URL — the page is live in 60 seconds.
          </p>
        </div>
      </section>

      {/* ── FILTER TABS ────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 40px 52px", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 6, padding: "6px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "8px 18px", borderRadius: 10, background: activeCategory === cat ? `linear-gradient(135deg, ${accent}, ${accentDark})` : "transparent", border: "none", color: activeCategory === cat ? "white" : "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── TEMPLATE GRID ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="templates-grid">
            {filtered.map((tmpl) => (
              <div key={tmpl.id} style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", overflow: "hidden", transition: "border-color 0.25s ease, transform 0.25s ease" }} className="tmpl-card">
                {/* Mockup */}
                <div style={{ padding: "18px 18px 0", background: "rgba(255,255,255,0.01)" }}>
                  <TemplateMockup lines={tmpl.mockupLines} accentColor={tmpl.accentColor} />
                </div>
                {/* Details */}
                <div style={{ padding: "20px 22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: tmpl.accentColor, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: `${tmpl.accentColor}18`, border: `1px solid ${tmpl.accentColor}28` }}>{tmpl.category}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.3 }}>{tmpl.name}</h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.65, marginBottom: 14 }}>{tmpl.description}</p>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>
                    <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>Goal:</span> {tmpl.convGoal}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
                    {tmpl.tags.map((tag, ti) => (
                      <span key={ti} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>{tag}</span>
                    ))}
                  </div>
                  <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    <Zap size={12} /> Generate with this template
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
              No templates in this category yet. More coming soon.
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px 120px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16, color: "white" }}>
            Not seeing your campaign type?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 36 }}>
            Tell clickr your campaign goal in the brief and Meridian AI will generate the right page structure for you — no template required.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 12, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 28px rgba(249,115,22,0.35)` }}>
              <Zap size={15} /> Start building free
            </a>
            <a href="/resources" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
              Browse guides <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        .tmpl-card:hover { border-color: rgba(249,115,22,0.22) !important; transform: translateY(-4px); box-shadow: 0 18px 52px rgba(249,115,22,0.08); }
        @media (max-width: 1000px) { .templates-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .templates-grid { grid-template-columns: 1fr !important; } section { padding-left: 20px !important; padding-right: 20px !important; } h1 { font-size: 36px !important; } }
      `}</style>
    </div>
  );
}

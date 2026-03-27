"use client";

import { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { Loader2, ExternalLink, ChevronRight, Phone, Mail, MessageSquare, CheckCircle2, Menu, X as XIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  name: string;
  price: string;
  description?: string;
  hoursPerMonth?: number;
}

interface TimelinePhase {
  title: string;
  duration: string;
  description: string;
}

interface KeywordIdea {
  text: string;
  adGroup: string;
  avgMonthlySearches: number;
  competition: string;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
}

interface AdGroup {
  name: string;
  keywords: string[];
}

interface ProposalGap { title: string; description: string; impact: string }
interface KeywordCluster { intent: string; keywords: string[]; searchVolume: number; opportunity: string }
interface ContentArticle { title: string; targetKeyword: string }

interface ProposalAIData {
  hero?: { tagline: string; description: string };
  whereYouAreNow?: {
    summary: string;
    positives?: Array<{ title: string; description: string }>;
    gaps: ProposalGap[];
  };
  keywordClusters?: KeywordCluster[];
  contentCluster?: {
    pillarPage: { title: string; description: string };
    articles: ContentArticle[];
  };
  whyUs?: Array<{ stat: string; title: string; description: string }>;
  cta?: { headline: string; body: string };
}

interface ProposalData {
  clientName: string;
  website: string;
  brief: string;
  proposalData: ProposalAIData;
  stats: {
    totalKeywords: number;
    totalSearchVolume: number;
    avgCpc: string;
    estimatedClicks: number;
    estimatedConversions: number;
  };
  services: Service[];
  timeline: TimelinePhase[];
  ppc: { maxCpc: number; monthlyBudget: number; conversionRate: number };
  topKeywords: KeywordIdea[];
  adGroups: AdGroup[];
}

interface PublicProposal {
  title: string;
  clientName: string;
  website: string;
  proposalDataJson: string | null;
  services: Service[];
  timeline: TimelinePhase[];
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function competitionLabel(c: string) {
  if (c === "HIGH") return "High";
  if (c === "MEDIUM") return "Med";
  if (c === "LOW") return "Low";
  return c || "—";
}

function intentColor(intent: string): { bg: string; color: string } {
  if (intent === "Transactional") return { bg: "#d1fae5", color: "#065f46" };
  if (intent === "Commercial") return { bg: "#dbeafe", color: "#1e40af" };
  return { bg: "#fef3c7", color: "#92400e" };
}

// ─── PPC Bar Chart ─────────────────────────────────────────────────────────────

function PPCBarChart({ months }: { months: Array<{ label: string; clicks: number; conversions: number }> }) {
  const maxClicks = Math.max(...months.map((m) => m.clicks), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
      {months.map((m, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "flex-end", height: 110 }}>
            <div
              style={{
                width: "70%",
                height: `${Math.round((m.clicks / maxClicks) * 100)}px`,
                background: "linear-gradient(to top, #6366f1, #818cf8)",
                borderRadius: "4px 4px 0 0",
                minHeight: 4,
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
                fontSize: 9, color: "#6366f1", fontWeight: 700, whiteSpace: "nowrap",
              }}>{fmtNum(m.clicks)}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
        <span style={{
          fontSize: 14, fontWeight: 700, color: "#6366f1",
          background: "#ede9fe", padding: "3px 10px", borderRadius: 99,
        }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
        {/* Track background */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 6,
          background: "#e2e8f0", borderRadius: 99,
        }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: 99 }} />
        </div>
        {/* Visible thumb indicator */}
        <div style={{
          position: "absolute",
          left: `calc(${pct}% - 10px)`,
          width: 20, height: 20, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          border: "2.5px solid #fff",
          boxShadow: "0 2px 8px rgba(99,102,241,0.5)",
          pointerEvents: "none",
          zIndex: 1,
        }} />
        {/* Invisible input on top for interaction */}
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%",
            opacity: 0, cursor: "pointer", height: 28, zIndex: 2, margin: 0,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{format(min)}</span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px", ...style }}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 32, height: 3, background: "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: 99 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", lineHeight: 1.2, margin: "0 0 16px" }}>{children}</h2>;
}

// ─── Ad mockup helpers ────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function trunc(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// ─── Google Search Ad preview ─────────────────────────────────────────────────

function GoogleSearchAdCard({
  headline1, headline2, headline3,
  displayUrl, urlPath,
  description1, description2,
}: {
  headline1: string; headline2: string; headline3?: string;
  displayUrl: string; urlPath?: string;
  description1: string; description2?: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #dadce0", borderRadius: 12,
      padding: "16px 20px", fontFamily: "Arial, sans-serif",
    }}>
      {/* Ad badge + display URL */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#188038",
          border: "1px solid #188038", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4,
        }}>Ad</span>
        <span style={{ fontSize: 14, color: "#202124" }}>
          {displayUrl}{urlPath ? ` › ${urlPath}` : ""}
        </span>
      </div>
      {/* Headlines */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 2px", marginBottom: 4 }}>
        {[headline1, headline2, headline3].filter(Boolean).map((h, i, arr) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 20, color: "#1a0dab", lineHeight: 1.3 }}>{h}</span>
            {i < arr.length - 1 && <span style={{ fontSize: 20, color: "#1a0dab", margin: "0 4px" }}>|</span>}
          </span>
        ))}
      </div>
      {/* Descriptions */}
      <p style={{ fontSize: 14, color: "#4d5156", lineHeight: 1.57, margin: 0 }}>
        {description1}{description2 && ` ${description2}`}
      </p>
    </div>
  );
}

// ─── Meta / Social ad preview ─────────────────────────────────────────────────

function MetaAdCard({
  clientName, tagline, description, domain,
}: {
  clientName: string; tagline: string; description: string; domain: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #dde3ef", borderRadius: 12,
      overflow: "hidden", maxWidth: 380,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Profile header */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 15,
        }}>
          {(clientName[0] ?? "?").toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#050505", margin: 0 }}>{clientName}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#65676b" }}>Sponsored</span>
            <span style={{ fontSize: 11, color: "#65676b" }}> · 🌐</span>
          </div>
        </div>
      </div>

      {/* Post body */}
      <p style={{ padding: "0 16px 12px", fontSize: 15, color: "#050505", lineHeight: 1.5, margin: 0 }}>
        {description}
      </p>

      {/* Image placeholder */}
      <div style={{
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        height: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 8, padding: "0 24px",
      }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: "#fff", textAlign: "center", margin: 0, lineHeight: 1.2 }}>
          {tagline}
        </p>
        <p style={{ fontSize: 11, color: "#a5b4fc", margin: 0, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          i3media · Digital Marketing
        </p>
      </div>

      {/* Footer with CTA */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid #e4e6eb",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#050505", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tagline}</p>
          <p style={{ fontSize: 12, color: "#65676b", margin: "2px 0 0" }}>{domain}</p>
        </div>
        <button style={{
          background: "#e4e6eb", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#050505",
          cursor: "default", flexShrink: 0,
        }}>
          Learn More
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props { params: Promise<{ token: string }> }

// Nav items that map to section IDs
const NAV_SECTIONS = [
  { id: "ppc-forecaster", label: "PPC Forecast" },
  { id: "ad-previews", label: "Ad Mockups" },
  { id: "services", label: "Services" },
  { id: "keywords", label: "Keywords" },
  { id: "content", label: "Content" },
  { id: "keyword-data", label: "Research" },
  { id: "timeline", label: "Timeline" },
  { id: "contact", label: "Get Started" },
];

// ─── Sticky Nav ────────────────────────────────────────────────────────────────

function StickyNav({ clientName, token }: { clientName: string; token: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 120);
      // Detect active section
      for (const nav of [...NAV_SECTIONS].reverse()) {
        const el = document.getElementById(nav.id);
        if (el && el.getBoundingClientRect().top <= 90) {
          setActiveSection(nav.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!scrolled) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(15,12,41,0.96)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      transition: "all 0.2s",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 52 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginRight: "auto" }}>{clientName}</span>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden-mobile">
          {NAV_SECTIONS.map((nav) => (
            <button
              key={nav.id}
              onClick={() => scrollTo(nav.id)}
              style={{
                background: activeSection === nav.id ? "rgba(99,102,241,0.2)" : "transparent",
                border: "none", color: activeSection === nav.id ? "#a5b4fc" : "#94a3b8",
                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {nav.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("contact")}
            style={{
              marginLeft: 8, background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              border: "none", color: "#fff", padding: "7px 16px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Get Started →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
          className="show-mobile"
        >
          {mobileOpen ? <XIcon style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{ background: "#1e1b4b", padding: "12px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {NAV_SECTIONS.map((nav) => (
            <button
              key={nav.id}
              onClick={() => scrollTo(nav.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", color: "#94a3b8",
                padding: "10px 0", fontSize: 14, fontWeight: 500, cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {nav.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) { .hidden-mobile { display: none !important; } }
        @media (min-width: 641px) { .show-mobile { display: none !important; } }
      `}</style>
    </div>
  );
}

// ─── Enquiry Form ─────────────────────────────────────────────────────────────

function EnquiryForm({ token, clientName }: { token: string; clientName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/proposal/${token}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle2 style={{ width: 32, height: 32, color: "#16a34a" }} />
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Message sent!</h3>
        <p style={{ fontSize: 15, color: "#a5b4fc", margin: 0, lineHeight: 1.6 }}>
          Thanks {name.split(" ")[0]}! We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 6, letterSpacing: "0.04em" }}>
            Your Name *
          </label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(165,180,252,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 6, letterSpacing: "0.04em" }}>
            Email *
          </label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(165,180,252,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 6, letterSpacing: "0.04em" }}>
          Phone (optional)
        </label>
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 000000"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(165,180,252,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 6, letterSpacing: "0.04em" }}>
          Message *
        </label>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi, I'd love to discuss this proposal for ${clientName}…`}
          rows={4}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(165,180,252,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }}
        />
      </div>
      {error && (
        <p style={{ fontSize: 13, color: "#fca5a5", margin: 0 }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px 24px", background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {submitting ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <ChevronRight style={{ width: 16, height: 16 }} />}
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

export default function ShareProposalPage({ params }: Props) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<PublicProposal | null>(null);
  const [data, setData] = useState<ProposalData | null>(null);

  // PPC forecaster interactive state
  const [cpc, setCpc] = useState(1.5);
  const [budget, setBudget] = useState(1500);
  const [convRate, setConvRate] = useState(3);

  // Service hours sliders
  const [serviceHours, setServiceHours] = useState<number[]>([]);

  const pinged = useRef(false);

  const ping = useCallback(() => {
    if (pinged.current) return;
    pinged.current = true;
    fetch(`/api/share/proposal/${token}/ping`, { method: "POST" }).catch(() => { /* silent */ });
  }, [token]);

  // ── Source-code protection ─────────────────────────────────────────────────
  // These measures deter casual inspection and prevent automated scrapers.
  // They cannot stop a determined technical user, but raise the barrier
  // significantly for non-technical recipients.
  useEffect(() => {
    // Block right-click context menu
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    // Block keyboard shortcuts used to view/save source
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C → DevTools
      // Ctrl+U → View Source,  Ctrl+S → Save As
      if (
        e.key === "F12" ||
        (ctrl && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
        (ctrl && ["u", "U", "s", "S"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/proposal/${token}`);
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json() as { proposal: PublicProposal };
        const p = json.proposal;
        setMeta(p);
        if (p.proposalDataJson) {
          try {
            const d = JSON.parse(p.proposalDataJson) as ProposalData;
            setData(d);
            if (d.ppc.maxCpc > 0) setCpc(d.ppc.maxCpc);
            if (d.ppc.monthlyBudget > 0) setBudget(d.ppc.monthlyBudget);
            if (d.ppc.conversionRate > 0) setConvRate(d.ppc.conversionRate);
            setServiceHours(d.services.map((s) => s.hoursPerMonth ?? 0));
          } catch { /* use fallback */ }
        }
        // Fire view ping after successful load
        ping();
      } catch { setNotFound(true); } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, ping]);

  // PPC calculations
  const ppcMetrics = useMemo(() => {
    const clicks = cpc > 0 ? Math.round(budget / cpc) : 0;
    const conversions = Math.round(clicks * convRate / 100);
    // Build 6-month ramp (month 1 = 60%, +8% each month)
    const months = Array.from({ length: 6 }, (_, i) => {
      const ramp = Math.min(1, 0.6 + i * 0.08);
      return {
        label: ["M1", "M2", "M3", "M4", "M5", "M6"][i],
        clicks: Math.round(clicks * ramp),
        conversions: Math.round(conversions * ramp),
      };
    });
    return { clicks, conversions, months };
  }, [cpc, budget, convRate]);

  // Service hours → price adjustment
  const serviceTotal = useMemo(() => {
    if (!data) return null;
    // Estimate hourly rate from base price if parseable
    return data.services.map((s, i) => {
      const hours = serviceHours[i] ?? s.hoursPerMonth ?? 0;
      return { ...s, hours };
    });
  }, [data, serviceHours]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6366f1", margin: "0 auto 12px" }} className="animate-spin" />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading proposal…</p>
        </div>
      </div>
    );
  }

  if (notFound || !meta) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Proposal not found</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>This link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  const ai = data?.proposalData;
  const stats = data?.stats;
  const services = meta.services;
  const timeline = meta.timeline;
  const topKws = data?.topKeywords ?? [];
  const adGroups = data?.adGroups ?? [];

  return (
    <div
      style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", userSelect: "none", WebkitUserSelect: "none" }}
      onCopy={(e) => {
        // Allow copy within form inputs so the enquiry form works normally
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
      }}
    >
      {/* ── Print & copy protection styles ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          body::before {
            display: block !important;
            content: '';
            position: fixed;
            inset: 0;
            background: white;
          }
          body::after {
            display: block !important;
            content: 'CONFIDENTIAL — This proposal is prepared exclusively for the named recipient by i3media. Unauthorised reproduction, distribution or use is strictly prohibited.';
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            text-align: center;
            padding: 48px;
            white-space: pre-wrap;
          }
        }
        /* Invisible diagonal watermark visible on every printed page */
        @media print {
          html::before {
            content: 'CONFIDENTIAL · i3media';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 72px;
            font-weight: 900;
            color: rgba(0,0,0,0.04);
            white-space: nowrap;
            pointer-events: none;
            z-index: 9999;
          }
        }
        /* Prevent drag-selection highlight */
        * { -webkit-tap-highlight-color: transparent; }
        a { -webkit-user-drag: none; }
        /* Always allow selection inside form inputs for usability */
        input, textarea, select { user-select: text !important; -webkit-user-select: text !important; }
        /* Reset range input so custom thumb renders cleanly */
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; }
        input[type=range]::-webkit-slider-runnable-track { background: transparent; }
        input[type=range]::-moz-range-thumb { width: 1px; height: 1px; border: none; background: transparent; }
        /* Responsive helpers for new grid sections */
        @media (max-width: 700px) {
          .prop-pillars { grid-template-columns: 1fr !important; }
          .prop-channels { grid-template-columns: 1fr !important; }
          .prop-arch-row { grid-template-columns: 1fr !important; }
          .prop-forecast-grid { grid-template-columns: 1fr !important; }
          .prop-contact-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>

      {/* ── Sticky Nav (portal-like, rendered at top) ── */}
      <StickyNav clientName={meta.clientName} token={token} />

      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(145deg, #0c1426 0%, #0f172a 40%, #131f38 72%, #0e1a31 100%)", color: "#fff", padding: "80px 24px 100px", position: "relative", overflow: "hidden" }}>
        {/* Decorative orbs */}
        <div aria-hidden="true" style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.07) 0%, transparent 70%)", top: -200, right: -150, pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 70%)", bottom: -100, left: -80, pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,.18) 0%, transparent 70%)", top: "30%", right: "25%", pointerEvents: "none" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Kicker label with line */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 28, height: 1, background: "#64748b" }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b" }}>Digital Strategy Proposal</span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.06, margin: "0 0 20px", letterSpacing: "-1.5px", color: "#fff" }}>
            {ai?.hero?.tagline ?? `Growing ${meta.clientName} Online`}
          </h1>
          {/* Blue accent divider */}
          <div style={{ width: 48, height: 3, background: "#3b82f6", borderRadius: 2, marginBottom: 24 }} />
          <p style={{ fontSize: 17, color: "#94a3b8", lineHeight: 1.75, maxWidth: 580, margin: "0 0 48px" }}>
            {ai?.hero?.description ?? `A comprehensive digital marketing strategy for ${meta.clientName}.`}
          </p>

          {/* Stats row */}
          {stats && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 48 }}>
              {[
                { value: fmtNum(stats.totalKeywords), label: "Keywords Identified" },
                { value: fmtNum(stats.totalSearchVolume), label: "Monthly Searches" },
                { value: String(adGroups.length), label: "Ad Groups" },
                { value: fmtNum(ppcMetrics.clicks), label: "Est. Monthly Clicks" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", minWidth: 90 }}>
                  <p style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1, letterSpacing: "-1.5px" }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "6px 0 0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hero meta strip */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 28 }}>
            <div>
              <strong style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", marginBottom: 3 }}>Client</strong>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{meta.clientName}</span>
            </div>
            {meta.website && (
              <div>
                <strong style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", marginBottom: 3 }}>Website</strong>
                <a href={meta.website.startsWith("http") ? meta.website : `https://${meta.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ExternalLink style={{ width: 12, height: 12 }} />
                  {meta.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
            <div>
              <strong style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", marginBottom: 3 }}>Prepared</strong>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{new Date(meta.updatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", marginBottom: 3 }}>Services</strong>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{services.length} included</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Where You Are Now ── */}
      {ai?.whereYouAreNow && (
        <div style={{ background: "#f8fafc" }}>
          <Section>
            <SectionLabel>Current Position</SectionLabel>
            <H2>Where You Are Now</H2>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
              {ai.whereYouAreNow.summary}
            </p>
            {(ai.whereYouAreNow.positives ?? []).length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16a34a", marginBottom: 16 }}>What you do well</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
                  {(ai.whereYouAreNow.positives ?? []).map((pos, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, borderLeft: "4px solid #22c55e" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>{pos.title}</h3>
                      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{pos.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 16 }}>Where the gaps are</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {(ai.whereYouAreNow.gaps ?? []).map((gap, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, borderLeft: "4px solid #ef4444" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>{gap.title}</h3>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" }}>{gap.description}</p>
                  <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, margin: 0 }}>Impact: {gap.impact}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Strategy Pillars ── */}
      <div style={{ background: "#0f172a", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 24, height: 1, background: "#60a5fa" }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#60a5fa" }}>The Strategy</span>
          </div>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1.15, margin: "0 0 14px" }}>
            Three pillars. One coherent plan.
          </h2>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 600, lineHeight: 1.75, marginBottom: 40 }}>
            Every element of this strategy — content, paid search, and keyword research — is built around the same underlying data. They reinforce each other rather than running in parallel.
          </p>
          <div className="prop-pillars" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Pillar 1: Content & SEO */}
            <div style={{ borderRadius: 16, padding: 28, background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.07)", top: -50, right: -50 }} />
              <span style={{ fontSize: "1.75rem", display: "block", marginBottom: 14, position: "relative", zIndex: 1 }}>📄</span>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 8px", position: "relative", zIndex: 1 }}>Content &amp; SEO</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.72)", lineHeight: 1.65, margin: 0, position: "relative", zIndex: 1 }}>
                Long-form content assets built around the keywords your ideal clients are actively searching. Pillar pages, guides, and articles designed to rank and convert.
              </p>
              {ai?.contentCluster && (
                <span style={{ display: "inline-block", background: "rgba(255,255,255,.18)", color: "rgba(255,255,255,.9)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginTop: 18, position: "relative", zIndex: 1 }}>
                  {ai.contentCluster.articles.length} articles · 1 pillar page
                </span>
              )}
            </div>
            {/* Pillar 2: Paid Media */}
            <div style={{ borderRadius: 16, padding: 28, background: "linear-gradient(135deg, #7c2d12, #c2410c)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.07)", top: -50, right: -50 }} />
              <span style={{ fontSize: "1.75rem", display: "block", marginBottom: 14, position: "relative", zIndex: 1 }}>🎯</span>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 8px", position: "relative", zIndex: 1 }}>Paid Media</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.72)", lineHeight: 1.65, margin: 0, position: "relative", zIndex: 1 }}>
                Structured campaigns across Google Search and Meta, built around your target keywords. Ad groups mapped to specific intent with coverage for every stage of the buying journey.
              </p>
              <span style={{ display: "inline-block", background: "rgba(255,255,255,.18)", color: "rgba(255,255,255,.9)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginTop: 18, position: "relative", zIndex: 1 }}>
                {adGroups.length > 0 ? `${adGroups.length} ad groups` : "Google · Meta"} · {fmtNum(ppcMetrics.clicks)} est. clicks/mo
              </span>
            </div>
            {/* Pillar 3: Keyword Research */}
            <div style={{ borderRadius: 16, padding: 28, background: "linear-gradient(135deg, #14532d, #16a34a)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.07)", top: -50, right: -50 }} />
              <span style={{ fontSize: "1.75rem", display: "block", marginBottom: 14, position: "relative", zIndex: 1 }}>🔍</span>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 8px", position: "relative", zIndex: 1 }}>Keyword Research</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.72)", lineHeight: 1.65, margin: 0, position: "relative", zIndex: 1 }}>
                In-depth keyword research across every intent stage — informational, commercial, and transactional — so content and campaigns speak to clients wherever they are in their journey.
              </p>
              <span style={{ display: "inline-block", background: "rgba(255,255,255,.18)", color: "rgba(255,255,255,.9)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginTop: 18, position: "relative", zIndex: 1 }}>
                {stats ? `${fmtNum(stats.totalKeywords)} keywords · ${fmtNum(stats.totalSearchVolume)}/mo searches` : "Full keyword map"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PPC Forecaster (Interactive) ── */}
      <Section id="ppc-forecaster">
        <SectionLabel>PPC Forecasting</SectionLabel>
        <H2>Your PPC Performance Forecast</H2>
        <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
          Use the sliders below to model different PPC scenarios. Adjust your CPC, monthly budget, and expected conversion rate to see how your campaigns could perform.
        </p>

        <div className="prop-forecast-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* Sliders */}
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 24px" }}>Adjust Your Inputs</h3>
            <Slider
              label="Average CPC"
              value={cpc} min={0.1} max={15} step={0.1}
              format={(v) => `£${v.toFixed(2)}`}
              onChange={setCpc}
            />
            <Slider
              label="Monthly Budget"
              value={budget} min={100} max={10000} step={100}
              format={(v) => fmtCurrency(v)}
              onChange={setBudget}
            />
            <Slider
              label="Conversion Rate"
              value={convRate} min={0.5} max={15} step={0.5}
              format={(v) => `${v}%`}
              onChange={setConvRate}
            />
          </div>

          {/* Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", borderRadius: 16, padding: 24, color: "#fff" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Monthly Clicks</p>
              <p style={{ fontSize: 40, fontWeight: 900, margin: 0, lineHeight: 1 }}>{fmtNum(ppcMetrics.clicks)}</p>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 16, padding: 24, border: "1px solid #bbf7d0" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Conversions/Month</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#15803d", margin: 0, lineHeight: 1 }}>{ppcMetrics.conversions}</p>
            </div>
            <div style={{ background: "#fff7ed", borderRadius: 16, padding: 24, border: "1px solid #fed7aa" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cost Per Conversion</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#c2410c", margin: 0, lineHeight: 1 }}>
                {ppcMetrics.conversions > 0 ? fmtCurrency(Math.round(budget / ppcMetrics.conversions)) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 6-month chart */}
        <div style={{ background: "#f8fafc", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0", marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>6-Month Performance Ramp</h3>
          <PPCBarChart months={ppcMetrics.months} />
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, textAlign: "center" }}>
            Campaigns typically ramp up over 6 months as optimisation improves Quality Scores and ad relevancy.
          </p>
        </div>
      </Section>

      {/* ── Ad Creatives / Mockups ── */}
      {(adGroups.length > 0 || meta.website) && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="ad-previews">
            <SectionLabel>Ad Creatives</SectionLabel>
            <H2>How Your Ads Will Look</H2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 48 }}>
              Below are mockups of how your ads will appear across Google Search and Meta (Facebook &amp; Instagram). Each ad is built around your target keywords and campaign goals.
            </p>

            {/* Paid Media Channels Overview */}
            <div className="prop-channels" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 48 }}>
              {([
                {
                  title: "Google PPC", sub: "Search & Display", icon: "G",
                  gradient: "linear-gradient(135deg, #ea4335, #fbbc04)",
                  rows: [
                    ["Ad groups", adGroups.length > 0 ? String(adGroups.length) : "Structured"] as [string, string],
                    ["Match types", "Exact, Phrase, Broad"] as [string, string],
                    ["Intent", "Bottom-of-funnel"] as [string, string],
                    ["Keywords", stats ? fmtNum(stats.totalKeywords) : "Researched"] as [string, string],
                  ],
                },
                {
                  title: "Meta Ads", sub: "Facebook & Instagram", icon: "📱",
                  gradient: "linear-gradient(135deg, #3b5998, #c2185b)",
                  rows: [
                    ["Targeting", "Interest + lookalike"] as [string, string],
                    ["Formats", "Static, video, story"] as [string, string],
                    ["Retargeting", "Site visitor audiences"] as [string, string],
                    ["Funnel", "Awareness + retarget"] as [string, string],
                  ],
                },
                {
                  title: "LinkedIn Ads", sub: "Sponsored Content", icon: "in",
                  gradient: "linear-gradient(135deg, #0077b5, #0a66c2)",
                  rows: [
                    ["Targeting", "Job title + company"] as [string, string],
                    ["Formats", "Single image + carousel"] as [string, string],
                    ["Strategy", "ABM & lead gen"] as [string, string],
                    ["Funnel", "Mid-funnel awareness"] as [string, string],
                  ],
                },
              ] as Array<{ title: string; sub: string; icon: string; gradient: string; rows: Array<[string, string]> }>).map((ch) => (
                <div key={ch.title} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <div style={{ background: ch.gradient, padding: "22px 20px 18px", color: "#fff", position: "relative" }}>
                    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.12)" }} />
                    <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 8, position: "relative" }}>{ch.icon}</span>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 3px", position: "relative" }}>{ch.title}</h3>
                    <span style={{ fontSize: 12, opacity: 0.88, position: "relative" }}>{ch.sub}</span>
                  </div>
                  <div style={{ background: "#fff", padding: "14px 18px" }}>
                    {ch.rows.map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#334155" }}>
                        <span>{k}</span>
                        <strong style={{ color: "#0f172a", fontWeight: 700 }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Google Search Ads */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🔍</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", margin: 0 }}>Google Search Ads</h3>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
                Your ads will appear at the top of Google Search results when potential customers search for your target keywords.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(adGroups.length > 0
                  ? adGroups.slice(0, 3)
                  : [{ name: meta.clientName, keywords: [] }]
                ).map((group, i) => {
                  const domain = extractDomain(meta.website || "example.com");
                  const urlPath = slugify(group.name).slice(0, 20);
                  const heroDesc = ai?.hero?.description;
                  const firstSentence = heroDesc ? heroDesc.split(/\.\s/)[0] + "." : null;
                  const descs = [
                    firstSentence ?? `${meta.clientName} provides expert ${group.name.toLowerCase()} services.`,
                    `Speak to our specialist team about ${group.name.toLowerCase()}. Results-driven campaigns tailored to your business goals.`,
                    `Trusted ${group.name.toLowerCase()} experts. Dedicated account management and transparent monthly reporting.`,
                  ];
                  const ctaLines = [
                    "Get a Free Quote Today",
                    "Contact Us Now",
                    "Book a Consultation",
                  ];
                  return (
                    <GoogleSearchAdCard
                      key={i}
                      headline1={trunc(meta.clientName, 30)}
                      headline2={trunc(group.name, 30)}
                      headline3={ctaLines[i % 3]}
                      displayUrl={domain}
                      urlPath={urlPath}
                      description1={trunc(descs[i % descs.length], 90)}
                      description2="Call now · No obligation · Results guaranteed"
                    />
                  );
                })}
              </div>
            </div>

            {/* Meta / Social Ads */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>📱</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", margin: 0 }}>Meta (Facebook &amp; Instagram) Ads</h3>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
                Targeted social media ads designed to reach your ideal customers on Facebook and Instagram.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <MetaAdCard
                  clientName={meta.clientName}
                  tagline={trunc(ai?.hero?.tagline ?? `Grow ${meta.clientName} Online`, 40)}
                  description={trunc(
                    ai?.hero?.description ??
                    `Looking to grow your business online? ${meta.clientName} is partnering with i3media to reach more customers through targeted digital marketing.`,
                    140,
                  )}
                  domain={extractDomain(meta.website || "example.com")}
                />
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── Services & Hours ── */}
      {services.length > 0 && (
        <div style={{ background: "#fff" }}>
          <Section id="services">
            <SectionLabel>Our Services</SectionLabel>
            <H2>What&apos;s Included</H2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
              Each service includes a dedicated monthly allocation of hours. Use the sliders to explore how adjusting your hours allocation affects your package.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(serviceTotal ?? services.map((s, i) => ({ ...s, hours: serviceHours[i] ?? 0 }))).map((svc, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: svc.hours > 0 ? 20 : 0 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>{svc.name}</p>
                      {svc.description && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{svc.description}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#6366f1", margin: 0 }}>{svc.price}</p>
                      {svc.hours > 0 && (
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{svc.hours}h/month allocated</p>
                      )}
                    </div>
                  </div>
                  {svc.hours > 0 && (
                    <Slider
                      label="Monthly Hours"
                      value={serviceHours[i] ?? svc.hours}
                      min={1} max={40} step={1}
                      format={(v) => `${v}h/mo`}
                      onChange={(v) => setServiceHours((prev) => prev.map((h, idx) => idx === i ? v : h))}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Keyword Clusters ── */}
      {(ai?.keywordClusters ?? []).length > 0 && (
        <Section id="keywords">
          <SectionLabel>Keyword Strategy</SectionLabel>
          <H2>Search Intent Clusters</H2>
          <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 32 }}>
            We&apos;ve grouped your target keywords by search intent to ensure campaigns reach the right audiences at each stage of the buying journey.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(ai?.keywordClusters ?? []).map((cluster, i) => {
              const { bg, color } = intentColor(cluster.intent);
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: bg, color }}>{cluster.intent}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{fmtNum(cluster.searchVolume)}/mo searches</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", margin: 0, flex: 1, textAlign: "right", minWidth: 140 }}>{cluster.opportunity}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {cluster.keywords.map((kw, j) => (
                      <span key={j} style={{ padding: "4px 10px", background: "#f1f5f9", borderRadius: 6, fontSize: 12, color: "#475569" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Content Cluster ── */}
      {ai?.contentCluster && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="content">
            <SectionLabel>Content Strategy</SectionLabel>
            <H2>Content Hub Plan</H2>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", borderRadius: 16, padding: 28, color: "#fff", marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", margin: "0 0 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pillar Page</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{ai.contentCluster.pillarPage.title}</h3>
              <p style={{ fontSize: 14, color: "#c4b5fd", margin: 0, lineHeight: 1.6 }}>{ai.contentCluster.pillarPage.description}</p>
            </div>

            {/* Content architecture breakdown */}
            <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0 24px" }}>
              {([
                {
                  type: "Pillar Page", isPillar: true, count: 1, countLabel: "total",
                  title: "The commercial centrepiece",
                  desc: "Decision-intent keyword targeting — full service description, proof points, and a clear route to enquiry.",
                  chips: [
                    { label: "Decision intent", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
                    { label: "Direct enquiry", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
                  ],
                },
                {
                  type: "Articles", isPillar: false, count: ai.contentCluster.articles.length, countLabel: "articles",
                  title: "Topic cluster coverage",
                  desc: "Each article targets a defined keyword, covering the full range of searches a potential client makes across their decision journey.",
                  chips: [
                    { label: "Mixed intent", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
                    { label: "Long-tail coverage", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
                  ],
                },
              ] as Array<{ type: string; isPillar: boolean; count: number; countLabel: string; title: string; desc: string; chips: Array<{ label: string; color: string; bg: string; border: string }> }>).map((row, i, arr) => (
                <div key={i} className="prop-arch-row" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 24, alignItems: "start", padding: "22px 0", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 12px", borderRadius: 6, display: "inline-block", marginBottom: 10, ...(row.isPillar ? { background: "#0f172a", color: "#fff" } : { background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0" }) }}>{row.type}</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.05em", display: "block" }}>{row.count}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.countLabel}</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{row.title}</h4>
                    <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.7, margin: "0 0 10px" }}>{row.desc}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {row.chips.map((chip, j) => (
                        <span key={j} style={{ fontSize: 11.5, padding: "3px 12px", borderRadius: 20, border: `1px solid ${chip.border}`, background: chip.bg, color: chip.color }}>{chip.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>All Articles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {ai.contentCluster.articles.map((article, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>{article.title}</p>
                  <p style={{ fontSize: 11, color: "#6366f1", margin: 0 }}>Target: {article.targetKeyword}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Top Keywords Table ── */}
      {topKws.length > 0 && (
        <Section id="keyword-data">
          <SectionLabel>Keyword Research</SectionLabel>
          <H2>Top Keywords by Search Volume</H2>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Keyword", "Monthly Searches", "Competition", "CPC (High)"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topKws.slice(0, 15).map((kw, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1e293b" }}>{kw.text}</td>
                    <td style={{ padding: "10px 16px", color: "#6366f1", fontWeight: 600 }}>{fmtNum(kw.avgMonthlySearches)}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>{competitionLabel(kw.competition)}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>{kw.highTopOfPageBidMicros ? `£${(kw.highTopOfPageBidMicros / 1_000_000).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Timeline ── */}
      {timeline.length > 0 && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="timeline">
            <SectionLabel>Project Timeline</SectionLabel>
            <H2>Your Roadmap to Growth</H2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {timeline.map((phase, i) => (
                <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 0", borderBottom: i < timeline.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>{phase.title}</p>
                      <span style={{ padding: "4px 12px", background: "#ede9fe", color: "#6366f1", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{phase.duration}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Why i3media ── */}
      {(ai?.whyUs ?? []).length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)", padding: "80px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.1em", textTransform: "uppercase" }}>Why choose us</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: "0 0 56px", textAlign: "center" }}>Why i3media?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {(ai!.whyUs ?? []).map((item, i) => (
                <div key={i} style={{ textAlign: "center", padding: "32px 24px" }}>
                  <p style={{ fontSize: 48, fontWeight: 900, color: "#ffffff", lineHeight: 1, margin: "0 0 8px" }}>{item.stat}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#c7d2fe", margin: "0 0 10px" }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: "#a5b4fc", lineHeight: 1.6, margin: "0 auto", maxWidth: 220 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Get Started / Enquiry CTA ── */}
      <div id="contact" style={{ background: "linear-gradient(135deg, #0f0c29, #1e1b4b)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Two-column layout: CTA left, form right */}
          <div className="prop-contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 3, background: "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: 99 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase" }}>Next Steps</span>
              </div>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1.1, margin: "0 0 20px" }}>
                {ai?.cta?.headline ?? `Ready to grow ${meta.clientName}?`}
              </h2>
              <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.7, margin: "0 0 32px" }}>
                {ai?.cta?.body ?? "Get in touch and we'll set up a discovery call to walk you through the strategy, answer your questions, and get things moving."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "📞", title: "Discovery call", desc: "30-minute strategy session — no commitment" },
                  { icon: "📊", title: "Custom roadmap", desc: "We tailor the plan to your timeline and budget" },
                  { icon: "🚀", title: "Fast onboarding", desc: "Campaigns live within 2 weeks of sign-off" },
                ].map((item) => (
                  <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 32, border: "1px solid rgba(165,180,252,0.12)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 20px" }}>
                Send us a message
              </h3>
              <EnquiryForm token={token} clientName={meta.clientName} />
            </div>
          </div>

          {/* Mobile: contact details row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", marginTop: 60, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { Icon: Mail, text: "hello@i3media.co.uk" },
              { Icon: Phone, text: "+44 (0)20 1234 5678" },
              { Icon: MessageSquare, text: "Live chat on our website" },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon style={{ width: 16, height: 16, color: "#6366f1" }} />
                <span style={{ fontSize: 13, color: "#64748b" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: "#080614", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 4px" }}>
          Prepared by <strong style={{ color: "#a5b4fc" }}>i3media</strong> · Digital Marketing Agency
        </p>
        <p style={{ fontSize: 11, color: "#334155", margin: "0 0 12px" }}>
          {new Date(meta.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p style={{ fontSize: 11, color: "#1e293b", margin: 0, lineHeight: 1.5 }}>
          🔒 This proposal is confidential and prepared exclusively for {meta.clientName}.
          Unauthorised sharing, reproduction or use by third parties is strictly prohibited.
        </p>
      </div>

      {/* ── Fixed confidentiality watermark badge ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          background: "rgba(15,12,41,0.82)",
          backdropFilter: "blur(8px)",
          borderRadius: 10,
          padding: "7px 14px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          pointerEvents: "none",
          border: "1px solid rgba(99,102,241,0.3)",
        }}
      >
        <span style={{ fontSize: 13 }}>🔒</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.03em" }}>
          Confidential · i3media
        </span>
      </div>
    </div>
  );
}

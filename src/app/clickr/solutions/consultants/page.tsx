import type { Metadata } from "next";
import Link from "next/link";
import ClickrNav from "../../_components/ClickrNav";
import ClickrFooter from "../../_components/ClickrFooter";
import {
  Zap,
  Clock,
  ArrowRight,
  CheckCircle,
  Star,
  BarChart2,
  Share2,
  Layers,
  Globe,
  MessageSquare,
  GitBranch,
  FileText,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Consultants & Freelancers",
  description:
    "clickr lets freelance performance marketers and independent consultants deliver client landing pages in under 60 seconds. Look like a full agency — without the overhead.",
  alternates: { canonical: "https://lp.bettsandburton.com/solutions/consultants" },
  openGraph: {
    title: "clickr for Consultants & Freelancers | Deliver More, Faster",
    description:
      "Deliver fully-branded, CRO-optimised landing pages for every client campaign. No designers, no handoffs, no waiting.",
    url: "https://lp.bettsandburton.com/solutions/consultants",
  },
};

const accent = "#14b8a6";
const accentDark = "#7c3aed";
const accentLight = "#5eead4";

const painPoints = [
  {
    icon: Clock,
    headline: "Custom builds eat your margin",
    body: "Charging for a landing page but spending 8 hours building it? clickr turns a day's work into 60 seconds — letting you charge the same rate and take on more clients.",
  },
  {
    icon: Star,
    headline: "Clients want agency-quality work",
    body: "As a solo operator, you need to punch above your weight. clickr generates pages that look like they came from a full creative team — because the AI does the heavy lifting.",
  },
  {
    icon: Wallet,
    headline: "Scope creep kills projects",
    body: '"Can you just tweak the headline?" — with chat-based refinement, changes take seconds. Stop billing for revisions. Start delivering them instantly and look like a hero.',
  },
];

const features = [
  {
    icon: Zap,
    title: "60-second page generation",
    body: "Paste the URL, write a brief. Meridian AI scrapes real brand assets and generates a complete, CRO-optimised page. No templates to gut, no lorem ipsum to replace.",
  },
  {
    icon: GitBranch,
    title: "3-pass AI audit included",
    body: "Every page gets a CRO audit, design audit, and copy audit automatically. You hand over pages that are already optimised — before the client even sees them.",
  },
  {
    icon: MessageSquare,
    title: "Instant chat revisions",
    body: "Client wants changes? Type it in plain English. The AI edits the HTML directly. One revision round = seconds, not hours.",
  },
  {
    icon: Share2,
    title: "Professional client preview",
    body: "Share a magic link for client review — no login needed on their side. Looks polished, feels professional. Get sign-off before you publish.",
  },
  {
    icon: BarChart2,
    title: "Conversion tracking wired in",
    body: "Google Ads, Meta, GA4, TikTok, LinkedIn, Microsoft UET — all in one settings panel. No pixel juggling across dashboards.",
  },
  {
    icon: Globe,
    title: "Multi-language pages",
    body: "Got a client running campaigns in multiple markets? Translate any page to 20+ languages in one click. Each translation is independently publishable.",
  },
  {
    icon: Layers,
    title: "Build your template library",
    body: "Create a master template for each campaign type — lead gen, event, product launch — then spin up new client pages from it. Consistent quality every time.",
  },
  {
    icon: FileText,
    title: "Full HTML access",
    body: "Export clean HTML, edit raw code in the built-in CodeMirror editor, or use the live CSS variable editor. Full control when you need it.",
  },
  {
    icon: BarChart2,
    title: "Version history & revert",
    body: "Every AI refinement creates a new version. Compare, preview, and roll back in one click. Great for showing clients the evolution of the page.",
  },
];

const comparisons = [
  { label: "Time to first draft", clickr: "< 60 seconds", other: "4–8 hours" },
  { label: "Revision turnaround", clickr: "Seconds (chat-based)", other: "Hours / next day" },
  { label: "CRO optimisation", clickr: "Automatic (3 passes)", other: "Manual or skipped" },
  { label: "Conversion tracking", clickr: "7 platforms, built-in", other: "Manual pixel install" },
  { label: "Client review flow", clickr: "Magic link (no login)", other: "Screenshots / Loom" },
  { label: "Multi-language support", clickr: "20+ languages", other: "Not included" },
];

export default function ConsultantsPage() {
  return (
    <>
      <ClickrNav />
      <main
        style={{
          background: "#09090f",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          paddingTop: 64,
        }}
      >
        {/* Hero */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "96px 24px 80px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,184,166,0.12) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 20,
                marginBottom: 24,
                background: "rgba(20,184,166,0.1)",
                border: "1px solid rgba(20,184,166,0.25)",
                fontSize: 12,
                fontWeight: 600,
                color: accentLight,
                letterSpacing: "0.04em",
              }}
            >
              FOR CONSULTANTS & FREELANCERS
            </span>
            <h1
              style={{
                fontSize: "clamp(36px, 6vw, 62px)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                margin: "0 0 24px",
              }}
            >
              Deliver more for clients.{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                In less time.
              </span>
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 2.2vw, 20px)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.55)",
                margin: "0 0 40px",
                maxWidth: 600,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              You&apos;re a one-person operation competing against full agencies. clickr gives you
              the same output in a fraction of the time — so you can take on more clients, deliver
              faster, and protect your margin.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                  color: "white",
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 0 32px rgba(20,184,166,0.35)",
                }}
              >
                Start free — no card required <ArrowRight size={16} />
              </Link>
              <Link
                href="/pricing"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View pricing
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 32,
              }}
            >
              {["No credit card required", "Cancel anytime", "14-day free trial"].map((badge) => (
                <span
                  key={badge}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  <CheckCircle size={13} style={{ color: accent }} /> {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pain points */}
        <section style={{ padding: "72px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                marginBottom: 48,
              }}
            >
              THE FREELANCER CHALLENGE
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}
              className="csol-3col"
            >
              {painPoints.map(({ icon: Icon, headline, body }) => (
                <div
                  key={headline}
                  style={{
                    padding: "28px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      marginBottom: 18,
                      background: "rgba(20,184,166,0.1)",
                      border: "1px solid rgba(20,184,166,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      margin: "0 0 10px",
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    {headline}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.45)",
                      margin: 0,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before/After comparison */}
        <section
          style={{
            padding: "72px 24px",
            background: "rgba(255,255,255,0.015)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                marginBottom: 12,
              }}
            >
              THE DIFFERENCE
            </p>
            <h2
              style={{
                textAlign: "center",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: "0 0 48px",
              }}
            >
              clickr vs. the old way
            </h2>
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  background: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 24px",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Task
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: accentLight,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textAlign: "center",
                  }}
                >
                  With clickr
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textAlign: "center",
                  }}
                >
                  Without clickr
                </span>
              </div>
              {comparisons.map(({ label, clickr, other }, i) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    padding: "16px 24px",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    borderBottom:
                      i < comparisons.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(20,184,166,0.9)",
                      textAlign: "center",
                    }}
                  >
                    {clickr}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", textAlign: "center" }}
                  >
                    {other}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: "72px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                marginBottom: 12,
              }}
            >
              WHAT YOU GET
            </p>
            <h2
              style={{
                textAlign: "center",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: "0 0 12px",
              }}
            >
              Everything a solo operator needs
            </h2>
            <p
              style={{
                textAlign: "center",
                fontSize: 16,
                color: "rgba(255,255,255,0.45)",
                margin: "0 0 56px",
                maxWidth: 520,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              No design tool subscription. No developer. No handoff delays. Just a brief and a
              published, conversion-ready page.
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
              className="csol-3col"
            >
              {features.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  style={{
                    padding: "24px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    transition: "border-color 0.2s, transform 0.2s",
                  }}
                  className="csol-card"
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      marginBottom: 14,
                      background: "rgba(20,184,166,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} style={{ color: accent }} />
                  </div>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 8px",
                      color: "rgba(255,255,255,0.88)",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.42)",
                      margin: 0,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            padding: "80px 24px",
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              background: "rgba(20,184,166,0.06)",
              border: "1px solid rgba(20,184,166,0.15)",
              borderRadius: 24,
              padding: "56px 40px",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(26px, 4vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: "0 0 16px",
              }}
            >
              Start delivering in the next 60 seconds
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                margin: "0 0 32px",
                lineHeight: 1.6,
              }}
            >
              Free plan available. No credit card. No lock-in. Build your first client landing page
              right now.
            </p>
            <Link
              href="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 32px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 32px rgba(20,184,166,0.35)",
              }}
            >
              Get started free <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <style>{`
          @media (max-width: 860px) {
            .csol-3col { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 560px) {
            .csol-3col { grid-template-columns: 1fr !important; }
          }
          .csol-card:hover {
            border-color: rgba(20,184,166,0.25) !important;
            transform: translateY(-2px);
          }
        `}</style>
      </main>
      <ClickrFooter />
    </>
  );
}

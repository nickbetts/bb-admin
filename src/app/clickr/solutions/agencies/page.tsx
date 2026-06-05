import type { Metadata } from "next";
import Link from "next/link";
import ClickrNav from "../../_components/ClickrNav";
import ClickrFooter from "../../_components/ClickrFooter";
import {
  Zap,
  Users,
  Globe,
  GitBranch,
  MessageSquare,
  BarChart2,
  Layers,
  Bell,
  Webhook,
  FileText,
  CheckCircle,
  ArrowRight,
  Clock,
  Star,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Agencies",
  description:
    "clickr lets performance agencies build client landing pages in under 60 seconds. Template library, multi-client management, white-label subdomains, CRM integrations, and magic-link client review — all in one platform.",
  alternates: { canonical: "https://lp.bettsandburton.com/solutions/agencies" },
  openGraph: {
    title: "clickr for Agencies | Scale Landing Page Production",
    description:
      "Build landing pages for every client campaign in under 60 seconds. CRM integrations, white-label subdomains, multi-client management.",
    url: "https://lp.bettsandburton.com/solutions/agencies",
  },
};

const accent = "#14b8a6";
const accentDark = "#7c3aed";
const accentLight = "#5eead4";

const painPoints = [
  {
    icon: Clock,
    headline: "Brief-to-page used to take days",
    body: "Waiting on designers, copying brand assets manually, building from scratch in every campaign. clickr scrapes your client's website and generates a fully branded, CRO-optimised page in under 60 seconds.",
  },
  {
    icon: Users,
    headline: "Managing five clients means five workflows",
    body: "clickr keeps every client's campaigns, pages, leads, and analytics in one place. Switch between clients instantly — no tab soup, no context switching.",
  },
  {
    icon: Star,
    headline: "Clients want proof before you publish",
    body: "Generate a magic review link and share it with your client in one click. They see the page, you get sign-off. No account needed on their end.",
  },
];

const features = [
  {
    icon: Zap,
    title: "60-second generation",
    body: "Paste a URL and campaign brief. Meridian AI scrapes real brand content — colours, fonts, logos, testimonials — and builds the page. No lorem ipsum, no templates that need gutting.",
  },
  {
    icon: GitBranch,
    title: "3-pass AI quality audit",
    body: "Every page automatically gets a CRO audit, a design audit, and a copy audit — three separate AI refinement passes before you touch it.",
  },
  {
    icon: MessageSquare,
    title: "Chat-based refinement",
    body: '"Make the hero more urgent" or "Add a comparison table" — type it in plain English. Meridian makes the change directly in the page HTML.',
  },
  {
    icon: Globe,
    title: "20+ language translations",
    body: "Running a campaign in France, Germany, or the UAE? Generate a full translation in any of 20+ languages in one click. Publish or unpublish each language independently.",
  },
  {
    icon: Layers,
    title: "Template library",
    body: "Save any page as a template. Build a lead-gen master template once, then spin up new client pages from it. Consistent structure, unique brand every time.",
  },
  {
    icon: BarChart2,
    title: "7-platform conversion tracking",
    body: "Wire up Google Ads, GA4, Meta, TikTok, LinkedIn, Microsoft UET, and Google Tag Manager. Per-lead attribution labels included.",
  },
  {
    icon: FileText,
    title: "Full HTML + CSS control",
    body: "Every page is clean HTML. Edit raw code in the built-in CodeMirror editor, or use the live CSS variable editor to adjust colours and fonts without touching markup.",
  },
  {
    icon: Shield,
    title: "Magic-link client review",
    body: "Share a unique preview URL with your client. They can view the live page without any account or login. You control when it goes live.",
  },
  {
    icon: Bell,
    title: "Slack, Teams & email alerts",
    body: "Get notified the moment a lead submits. Route lead notifications to any channel — Slack workspace, Microsoft Teams channel, or email.",
  },
  {
    icon: Webhook,
    title: "Webhooks to any CRM",
    body: "Native CRM integrations for HubSpot, Salesforce, Zoho, and Pipedrive. Or fire a webhook to any endpoint — Zapier, Make, your own system.",
  },
  {
    icon: Globe,
    title: "White-label subdomains",
    body: "Publish to client-branded subdomains like `summer-sale.lp.bettsandburton.com`. Custom domain support coming soon.",
  },
  {
    icon: Users,
    title: "Version history & revert",
    body: "Every AI refinement creates a new version. Compare, preview, and roll back to any previous version in one click.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Paste the URL",
    body: "Drop in your client's website URL. Meridian scrapes it — brand colours, fonts, logo, testimonials, service descriptions, the lot.",
  },
  {
    step: "02",
    title: "Write the brief",
    body: "Campaign type, target audience, offer. 2 sentences is enough. Meridian handles the rest.",
  },
  {
    step: "03",
    title: "Let AI build it",
    body: "Three passes: initial generation → CRO audit → design & copy refinement. Done in under 60 seconds.",
  },
  {
    step: "04",
    title: "Refine with chat",
    body: '"Move the form above the fold" — done. "Add social proof counters" — done. No code required.',
  },
  {
    step: "05",
    title: "Share for review",
    body: "One-click magic link. Client reviews, approves. You publish.",
  },
  {
    step: "06",
    title: "Track and optimise",
    body: "Leads flow into your CRM, conversion events fire to your ad accounts. A/B variants ready when you need them.",
  },
];

export default function AgenciesPage() {
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
              FOR PERFORMANCE AGENCIES
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
              Scale landing page production{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                across every client
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
              Stop losing hours on briefs, design handoffs, and copy revisions. clickr gives your
              agency a repeatable, AI-powered pipeline — from client brief to published, CRO-audited
              page in under 60 seconds.
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
            {/* Trust badges */}
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
              THE PROBLEMS WE SOLVE
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}
              className="csol-3col"
            >
              {painPoints.map(({ icon: Icon, headline, body }) => (
                <div
                  key={headline}
                  style={{
                    padding: "28px 28px",
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

        {/* Workflow */}
        <section
          style={{
            padding: "72px 24px",
            background: "rgba(255,255,255,0.015)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
              HOW IT WORKS
            </p>
            <h2
              style={{
                textAlign: "center",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: "0 0 56px",
              }}
            >
              From brief to published in 6 steps
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {workflow.map(({ step, title, body }, i) => (
                <div
                  key={step}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 20,
                    paddingBottom: 32,
                    borderLeft:
                      i < workflow.length - 1
                        ? `2px solid rgba(20,184,166,0.15)`
                        : "2px solid transparent",
                    marginLeft: 27,
                    paddingLeft: 32,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -17,
                      top: 0,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "white",
                      letterSpacing: "0.02em",
                      flexShrink: 0,
                    }}
                  >
                    {step}
                  </div>
                  <div style={{ paddingLeft: 20 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        margin: "4px 0 8px",
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {title}
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
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid */}
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
              EVERYTHING YOU NEED
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
              Built for agency workflows
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
              Every feature is designed around the reality of managing paid campaigns across
              multiple clients.
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
              Ready to 10× your agency&apos;s output?
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                margin: "0 0 32px",
                lineHeight: 1.6,
              }}
            >
              Start free. No credit card. No lock-in. Build your first client landing page in the
              next 60 seconds.
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

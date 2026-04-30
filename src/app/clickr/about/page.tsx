import type { Metadata } from "next";
import { ArrowRight, Zap, Brain, Plug } from "lucide-react";
import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";

export const metadata: Metadata = {
  title: "About",
  description:
    "clickr is an AI landing page builder built by i3MEDIA, a UK performance marketing agency. Learn the story behind Meridian AI and why we built clickr.",
  alternates: { canonical: "https://clickr.marketing/clickr/about" },
  openGraph: {
    title: "About | clickr",
    description: "Built by a performance marketing agency to solve a problem every campaign manager knows.",
    url: "https://clickr.marketing/clickr/about",
  },
};

const accent = "#f97316";
const accentDark = "#ea580c";
const accentLight = "#fdba74";
const accentGlow = "rgba(249,115,22,0.45)";

const pillars = [
  {
    icon: <Zap size={24} color={accentLight} />,
    title: "Speed",
    body: "A complete, fully branded landing page in under 60 seconds. Meridian reads real brand context from the client's website — no lorem ipsum, no placeholder copy. The first draft is ready to publish.",
  },
  {
    icon: <Brain size={24} color={accentLight} />,
    title: "Intelligence",
    body: "Meridian AI doesn't generate generic pages. It extracts brand colours, typography, real services, testimonials, team bios, and campaign context. Every page is specific to the client and the campaign goal.",
  },
  {
    icon: <Plug size={24} color={accentLight} />,
    title: "Integration",
    body: "clickr connects to the tools your team already uses. Lead submissions route to your CRM. Conversions fire your tracking pixels. Notifications hit Slack or Teams. Everything works on the first publish.",
  },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit", minHeight: "100vh" }}>
      <ClickrNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 140,
          paddingBottom: 100,
          paddingLeft: 40,
          paddingRight: 40,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "70%",
            paddingBottom: "35%",
            top: "-5%",
            left: "-10%",
            pointerEvents: "none",
            background: "radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 65%)",
          }}
        />
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: accentLight,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            About clickr
          </p>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 1.04,
              marginBottom: 28,
              color: "white",
            }}
          >
            We build tools for<br />
            <span
              style={{
                background: `linear-gradient(90deg, ${accentLight}, ${accent}, #ef4444)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              performance marketers.
            </span>
          </h1>
          <p
            style={{
              fontSize: 19,
              color: "rgba(255,255,255,0.52)",
              lineHeight: 1.8,
              maxWidth: 640,
              fontWeight: 400,
            }}
          >
            clickr is what happens when a digital marketing agency gets tired of its own bottleneck.
          </p>
        </div>
      </section>

      {/* ── The story ───────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 40px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: 60,
            alignItems: "start",
          }}
          className="about-story-grid"
        >
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 0,
              }}
            >
              The story
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.85,
                marginBottom: 22,
              }}
            >
              i3MEDIA has been running paid media campaigns for clients across the UK for years. Google Ads, Meta, TikTok, Microsoft — all of it. And for years, we kept hitting the same problem: great ad creative driving traffic to weak, irrelevant landing pages.
            </p>
            <p
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.85,
                marginBottom: 22,
              }}
            >
              The brief-to-page process took days. Designers, developers, revisions, approval loops. Meanwhile the ad was live, spending budget, and sending people to a homepage that had nothing to do with the campaign.
            </p>
            <p
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.85,
              }}
            >
              So we built clickr internally. Paste the client&apos;s URL, write a campaign brief, and Meridian generates a fully branded, conversion-optimised page in under a minute. It started as a tool for our own campaigns. It&apos;s now part of StratOS — our full marketing intelligence platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── Three pillars ────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: 16,
                color: "white",
              }}
            >
              Built on three principles.
            </h2>
            <p
              style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}
            >
              Every decision in clickr is driven by the same question: does this make campaigns convert better, faster?
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
            className="pillars-grid"
          >
            {pillars.map((p) => (
              <div
                key={p.title}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  padding: "28px 26px",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(249,115,22,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  {p.icon}
                </div>
                <h3
                  style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12, color: "white" }}
                >
                  {p.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meridian AI ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 40px",
          background: `linear-gradient(180deg, rgba(249,115,22,0.05) 0%, rgba(239,68,68,0.03) 100%)`,
          borderTop: "1px solid rgba(249,115,22,0.12)",
          borderBottom: "1px solid rgba(249,115,22,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
              padding: "8px 20px",
              borderRadius: 24,
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)",
            }}
          >
            <Brain size={14} color={accentLight} />
            <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Meridian AI
            </span>
          </div>
          <h2
            style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 22, color: "white" }}
          >
            The intelligence behind every page.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.85, marginBottom: 22 }}>
            Meridian is i3MEDIA&apos;s proprietary marketing intelligence layer. It powers every generation, audit, and chat refinement in clickr. Meridian doesn&apos;t just generate landing pages — it extracts real brand context, applies conversion-rate best practices, and builds pages that match the campaign goal.
          </p>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.85 }}>
            Every generated page goes through three audit passes: CRO (conversion rate optimisation), design quality, and copy quality. Meridian identifies gaps and rewrites until the page is genuinely ready to run traffic.
          </p>
        </div>
      </section>

      {/* ── Team ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              alignItems: "start",
            }}
            className="team-grid"
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: accentLight,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                The team
              </p>
              <h2
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: 18,
                  color: "white",
                  lineHeight: 1.15,
                }}
              >
                i3MEDIA
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.52)", lineHeight: 1.75, marginBottom: 20 }}>
                A performance marketing agency based in the UK. We manage paid media across Google, Meta, TikTok, Microsoft, and LinkedIn for clients across retail, professional services, healthcare, and education.
              </p>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.52)", lineHeight: 1.75, marginBottom: 24 }}>
                We built the tools we wish existed. clickr is one of them. StratOS is the rest.
              </p>
              <a
                href="https://i3media.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: accentLight,
                  textDecoration: "none",
                }}
              >
                i3media.co.uk ↗
              </a>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18,
                padding: "28px 24px",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                What we do
              </p>
              {[
                "Paid search (Google + Microsoft Ads)",
                "Paid social (Meta, TikTok, LinkedIn)",
                "Landing page strategy and CRO",
                "Marketing automation and attribution",
                "AI-powered campaign tools (StratOS)",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{ color: accentLight, fontSize: 14, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 40px 120px",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 16, color: "white" }}
          >
            clickr is included in every StratOS plan.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.7, marginBottom: 36 }}>
            No additional subscription. No per-page fees. Every StratOS plan includes full access to clickr and all its integrations.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/clickr/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 11,
                background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: `0 0 28px ${accentGlow}`,
              }}
            >
              Get started free <ArrowRight size={15} />
            </a>
            <a
              href="/clickr/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 11,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View pricing
            </a>
          </div>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        @media (max-width: 860px) {
          .pillars-grid { grid-template-columns: 1fr !important; }
          .about-story-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .team-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          h1 { font-size: 38px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  );
}

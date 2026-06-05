import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";
import { Zap, Tag, Sparkles } from "lucide-react";

const bg = "#09090f";
const accent = "#14b8a6";
const accentLight = "#5eead4";
const accentDark = "#7c3aed";

type ReleaseType = "feature" | "improvement" | "fix" | "new";

interface Release {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: { type: ReleaseType; label: string }[];
}

const releases: Release[] = [
  {
    version: "1.4.0",
    date: "May 2026",
    title: "Multilingual generation & Pro plan custom domains",
    summary:
      "Generate landing pages in 22 languages in a single click, and publish Pro plan pages to your own subdomain via CNAME.",
    items: [
      {
        type: "feature",
        label: "Multilingual page generation — 22 languages, one click from the editor",
      },
      { type: "feature", label: "Custom subdomain support for Pro plan (CNAME-based)" },
      {
        type: "feature",
        label: "Language auto-detect from source URL — clickr picks the right output language",
      },
      {
        type: "improvement",
        label:
          "Multilingual pages preserve brand colours and font choices from the original scrape",
      },
      { type: "improvement", label: "URL slug auto-transliterated for non-Latin scripts" },
      { type: "fix", label: "Fixed: RTL text layout broken on Arabic and Hebrew pages" },
    ],
  },
  {
    version: "1.3.0",
    date: "April 2026",
    title: "Meridian AI — 3-pass quality audit engine",
    summary:
      "Every generated page now goes through a 3-pass AI audit covering CRO, design consistency, and copy quality before it reaches you.",
    items: [
      {
        type: "new",
        label: "Meridian 3-pass audit: CRO check, design consistency check, copy quality check",
      },
      { type: "new", label: "Audit scores shown in the editor — fix suggestions inline" },
      { type: "feature", label: "Chat editor: refine any page element in plain English" },
      {
        type: "feature",
        label:
          "Magic-link client review — share a read-only preview with clients, no login required",
      },
      {
        type: "improvement",
        label: "Generation time reduced by 35% with parallel scrape + generate pipeline",
      },
      {
        type: "improvement",
        label: "Brand scraper now extracts testimonials and team names from source site",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "March 2026",
    title: "Conversion tracking — Google, Meta, TikTok, LinkedIn",
    summary:
      "Native pixel and conversion event support added to the editor. Fire accurate events from every page with zero custom code.",
    items: [
      { type: "feature", label: "Google Ads conversion ID + send-to value injection from editor" },
      {
        type: "feature",
        label: "Meta Pixel + Standard Events (Lead, Contact, CompleteRegistration)",
      },
      { type: "feature", label: "TikTok Pixel with SubmitForm standard event" },
      { type: "feature", label: "LinkedIn Insight Tag with conversion event" },
      { type: "feature", label: "Microsoft UET tag support" },
      {
        type: "feature",
        label: "Test mode: ?test=1 logs all pixel events without sending to ad platforms",
      },
      {
        type: "improvement",
        label: "GTM container ID support as an alternative to direct pixel injection",
      },
      { type: "fix", label: "Fixed: phone click event not firing on iOS mobile browsers" },
    ],
  },
  {
    version: "1.1.0",
    date: "February 2026",
    title: "Lead routing — CRM, email, Slack, Teams, webhooks",
    summary:
      "Connect clickr to your full stack. Route leads to CRMs, notify your team on the tools they already use, and send events anywhere via webhook.",
    items: [
      { type: "feature", label: "HubSpot lead routing — creates contacts and deals automatically" },
      {
        type: "feature",
        label: "Salesforce, Zoho CRM, Pipedrive, Mailchimp, ActiveCampaign integrations",
      },
      { type: "feature", label: "Microsoft Teams and Slack notifications on form submission" },
      {
        type: "feature",
        label: "Form-to-email routing — any email address, no SMTP config required",
      },
      { type: "feature", label: "Custom webhooks — POST lead data to any HTTP endpoint" },
      {
        type: "improvement",
        label: "Lead log in StratOS dashboard — full submission history with timestamps",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "January 2026",
    title: "clickr public launch",
    summary:
      "clickr goes live. Brand scraping, AI page generation, instant publishing, and full campaign type support.",
    items: [
      { type: "new", label: "lp.bettsandburton.com public launch" },
      {
        type: "new",
        label: "Brand scraper — extract colours, fonts, copy, and images from any URL",
      },
      {
        type: "new",
        label: "AI page generation — fully branded landing pages in under 60 seconds",
      },
      {
        type: "new",
        label:
          "10 campaign types: Lead Gen, E-commerce, Event, Free Trial, Demo, Webinar, App, Recruitment, Charity, Local",
      },
      { type: "new", label: "Instant publish to {slug}.lp.bettsandburton.com" },
      { type: "new", label: "HTML editor with live preview" },
      { type: "new", label: "Free plan: 3 pages, Starter plan: 20 pages, Pro plan: unlimited" },
    ],
  },
];

const TYPE_STYLES: Record<ReleaseType, { label: string; color: string; bg: string }> = {
  new: { label: "NEW", color: accentLight, bg: "rgba(20,184,166,0.12)" },
  feature: { label: "FEATURE", color: "#86efac", bg: "rgba(134,239,172,0.1)" },
  improvement: { label: "IMPROVEMENT", color: "#93c5fd", bg: "rgba(147,197,253,0.1)" },
  fix: { label: "FIX", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

export default function ChangelogPage() {
  return (
    <div
      style={{
        background: bg,
        color: "white",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <ClickrNav />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "120px 40px 72px",
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
            top: "-5%",
            left: "20%",
            background: "radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 20,
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.22)",
              marginBottom: 28,
            }}
          >
            <Sparkles size={12} color={accentLight} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Changelog
            </span>
          </div>
          <h1
            style={{
              fontSize: 50,
              fontWeight: 900,
              letterSpacing: "-0.045em",
              marginBottom: 20,
              color: "white",
              lineHeight: 1.05,
            }}
          >
            What&apos;s new in clickr.
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            New features, improvements, and fixes — shipped regularly. Everything we build,
            documented here.
          </p>
        </div>
      </section>

      {/* ── RELEASES ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 120px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ position: "relative" }}>
            {/* Timeline line */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 1,
                background: "rgba(255,255,255,0.07)",
              }}
            />

            {releases.map((release, i) => (
              <div
                key={release.version}
                style={{
                  paddingLeft: 36,
                  marginBottom: i < releases.length - 1 ? 72 : 0,
                  position: "relative",
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -8,
                    top: 8,
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? `linear-gradient(135deg, ${accent}, ${accentDark})`
                        : "rgba(255,255,255,0.08)",
                    border: `1px solid ${i === 0 ? "rgba(20,184,166,0.5)" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: i === 0 ? `0 0 16px rgba(20,184,166,0.4)` : "none",
                  }}
                />

                {/* Version + date header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 12px",
                      borderRadius: 8,
                      background: i === 0 ? `rgba(20,184,166,0.1)` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${i === 0 ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <Tag size={11} color={i === 0 ? accentLight : "rgba(255,255,255,0.4)"} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: i === 0 ? accentLight : "rgba(255,255,255,0.5)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      v{release.version}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                    {release.date}
                  </span>
                  {i === 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: accent,
                        letterSpacing: "0.1em",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(20,184,166,0.12)",
                        border: "1px solid rgba(20,184,166,0.22)",
                        textTransform: "uppercase",
                      }}
                    >
                      Latest
                    </span>
                  )}
                </div>

                {/* Release title + summary */}
                <div
                  style={{
                    padding: "24px 28px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${i === 0 ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.06)"}`,
                    marginBottom: 0,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "white",
                      marginBottom: 10,
                      lineHeight: 1.3,
                    }}
                  >
                    {release.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.48)",
                      lineHeight: 1.7,
                      marginBottom: 22,
                    }}
                  >
                    {release.summary}
                  </p>

                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {release.items.map((item, ii) => {
                      const style = TYPE_STYLES[item.type];
                      return (
                        <div
                          key={ii}
                          style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: style.color,
                              letterSpacing: "0.07em",
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: style.bg,
                              border: `1px solid ${style.color}30`,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {style.label}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.58)",
                              lineHeight: 1.6,
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 40px 120px",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 16,
              color: "white",
            }}
          >
            Want early access to new features?
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.42)",
              lineHeight: 1.75,
              marginBottom: 32,
            }}
          >
            Sign up to clickr and get notified when new features ship. Pro plan users get access to
            beta features first.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "14px 28px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: `0 0 28px rgba(20,184,166,0.35)`,
            }}
          >
            <Zap size={15} /> Get started free
          </a>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        @media (max-width: 600px) { section { padding-left: 20px !important; padding-right: 20px !important; } h1 { font-size: 36px !important; } h2 { font-size: 22px !important; } }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import ClickrNav from "./_components/ClickrNav";
import ClickrFooter from "./_components/ClickrFooter";
import {
  Zap,
  ArrowRight,
  Lock,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Globe,
  Layers,
  MousePointerClick,
  LayoutTemplate,
  FileCode2,
  SlidersHorizontal,
  Share2,
  Users,
  Bell,
  Mail,
  Database,
  Link2,
} from "lucide-react";

function useCountUp(end: number, duration = 1800, shouldStart = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    let frame: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration, shouldStart]);
  return count;
}

const secondaryFeatures = [
  {
    icon: <Globe size={20} />,
    title: "Publish to clickr.marketing",
    desc: "Every page goes live at {client}.clickr.marketing/{slug}. Fast global CDN, clean URLs, zero hosting overhead. Custom CNAME on Pro.",
  },
  {
    icon: <Layers size={20} />,
    title: "Version history",
    desc: "Every edit is saved as a version. Restore any previous iteration in one click. Nothing is ever lost, and clients can always roll back.",
  },
  {
    icon: <LayoutTemplate size={20} />,
    title: "Template library",
    desc: "Save any generated page as a reusable template. Build a library of high-converting structures your team can spin up for new clients instantly.",
  },
  {
    icon: <FileCode2 size={20} />,
    title: "Full HTML control",
    desc: "Drop into the code editor for surgical changes. Clean, semantic HTML — no build tools, no frameworks, no dependencies.",
  },
  {
    icon: <Database size={20} />,
    title: "CRM integrations",
    desc: "Route leads directly into HubSpot, Salesforce, Zoho, Pipedrive, or any CRM your clients use. Data flows the moment a form is submitted.",
  },
  {
    icon: <Bell size={20} />,
    title: "Real-time notifications",
    desc: "clickr fires an alert the moment a conversion happens. Reach your team via Microsoft Teams, Slack, or any email address you configure.",
  },
  {
    icon: <Link2 size={20} />,
    title: "Custom webhooks",
    desc: "Send lead and event data to any endpoint that accepts an HTTP POST. Connect to Zapier, Make, your own backend, or any custom workflow.",
  },
  {
    icon: <Share2 size={20} />,
    title: "Client review portal",
    desc: "Publish pages to the client portal via magic link. Clients review and approve without a StratOS login.",
  },
];

const steps = [
  {
    n: "01",
    icon: <Globe size={22} />,
    title: "Scrape",
    desc: "Paste the client's website URL. clickr pulls brand colours, typography, real services, testimonials, team bios, and everything needed to build an authentic page.",
  },
  {
    n: "02",
    icon: <Zap size={22} />,
    title: "Generate",
    desc: "Meridian, i3MEDIA's proprietary marketing intelligence, builds a complete, conversion-optimised landing page. Hero, social proof, benefits, CTA, all populated with real brand content. Ready in under a minute.",
  },
  {
    n: "03",
    icon: <MessageSquare size={22} />,
    title: "Refine",
    desc: "Chat with clickr to tweak anything. Change the layout, rewrite a section, add urgency, adjust the colour palette. It iterates as fast as you can type.",
  },
  {
    n: "04",
    icon: <MousePointerClick size={22} />,
    title: "Publish",
    desc: "Hit publish. The page goes live at {client}.clickr.marketing/{slug} with your tracking pixels firing, lead capture active, and the URL ready to drop into any ad campaign.",
  },
];

const agencyNames = [
  "Velocity Digital", "Traction Agency", "Beacon Media", "Pilot Growth",
  "Meridian PPC", "Atlas Digital", "Summit Marketing", "Craft Paid Media",
  "Orbit Agency", "Forge Digital", "Nova Performance", "Crest Media",
  "Apex Growth", "Calibre Media", "Prism Digital", "Impact PPC",
];

const testimonials = [
  {
    quote: "We used to spend three days per client on landing pages. Now it's under 30 minutes — brief, generate, tweak, publish. Our margins have genuinely improved and clients see campaigns live faster.",
    name: "James Whitmore",
    role: "Head of Paid Media",
    company: "Velocity Digital",
    initials: "JW",
    avatarColor: "linear-gradient(135deg, #f97316, #ea580c)",
    rating: 5,
  },
  {
    quote: "clickr generates pages that actually look like the client's brand. Real copy from their website, their actual colours — not lorem ipsum with a logo slapped on. The chat editor is the bit I didn't know I needed.",
    name: "Sarah Chen",
    role: "Independent PPC Consultant",
    company: "Freelance",
    initials: "SC",
    avatarColor: "linear-gradient(135deg, #818cf8, #6366f1)",
    rating: 5,
  },
  {
    quote: "We ran clickr against our old Unbounce setup across 6 campaigns. Average 2.3× improvement in conversion rate. Having a page that matches each campaign's exact message just works. It's not magic — it's basic CRO at scale.",
    name: "Marcus Reid",
    role: "Founder",
    company: "Traction Agency",
    initials: "MR",
    avatarColor: "linear-gradient(135deg, #34d399, #059669)",
    rating: 5,
  },
];

const faqs = [
  {
    q: "How does clickr generate a landing page from a URL?",
    a: "clickr uses Meridian, i3MEDIA's AI marketing intelligence, to scrape the target website. It extracts brand colours, typography, real service descriptions, testimonials, and USPs. That brand context is combined with your campaign brief to generate a post-click page populated with real content — not placeholder copy.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. The chat editor lets you make any change in plain English — 'make the headline bigger', 'change the CTA to orange', 'add a trust badge above the fold'. Full HTML editor access is there if you want it, but it's entirely optional.",
  },
  {
    q: "What campaign types does clickr support?",
    a: "clickr supports 10+ campaign types: lead generation, e-commerce, event registration, free trial, demo request, webinar sign-up, app download, recruitment, charity/donation, and local services. Select the type and Meridian optimises the layout, copy structure, and CTA hierarchy for that specific goal.",
  },
  {
    q: "How does conversion tracking work?",
    a: "From the editor, add your Google Ads conversion ID, Meta Pixel ID, GA4 measurement ID, TikTok Pixel ID, LinkedIn Insight Tag, or Microsoft UET ID. clickr injects the correct code and fires conversion events automatically on form submissions, phone clicks, and email clicks. Use ?test=1 to verify events without polluting your ad accounts.",
  },
  {
    q: "Is the published URL my own domain?",
    a: "Free and Starter plan pages publish to {your-slug}.clickr.marketing. Pro plan pages support custom subdomains (e.g., landing.yourclient.com) via CNAME. The clickr subdomain is fast, globally distributed, and works perfectly for paid campaigns.",
  },
  {
    q: "How do leads get routed after form submission?",
    a: "Form submissions are stored in StratOS with full attribution data. You can route in real time to any email address, HubSpot, Salesforce, Zoho CRM, Pipedrive, Mailchimp, ActiveCampaign, or any endpoint via webhook. Microsoft Teams and Slack notifications fire the moment a conversion happens.",
  },
  {
    q: "What's the difference between standalone clickr and the StratOS version?",
    a: "Standalone clickr at clickr.marketing gives you all core landing page features: generation, chat editor, tracking, lead routing, and publishing. The StratOS version adds full multi-client management, campaign reporting across 15 marketing channels, AI insights, shared attribution data, and the magic-link client review portal.",
  },
];

const campaignTypes = [
  "Lead Gen", "E-commerce", "Event Registration", "Free Trial",
  "Demo Request", "Webinar Sign-up", "App Download",
  "Recruitment", "Charity / Donation", "Local Services",
];

const trackingLogos = [
  { label: "Google Ads", bg: "rgba(66,133,244,0.12)", border: "rgba(66,133,244,0.25)", color: "#93c5fd" },
  { label: "Meta Pixel", bg: "rgba(24,119,242,0.12)", border: "rgba(24,119,242,0.25)", color: "#818cf8" },
  { label: "GA4", bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.25)", color: "#fdba74" },
  { label: "TikTok", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" },
  { label: "LinkedIn", bg: "rgba(10,102,194,0.12)", border: "rgba(10,102,194,0.25)", color: "#7dd3fc" },
  { label: "Microsoft UET", bg: "rgba(0,120,215,0.12)", border: "rgba(0,120,215,0.25)", color: "#93c5fd" },
];

export default function ClickrPage() {
  const accent = "#f97316";
  const accentLight = "#fdba74";
  const accentGlow = "rgba(249,115,22,0.55)";
  const accentDark = "#ea580c";

  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const cycleTexts = ["agencies", "consultants", "paid campaigns", "product launches"];
  const [cycleIdx, setCycleIdx] = useState(0);
  const [cycleVisible, setCycleVisible] = useState(true);

  const briefText = "High-converting summer camp landing page. Target: parents of 8-16 year olds. CTA: enrol now.";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < briefText.length) {
        setTypedText(briefText.slice(0, i + 1));
        i++;
      } else {
        setTypingDone(true);
        clearInterval(interval);
      }
    }, 38);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setCycleVisible(false);
      setTimeout(() => {
        setCycleIdx((idx) => (idx + 1) % cycleTexts.length);
        setCycleVisible(true);
      }, 280);
    }, 2600);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setParallaxY(el.scrollTop * 0.25);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  const navIds = ["how-it-works", "features", "tracking", "cta"];
  useEffect(() => {
    const obs: IntersectionObserver[] = [];
    navIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const o = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-35% 0px -60% 0px" }
      );
      o.observe(el);
      obs.push(o);
    });
    return () => obs.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
            if (entry.target.id === "stats-row") setStatsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll<Element>(".reveal-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    top: `${5 + (i * 4.8) % 86}%`,
    left: `${3 + (i * 6.9) % 93}%`,
    size: 1 + (i % 3),
    dur: `${3.5 + (i % 6)}s`,
    delay: `${-(i * 0.6)}s`,
    opacity: 0.04 + (i % 5) * 0.04,
    color: i % 3 === 0 ? `rgba(249,115,22,0.9)` : i % 3 === 1 ? `rgba(239,68,68,0.9)` : `rgba(251,191,36,0.9)`,
  }));

  const s1 = useCountUp(60, 1500, statsVisible);
  const s2 = useCountUp(10, 1600, statsVisible);
  const s3 = useCountUp(100, 1800, statsVisible);

  const navLinks = [
    { id: "how-it-works", label: "How it works" },
    { id: "features", label: "Features" },
    { id: "tracking", label: "Tracking" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      {/* Cursor glow */}
      <div style={{ position: "fixed", pointerEvents: "none", zIndex: 1, width: 640, height: 640, borderRadius: "50%", left: mouse.x - 320, top: mouse.y - 320, background: `radial-gradient(circle, rgba(249,115,22,0.055) 0%, transparent 65%)`, transition: "left 0.2s ease-out, top 0.2s ease-out" }} />

      {/* Side nav */}
      <nav style={{ position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 1, background: "rgba(9,9,15,0.88)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "10px 6px", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} className="side-nav">
        {navLinks.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "block", padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: activeSection === id ? accentLight : "rgba(255,255,255,0.2)", textDecoration: "none", borderLeft: activeSection === id ? `2px solid ${accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s" }}>{label}</a>
        ))}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: `linear-gradient(180deg, ${accent}, #ef4444)`, transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>

      <ClickrNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", paddingTop: 64, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        {/* Background orbs */}
        <div style={{ position: "absolute", width: "70%", paddingBottom: "70%", top: "-20%", left: "-20%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.2}px)` }} className="orb-1" />
        <div style={{ position: "absolute", width: "55%", paddingBottom: "55%", bottom: "-10%", right: "-15%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.12}px)` }} className="orb-2" />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.018, backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{ position: "absolute", top: p.top, left: p.left, pointerEvents: "none", width: p.size, height: p.size, borderRadius: "50%", background: p.color, opacity: p.opacity, animationDuration: p.dur, animationDelay: p.delay }} />
        ))}

        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 520px", gap: 80, alignItems: "center", width: "100%", position: "relative", boxSizing: "border-box" }} className="hero-grid">

          {/* Copy */}
          <div>
            {/* Brand badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "8px 18px", borderRadius: 24, background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.28)` }}>
              <MousePointerClick size={14} color={accentLight} />
              <span style={{ fontSize: 13, fontWeight: 800, color: accentLight, letterSpacing: "0.06em" }}>clickr</span>
              <span style={{ width: 1, height: 14, background: `rgba(249,115,22,0.3)` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>by i3MEDIA</span>
            </div>

            <h1 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.045em", marginBottom: 30, color: "white" }}>
              <span className="hw hw1">Landing pages for</span>
              <br />
              <span className="hw hw2" style={{
                background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                display: "inline-block",
                opacity: cycleVisible ? 1 : 0,
                transform: cycleVisible ? "translateY(0)" : "translateY(-10px)",
                transition: "opacity 0.28s ease, transform 0.28s ease",
              }}>
                {cycleTexts[cycleIdx]}
              </span>
              <br />
              <span className="hw hw3">that actually</span>
              <br />
              <span className="hw" style={{ animationDelay: "0.58s", background: `linear-gradient(90deg, ${accentLight}, ${accent}, #ef4444)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>convert.</span>
            </h1>

            <p style={{ fontSize: 19, color: "rgba(255,255,255,0.58)", lineHeight: 1.78, maxWidth: 500, marginBottom: 36, fontWeight: 400 }}>
              Powered by Meridian, i3MEDIA&apos;s proprietary marketing intelligence. Scrape any website, generate a fully branded post-click page, and go live at <span style={{ color: accentLight, fontWeight: 600 }}>clickr.marketing</span>. Integrates with your existing CRM, notification stack, and any tool that accepts a webhook.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 38 }}>
              {[
                "Full page generated from your client's website in under 60 seconds",
                "Chat editor: describe the change, clickr rewrites it",
                "Conversion tracking: Google Ads, Meta, GA4, TikTok, LinkedIn",
                "Publishes to {client}.clickr.marketing/{slug} instantly",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.58)" }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 26px", borderRadius: 11, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 28px ${accentGlow}` }} className="cta-accent-pulse">
                See how it works <ArrowRight size={15} />
              </a>
              <a href="mailto:hello@i3media.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 26px", borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                Talk to us
              </a>
            </div>
          </div>

          {/* Hero mockup — fake LP editor */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -50, borderRadius: "50%", background: `radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)`, pointerEvents: "none" }} />

            {/* Editor shell */}
            <div className="mockup-3d" style={{ background: "rgba(15,15,22,0.9)", border: `1px solid rgba(249,115,22,0.18)`, borderRadius: 18, overflow: "hidden", boxShadow: `0 32px 80px rgba(0,0,0,0.6)` }}>
              {/* Toolbar */}
              <div style={{ padding: "12px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239,68,68,0.5)" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(251,191,36,0.5)" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(34,197,94,0.5)" }} />
                  </div>
                  <div style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>clickr editor</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 5, background: `rgba(249,115,22,0.12)`, border: `1px solid rgba(249,115,22,0.25)`, fontSize: 10, fontWeight: 700, color: accentLight }}>Publish</div>
                  <SlidersHorizontal size={12} color="rgba(255,255,255,0.25)" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr" }}>
                {/* Chat sidebar */}
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 340 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Chat</div>

                  {/* User message */}
                  <div style={{ alignSelf: "flex-end", background: `rgba(249,115,22,0.12)`, border: `1px solid rgba(249,115,22,0.2)`, borderRadius: "10px 10px 2px 10px", padding: "7px 10px", maxWidth: "85%" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: 0 }}>Make the hero headline bigger and more urgent</p>
                  </div>

                  {/* clickr response */}
                  <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px 10px 10px 2px", padding: "7px 10px", maxWidth: "90%" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, margin: 0 }}>Done. Updated hero to 64px with urgency-driven copy and a countdown element.</p>
                  </div>

                  {/* User message 2 */}
                  <div style={{ alignSelf: "flex-end", background: `rgba(249,115,22,0.12)`, border: `1px solid rgba(249,115,22,0.2)`, borderRadius: "10px 10px 2px 10px", padding: "7px 10px", maxWidth: "85%" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: 0 }}>Change CTA button to orange</p>
                  </div>

                  {/* clickr response 2 */}
                  <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px 10px 10px 2px", padding: "7px 10px", maxWidth: "90%" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, margin: 0 }}>CTA updated to #f97316 with hover state.</p>
                  </div>

                  {/* Input bar */}
                  <div style={{ marginTop: "auto", display: "flex", gap: 6, alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flex: 1 }}>Ask clickr…</span>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: `rgba(249,115,22,0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight size={10} color={accentLight} />
                    </div>
                  </div>
                </div>

                {/* Page preview */}
                <div style={{ overflow: "hidden", position: "relative" }}>
                  {/* Mini LP preview */}
                  <div style={{ background: "white", minHeight: 340, position: "relative", overflow: "hidden" }}>
                    {/* Hero section */}
                    <div style={{ background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`, padding: "28px 22px 20px", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "60%", paddingBottom: "60%", borderRadius: "50%", background: "rgba(249,115,22,0.15)", pointerEvents: "none" }} />
                      <div style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>FCV Football Academy</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1.15, marginBottom: 8, letterSpacing: "-0.03em" }}>
                        Last Spaces for<br />
                        <span style={{ color: "#fdba74" }}>Summer 2026</span>
                      </div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
                        Elite coaching, 5-a-side tournaments,<br />and UEFA Pro licence coaches.
                      </div>
                      <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 6, background: "#f97316", fontSize: 9, fontWeight: 800, color: "white", letterSpacing: "0.04em", boxShadow: "0 4px 12px rgba(249,115,22,0.5)" }}>
                        Enrol Now. Limited Spaces
                      </div>
                    </div>
                    {/* Social proof strip */}
                    <div style={{ background: "#f8fafc", padding: "10px 22px", display: "flex", gap: 16, alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
                      {["⭐ 4.9/5", "200+ Players", "15 Years"].map((s, i) => (
                        <div key={i} style={{ fontSize: 8, fontWeight: 700, color: "#374151" }}>{s}</div>
                      ))}
                    </div>
                    {/* Benefits */}
                    <div style={{ padding: "12px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {["Full-day coaching sessions", "Age groups 8–16", "Free kit included"].map((b, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <div style={{ width: 5, height: 5, background: "white", borderRadius: "50%" }} />
                          </div>
                          <div style={{ fontSize: 9, color: "#374151", fontWeight: 500 }}>{b}</div>
                        </div>
                      ))}
                    </div>
                    {/* Typing indicator */}
                    {!typingDone && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: accentLight }} className="typing-dot dot1" />
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: accentLight }} className="typing-dot dot2" />
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: accentLight }} className="typing-dot dot3" />
                        </div>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>Generating…</span>
                      </div>
                    )}
                    {typingDone && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={10} color="#86efac" />
                        <span style={{ fontSize: 9, color: "#86efac", fontWeight: 600 }}>Page ready. 47 seconds</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div style={{ padding: "8px 18px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>fcv.clickr.marketing/summer-2026</span>
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>v3 · 2 leads</div>
              </div>
            </div>

            {/* Floating brief card */}
            <div style={{ position: "absolute", bottom: -28, left: -24, background: "rgba(15,15,22,0.95)", border: `1px solid rgba(249,115,22,0.2)`, borderRadius: 14, padding: "12px 16px", maxWidth: 240, backdropFilter: "blur(16px)", zIndex: 10 }} className="float-card">
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Brief</div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: 0, minHeight: 30 }}>
                {typedText}
                {!typingDone && <span className="cursor-blink">|</span>}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section id="stats-row" className="reveal-section" style={{ padding: "80px 40px", background: `linear-gradient(180deg, rgba(249,115,22,0.05) 0%, rgba(239,68,68,0.03) 100%)`, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="stats-grid">
            {[
              { val: s1, suffix: "s", prefix: "~", label: "Average time from brief to first published draft", note: "Including Meridian generation + scrape", color: accent },
              { val: s2, suffix: "+", label: "Campaign types supported: lead gen, e-commerce, events, trials, donations, and more", note: "Any paid campaign goal", color: "#ef4444" },
              { val: s3, suffix: "%", label: "Of generated pages built with real brand content, not placeholder copy or lorem ipsum", note: "Full brand context from scrape", color: "#f59e0b", isText: false },
            ].map((s, i) => (
              <div key={i} className="stat-card stagger-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "36px 28px", textAlign: "center", position: "relative", overflow: "hidden", animationDelay: `${i * 0.1}s` }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ fontSize: 52, fontWeight: 900, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>
                  {s.prefix ?? ""}{s.val}{s.suffix}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: 1.55 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGO MARQUEE ──────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 0 24px", borderTop: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <p style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.18)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
          Trusted by performance marketing teams
        </p>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div className="marquee-track">
            {[...agencyNames, ...agencyNames].map((name, i) => (
              <span key={i} style={{ padding: "7px 22px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", marginRight: 10, flexShrink: 0 }}>{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── AUDIENCE STRIP ─────────────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "72px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>WHO IT&apos;S FOR</p>
          <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 40, color: "white" }} className="blur-reveal">
            Purpose-built for B2B performance marketers
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="aud-grid">
            {[
              {
                href: "/solutions/agencies",
                badge: "FOR AGENCIES",
                title: "Scale across every client",
                body: "Multi-client management, template library, magic-link review, CRM integrations, and white-label subdomains. One workflow. Every client campaign.",
                cta: "For agencies →",
              },
              {
                href: "/solutions/consultants",
                badge: "FOR CONSULTANTS",
                title: "Deliver more. Charge accordingly.",
                body: "Punch above your weight. Build client pages that look like they came from a full agency — in under 60 seconds. Full HTML access, no watermarks on paid plans.",
                cta: "For consultants →",
              },
            ].map(({ href, badge, title, body, cta }) => (
              <a key={href} href={href} style={{
                display: "block", textDecoration: "none",
                padding: "32px 28px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                transition: "border-color 0.2s, transform 0.2s",
                cursor: "pointer",
              }} className="aud-card">
                <span style={{
                  display: "inline-block", padding: "4px 10px", borderRadius: 20, marginBottom: 16,
                  background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
                  fontSize: 10, fontWeight: 700, color: accentLight, letterSpacing: "0.06em",
                }}>{badge}</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 12px", color: "white" }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.45)", margin: "0 0 20px" }}>{body}</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{cta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">The workflow</p>
            <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              From brief to live page<br />
              <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent}, #ef4444)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in four steps.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              No design briefs. No dev sprints. No agency back-and-forth. Just a URL and a brief, and clickr handles the rest.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }} className="steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="feature-card stagger-in" style={{ padding: "32px 28px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: `${i * 0.1}s`, transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, rgba(249,115,22,${0.6 - i * 0.1}), transparent)` }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.22)`, display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: `rgba(249,115,22,0.5)`, letterSpacing: "0.1em" }}>{step.n}</span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "white" }}>{step.title}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "120px 40px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: 112 }} className="reveal-section">
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Everything you need</p>
            <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Built for performance marketers.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              clickr handles every stage: generation, editing, publishing, tracking, lead routing, and notifications. No context switching. No extra subscriptions.
            </p>
          </div>

          {/* ── Feature 1: AI Generation ─────────────────────────────── */}
          <div className="reveal-section feat-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", marginBottom: 24 }}>
                <Zap size={12} color={accentLight} />
                <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>AI generation</span>
              </div>
              <h3 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "white", marginBottom: 20 }}>
                From URL to live page<br />
                <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in under 60 seconds.</span>
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 28 }}>
                Paste the client&apos;s website URL. Meridian scrapes brand colours, typography, real service descriptions, testimonials, and team content. Every page is populated with genuine brand content — not placeholder copy.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  "Full brand context: colours, copy, services, testimonials",
                  "10+ campaign types — layout optimised for each goal",
                  "3-pass AI quality audit: CRO, design, and copywriting",
                  "First publishable draft in under 60 seconds",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrape mockup */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -48, borderRadius: "50%", background: `radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ background: "rgba(13,13,20,0.96)", border: `1px solid rgba(249,115,22,0.18)`, borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 72px rgba(0,0,0,0.55)" }}>
                <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["rgba(239,68,68,0.5)", "rgba(251,191,36,0.5)", "rgba(34,197,94,0.5)"].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>clickr — Brand Extraction</span>
                </div>
                <div style={{ padding: "20px 20px 22px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <div style={{ flex: 1, padding: "9px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 7 }}>
                      <Globe size={11} color="rgba(255,255,255,0.3)" />
                      <span>fcvfootball.co.uk</span>
                    </div>
                    <div style={{ padding: "9px 14px", borderRadius: 8, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, fontSize: 11, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <Zap size={11} />Scrape
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>Brand colours</span>
                        <span style={{ fontSize: 9, color: "#86efac", fontWeight: 600 }}>✓ Extracted</span>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {["#1a3a6b", "#f97316", "#ffffff", "#1f2937", "#94a3b8"].map((c, i) => (
                          <div key={i} style={{ width: 26, height: 26, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.12)" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>Services detected</span>
                        <span style={{ fontSize: 9, color: "#86efac", fontWeight: 600 }}>✓ 5 found</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {["Summer Camps", "Holiday Courses", "1-to-1 Coaching", "Team Training", "Trials"].map((s, i) => (
                          <span key={i} style={{ padding: "3px 8px", borderRadius: 5, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.14)", fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ label: "Testimonials", val: "3 extracted" }, { label: "Typography", val: "Poppins / Inter" }].map((item, i) => (
                        <div key={i} style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontSize: 9, color: "#86efac", fontWeight: 600, marginBottom: 3 }}>✓ {item.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.33)" }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "9px 13px", borderRadius: 9, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.14)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: accentLight }}>Generating page…</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>83%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${accent}, ${accentDark})` }} className="progress-bar-fill" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Feature 2: Chat editor ──────────────────────────────────── */}
          <div className="reveal-section feat-row feat-row-rev" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
            {/* Chat mockup */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -48, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ background: "rgba(13,13,20,0.96)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 72px rgba(0,0,0,0.55)" }}>
                <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["rgba(239,68,68,0.5)", "rgba(251,191,36,0.5)", "rgba(34,197,94,0.5)"].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>clickr — Chat Editor</span>
                  <div style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 5, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", fontSize: 9, fontWeight: 700, color: accentLight }}>Publish</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "175px 1fr" }}>
                  <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", padding: "13px 11px", display: "flex", flexDirection: "column", gap: 7, minHeight: 280 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Chat</span>
                    <div style={{ alignSelf: "flex-end", background: "rgba(249,115,22,0.09)", border: "1px solid rgba(249,115,22,0.17)", borderRadius: "8px 8px 2px 8px", padding: "6px 8px" }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: 0 }}>Rewrite headline to emphasise scarcity</p>
                    </div>
                    <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px 8px 8px 2px", padding: "6px 8px" }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>Done. 1 change applied in 3 seconds.</p>
                    </div>
                    <div style={{ alignSelf: "flex-end", background: "rgba(249,115,22,0.09)", border: "1px solid rgba(249,115,22,0.17)", borderRadius: "8px 8px 2px 8px", padding: "6px 8px", marginTop: 4 }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: 0 }}>Make CTA button orange, bigger</p>
                    </div>
                    <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px 8px 8px 2px", padding: "6px 8px" }}>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>CTA updated to #f97316 at 18px.</p>
                    </div>
                    <div style={{ marginTop: "auto", display: "flex", gap: 5, alignItems: "center", padding: "5px 7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7 }}>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", flex: 1 }}>Ask clickr…</span>
                      <div style={{ width: 15, height: 15, borderRadius: 4, background: "rgba(249,115,22,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowRight size={8} color={accentLight} /></div>
                    </div>
                  </div>
                  {/* Before/after diff */}
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ background: "#fef2f2", borderBottom: "2px solid #fca5a5", padding: "14px 16px" }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>− Before</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", letterSpacing: "-0.02em", textDecoration: "line-through", opacity: 0.45 }}>Summer Football Camps 2026</div>
                      <div style={{ fontSize: 8, color: "#9ca3af", marginTop: 3, textDecoration: "line-through", opacity: 0.45 }}>Book your place today</div>
                    </div>
                    <div style={{ background: "#f0fdf4", borderBottom: "2px solid #86efac", padding: "14px 16px" }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>+ After</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Only 4 Spaces Left<br /><span style={{ color: "#f97316" }}>for Summer 2026</span></div>
                      <div style={{ fontSize: 8, color: "#374151", marginTop: 4 }}>Don&apos;t miss out — enrol now</div>
                      <div style={{ display: "inline-block", marginTop: 7, padding: "4px 12px", borderRadius: 5, background: "#f97316", fontSize: 8, fontWeight: 800, color: "white" }}>Enrol Now — Last Spaces</div>
                    </div>
                    <div style={{ padding: "9px 16px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={9} color="#16a34a" />
                      <span style={{ fontSize: 8, color: "#374151", fontWeight: 600 }}>1 change · 3s · v4 saved</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Text */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 24 }}>
                <MessageSquare size={12} color="#a5b4fc" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.06em", textTransform: "uppercase" }}>Chat editor</span>
              </div>
              <h3 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "white", marginBottom: 20 }}>
                Describe the change.<br />
                <span style={{ background: "linear-gradient(90deg, #a5b4fc, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>clickr rewrites it.</span>
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 28 }}>
                No drag-and-drop. No element panels. No wrestling with a builder. Type what you want in plain English and clickr edits the actual page HTML — headline, layout, copy, colour, structure.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  "Edit any section: hero, benefits, testimonials, CTA, footer",
                  "Changes apply in 2–5 seconds, full page rewritten if needed",
                  "Every version saved — restore any previous state in one click",
                  "Full HTML code editor available for precise surgical edits",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 size={14} color="#a5b4fc" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Feature 3: Conversion tracking ─────────────────────────── */}
          <div className="reveal-section feat-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
            {/* Text */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", marginBottom: 24 }}>
                <BarChart3 size={12} color={accentLight} />
                <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>Conversion tracking</span>
              </div>
              <h3 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "white", marginBottom: 20 }}>
                Pixels fire.<br />
                <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Conversions count.</span>
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 28 }}>
                Add your tracking IDs from inside the editor. clickr injects the correct pixel code and fires conversion events automatically — form submissions, phone clicks, email clicks. No GTM fumbling, no dev handoffs.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  "Google Ads, Meta Pixel, GA4, TikTok, LinkedIn, Microsoft UET",
                  "GTM container support — manage all pixels from one tag",
                  "Conversion events fire on form submit, phone click, email click",
                  "Test mode: verify events without polluting real ad accounts",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking config mockup */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -48, borderRadius: "50%", background: `radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ background: "rgba(13,13,20,0.96)", border: `1px solid rgba(249,115,22,0.18)`, borderRadius: 16, overflow: "hidden", boxShadow: "0 28px 72px rgba(0,0,0,0.55)" }}>
                <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["rgba(239,68,68,0.5)", "rgba(251,191,36,0.5)", "rgba(34,197,94,0.5)"].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>Tracking Configuration</span>
                </div>
                <div style={{ padding: "18px 18px 20px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Active pixels</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                    {[
                      { label: "Google Ads", id: "AW-12345678", color: "#93c5fd" },
                      { label: "Meta Pixel", id: "23456789012", color: "#818cf8" },
                      { label: "GA4", id: "G-ABCD1234", color: "#fdba74" },
                      { label: "TikTok Pixel", id: "TT-98765432", color: "rgba(255,255,255,0.55)" },
                      { label: "LinkedIn Tag", id: "1234567", color: "#7dd3fc" },
                    ].map((pixel, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 11px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.6)", flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: pixel.color, flex: 1 }}>{pixel.label}</span>
                        <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.04)", padding: "2px 5px", borderRadius: 3 }}>{pixel.id}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.055)", marginBottom: 12 }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Event log — test mode</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {[
                      { ev: "form_submit", n: "5 pixels", ms: "120ms" },
                      { ev: "phone_click", n: "4 pixels", ms: "90ms" },
                      { ev: "page_view", n: "5 pixels", ms: "28ms" },
                    ].map((ev, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 7, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.09)" }}>
                        <CheckCircle2 size={9} color="#86efac" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.5)", flex: 1 }}>{ev.ev}</span>
                        <span style={{ fontSize: 9, color: "#86efac", fontWeight: 600 }}>{ev.n}</span>
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.18)" }}>{ev.ms}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Feature 4: Lead routing ─────────────────────────────────── */}
          <div className="reveal-section feat-row feat-row-rev" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
            {/* Lead routing mockup */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -48, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ background: "rgba(13,13,20,0.96)", border: `1px solid rgba(249,115,22,0.2)`, borderRadius: 14, padding: "15px 17px", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Users size={13} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>New lead</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>FCV Summer Camp · Just now</div>
                    </div>
                    <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 7px rgba(34,197,94,0.7)" }} className="accent-pulse" />
                  </div>
                  <div style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>James Thompson</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>james@email.com · 07712 345 678</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", fontStyle: "italic" }}>&ldquo;Looking for sessions for my 10-year-old&rdquo;</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 7px", borderRadius: 5, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)", fontSize: 9, color: accentLight }}>Google Ads</span>
                    <span style={{ padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>/summer-camp-2026</span>
                    <span style={{ padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Mobile</span>
                  </div>
                </div>
                <div style={{ background: "rgba(13,13,20,0.96)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "15px 17px", boxShadow: "0 8px 28px rgba(0,0,0,0.4)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Routed to</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      { dest: "HubSpot", detail: "Contact created", abbr: "H", color: "#ff7a59" },
                      { dest: "Microsoft Teams", detail: "Notification sent", abbr: "T", color: "#6264a7" },
                      { dest: "hello@fcvfootball.co.uk", detail: "Email delivered", abbr: "✉", color: "#93c5fd" },
                      { dest: "Webhook", detail: "POST 200 OK", abbr: "⌁", color: "#86efac" },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: `${r.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: r.color, flexShrink: 0 }}>{r.abbr}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.55)", flex: 1 }}>{r.dest}</span>
                        <span style={{ fontSize: 9, color: "#86efac" }}>✓ {r.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Text */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 24 }}>
                <Users size={12} color="#a5b4fc" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.06em", textTransform: "uppercase" }}>Lead capture &amp; routing</span>
              </div>
              <h3 style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "white", marginBottom: 20 }}>
                Every lead, routed<br />
                <span style={{ background: "linear-gradient(90deg, #a5b4fc, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>exactly where it needs to go.</span>
              </h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 28 }}>
                Every form submission is stored in StratOS with full attribution data. Route to your CRM, fire a Teams or Slack notification, send a client email, and POST to any webhook — all in the same instant.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  "Full attribution: page, campaign, creative, device, source",
                  "CRM sync: HubSpot, Salesforce, Zoho, Pipedrive, and more",
                  "Real-time alerts via Teams, Slack, email, or SMS",
                  "Webhooks: connect Zapier, Make, or your own backend",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 size={14} color="#a5b4fc" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Secondary features compact grid ──────────────────────── */}
          <div className="reveal-section" style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 28 }}>And more</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="features-grid">
              {secondaryFeatures.map((f, i) => (
                <div key={i} className="feature-card stagger-in" style={{ padding: "22px 20px", borderRadius: 13, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", animationDelay: `${i * 0.06}s`, transition: "transform 0.3s ease, border-color 0.2s ease" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight, marginBottom: 13 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.82)", marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── COMPETITOR COMPARISON ──────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "100px 40px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Why clickr</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Stacks up against every alternative.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Unbounce and Instapage charge enterprise prices for drag-and-drop editors. Coding from scratch takes days. clickr is the only platform built for AI-native, multi-client performance marketing.
            </p>
          </div>
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }} className="stagger-in">
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr",
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              padding: "14px 24px",
            }} className="comp-row">
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>clickr</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Unbounce</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Instapage</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Hand-code</span>
            </div>
            {[
              { feature: "Time to first live page", clickr: "< 60 seconds", unbounce: "30–60 min", instapage: "30–60 min", handcode: "4–8 hours" },
              { feature: "Brand scraping & real content", clickr: "✓", unbounce: "✗", instapage: "✗", handcode: "✗" },
              { feature: "3-pass AI quality audit (CRO + Design + Copy)", clickr: "✓", unbounce: "Basic AI", instapage: "Basic AI", handcode: "✗" },
              { feature: "Chat-based page refinement", clickr: "✓", unbounce: "✗", instapage: "✗", handcode: "✗" },
              { feature: "Multi-client management", clickr: "✓", unbounce: "✓ (expensive)", instapage: "✓ (expensive)", handcode: "Manual" },
              { feature: "Magic-link client review", clickr: "✓", unbounce: "✗", instapage: "✗", handcode: "✗" },
              { feature: "Native CRM integrations", clickr: "✓", unbounce: "✓", instapage: "✓", handcode: "Custom dev" },
              { feature: "Multi-language pages (20+ langs)", clickr: "✓", unbounce: "Manual", instapage: "Manual", handcode: "Manual" },
            ].map(({ feature, clickr, unbounce, instapage, handcode }, i) => (
              <div key={feature} style={{
                display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr",
                padding: "15px 24px",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.04)" : "none",
                alignItems: "center",
              }} className="comp-row">
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{feature}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: clickr === "✓" ? "#86efac" : accentLight, textAlign: "center" }}>{clickr}</span>
                <span style={{ fontSize: 12, color: unbounce === "✗" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)", textAlign: "center" }}>{unbounce}</span>
                <span style={{ fontSize: 12, color: instapage === "✗" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)", textAlign: "center" }}>{instapage}</span>
                <span style={{ fontSize: 12, color: handcode === "✗" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)", textAlign: "center" }}>{handcode}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ───────────────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "100px 40px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Integrations</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Plugs into your existing stack.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              clickr connects to the tools your team and clients already use. Leads route to your CRM, your team gets notified instantly, and every event can be sent anywhere via webhook.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }} className="stagger-in">

            {/* CRM integrations */}
            <div style={{ padding: "28px 26px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>
                  <Database size={18} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>CRM integrations</div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.43)", lineHeight: 1.65, marginBottom: 18 }}>
                Route leads directly into your existing CRM the moment a form is submitted. No manual exports, no missed follow-ups, no copy-pasting between tabs.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {["HubSpot", "Salesforce", "Zoho CRM", "Pipedrive", "Mailchimp", "ActiveCampaign"].map((crm, i) => (
                  <div key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{crm}</div>
                ))}
              </div>
            </div>

            {/* Instant notifications */}
            <div style={{ padding: "28px 26px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>
                  <Bell size={18} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Instant notifications</div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.43)", lineHeight: 1.65, marginBottom: 18 }}>
                Get alerted the moment a lead converts. clickr fires real-time notifications to your team via the platforms they already work in, so no conversion ever gets missed.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {["Microsoft Teams", "Slack", "Email", "SMS"].map((n, i) => (
                  <div key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{n}</div>
                ))}
              </div>
            </div>

            {/* Form to email */}
            <div style={{ padding: "28px 26px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>
                  <Mail size={18} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Form-to-email routing</div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.43)", lineHeight: 1.65 }}>
                Every form submission lands in the right inbox automatically. Route to client email addresses, internal distribution lists, or any combination of both. No third-party form service required, and no setup beyond entering an address.
              </p>
            </div>

            {/* Custom webhooks */}
            <div style={{ padding: "28px 26px", borderRadius: 18, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(249,115,22,0.15)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: accentLight }}>
                  <Link2 size={18} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Custom webhooks</div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.43)", lineHeight: 1.65, marginBottom: 14 }}>
                Send lead and conversion data to any endpoint that accepts an HTTP POST. Connect clickr to Zapier, Make, your own backend, or any custom workflow already running in your stack.
              </p>
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>
                POST https://your-endpoint.com/webhook
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CAMPAIGN TYPES ─────────────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "80px 40px 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }} className="blur-reveal">Campaign types</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
            Whatever the campaign goal, clickr nails it.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", marginBottom: 48, lineHeight: 1.7 }}>
            Choose the campaign type when you create a page and clickr optimises the layout, copy structure, and CTA hierarchy for maximum conversion.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }} className="stagger-in">
            {campaignTypes.map((c, i) => (
              <div key={i} style={{ padding: "9px 18px", borderRadius: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", transition: "all 0.2s" }} className="pill-hover">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKING ───────────────────────────────────────────────────────── */}
      <section id="tracking" className="reveal-section" style={{ padding: "100px 40px", background: `linear-gradient(180deg, rgba(249,115,22,0.04) 0%, rgba(239,68,68,0.03) 100%)`, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }} className="tracking-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Conversion tracking</p>
              <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white", lineHeight: 1.1 }} className="blur-reveal">
                Pixels fire.<br />Conversions count.
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 28 }}>
                Add your tracking IDs from inside the editor. clickr injects the correct pixels into the page and fires conversion events automatically when a form is submitted, a phone number is clicked, or an email is tapped.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "GTM container ID or direct pixel tags",
                  "Conversion events fire on form submit, phone click, email click",
                  "Test mode: verify events without polluting real ad accounts",
                  "Per-page or client-default tracking config",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={13} color={accentLight} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="stagger-in">
              <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Tracking platforms</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {trackingLogos.map((t, i) => (
                    <div key={i} style={{ padding: "5px 12px", borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600, color: t.color }}>
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(249,115,22,0.15)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `rgba(249,115,22,0.12)`, border: `1px solid rgba(249,115,22,0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={13} color={accentLight} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Test mode</div>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: 0 }}>
                  Open any page with <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 }}>?test=1</span> and a floating overlay logs every pixel event that would fire, without sending anything to your ad platforms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "112px 40px", background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Social proof</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              The agencies speak for themselves.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
              Performance marketers who switched from legacy LP tools and manual workflows.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="testimonials-grid stagger-in">
            {testimonials.map((t, i) => (
              <div key={i} className="feature-card" style={{ padding: "30px 28px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 20, animationDelay: `${i * 0.1}s`, transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease" }}>
                {/* Stars */}
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <svg key={si} width="13" height="13" viewBox="0 0 24 24" fill={accent}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                {/* Quote */}
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.75, flex: 1, fontStyle: "italic", margin: 0 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                {/* Author */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="reveal-section" style={{ padding: "112px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">FAQ</p>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Common questions, answered.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderRadius: 14, border: `1px solid ${openFaq === i ? "rgba(249,115,22,0.22)" : "rgba(255,255,255,0.07)"}`, background: openFaq === i ? "rgba(249,115,22,0.04)" : "rgba(255,255,255,0.02)", overflow: "hidden", transition: "border-color 0.2s ease, background 0.2s ease" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: openFaq === i ? accentLight : "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: `1px solid ${openFaq === i ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: openFaq === i ? accent : "rgba(255,255,255,0.4)", transition: "transform 0.25s ease, border-color 0.2s ease, color 0.2s ease", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 22px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.52)", lineHeight: 1.8, marginTop: 18, margin: "18px 0 0" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <a href="mailto:hello@i3media.co.uk" style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
              Still have questions? <span style={{ color: accentLight, textDecoration: "underline", textUnderlineOffset: 3 }}>Email the team →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section id="cta" className="reveal-section" style={{ padding: "120px 40px 160px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "80%", paddingBottom: "40%", bottom: "-20%", left: "50%", transform: "translateX(-50%)", background: `radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "50%", paddingBottom: "25%", top: "10%", left: "25%", background: `radial-gradient(ellipse, rgba(239,68,68,0.06) 0%, transparent 65%)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Brand mark */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "10px 22px", borderRadius: 28, background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.25)` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accentGlow}` }} className="accent-pulse" />
            <span style={{ fontSize: 14, fontWeight: 800, color: accentLight, letterSpacing: "0.04em" }}>clickr</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)" }}>by i3MEDIA</span>
            <span style={{ width: 1, height: 14, background: `rgba(249,115,22,0.25)` }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Part of StratOS</span>
          </div>

          <h2 style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.045em", marginBottom: 22, color: "white", lineHeight: 1.05 }} className="blur-reveal">
            Build your first page.<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent}, #ef4444)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Go live today.</span>
          </h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.48)", lineHeight: 1.8, marginBottom: 44 }}>
            Paste a URL. Write a brief. clickr does the rest: a fully branded, conversion-optimised landing page, live on clickr.marketing in under a minute. Connected to your CRM, your team notifications, and your tracking from day one.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 32px", borderRadius: 13, background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "white", fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 36px rgba(249,115,22,0.42)` }} className="cta-accent-pulse">
              <Lock size={16} /> Open clickr in StratOS
            </a>
            <a href="mailto:hello@i3media.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 32px", borderRadius: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
              Talk to us
            </a>
          </div>
          <p style={{ marginTop: 26, fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
            clickr is included in every StratOS plan. No additional subscription required.
          </p>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        .side-nav { display: flex; }
        @media (max-width: 1100px) { .side-nav { display: none !important; } }

        @keyframes orb1 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(50px,-35px) scale(1.08); } 70% { transform: translate(-25px,25px) scale(0.93); } }
        @keyframes orb2 { 0%, 100% { transform: translate(0,0) scale(1); } 35% { transform: translate(-40px,30px) scale(0.92); } 70% { transform: translate(35px,-45px) scale(1.1); } }
        .orb-1 { animation: orb1 18s ease-in-out infinite; }
        .orb-2 { animation: orb2 22s ease-in-out infinite; }

        @keyframes hw-in { from { opacity: 0; transform: translateY(28px) rotate(-1.5deg); filter: blur(8px); } to { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); } }
        .hw { display: inline-block; animation: hw-in 0.85s cubic-bezier(0.16,1,0.3,1) both; }
        .hw1 { animation-delay: 0.05s; } .hw2 { animation-delay: 0.22s; } .hw3 { animation-delay: 0.4s; }

        @keyframes particle-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.35); } }
        .hero-particle { animation: particle-float linear infinite; }

        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(249,115,22,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(249,115,22,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }

        .reveal-section { opacity: 0; transform: translateY(44px); transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }

        @keyframes fadeInBlur { from { opacity: 0; filter: blur(12px); transform: translateY(14px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(30px); }
        .section-visible .stagger-in { animation: fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 22px rgba(249,115,22,0.4); } 50% { box-shadow: 0 0 44px rgba(249,115,22,0.75), 0 0 88px rgba(249,115,22,0.12); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }

        .feature-card:hover { transform: translateY(-7px) scale(1.015) !important; border-color: rgba(249,115,22,0.22) !important; box-shadow: 0 18px 52px rgba(249,115,22,0.1); }
        .stat-card:hover { transform: translateY(-7px) scale(1.025) !important; border-color: rgba(249,115,22,0.22) !important; box-shadow: 0 18px 52px rgba(249,115,22,0.1); }

        @keyframes card-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 8px 40px rgba(249,115,22,0.06), 0 0 0 1px rgba(249,115,22,0.08); } 50% { box-shadow: 0 16px 60px rgba(249,115,22,0.18), 0 0 0 1px rgba(249,115,22,0.18); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(700px); opacity: 0; } }
        .mockup-3d { animation: card-float 7s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.5) 40%, rgba(249,115,22,0.8) 50%, rgba(249,115,22,0.5) 60%, transparent 100%); animation: scan-line 9s ease-in-out infinite; pointer-events: none; }

        @keyframes float-card { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(-1deg); } }
        .float-card { animation: float-card 5s ease-in-out infinite; }

        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor-blink { animation: cursor-blink 0.75s step-end infinite; }

        @keyframes dot-bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .typing-dot { animation: dot-bounce 1.2s ease-in-out infinite; }
        .dot1 { animation-delay: 0s; }
        .dot2 { animation-delay: 0.2s; }
        .dot3 { animation-delay: 0.4s; }

        .pill-hover:hover { background: rgba(249,115,22,0.08) !important; border-color: rgba(249,115,22,0.25) !important; color: rgba(255,255,255,0.8) !important; transform: translateY(-2px); }
        .pill-hover { transition: all 0.2s ease; }

        .aud-card:hover { border-color: rgba(249,115,22,0.28) !important; transform: translateY(-3px); }
        @media (max-width: 680px) { .aud-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 700px) { .comp-row { grid-template-columns: 1.5fr 1fr 1fr !important; } .comp-row > span:nth-child(4), .comp-row > span:nth-child(5) { display: none !important; } }

        @media (max-width: 1000px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .tracking-grid { grid-template-columns: 1fr !important; }
          .hero-particle { animation: none !important; }
          .stagger-in { opacity: 1 !important; transform: none !important; animation: none !important; }
          .blur-reveal { opacity: 1 !important; animation: none !important; }
          h1 { font-size: 44px !important; }
          h2 { font-size: 34px !important; }
        }
        @media (max-width: 760px) { .testimonials-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px) { .testimonials-grid { grid-template-columns: 1fr !important; } }

        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { display: flex; align-items: center; gap: 0; animation: marquee-scroll 30s linear infinite; width: max-content; padding: 0 5px; }
        .marquee-track:hover { animation-play-state: paused; }

        @keyframes progress-fill { from { width: 0% } to { width: 83% } }
        .progress-bar-fill { animation: progress-fill 2.5s ease-out 0.5s both; }
        @media (max-width: 920px) {
          .feat-row { grid-template-columns: 1fr !important; gap: 40px !important; }
          .feat-row-rev > :first-child { order: 2; }
          .feat-row-rev > :last-child { order: 1; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 36px !important; }
          h2 { font-size: 28px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  );
}

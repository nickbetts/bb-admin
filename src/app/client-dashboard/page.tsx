"use client";

import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import {
  Monitor,
  BarChart3,
  TrendingUp,
  Users,
  Layers,
  Zap,
  ArrowRight,
  Lock,
  CheckCircle2,
  Activity,
  Globe,
  Target,
} from "lucide-react";

function useCountUp(end: number, duration = 2000, shouldStart = false) {
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

const features = [
  { icon: <Layers size={20} />, title: "16 channel integrations", desc: "GA4, Google Ads, Meta, TikTok, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, Microsoft Ads, WooCommerce, Shopify, and Core Web Vitals." },
  { icon: <BarChart3 size={20} />, title: "34 dashboard panels", desc: "Each channel gets its own section with the metrics that matter. Sessions, conversions, ROAS, CTR, email opens, call tracking, rankings. All in one scroll." },
  { icon: <Zap size={20} />, title: "AI-powered overview", desc: "Meridian reads every connected platform and writes a plain-English summary of what happened, what changed, and what needs attention." },
  { icon: <Target size={20} />, title: "Per-channel drill-down", desc: "Click into any section for campaign-level data, ad group breakdowns, audience segments, and device splits. No switching tools." },
  { icon: <Activity size={20} />, title: "Integration badges", desc: "See which platforms are connected for each client at a glance. Green means live. Grey means not yet configured. Simple." },
  { icon: <Globe size={20} />, title: "One-click report generation", desc: "Hit the report button from any client dashboard. We pull the data, the AI writes the commentary, and you have a draft in minutes." },
];

const channels = [
  { name: "GA4", color: "#f59e0b" },
  { name: "Google Ads", color: "#4285f4" },
  { name: "Meta", color: "#1877f2" },
  { name: "TikTok", color: "#ff0050" },
  { name: "LinkedIn", color: "#0a66c2" },
  { name: "Klaviyo", color: "#2dd4bf" },
  { name: "YouTube", color: "#ff0000" },
  { name: "HubSpot", color: "#ff7a59" },
  { name: "CallRail", color: "#10b981" },
  { name: "SemRush", color: "#f97316" },
  { name: "Search Console", color: "#4285f4" },
  { name: "Microsoft Ads", color: "#00a4ef" },
  { name: "WooCommerce", color: "#7f54b3" },
  { name: "Shopify", color: "#96bf48" },
  { name: "Moz", color: "#3b82f6" },
  { name: "Core Web Vitals", color: "#10b981" },
];

export default function ClientDashboardPage() {
  const accent = "#6366f1";
  const accentLight = "#a5b4fc";
  const accentGlow = "rgba(99,102,241,0.6)";

  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

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

  const navIds = ["features", "channels", "mockup", "cta"];
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

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    top: `${6 + (i * 5.2) % 84}%`,
    left: `${4 + (i * 7.1) % 92}%`,
    size: 1 + (i % 3),
    dur: `${4 + (i % 5)}s`,
    delay: `${-(i * 0.7)}s`,
    opacity: 0.05 + (i % 4) * 0.04,
  }));

  const s1 = useCountUp(16, 1800, statsVisible);
  const s2 = useCountUp(34, 2100, statsVisible);
  const s3 = useCountUp(30, 1500, statsVisible);
  const s4 = useCountUp(15, 1700, statsVisible);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "channels", label: "Channels" },
    { id: "mockup", label: "In action" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>

      {/* Cursor glow */}
      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 1,
        width: 600, height: 600, borderRadius: "50%",
        left: mouse.x - 300, top: mouse.y - 300,
        background: `radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)`,
        transition: "left 0.2s ease-out, top 0.2s ease-out",
      }} />

      {/* Side nav */}
      <nav style={{
        position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
        zIndex: 40, display: "flex", flexDirection: "column", gap: 1,
        background: "rgba(9,9,15,0.88)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, padding: "10px 6px",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }} className="side-nav">
        {navLinks.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          }} style={{
            display: "block", padding: "5px 12px", borderRadius: 8,
            fontSize: 11, fontWeight: 600,
            color: activeSection === id ? accentLight : "rgba(255,255,255,0.2)",
            textDecoration: "none",
            borderLeft: activeSection === id ? `2px solid ${accent}` : "2px solid transparent",
            whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s",
          }}>
            {label}
          </a>
        ))}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: `linear-gradient(180deg, ${accent}, #10b981)`, transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>

      <LandingNav currentPage="Client Dashboard" accentColor={accent} onCtaClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })} />

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", paddingTop: 64, position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center",
      }}>
        <div style={{
          position: "absolute", width: "65%", paddingBottom: "65%", top: "-15%", left: "-15%",
          pointerEvents: "none", borderRadius: "50%",
          background: `radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)`,
          transform: `translateY(${parallaxY * -0.25}px)`,
        }} className="orb-1" />
        <div style={{
          position: "absolute", width: "55%", paddingBottom: "55%", bottom: "-15%", right: "-10%",
          pointerEvents: "none", borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 65%)`,
          transform: `translateY(${parallaxY * -0.15}px)`,
        }} className="orb-2" />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.02,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{
            position: "absolute", top: p.top, left: p.left, pointerEvents: "none",
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.id % 3 === 0 ? `rgba(99,102,241,0.9)` : p.id % 3 === 1 ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.8)",
            opacity: p.opacity, animationDuration: p.dur, animationDelay: p.delay,
          }} />
        ))}

        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "80px 40px",
          display: "grid", gridTemplateColumns: "1fr 480px", gap: 72,
          alignItems: "center", width: "100%", position: "relative", boxSizing: "border-box",
        }} className="hero-grid">

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(99,102,241,0.12)`, border: `1px solid rgba(99,102,241,0.3)` }}>
                <Monitor size={12} color={accentLight} />
                <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Every client, one view</span>
              </div>
            </div>
            <h1 style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: 28, color: "white" }}>
              <span className="hw hw1">Every channel.</span>
              <br />
              <span className="hw hw2" style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>One dashboard.</span>
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, maxWidth: 500, marginBottom: 32, fontWeight: 400 }}>
              16 marketing channels feeding live data into a single client view. GA4, Google Ads, Meta, TikTok, LinkedIn, Klaviyo, and more. No more logging into five platforms before your morning coffee.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "34 dashboard panels across 16 platforms",
                "AI-written overview summarising what changed",
                "One-click report generation from any client view",
                "Integration badges showing connection status at a glance",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 24px", borderRadius: 10,
                background: `linear-gradient(135deg, #4f46e5, ${accent})`,
                color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none",
                boxShadow: `0 0 24px rgba(99,102,241,0.35)`,
              }} className="cta-accent-pulse">
                See what is included <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Mockup */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: -40, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
            <div className="mockup-3d" style={{
              background: "rgba(255,255,255,0.04)", border: `1px solid rgba(99,102,241,0.2)`,
              borderRadius: 20, overflow: "hidden", position: "relative",
            }}>
              <div style={{
                padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: `rgba(99,102,241,0.05)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(99,102,241,0.15)`, border: `1px solid rgba(99,102,241,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Monitor size={16} color={accentLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Acme Corp</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Client Dashboard</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {channels.slice(0, 6).map((ch) => (
                    <div key={ch.name} style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, boxShadow: `0 0 4px ${ch.color}` }} title={ch.name} />
                  ))}
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>+10</span>
                </div>
              </div>

              {/* KPI tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                {[
                  { label: "Sessions", value: "48,291", delta: "+12.4%", up: true },
                  { label: "Conversions", value: "1,847", delta: "+8.2%", up: true },
                  { label: "ROAS", value: "4.2x", delta: "+0.6", up: true },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: "16px 14px",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: m.up ? "#34d399" : "#f87171", marginTop: 3, fontWeight: 600 }}>{m.delta}</div>
                  </div>
                ))}
              </div>

              {/* Channel tabs */}
              <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["GA4", "Google Ads", "Meta", "TikTok", "LinkedIn", "Klaviyo"].map((tab, i) => (
                    <div key={tab} style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: i === 0 ? `rgba(99,102,241,0.15)` : "rgba(255,255,255,0.04)",
                      border: i === 0 ? `1px solid rgba(99,102,241,0.3)` : "1px solid rgba(255,255,255,0.06)",
                      color: i === 0 ? accentLight : "rgba(255,255,255,0.4)",
                    }}>{tab}</div>
                  ))}
                </div>
              </div>

              {/* Mini chart placeholder */}
              <div style={{ padding: "16px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
                  {[18, 24, 20, 32, 28, 36, 42, 38, 45, 40, 48, 52].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${h}%`, borderRadius: 2,
                      background: `rgba(99,102,241,${0.2 + (i / 12) * 0.5})`,
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Sessions, last 30 days</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats-row" className="reveal-section" style={{
        padding: "80px 40px",
        background: `linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(16,185,129,0.03) 100%)`,
        borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="stats-grid">
            {[
              { val: s1, suffix: "", label: "Marketing channels integrated and feeding live data", note: "GA4, Google Ads, Meta, and 13 more", color: accent },
              { val: s2, suffix: "", label: "Dashboard panels across all connected platforms", note: "Each with drill-down capability", color: "#10b981" },
              { val: s3, suffix: "s", label: "Average data refresh time from platform APIs", note: "Cached and rate-limit aware", color: "#f59e0b" },
              { val: s4, suffix: " min", label: "Typical onboarding time to connect a new client", note: "Credentials in, dashboard live", color: "#ec4899" },
            ].map((s, i) => (
              <div key={i} className="stat-card stagger-in" style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "32px 24px", textAlign: "center",
                position: "relative", overflow: "hidden", animationDelay: `${i * 0.1}s`,
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ fontSize: 48, fontWeight: 900, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{s.val}{s.suffix}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 10, lineHeight: 1.5 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">What you get</p>
            <h2 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Everything your team needs.<br />Nothing they don&apos;t.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Each client gets a single dashboard pulling live data from every platform they use. No extra logins, no switching tabs, no copy-pasting numbers into spreadsheets.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card stagger-in" style={{
                padding: "28px 24px", borderRadius: 16,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                animationDelay: `${i * 0.08}s`, transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `rgba(99,102,241,0.12)`, border: `1px solid rgba(99,102,241,0.25)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accentLight, marginBottom: 16,
                }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHANNELS ── */}
      <section id="channels" className="reveal-section" style={{
        padding: "100px 40px",
        background: `linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 100%)`,
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Integrations</p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              16 platforms. One connection each.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="channels-grid">
            {channels.map((ch, i) => (
              <div key={ch.name} className="stagger-in" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                animationDelay: `${i * 0.04}s`,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ch.color, boxShadow: `0 0 6px ${ch.color}`, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{ch.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOCKUP ── */}
      <section id="mockup" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">In action</p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              One client. Every metric. No tab-switching.
            </h2>
          </div>
          <div className="mockup-3d" style={{
            background: "rgba(255,255,255,0.03)", border: `1px solid rgba(99,102,241,0.15)`,
            borderRadius: 20, overflow: "hidden", position: "relative",
          }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(99,102,241,0.15)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={18} color={accentLight} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Bright Sparks Ltd</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>brightsparks.co.uk</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {channels.slice(0, 8).map((ch) => (
                  <div key={ch.name} style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                    background: `${ch.color}20`, color: ch.color, border: `1px solid ${ch.color}40`,
                  }}>{ch.name}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {[
                { label: "Sessions", value: "124,892", delta: "+14.2%", up: true },
                { label: "Leads", value: "2,341", delta: "+22.7%", up: true },
                { label: "Ad Spend", value: "£18,450", delta: "+3.1%", up: false },
                { label: "ROAS", value: "5.8x", delta: "+0.9", up: true },
              ].map((m, i) => (
                <div key={i} style={{ padding: "20px 18px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: m.up ? "#34d399" : "#fbbf24", marginTop: 4, fontWeight: 600 }}>{m.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "18px 28px", background: "rgba(99,102,241,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <TrendingUp size={13} color={accentLight} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>AI Summary</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                Sessions up 14.2% month-on-month, driven primarily by a 31% jump in organic traffic following the March content push. Google Ads ROAS improved to 5.8x after pausing three underperforming ad groups. Meta CPA dropped 18% with the new lookalike audience. Klaviyo email revenue steady at £4,200.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="reveal-section" style={{ padding: "120px 40px 140px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "80%", paddingBottom: "40%",
          bottom: "-20%", left: "50%", transform: "translateX(-50%)",
          background: `radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(99,102,241,0.12)`, border: `1px solid rgba(99,102,241,0.25)`, marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accentGlow}` }} className="accent-pulse" />
            <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Included with StratOS</span>
          </div>
          <h2 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 20, color: "white", lineHeight: 1.05 }} className="blur-reveal">
            Stop switching tabs.<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent}, #10b981)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Start seeing everything.</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 40 }}>
            Every i3 client gets a unified dashboard from day one. Connect your platforms, and the data starts flowing. AI writes the summary. Reports build themselves. Your team focuses on strategy, not screenshots.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 28px", borderRadius: 12,
              background: `linear-gradient(135deg, #4f46e5, ${accent})`,
              color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: `0 0 32px rgba(99,102,241,0.4)`,
            }} className="cta-accent-pulse">
              <Lock size={16} /> Sign in to your dashboard
            </a>
            <a href="mailto:hello@i3media.co.uk" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 28px", borderRadius: 12,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600, textDecoration: "none",
            }}>Talk to us</a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            No extra tools. No extra cost. Already part of your StratOS platform.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, color: "rgba(255,255,255,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 18, opacity: 0.4 }} alt="i3MEDIA" />
          <span>&copy; {new Date().getFullYear()} i3 Media. Client Dashboard is part of StratOS.</span>
        </div>
        <a href="/login" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 12 }}>&larr; Back to StratOS</a>
      </div>

      <style>{`
        .side-nav { display: flex; }
        @media (max-width: 1100px) { .side-nav { display: none !important; } }

        @keyframes orb1 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(40px, -30px) scale(1.1); } 70% { transform: translate(-20px, 20px) scale(0.92); } }
        @keyframes orb2 { 0%, 100% { transform: translate(0,0) scale(1); } 35% { transform: translate(-30px, 25px) scale(0.9); } 70% { transform: translate(30px, -40px) scale(1.12); } }
        .orb-1 { animation: orb1 16s ease-in-out infinite; }
        .orb-2 { animation: orb2 20s ease-in-out infinite; }

        @keyframes hw-in { from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(6px); } to { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); } }
        .hw { display: inline-block; animation: hw-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; }
        .hw2 { animation-delay: 0.25s; }

        @keyframes particle-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-22px) scale(1.4); } }
        .hero-particle { animation: particle-float linear infinite; }

        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(99,102,241,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(99,102,241,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }

        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }

        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.75), 0 0 80px rgba(99,102,241,0.15); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }

        .feature-card:hover { transform: translateY(-6px) scale(1.015) !important; border-color: rgba(99,102,241,0.2) !important; box-shadow: 0 16px 48px rgba(99,102,241,0.12); }
        .stat-card:hover { transform: translateY(-6px) scale(1.025) !important; border-color: rgba(99,102,241,0.2) !important; box-shadow: 0 16px 48px rgba(99,102,241,0.12); }

        @keyframes card-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 4px 32px rgba(99,102,241,0.08), 0 0 0 1px rgba(99,102,241,0.1); } 50% { box-shadow: 0 8px 48px rgba(99,102,241,0.22), 0 0 0 1px rgba(99,102,241,0.2); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 92% { opacity: 0.5; } 100% { transform: translateY(600px); opacity: 0; } }
        .mockup-3d { animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 40%, rgba(99,102,241,0.8) 50%, rgba(99,102,241,0.6) 60%, transparent 100%); animation: scan-line 8s ease-in-out infinite; pointer-events: none; }

        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .channels-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-particle { animation: none !important; }
          .stagger-in { opacity: 1 !important; transform: none !important; animation: none !important; }
          .blur-reveal { opacity: 1 !important; animation: none !important; }
          h1 { font-size: 42px !important; }
          h2 { font-size: 32px !important; }
        }
      `}</style>
    </div>
  );
}

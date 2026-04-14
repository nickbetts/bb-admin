"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  Layers,
  Code2,
  RefreshCw,
  Users,
  LineChart,
  Star,
  Lock,
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

const comparisons = [
  {
    feature: "ROAS and CPA benchmarks by sector and budget tier",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Trained on real campaign outcomes (not simulations)",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Platform-specific anomaly detection thresholds",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Budget-tier-aware recommendations",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Creative fatigue and frequency intelligence",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Cross-channel attribution modelling",
    meridian: true, gpt4o: "partial", gemini: "partial", claude: "partial", mistral: false,
  },
  {
    feature: "Learns from recommendation outcomes over time",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Understands Google Ads quality score dynamics",
    meridian: true, gpt4o: "partial", gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Sector-specific creative performance patterns",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Live benchmark database injection at inference",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "White-label API with custom model IDs",
    meridian: true, gpt4o: false, gemini: false, claude: false, mistral: false,
  },
  {
    feature: "Fluent marketing and copywriting output",
    meridian: true, gpt4o: true, gemini: true, claude: true, mistral: true,
  },
];

const benchmarkRows = [
  { sector: "E-commerce", channel: "Meta Ads", metric: "ROAS", p25: "1.8x", median: "2.9x", p75: "4.6x", top10: "7.2x" },
  { sector: "Education", channel: "Google Ads", metric: "CPA", p25: "£94", median: "£61", p75: "£38", top10: "£22" },
  { sector: "Hospitality", channel: "Google Ads", metric: "CTR", p25: "2.1%", median: "3.8%", p75: "5.9%", top10: "9.2%" },
  { sector: "SaaS / B2B", channel: "LinkedIn Ads", metric: "CPL", p25: "£88", median: "£54", p75: "£31", top10: "£19" },
  { sector: "Charity", channel: "Meta Ads", metric: "CPC", p25: "£1.42", median: "£0.89", p75: "£0.52", top10: "£0.28" },
  { sector: "Retail", channel: "Google Shopping", metric: "ROAS", p25: "2.2x", median: "3.6x", p75: "5.8x", top10: "9.4x" },
  { sector: "Healthcare", channel: "Google Ads", metric: "CPA", p25: "£142", median: "£88", p75: "£51", top10: "£29" },
  { sector: "Travel", channel: "Meta Ads", metric: "CPC", p25: "£0.92", median: "£0.58", p75: "£0.34", top10: "£0.18" },
  { sector: "Finance / Fintech", channel: "Google Ads", metric: "CPL", p25: "£74", median: "£46", p75: "£28", top10: "£14" },
  { sector: "Automotive", channel: "YouTube Ads", metric: "CPV", p25: "£0.04", median: "£0.025", p75: "£0.014", top10: "£0.008" },
  { sector: "Fashion / Beauty", channel: "TikTok Ads", metric: "ROAS", p25: "1.4x", median: "2.6x", p75: "4.1x", top10: "6.8x" },
  { sector: "Property", channel: "Meta Ads", metric: "CPL", p25: "£38", median: "£22", p75: "£13", top10: "£7" },
];

const capabilities = [
  {
    icon: <BarChart3 size={22} />,
    title: "Benchmark-aware analysis",
    desc: "Every metric you submit gets benchmarked against real accounts in your sector, your channel, and your budget range. 47th percentile. Not just good or bad.",
    colour: "#7c3aed",
    tag: "Core feature",
  },
  {
    icon: <TrendingUp size={22} />,
    title: "Outcome-calibrated forecasts",
    desc: "Meridian forecasts aren't statistical projections. They're built from what actually happened when agencies in similar positions took similar actions.",
    colour: "#06b6d4",
    tag: "Forecasting",
  },
  {
    icon: <Target size={22} />,
    title: "Budget reallocation intelligence",
    desc: "Budget move recommendations come with real confidence intervals drawn from 24 million labelled data points across your exact spend tier.",
    colour: "#f59e0b",
    tag: "Paid media",
  },
  {
    icon: <Sparkles size={22} />,
    title: "Creative fatigue and format intelligence",
    desc: "Meridian knows which creative formats burn out fastest in your sector, which angles drive the highest CTR, and when to rotate before you lose ROAS.",
    colour: "#10b981",
    tag: "Creative",
  },
  {
    icon: <Activity size={22} />,
    title: "Anomaly root-cause diagnosis",
    desc: "Something dropped 30% overnight. Meridian cross-references 12 signal types across your account history and surfaces the most probable cause in seconds.",
    colour: "#ec4899",
    tag: "Diagnostics",
  },
  {
    icon: <Globe size={22} />,
    title: "Cross-channel performance narrative",
    desc: "15 channels. One story. Meridian reads across Google, Meta, TikTok, LinkedIn, Klaviyo and more to tell you what is actually driving growth.",
    colour: "#8b5cf6",
    tag: "Reporting",
  },
  {
    icon: <Zap size={22} />,
    title: "Real-time strategy generation",
    desc: "Brief Meridian on a client objective and it outputs a prioritised 90-day strategy grounded in what has worked for comparable accounts in that sector.",
    colour: "#f59e0b",
    tag: "Strategy",
  },
  {
    icon: <Users size={22} />,
    title: "Audience and segment insight",
    desc: "Meridian identifies audience fatigue, overlap, and expansion opportunities by drawing on behavioural signal patterns from 800,000+ ad accounts.",
    colour: "#06b6d4",
    tag: "Audience",
  },
  {
    icon: <LineChart size={22} />,
    title: "Attribution and revenue modelling",
    desc: "Go beyond last-click. Meridian builds data-driven attribution models trained on first-party outcomes across your exact channel mix and funnel length.",
    colour: "#a78bfa",
    tag: "Attribution",
  },
];

export default function MeridianPage() {
  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [activeBenchmarkRow, setActiveBenchmarkRow] = useState(0);
  const [apiTabActive, setApiTabActive] = useState(0);
  const [flyStep, setFlyStep] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setParallaxY(el.scrollTop * 0.2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  const navIds = ["problem", "how-it-works", "benchmarks", "capabilities", "comparison", "api", "pricing", "cta"];
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

  // Flywheel auto-advance
  useEffect(() => {
    const t = setInterval(() => setFlyStep((s) => (s + 1) % 5), 2200);
    return () => clearInterval(t);
  }, []);

  // Benchmark rows cycle
  useEffect(() => {
    const t = setInterval(() => setActiveBenchmarkRow((r) => (r + 1) % benchmarkRows.length), 2400);
    return () => clearInterval(t);
  }, []);

  // Progress bar in hero mockup
  useEffect(() => {
    let v = 0;
    const t = setInterval(() => {
      v = v >= 100 ? 0 : v + 0.8;
      setAnimProgress(v);
    }, 30);
    return () => clearInterval(t);
  }, []);

  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    top: `${6 + (i * 4.3) % 84}%`,
    left: `${4 + (i * 6.7) % 92}%`,
    size: 1 + (i % 3),
    dur: `${4 + (i % 5)}s`,
    delay: `${-(i * 0.6)}s`,
    opacity: 0.04 + (i % 4) * 0.035,
  }));

  const s1 = useCountUp(15, 1800, statsVisible);
  const s2 = useCountUp(24, 2200, statsVisible);
  const s3 = useCountUp(97, 1600, statsVisible);
  const s4 = useCountUp(19, 2000, statsVisible);

  const navLinks = [
    { id: "problem", label: "The problem" },
    { id: "how-it-works", label: "How it works" },
    { id: "benchmarks", label: "Benchmarks" },
    { id: "capabilities", label: "Capabilities" },
    { id: "comparison", label: "vs the rest" },
    { id: "api", label: "API access" },
    { id: "pricing", label: "Pricing" },
    { id: "cta", label: "Get access" },
  ];

  const flywheelSteps = [
    { label: "Agencies run Meridian", icon: <Users size={14} />, colour: "#7c3aed" },
    { label: "Real outcome data flows in", icon: <Database size={14} />, colour: "#8b5cf6" },
    { label: "Benchmarks get sharper", icon: <Target size={14} />, colour: "#06b6d4" },
    { label: "Recommendations improve", icon: <TrendingUp size={14} />, colour: "#10b981" },
    { label: "Clients get better results", icon: <Star size={14} />, colour: "#f59e0b" },
  ];

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes glow-pulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes particle-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes hero-reveal { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes width-grow { from{width:0%} to{width:100%} }
        @keyframes counter-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scan-line { 0%{top:-2px} 100%{top:100%} }
        @keyframes typewriter { from{width:0} to{width:100%} }
        @keyframes blink-cursor { 0%,90%{opacity:1} 95%,100%{opacity:0} }
        .hero-particle { animation: particle-float var(--dur,5s) var(--delay,0s) ease-in-out infinite; }
        .section-reveal { opacity:0; transform:translateY(32px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .section-visible { opacity:1 !important; transform:translateY(0) !important; }
        .reveal-section { opacity:0; transform:translateY(32px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .meridian-side-nav { display:flex; }
        .meridian-card-hover { transition:transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .meridian-card-hover:hover { transform:translateY(-4px); box-shadow:0 20px 60px rgba(124,58,237,0.2) !important; border-color:rgba(124,58,237,0.5) !important; }
        @media(max-width:900px) { .meridian-side-nav{display:none!important} .hero-grid{grid-template-columns:1fr!important} .hero-mockup{display:none!important} }
        @media(max-width:640px) { .stats-grid{grid-template-columns:1fr 1fr!important} .comp-grid{grid-template-columns:1fr!important} }
        .fly-step { transition: all 0.4s ease; }
        .fly-step-active { border-color: rgba(124,58,237,0.7) !important; background: rgba(124,58,237,0.15) !important; }
        .tab-btn { transition: all 0.2s ease; }
        .tab-btn-active { background: rgba(124,58,237,0.2) !important; border-color: rgba(124,58,237,0.5) !important; color: #c4b5fd !important; }
        @keyframes scanning { 0%{top:-4px;opacity:0.8} 70%{opacity:0.5} 100%{top:100%;opacity:0} }
        .scan-line { animation: scanning 3s linear infinite; }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-in-up { animation: fade-in-up 0.5s ease forwards; }
        .cta-violet-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        .benchmark-row-fade { transition: all 0.4s ease; }
      `}</style>

      {/* Cursor glow */}
      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 1,
        width: 700, height: 700, borderRadius: "50%",
        left: mouse.x - 350, top: mouse.y - 350,
        background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)",
        transition: "left 0.25s ease-out, top 0.25s ease-out",
      }} />

      {/* Side nav */}
      <nav style={{
        position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
        zIndex: 40, display: "flex", flexDirection: "column", gap: 1,
        background: "rgba(9,9,15,0.88)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, padding: "10px 6px",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }} className="meridian-side-nav">
        {navLinks.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={scrollTo(id)} style={{
            display: "block", padding: "5px 12px", borderRadius: 8,
            fontSize: 11, fontWeight: 600,
            color: activeSection === id ? "#c4b5fd" : "rgba(255,255,255,0.2)",
            textDecoration: "none",
            borderLeft: activeSection === id ? "2px solid #7c3aed" : "2px solid transparent",
            whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s",
          }}>{label}</a>
        ))}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: "linear-gradient(180deg, #7c3aed, #06b6d4)", transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>

      {/* Top nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(9,9,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: 64, display: "flex", alignItems: "center",
        padding: "0 40px", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/login" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
            <img src="/primary-logo.svg" style={{ height: 26, width: "auto" }} alt="i3MEDIA" />
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>StratOS</span>
          </a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 8px rgba(124,58,237,0.7)", display: "inline-block" }} className="stratum-pulse" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em" }}>Meridian</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", padding: "2px 7px", borderRadius: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Alpha</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/ad-traffic-protection" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "7px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7",
            fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Ad Traffic Protection
          </a>
          <a href="/login" style={{
            padding: "9px 18px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>Sign in</a>
          <a href="#cta" onClick={scrollTo("cta")} style={{
            padding: "9px 22px", borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 0 24px rgba(124,58,237,0.4)",
          }} className="cta-violet-pulse">Request access →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", paddingTop: 64, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        {/* Orbs */}
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "60%",
          top: "-10%", left: "-8%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 65%)",
          transform: `translateY(${parallaxY * -0.2}px)`,
        }} />
        <div style={{
          position: "absolute", width: "45%", paddingBottom: "45%",
          bottom: "-20%", right: "-5%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 65%)",
          transform: `translateY(${parallaxY * -0.1}px)`,
        }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {particles.map(p => (
          <div key={p.id} className="hero-particle" style={{
            position: "absolute", top: p.top, left: p.left, pointerEvents: "none",
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.id % 3 === 0 ? "rgba(124,58,237,0.9)" : p.id % 3 === 1 ? "rgba(6,182,212,0.9)" : "rgba(255,255,255,0.8)",
            opacity: p.opacity,
            ["--dur" as string]: p.dur, ["--delay" as string]: p.delay,
          }} />
        ))}

        <div style={{
          maxWidth: 1240, margin: "0 auto", padding: "80px 40px",
          display: "grid", gridTemplateColumns: "1fr 500px", gap: 72,
          alignItems: "center", width: "100%", position: "relative", boxSizing: "border-box",
        }} className="hero-grid">
          {/* Left */}
          <div style={{ animation: "hero-reveal 0.8s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.35)",
              }}>
                <Brain size={12} color="#a78bfa" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  The world&apos;s first marketing-native LLM
                </span>
              </div>
            </div>
            <h1 style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: 28, color: "white" }}>
              <span style={{ display: "block", opacity: 0, animation: "hero-reveal 0.7s 0.1s ease both" }}>The AI that</span>
              <span style={{ display: "block", opacity: 0, animation: "hero-reveal 0.7s 0.2s ease both" }}>
                knows{" "}
                <span style={{ background: "linear-gradient(90deg, #a78bfa, #7c3aed, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>what good</span>
              </span>
              <span style={{ display: "block", opacity: 0, animation: "hero-reveal 0.7s 0.3s ease both" }}>looks like.</span>
            </h1>
            <p style={{
              fontSize: 19, color: "rgba(255,255,255,0.58)", lineHeight: 1.8,
              maxWidth: 520, marginBottom: 44, fontWeight: 400,
              opacity: 0, animation: "hero-reveal 0.7s 0.45s ease both",
            }}>
              Generic AI gives generic answers. Meridian is trained on 24 million real campaign outcomes, live benchmark data from 15 channels, and the collective knowledge of agencies managing billions in ad spend. It doesn&apos;t just describe your numbers. It tells you if they&apos;re any good.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: 0, animation: "hero-reveal 0.7s 0.6s ease both" }}>
              <a href="#cta" onClick={scrollTo("cta")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none",
                boxShadow: "0 4px 32px rgba(124,58,237,0.45)",
              }}>Request access <ArrowRight size={16} /></a>
              <a href="#how-it-works" onClick={scrollTo("how-it-works")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 24px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600, textDecoration: "none",
              }}>How it works <ChevronRight size={16} /></a>
            </div>
            {/* Inline trust signals */}
            <div style={{ display: "flex", gap: 24, marginTop: 44, flexWrap: "wrap", opacity: 0, animation: "hero-reveal 0.7s 0.75s ease both" }}>
              {[
                { label: "24M+ training examples", sub: "real campaigns, real outcomes" },
                { label: "15 channel integrations", sub: "from Google to TikTok to Klaviyo" },
                { label: "12 sectors covered", sub: "with budget-tier benchmarks" },
              ].map(t => (
                <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — hero mockup */}
          <div className="hero-mockup" style={{ animation: "hero-reveal 0.9s 0.3s ease both", opacity: 0 }}>
            <div style={{
              background: "rgba(13,13,26,0.95)", border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: 16, padding: 0, overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.15)",
              position: "relative",
            }}>
              {/* Scanning line */}
              <div className="scan-line" style={{
                position: "absolute", left: 0, right: 0, height: 2,
                background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(6,182,212,0.4), transparent)",
                pointerEvents: "none", zIndex: 10,
              }} />
              {/* Mock title bar */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["#ff5f57", "#ffbd2e", "#28ca41"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />)}
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 22, display: "flex", alignItems: "center", paddingLeft: 10 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>meridian.ai/analyse</span>
                </div>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 6px rgba(124,58,237,0.8)" }} />
              </div>
              {/* Mock content */}
              <div style={{ padding: "18px 20px" }}>
                {/* Request snippet */}
                <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "12px 14px", marginBottom: 14, border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(124,58,237,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>POST /v1/analyse</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                    <span style={{ color: "#c4b5fd" }}>sector</span>: <span style={{ color: "#86efac" }}>&quot;ecommerce&quot;</span><br />
                    <span style={{ color: "#c4b5fd" }}>channel</span>: <span style={{ color: "#86efac" }}>&quot;meta_ads&quot;</span><br />
                    <span style={{ color: "#c4b5fd" }}>roas</span>: <span style={{ color: "#fcd34d" }}>2.8</span>{" "}<span style={{ color: "#6b7280" }}>{"// your value"}</span><br />
                    <span style={{ color: "#c4b5fd" }}>budget</span>: <span style={{ color: "#fcd34d" }}>15000</span>{" "}<span style={{ color: "#6b7280" }}>{"// monthly"}</span>
                  </div>
                </div>

                {/* Benchmark verdict */}
                <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Benchmark verdict</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", padding: "2px 8px", borderRadius: 4 }}>Below median</span>
                  </div>
                  {/* Bar chart */}
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 48, marginBottom: 8 }}>
                    {[
                      { label: "P25", h: 28, val: "1.8x", active: false },
                      { label: "P50", h: 38, val: "2.9x", active: false },
                      { label: "You", h: 29, val: "2.8x", active: true },
                      { label: "P75", h: 52, val: "4.6x", active: false },
                      { label: "Top", h: 68, val: "7.2x", active: false },
                    ].map(b => (
                      <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 3 }}>
                        <span style={{ fontSize: 9, color: b.active ? "#fbbf24" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{b.val}</span>
                        <div style={{ width: "100%", height: b.h, borderRadius: "3px 3px 0 0", background: b.active ? "rgba(251,191,36,0.6)" : "rgba(124,58,237,0.35)", border: b.active ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(124,58,237,0.2)", transition: "all 0.3s" }} />
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI insight */}
                <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.18)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#67e8f9", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                    <Sparkles size={9} color="#67e8f9" /> Meridian insight
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: 0 }}>
                    Your 2.8x ROAS sits at the <strong style={{ color: "#e2e8f0" }}>47th percentile</strong> for e-commerce Meta Ads at £10-20k/month. Accounts at your spend level typically hit 3.5-4.2x once audience segmentation is dialled in. <strong style={{ color: "#a78bfa" }}>Primary lever: creative frequency at 3.2, above the 2.4 fatigue threshold for your sector.</strong>
                  </p>
                </div>

                {/* Recommendations */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { text: "Pause 3 creatives above 3.0 frequency", priority: "High", colour: "#ef4444" },
                    { text: "Shift budget to ROAS > 4x ad sets", priority: "High", colour: "#ef4444" },
                    { text: "Test UGC format, +34% CTR in your sector", priority: "Medium", colour: "#f59e0b" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.colour, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flex: 1 }}>{r.text}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: r.colour, background: `${r.colour}18`, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{r.priority}</span>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(124,58,237,0.06)", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Training data quality</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa" }}>94%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${animProgress}%`, background: "linear-gradient(90deg, #7c3aed, #06b6d4)", borderRadius: 2, transition: "width 0.1s" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats-row" className="reveal-section" style={{ padding: "0 40px 80px", position: "relative", zIndex: 2 }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, overflow: "hidden",
        }} className="stats-grid">
          {[
            { val: s1, suffix: " channels", label: "trained across", desc: "every major paid and organic platform" },
            { val: s2, suffix: "M+", label: "labelled training examples", desc: "real agency campaigns with verified outcomes" },
            { val: s3, suffix: "%", label: "benchmark accuracy", desc: "independently verified against held-out dataset" },
            { val: s4, suffix: "x", label: "more precise on marketing", desc: "vs GPT-4o on sector-specific queries" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "32px 28px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, right: 14, width: 28, height: 28, borderRadius: "50%", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(124,58,237,0.6)" }} />
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
                {s.val}{s.suffix}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section id="problem" className="reveal-section" style={{ padding: "80px 40px", position: "relative" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5", letterSpacing: "0.08em", textTransform: "uppercase" }}>Why generic AI fails marketers</span>
            </div>
            <h2 style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
              ChatGPT doesn&apos;t know<br />
              <span style={{ background: "linear-gradient(90deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>your sector. Meridian does.</span>
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
              Ask any general LLM about your 2.8x ROAS and it will say something about strong performance depending on your margins. Ask Meridian and it tells you you&apos;re at the 47th percentile for your sector, what the top 10% are doing differently, and which lever to pull first.
            </p>
          </div>

          {/* Side by side comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, margin: "0 auto" }} className="comp-grid">
            {/* Generic AI */}
            <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", padding: "3px 10px", borderRadius: 100 }}>Generic LLM</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Response to: &quot;My Meta ROAS is 2.8x&quot;</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.75, fontStyle: "italic", borderLeft: "3px solid rgba(239,68,68,0.3)", paddingLeft: 14 }}>
                &quot;A ROAS of 2.8x means you&apos;re generating £2.80 for every £1 spent. This could indicate strong performance depending on your industry and margins. You may want to consider whether your campaigns are meeting your business objectives and review your audience targeting.&quot;
              </p>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 7 }}>
                {["No sector context", "No budget-range awareness", "No actionable next step", "Could apply to any business"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    <XCircle size={13} color="#f87171" />{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Meridian */}
            <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, color: "#a78bfa", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", padding: "3px 10px", borderRadius: 100 }}>Meridian</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Same question</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontStyle: "italic", borderLeft: "3px solid rgba(124,58,237,0.5)", paddingLeft: 14 }}>
                &quot;At 2.8x, you&apos;re at the 47th percentile for e-commerce Meta accounts at £10-20k/month. Median for your tier is 3.1x and top quartile accounts average 4.6x. Your creative frequency is 3.2, above the 2.4 threshold where e-commerce audiences fatigue. Pause ad sets above 3.0 frequency and rotate creative. Historically this recovers 0.4-0.8x ROAS within 14 days for accounts in your range.&quot;
              </p>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 7 }}>
                {["Sector-specific percentile rank", "Budget-range benchmarks", "Specific next action", "Evidence from comparable accounts"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                    <CheckCircle2 size={13} color="#a78bfa" />{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="reveal-section" style={{ padding: "80px 40px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.08em", textTransform: "uppercase" }}>Architecture</span>
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>Three versions.<br />One mission.</h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>
              Meridian isn&apos;t bolt-on AI. It&apos;s a ground-up model stack built on a foundation LLM, fine-tuned on 24 million labelled marketing outcomes, and augmented with a live benchmark database that updates every 24 hours.
            </p>
          </div>

          {/* Architecture diagram */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 960, margin: "0 auto 72px", position: "relative" }}>
            {/* Connector lines */}
            <div style={{ position: "absolute", top: 56, left: "33%", width: "34%", height: 2, background: "linear-gradient(90deg, rgba(124,58,237,0.4), rgba(6,182,212,0.4))", pointerEvents: "none" }} />
            {[
              {
                icon: <Layers size={26} color="#a78bfa" />,
                title: "Foundation model",
                sub: "Llama 3.1 70B base",
                desc: "Built on Llama 3.1 70B, one of the strongest open-source foundation models available. Deep language understanding, long-context reasoning, and a proven base for domain-specific fine-tuning.",
                colour: "#7c3aed",
                badge: "v1",
              },
              {
                icon: <Database size={26} color="#67e8f9" />,
                title: "Marketing fine-tune",
                sub: "24M+ labelled examples",
                desc: "Fine-tuned on 24 million labelled agency report outputs, channel-specific analyses, and expert commentary, all labelled by actual campaign outcomes. This is what makes Meridian different from every other model.",
                colour: "#06b6d4",
                badge: "v2",
              },
              {
                icon: <Target size={26} color="#34d399" />,
                title: "Live benchmark injection",
                sub: "Updated every 24 hours",
                desc: "At inference time, every query is enriched with live benchmark data: your sector, your channel, your budget tier. Meridian doesn&apos;t guess what good looks like. It looks it up.",
                colour: "#10b981",
                badge: "v3",
              },
            ].map((l, i) => (
              <div key={i} className="meridian-card-hover" style={{
                background: "rgba(13,13,26,0.8)", border: `1px solid rgba(${l.colour === "#7c3aed" ? "124,58,237" : l.colour === "#06b6d4" ? "6,182,212" : "16,185,129"},0.2)`,
                borderRadius: 16, padding: "32px 28px",
                boxShadow: `0 8px 40px rgba(0,0,0,0.4)`,
                cursor: "default",
              }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: `rgba(${l.colour === "#7c3aed" ? "124,58,237" : l.colour === "#06b6d4" ? "6,182,212" : "16,185,129"},0.12)`, marginBottom: 20 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: l.icon.props.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{l.badge}</span>
                </div>
                <div style={{ marginBottom: 16 }}>{l.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>{l.title}</h3>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", marginBottom: 14 }}>{l.sub}</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>{l.desc}</p>
              </div>
            ))}
          </div>

          {/* The flywheel */}
          <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 20, padding: "48px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h3 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 10, letterSpacing: "-0.025em" }}>The data flywheel</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 440, margin: "0 auto" }}>Every agency that joins Meridian makes it smarter for everyone else. More data means better benchmarks, which means better recommendations, which means better results, which means more agencies. That compounding advantage is the moat no competitor can buy.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {flywheelSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className={`fly-step ${flyStep === i ? "fly-step-active" : ""}`} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 10,
                    background: flyStep === i ? `${step.colour}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${flyStep === i ? step.colour + "60" : "rgba(255,255,255,0.07)"}`,
                  }}>
                    <div style={{ color: flyStep === i ? step.colour : "rgba(255,255,255,0.3)" }}>{step.icon}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: flyStep === i ? "white" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{step.label}</span>
                  </div>
                  {i < flywheelSteps.length - 1 && <ArrowRight size={12} color="rgba(255,255,255,0.15)" />}
                </div>
              ))}
              <ArrowRight size={12} color="rgba(255,255,255,0.15)" style={{ transform: "rotate(180deg)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── BENCHMARKS ── */}
      <section id="benchmarks" className="reveal-section" style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: 72, alignItems: "center" }} className="comp-grid">
            {/* Left */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#67e8f9", letterSpacing: "0.08em", textTransform: "uppercase" }}>Proprietary benchmark data</span>
              </div>
              <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 22, color: "white" }}>
                Percentile rankings,<br />
                <span style={{ background: "linear-gradient(90deg, #67e8f9, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>not vague verdicts.</span>
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 32, maxWidth: 460 }}>
                Meridian&apos;s benchmark database covers 15 channels, 12 sectors, and 6 budget tiers. Submit any metric and it immediately places you in the distribution, compares you to adjacent accounts, and tells you what separates the top quartile from everyone else.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["15 channels, 12 sectors, 6 budget tiers", "Updated every 24 hours from live campaign data", "Percentile positions, not just averages", "Budget-normalised so the comparison is always fair", "800,000+ ad accounts contributing signal"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06b6d4", flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — benchmark table mockup */}
            <div style={{ background: "rgba(13,13,26,0.9)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Live benchmark database</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["#ff5f57", "#ffbd2e", "#28ca41"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
                </div>
              </div>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 70px 70px 70px", gap: 0, padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["Sector / Channel", "Metric", "P25", "Median", "P75", "Top 10%"].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                ))}
              </div>
              {benchmarkRows.map((row, i) => (
                <div key={i} className="benchmark-row-fade" style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 70px 70px 70px 70px",
                  padding: "12px 20px", borderBottom: i < benchmarkRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: i === activeBenchmarkRow ? "rgba(124,58,237,0.08)" : "transparent",
                  transition: "background 0.3s",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 2 }}>{row.sector}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{row.channel}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", alignSelf: "center" }}>{row.metric}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", alignSelf: "center" }}>{row.p25}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", alignSelf: "center" }}>{row.median}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", alignSelf: "center" }}>{row.p75}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", alignSelf: "center" }}>{row.top10}</span>
                </div>
              ))}
              <div style={{ padding: "12px 20px", background: "rgba(124,58,237,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={12} color="#7c3aed" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Updated daily · 15 channels · 12 sectors · 6 budget tiers · 800,000+ accounts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="capabilities" className="reveal-section" style={{ padding: "80px 40px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.08em", textTransform: "uppercase" }}>What it can do</span>
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
              Nine capabilities.<br />None of them generic.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="stats-grid">
            {capabilities.map((cap, i) => (
              <div key={i} className="meridian-card-hover" style={{
                background: "rgba(13,13,26,0.7)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "28px 26px", cursor: "default",
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${cap.colour}18`, border: `1px solid ${cap.colour}35`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, color: cap.colour }}>{cap.icon}</div>
                <div style={{ display: "inline-flex", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 4 }}>{cap.tag}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 10, lineHeight: 1.3 }}>{cap.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section id="comparison" className="reveal-section" style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 16, color: "white" }}>
              Meridian vs every other model
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 500, margin: "0 auto" }}>
              GPT-4o, Claude 3.5, Gemini 1.5 Pro, and Mistral Large are all excellent general-purpose models. None of them know what a good ROAS looks like for a fashion brand running TikTok at £20k a month.
            </p>
          </div>

          <div style={{ background: "rgba(13,13,26,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Capability</span>
              {["Meridian", "GPT-4o", "Claude 3.5", "Gemini 1.5", "Mistral"].map((h, i) => (
                <span key={h} style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "#c4b5fd" : "rgba(255,255,255,0.3)", textAlign: "center" }}>{h}</span>
              ))}
            </div>
            {comparisons.map((row, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                padding: "14px 24px", borderBottom: i < comparisons.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: i % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{row.feature}</span>
                {(["meridian", "gpt4o", "claude", "gemini", "mistral"] as const).map((k, ki) => {
                  const val = row[k];
                  return (
                    <div key={k} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      {val === true ? <CheckCircle2 size={16} color={ki === 0 ? "#a78bfa" : "#4b5563"} />
                        : val === false ? <XCircle size={15} color="#374151" />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>partial</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API ── */}
      <section id="api" className="reveal-section" style={{ padding: "80px 40px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 520px", gap: 72, alignItems: "start" }} className="comp-grid">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 24 }}>
                <Code2 size={12} color="#c4b5fd" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.08em", textTransform: "uppercase" }}>API access</span>
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 22, color: "white" }}>
                Drop in. No migration.<br />
                <span style={{ background: "linear-gradient(90deg, #a78bfa, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>OpenAI-compatible.</span>
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 32, maxWidth: 420 }}>
                Meridian&apos;s API matches the OpenAI spec exactly. Swap the base URL and model ID and you&apos;re done. If it works with the OpenAI SDK today, it works with Meridian tomorrow.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: <RefreshCw size={14} />, title: "OpenAI SDK compatible", desc: "One-line swap from openai to meridian. No refactor." },
                  { icon: <Lock size={14} />, title: "Your data is never trained on", desc: "Client data is isolated and never used to update the model." },
                  { icon: <Activity size={14} />, title: "Streaming supported", desc: "Server-sent events for real-time UI streaming out of the box." },
                  { icon: <LineChart size={14} />, title: "Usage analytics built in", desc: "Token spend, latency, cost per insight, and model version history." },
                  { icon: <Zap size={14} />, title: "Sub-800ms median latency", desc: "Optimised inference stack with global edge nodes." },
                  { icon: <Globe size={14} />, title: "15 native integrations", desc: "Google Ads, Meta, TikTok, LinkedIn, GA4, Klaviyo, Search Console, and more." },
                ].map(f => (
                  <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code block */}
            <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 2, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["TypeScript", "Python", "cURL"].map((t, i) => (
                  <button key={t} className={`tab-btn ${apiTabActive === i ? "tab-btn-active" : ""}`} onClick={() => setApiTabActive(i)} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: apiTabActive === i ? "rgba(124,58,237,0.2)" : "transparent",
                    border: `1px solid ${apiTabActive === i ? "rgba(124,58,237,0.5)" : "transparent"}`,
                    color: apiTabActive === i ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                    cursor: "pointer",
                  }}>{t}</button>
                ))}
              </div>
              {/* Code */}
              <div style={{ padding: "20px 22px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.75, color: "rgba(255,255,255,0.7)", overflowX: "auto" }}>
                {apiTabActive === 0 && (
                  <pre
                    style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    dangerouslySetInnerHTML={{
                      __html: [
                        `<span style="color:#f472b6">import</span> OpenAI <span style="color:#f472b6">from</span> <span style="color:#86efac">'openai'</span>`,
                        ``,
                        `<span style="color:#94a3b8">// Just swap the baseURL — nothing else changes</span>`,
                        `<span style="color:#f472b6">const</span> client = <span style="color:#f472b6">new</span> <span style="color:#67e8f9">OpenAI</span>({`,
                        `  baseURL: <span style="color:#86efac">'https://api.meridian.ai/v1'</span>,`,
                        `  apiKey: <span style="color:#86efac">process.env.MERIDIAN_API_KEY</span>,`,
                        `});`,
                        ``,
                        `<span style="color:#f472b6">const</span> response = <span style="color:#f472b6">await</span> client.chat.completions.<span style="color:#67e8f9">create</span>({`,
                        `  model: <span style="color:#86efac">'meridian-marketing-v1'</span>,`,
                        `  messages: [`,
                        `    { role: <span style="color:#86efac">'system'</span>, content: <span style="color:#86efac">'sector:ecommerce budget:15000'</span> },`,
                        `    { role: <span style="color:#86efac">'user'</span>, content: <span style="color:#86efac">'Analyse my Meta ROAS of 2.8x'</span> },`,
                        `  ],`,
                        `});`,
                      ].join("\n"),
                    }}
                  />
                )}
                {apiTabActive === 1 && (
                  <pre
                    style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    dangerouslySetInnerHTML={{
                      __html: [
                        `<span style="color:#f472b6">from</span> openai <span style="color:#f472b6">import</span> OpenAI`,
                        ``,
                        `<span style="color:#94a3b8"># Just swap the base_url</span>`,
                        `client = <span style="color:#67e8f9">OpenAI</span>(`,
                        `  base_url=<span style="color:#86efac">"https://api.meridian.ai/v1"</span>,`,
                        `  api_key=os.environ[<span style="color:#86efac">"MERIDIAN_API_KEY"</span>]`,
                        `)`,
                        ``,
                        `response = client.chat.completions.<span style="color:#67e8f9">create</span>(`,
                        `  model=<span style="color:#86efac">"meridian-marketing-v1"</span>,`,
                        `  messages=[`,
                        `    {"role": <span style="color:#86efac">"user"</span>, "content": <span style="color:#86efac">"Analyse ROAS 2.8x"</span>}`,
                        `  ]`,
                        `)`,
                      ].join("\n"),
                    }}
                  />
                )}
                {apiTabActive === 2 && (
                  <pre
                    style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    dangerouslySetInnerHTML={{
                      __html: [
                        `<span style="color:#94a3b8"># Drop-in replacement for OpenAI</span>`,
                        `curl https://api.meridian.ai/<span style="color:#67e8f9">v1</span>/chat/completions \\`,
                        `  -H <span style="color:#86efac">"Authorization: Bearer $MERIDIAN_API_KEY"</span> \\`,
                        `  -H <span style="color:#86efac">"Content-Type: application/json"</span> \\`,
                        `  -d '{`,
                        `    "model": <span style="color:#86efac">"meridian-marketing-v1"</span>,`,
                        `    "messages": [{"role": <span style="color:#86efac">"user"</span>,`,
                        `      "content": <span style="color:#86efac">"Analyse ROAS 2.8x"</span>}]`,
                        `  }'`,
                      ].join("\n"),
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(124,58,237,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={12} color="#a78bfa" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Compatible with OpenAI SDK v4+ · No code refactor needed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="reveal-section" style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 16, color: "white" }}>
              Access Meridian
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
              Meridian is in private alpha. Pricing is based on token volume and
              team size. Every tier includes benchmark database access.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="stats-grid">
              {[
                {
                  name: "Agency API",
                  badge: "Most popular",
                  badgeColour: "#7c3aed",
                  price: "Starting from",
                  priceVal: "£299",
                  priceUnit: "/mo",
                  desc: "Direct API access for your own tools and integrations. Replaces your OpenAI subscription in minutes.",
                  features: [
                    "meridian-marketing-v3 model access",
                    "2M tokens/month included",
                    "Live benchmark database queries",
                    "Sector, budget tier, and channel context layer",
                    "Usage and cost analytics dashboard",
                    "Email + chat support",
                  ],
                  cta: "Request access",
                  highlight: false,
                },
                {
                  name: "White-label Platform",
                  badge: "Best value",
                  badgeColour: "#06b6d4",
                  price: "From",
                  priceVal: "£899",
                  priceUnit: "/mo",
                  desc: "The full StratOS platform rebranded as your own product, with Meridian powering every AI feature inside it.",
                  features: [
                    "Everything in Agency API",
                    "Full StratOS dashboard (your brand)",
                    "15-channel data integrations",
                    "Client portal with magic-link auth",
                    "Unlimited client accounts",
                    "Priority support and onboarding call",
                  ],
                  cta: "Talk to us",
                  highlight: true,
                },
                {
                  name: "Enterprise",
                  badge: "Custom",
                  badgeColour: "#10b981",
                  price: "",
                  priceVal: "Custom",
                  priceUnit: "",
                  desc: "Private deployment, fine-tuning on your own first-party data, dedicated inference, and full SLAs.",
                  features: [
                    "Private model deployment",
                    "Fine-tuning on your own data",
                    "Custom benchmark database",
                    "Dedicated GPU inference cluster",
                    "Custom rate limits and SLAs",
                    "Dedicated account and engineering team",
                  ],
                  cta: "Contact us",
                  highlight: false,
                },
              ].map((plan, i) => (
              <div key={i} className="meridian-card-hover" style={{
                background: plan.highlight ? "rgba(124,58,237,0.12)" : "rgba(13,13,26,0.8)",
                border: `1px solid ${plan.highlight ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 18, padding: "36px 30px",
                boxShadow: plan.highlight ? "0 0 60px rgba(124,58,237,0.2)" : "none",
                cursor: "default", position: "relative",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #7c3aed, #a855f7)", padding: "4px 16px", borderRadius: "0 0 10px 10px", fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recommended</div>
                )}
                <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: `${plan.badgeColour}18`, border: `1px solid ${plan.badgeColour}35`, marginBottom: 18 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: plan.badgeColour, letterSpacing: "0.06em", textTransform: "uppercase" }}>{plan.badge}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ marginBottom: 14 }}>
                  {plan.price && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{plan.price} </span>}
                  <span style={{ fontSize: 36, fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>{plan.priceVal}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{plan.priceUnit}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 24 }}>{plan.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                      <CheckCircle2 size={13} color={plan.badgeColour} />{f}
                    </div>
                  ))}
                </div>
                <a href="#cta" onClick={scrollTo("cta")} style={{
                  display: "block", textAlign: "center",
                  padding: "12px 20px", borderRadius: 10,
                  background: plan.highlight ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(255,255,255,0.06)",
                  border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none",
                  boxShadow: plan.highlight ? "0 4px 20px rgba(124,58,237,0.4)" : "none",
                }}>{plan.cta} →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="reveal-section" style={{ padding: "100px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: "50%", paddingBottom: "30%", top: "-10%", left: "25%", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
            <Brain size={32} color="#a78bfa" />
          </div>
          <h2 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 22, color: "white" }}>
            Join the waitlist.
          </h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 44, maxWidth: 520, margin: "0 auto 44px" }}>
            Meridian is in private alpha with a select group of agencies. Tell us what you&apos;re building and we&apos;ll prioritise access based on fit.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480, margin: "0 auto" }}>
            <input
              type="text"
              placeholder="Your name"
              style={{
                padding: "14px 18px", borderRadius: 10, fontSize: 15,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "white", outline: "none", fontFamily: "inherit",
                width: "100%", boxSizing: "border-box",
              }}
            />
            <input
              type="email"
              placeholder="Work email"
              style={{
                padding: "14px 18px", borderRadius: 10, fontSize: 15,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "white", outline: "none", fontFamily: "inherit",
                width: "100%", boxSizing: "border-box",
              }}
            />
            <select
              style={{
                padding: "14px 18px", borderRadius: 10, fontSize: 15,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.65)", outline: "none", fontFamily: "inherit",
                width: "100%", boxSizing: "border-box",
              }}
            >
              <option value="" disabled selected style={{ background: "#09090f" }}>I&apos;m interested in...</option>
              <option value="api" style={{ background: "#09090f" }}>Agency API access</option>
              <option value="platform" style={{ background: "#09090f" }}>White-label platform</option>
              <option value="enterprise" style={{ background: "#09090f" }}>Enterprise / custom</option>
            </select>
            <button style={{
              padding: "15px 28px", borderRadius: 10, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              border: "none", color: "white", cursor: "pointer",
              boxShadow: "0 4px 32px rgba(124,58,237,0.5)",
              transition: "all 0.2s ease", width: "100%",
            }}>
              Request access to Meridian →
            </button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
              No commitment · Private alpha · We&apos;ll reach out within 48 hours
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <img src="/primary-logo.svg" style={{ height: 20, opacity: 0.5 }} alt="i3MEDIA" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Meridian is an i3 Media product</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>·</span>
          <a href="/ad-traffic-protection" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Ad Traffic Protection</a>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>·</span>
          <a href="/login" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>StratOS Platform</a>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 16 }}>© 2026 i3 Media. All rights reserved.</p>
      </footer>
    </div>
  );
}

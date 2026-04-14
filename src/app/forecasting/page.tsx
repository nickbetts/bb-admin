"use client";

import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import {
  TrendingUp,
  ArrowRight,
  Lock,
  CheckCircle2,
  BarChart3,
  Gauge,
  MessageSquare,
  Clock,
  AlertTriangle,
  Layers,
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
  { icon: <BarChart3 size={20} />, title: "Multi-metric forecasting", desc: "Forecast impressions, clicks, conversions, revenue, and cost across channels. Each metric gets its own projection model." },
  { icon: <Gauge size={20} />, title: "Confidence intervals", desc: "Every forecast shows expected, best-case, and worst-case bounds. The confidence range reflects actual variance in your historical data." },
  { icon: <Clock size={20} />, title: "30/60/90-day windows", desc: "Three horizons in every forecast. Short-term predictions are tighter. Longer windows show wider ranges. Pick the period that fits the conversation." },
  { icon: <MessageSquare size={20} />, title: "Narrative explanations", desc: "The AI writes a plain-English summary of what the forecast means. Trends, risks, and seasonal patterns explained in context." },
  { icon: <Layers size={20} />, title: "Historical context", desc: "Forecasts sit alongside actual historical performance. See how the projection compares to last month, last quarter, and year-on-year." },
  { icon: <AlertTriangle size={20} />, title: "Risk flagging", desc: "If a forecast shows potential decline, it gets flagged. The AI explains why and suggests what to monitor. No surprises." },
];

export default function ForecastingPage() {
  const accent = "#60a5fa";
  const accentLight = "#bfdbfe";
  const accentGlow = "rgba(96,165,250,0.6)";

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

  const navIds = ["features", "mockup", "cta"];
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
    id: i, top: `${6 + (i * 5.2) % 84}%`, left: `${4 + (i * 7.1) % 92}%`,
    size: 1 + (i % 3), dur: `${4 + (i % 5)}s`, delay: `${-(i * 0.7)}s`, opacity: 0.05 + (i % 4) * 0.04,
  }));

  const s1 = useCountUp(3, 1800, statsVisible);
  const s2 = useCountUp(5, 1500, statsVisible);
  const s3 = useCountUp(3, 1600, statsVisible);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "mockup", label: "In action" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      <div style={{ position: "fixed", pointerEvents: "none", zIndex: 1, width: 600, height: 600, borderRadius: "50%", left: mouse.x - 300, top: mouse.y - 300, background: `radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 65%)`, transition: "left 0.2s ease-out, top 0.2s ease-out" }} />

      <nav style={{ position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 1, background: "rgba(9,9,15,0.88)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "10px 6px", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} className="side-nav">
        {navLinks.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "block", padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: activeSection === id ? accentLight : "rgba(255,255,255,0.2)", textDecoration: "none", borderLeft: activeSection === id ? `2px solid ${accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s" }}>{label}</a>
        ))}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: `linear-gradient(180deg, ${accent}, #3b82f6)`, transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>
      <LandingNav currentPage="Forecasting" accentColor={accent} onCtaClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })} />

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", paddingTop: 64, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", width: "65%", paddingBottom: "65%", top: "-15%", left: "-15%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.25}px)` }} className="orb-1" />
        <div style={{ position: "absolute", width: "55%", paddingBottom: "55%", bottom: "-15%", right: "-10%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.15}px)` }} className="orb-2" />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.02, backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{ position: "absolute", top: p.top, left: p.left, pointerEvents: "none", width: p.size, height: p.size, borderRadius: "50%", background: p.id % 3 === 0 ? `rgba(96,165,250,0.9)` : p.id % 3 === 1 ? "rgba(59,130,246,0.9)" : "rgba(255,255,255,0.8)", opacity: p.opacity, animationDuration: p.dur, animationDelay: p.delay }} />
        ))}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 480px", gap: 72, alignItems: "center", width: "100%", position: "relative", boxSizing: "border-box" }} className="hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(96,165,250,0.12)`, border: `1px solid rgba(96,165,250,0.3)` }}>
                <TrendingUp size={12} color={accentLight} />
                <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Predictive Analytics</span>
              </div>
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 28, color: "white" }}>
              <span className="hw hw1">90-day forecasts built</span>
              <br />
              <span className="hw hw2" style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>from your actual data.</span>
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, maxWidth: 500, marginBottom: 32, fontWeight: 400 }}>
              Predictive projections with confidence intervals. Not benchmarks. Not industry averages. Your numbers, projected forward with ranges that reflect real variance.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "30/60/90-day projection windows",
                "Confidence intervals: expected, best, and worst case",
                "AI-written narrative explaining the trends",
                "Risk flags for potential decline",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#mockup" onClick={(e) => { e.preventDefault(); document.getElementById("mockup")?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #3b82f6)`, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", boxShadow: `0 0 24px rgba(96,165,250,0.35)` }} className="cta-accent-pulse">
                See it in action <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Forecast mockup */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: `radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div className="mockup-3d" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(96,165,250,0.2)`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: `rgba(96,165,250,0.05)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(96,165,250,0.15)`, border: `1px solid rgba(96,165,250,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={16} color={accentLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>90-Day Forecast</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Google Ads - Conversions</div>
                  </div>
                </div>
              </div>

              {/* Chart area */}
              <div style={{ padding: "20px 22px" }}>
                <svg viewBox="0 0 440 160" style={{ width: "100%", height: "auto" }}>
                  {/* Confidence band (worst to best) */}
                  <path d="M0,120 L73,110 L146,95 L220,85 L293,70 L366,55 L440,40 L440,90 L366,100 L293,110 L220,115 L146,120 L73,125 L0,130 Z" fill="rgba(96,165,250,0.08)" stroke="none" />
                  {/* Expected line */}
                  <path d="M0,125 L73,118 L146,108 L220,100 L293,90 L366,78 L440,65" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
                  {/* Best case dashed */}
                  <path d="M220,85 L293,70 L366,55 L440,40" fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1" strokeDasharray="4,4" />
                  {/* Worst case dashed */}
                  <path d="M220,115 L293,110 L366,100 L440,90" fill="none" stroke="rgba(96,165,250,0.25)" strokeWidth="1" strokeDasharray="4,4" />
                  {/* Division line (today) */}
                  <line x1="220" y1="10" x2="220" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="210" y="8" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">Historical</text>
                  <text x="230" y="8" fill={accent} fontSize="8">Forecast</text>
                  {/* Data points */}
                  {[
                    { x: 0, y: 125 }, { x: 73, y: 118 }, { x: 146, y: 108 }, { x: 220, y: 100 },
                  ].map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={accent} strokeWidth="1.5" />
                  ))}
                  {[
                    { x: 293, y: 90 }, { x: 366, y: 78 }, { x: 440, y: 65 },
                  ].map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r="3" fill={accent} stroke={accent} strokeWidth="1.5" />
                  ))}
                </svg>
              </div>

              {/* Metric cards */}
              <div style={{ padding: "0 22px 18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { period: "30 days", value: "342", change: "+8%", colour: "#10b981" },
                  { period: "60 days", value: "698", change: "+12%", colour: "#10b981" },
                  { period: "90 days", value: "1,060", change: "+15%", colour: "#10b981" },
                ].map((m, i) => (
                  <div key={i} style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.period}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: m.colour, fontWeight: 600, marginTop: 2 }}>{m.change} projected</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats-row" className="reveal-section" style={{ padding: "80px 40px", background: `linear-gradient(180deg, rgba(96,165,250,0.04) 0%, rgba(59,130,246,0.03) 100%)`, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="stats-grid">
            {[
              { val: s1, suffix: " horizons", label: "30, 60, and 90-day projection windows for every metric", note: "Short, medium, and long range", color: accent },
              { val: s2, suffix: " metrics", label: "Impressions, clicks, conversions, revenue, and cost forecasted", note: "Cross-channel projections", color: "#3b82f6" },
              { val: s3, suffix: " bands", label: "Expected, best-case, and worst-case confidence intervals", note: "Variance-based ranges", color: "#10b981" },
            ].map((s, i) => (
              <div key={i} className="stat-card stagger-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden", animationDelay: `${i * 0.1}s` }}>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">How it works</p>
            <h2 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              Data in. Forecast out.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              The AI reads your historical performance, identifies trends and seasonal patterns, and projects forward with confidence ranges that reflect real variance.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card stagger-in" style={{ padding: "28px 24px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: `${i * 0.08}s`, transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(96,165,250,0.12)`, border: `1px solid rgba(96,165,250,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: accentLight, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEEP MOCKUP ── */}
      <section id="mockup" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">AI narrative</p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              The forecast, explained.
            </h2>
          </div>
          <div className="mockup-3d" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(96,165,250,0.15)`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(96,165,250,0.15)`, border: `1px solid rgba(96,165,250,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={14} color={accentLight} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>AI Forecast Narrative</div>
              </div>
              <div style={{ padding: "20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 14 }}>Google Ads conversions have trended upward over the past 90 days, averaging 11.2 per day. The 30-day projection is <strong style={{ color: "white" }}>342 conversions</strong> (best case 380, worst case 305).</p>
                <p style={{ marginBottom: 14 }}>Seasonal patterns suggest a lift in April and May, consistent with last year. The 60-day and 90-day projections reflect this, with expected totals of <strong style={{ color: "white" }}>698</strong> and <strong style={{ color: "white" }}>1,060</strong> respectively.</p>
                <p style={{ marginBottom: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={12} color="#f59e0b" />
                    <strong style={{ color: "#fcd34d" }}>Risk flag:</strong>
                  </span>{" "}
                  If CPC continues to rise at the current rate (+3.2% month-on-month), conversion volume may flatten in the 60-90 day range unless budget is increased or targeting is narrowed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="reveal-section" style={{ padding: "120px 40px 140px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "80%", paddingBottom: "40%", bottom: "-20%", left: "50%", transform: "translateX(-50%)", background: `radial-gradient(ellipse, rgba(96,165,250,0.12) 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(96,165,250,0.12)`, border: `1px solid rgba(96,165,250,0.25)`, marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accentGlow}` }} className="accent-pulse" />
            <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Included with StratOS</span>
          </div>
          <h2 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 20, color: "white", lineHeight: 1.05 }} className="blur-reveal">
            See what is coming.<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent}, #3b82f6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plan for it.</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 40 }}>
            Every client gets predictive forecasts. Real data, real variance, real ranges. Not a guess, not a benchmark.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px", borderRadius: 12, background: `linear-gradient(135deg, ${accent}, #3b82f6)`, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 32px rgba(96,165,250,0.4)` }} className="cta-accent-pulse">
              <Lock size={16} /> Sign in to your dashboard
            </a>
            <a href="mailto:hello@i3media.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Talk to us</a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>AI forecasting included with every StratOS plan.</p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 18, opacity: 0.4 }} alt="i3MEDIA" />
          <span>&copy; {new Date().getFullYear()} i3 Media. Forecasting is part of StratOS.</span>
        </div>
        <a href="/login" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 12 }}>&larr; Back to StratOS</a>
      </div>

      <style>{`
        .side-nav { display: flex; }
        @media (max-width: 1100px) { .side-nav { display: none !important; } }
        @keyframes orb1 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(40px, -30px) scale(1.1); } 70% { transform: translate(-20px, 20px) scale(0.92); } }
        @keyframes orb2 { 0%, 100% { transform: translate(0,0) scale(1); } 35% { transform: translate(-30px, 25px) scale(0.9); } 70% { transform: translate(30px, -40px) scale(1.12); } }
        .orb-1 { animation: orb1 16s ease-in-out infinite; } .orb-2 { animation: orb2 20s ease-in-out infinite; }
        @keyframes hw-in { from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(6px); } to { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); } }
        .hw { display: inline-block; animation: hw-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; } .hw2 { animation-delay: 0.25s; }
        @keyframes particle-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-22px) scale(1.4); } }
        .hero-particle { animation: particle-float linear infinite; }
        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(96,165,250,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(96,165,250,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }
        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 20px rgba(96,165,250,0.4); } 50% { box-shadow: 0 0 40px rgba(96,165,250,0.75), 0 0 80px rgba(96,165,250,0.15); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }
        .feature-card:hover { transform: translateY(-6px) scale(1.015) !important; border-color: rgba(96,165,250,0.2) !important; box-shadow: 0 16px 48px rgba(96,165,250,0.12); }
        .stat-card:hover { transform: translateY(-6px) scale(1.025) !important; border-color: rgba(96,165,250,0.2) !important; box-shadow: 0 16px 48px rgba(96,165,250,0.12); }
        @keyframes card-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 4px 32px rgba(96,165,250,0.08), 0 0 0 1px rgba(96,165,250,0.1); } 50% { box-shadow: 0 8px 48px rgba(96,165,250,0.22), 0 0 0 1px rgba(96,165,250,0.2); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 92% { opacity: 0.5; } 100% { transform: translateY(600px); opacity: 0; } }
        .mockup-3d { animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.6) 40%, rgba(96,165,250,0.8) 50%, rgba(96,165,250,0.6) 60%, transparent 100%); animation: scan-line 8s ease-in-out infinite; pointer-events: none; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
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

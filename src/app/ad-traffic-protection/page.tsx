"use client";

import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  MousePointerClick,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Bot,
  Globe,
  BarChart3,
  Lock,
  Eye,
  Activity,
  Target,
  ChevronRight,
} from "lucide-react";

// ── Animated counter ──────────────────────────────────────────────────────────
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

// ── Data ──────────────────────────────────────────────────────────────────────
const competitors = [
  {
    name: "ClickCease",
    price: "£55–150/mo",
    extra: true,
    googleInvalid: true,
    metaQuality: false,
    snippet: true,
    placementInsights: false,
    reportIntegration: false,
    threastBlocking: true,
    agencyReady: false,
  },
  {
    name: "Lunio",
    price: "£75–200/mo",
    extra: true,
    googleInvalid: true,
    metaQuality: true,
    snippet: true,
    placementInsights: false,
    reportIntegration: false,
    threastBlocking: true,
    agencyReady: false,
  },
  {
    name: "TrafficGuard",
    price: "£100–300/mo",
    extra: true,
    googleInvalid: true,
    metaQuality: true,
    snippet: true,
    placementInsights: false,
    reportIntegration: false,
    threastBlocking: true,
    agencyReady: false,
  },
  {
    name: "i3 Media",
    price: "Included",
    extra: false,
    googleInvalid: true,
    metaQuality: true,
    snippet: true,
    placementInsights: true,
    reportIntegration: true,
    threastBlocking: true,
    agencyReady: true,
    highlight: true,
  },
];

const compFeatures: { key: keyof (typeof competitors)[0]; label: string }[] = [
  { key: "googleInvalid", label: "Google invalid click API" },
  { key: "metaQuality", label: "Meta traffic quality monitor" },
  { key: "snippet", label: "Landing page detection script" },
  { key: "placementInsights", label: "Placement quality insights" },
  { key: "reportIntegration", label: "Integrated monthly report" },
  { key: "threastBlocking", label: "Active threat blocking" },
  { key: "agencyReady", label: "Agency-native (no extra login)" },
];

export default function AdTrafficProtectionPage() {
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

  const navIds = ["problem", "how-it-works", "google", "meta", "comparison", "pricing", "cta"];
  useEffect(() => {
    const obs: IntersectionObserver[] = [];
    navIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const o = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-35% 0px -60% 0px" },
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
      { threshold: 0.1 },
    );
    document.querySelectorAll<Element>(".reveal-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    top: `${6 + ((i * 5.2) % 84)}%`,
    left: `${4 + ((i * 7.1) % 92)}%`,
    size: 1 + (i % 3),
    dur: `${4 + (i % 5)}s`,
    delay: `${-(i * 0.7)}s`,
    opacity: 0.05 + (i % 4) * 0.04,
  }));

  // Animated stats
  const s1 = useCountUp(14, 1800, statsVisible);
  const s2 = useCountUp(42, 2100, statsVisible);
  const s3 = useCountUp(2, 1500, statsVisible);
  const s4 = useCountUp(100, 1700, statsVisible);

  const navLinks = [
    { id: "problem", label: "The problem" },
    { id: "how-it-works", label: "How it works" },
    { id: "google", label: "Google protection" },
    { id: "meta", label: "Meta protection" },
    { id: "comparison", label: "vs competitors" },
    { id: "pricing", label: "Pricing" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      {/* Cursor glow */}
      <div
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 1,
          width: 600,
          height: 600,
          borderRadius: "50%",
          left: mouse.x - 300,
          top: mouse.y - 300,
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)",
          transition: "left 0.2s ease-out, top 0.2s ease-out",
        }}
      />

      {/* Side nav */}
      <nav
        style={{
          position: "fixed",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "rgba(9,9,15,0.88)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: "10px 6px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        className="atp-side-nav"
      >
        {navLinks.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "block",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              color: activeSection === id ? "#6ee7b7" : "rgba(255,255,255,0.2)",
              textDecoration: "none",
              borderLeft: activeSection === id ? "2px solid #10b981" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {label}
          </a>
        ))}
        <div
          style={{
            width: "100%",
            height: 44,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            scroll
          </span>
          <div
            style={{
              width: 2,
              height: 32,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: `${scrollPct}%`,
                background: "linear-gradient(180deg, #10b981, #6366f1)",
                transition: "height 0.1s linear",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </nav>
      <LandingNav
        currentPage="Ad Traffic Protection"
        accentColor="#10b981"
        onCtaClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: "100vh",
          paddingTop: 64,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Orbs */}
        <div
          style={{
            position: "absolute",
            width: "65%",
            paddingBottom: "65%",
            top: "-15%",
            left: "-15%",
            pointerEvents: "none",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(5,150,105,0.30) 0%, transparent 65%)",
            transform: `translateY(${parallaxY * -0.25}px)`,
            transition: "transform 0.1s ease-out",
          }}
          className="atp-orb-1"
        />
        <div
          style={{
            position: "absolute",
            width: "55%",
            paddingBottom: "55%",
            bottom: "-15%",
            right: "-10%",
            pointerEvents: "none",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)",
            transform: `translateY(${parallaxY * -0.15}px)`,
            transition: "transform 0.1s ease-out",
          }}
          className="atp-orb-2"
        />
        {/* Grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.02,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="hero-particle"
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              pointerEvents: "none",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background:
                p.id % 3 === 0
                  ? "rgba(16,185,129,0.9)"
                  : p.id % 3 === 1
                    ? "rgba(99,102,241,0.9)"
                    : "rgba(255,255,255,0.8)",
              opacity: p.opacity,
              animationDuration: p.dur,
              animationDelay: p.delay,
            }}
          />
        ))}

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 480px",
            gap: 72,
            alignItems: "center",
            width: "100%",
            position: "relative",
            boxSizing: "border-box",
          }}
          className="hero-grid"
        >
          {/* Left */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                <ShieldCheck size={12} color="#34d399" />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6ee7b7",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Included with every management contract
                </span>
              </div>
            </div>
            <h1
              style={{
                fontSize: 60,
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                marginBottom: 28,
                color: "white",
              }}
            >
              <span className="hw hw1">One in five</span>
              <br />
              <span className="hw hw2">ad clicks</span>{" "}
              <span
                className="hw hw3"
                style={{
                  background: "linear-gradient(90deg, #34d399, #10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                is wasted.
              </span>
              <br />
              <span className="hw hw4">We prove</span> <span className="hw hw5">which ones.</span>
            </h1>
            <p
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.8,
                maxWidth: 500,
                marginBottom: 40,
                fontWeight: 400,
              }}
            >
              Ad we connect directly to Google and Meta&apos;s own fraud APIs, then run independent
              detection on your landing pages on top of that. Every month, your report shows exactly
              how much of your budget went on bad traffic, and what we caught.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 0 24px rgba(16,185,129,0.35)",
                }}
                className="cta-green-pulse"
              >
                See how it works <ArrowRight size={14} />
              </a>
              <a
                href="#comparison"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                vs ClickCease &amp; others
              </a>
            </div>
          </div>

          {/* Right — mockup protection card */}
          <div style={{ position: "relative" }}>
            {/* Glow behind */}
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            {/* Main card */}
            <div
              className="mockup-3d"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(16,185,129,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldCheck size={16} color="#34d399" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                      Ad Traffic Protection
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      Google Ads · March 2026
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.25)",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 6px rgba(16,185,129,0.7)",
                    }}
                    className="stratum-pulse"
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6ee7b7",
                      letterSpacing: "0.04em",
                    }}
                  >
                    PROTECTED
                  </span>
                </div>
              </div>

              {/* Metric tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                {[
                  {
                    icon: <MousePointerClick size={13} color="#f87171" />,
                    label: "Invalid Clicks",
                    value: "142",
                    sub: "Caught by Google",
                    color: "#fef2f2",
                    border: "#fecaca",
                  },
                  {
                    icon: <ShieldAlert size={13} color="#f87171" />,
                    label: "Invalid Rate",
                    value: "2.8%",
                    sub: "Below 14% avg",
                    color: "#fef2f2",
                    border: "#fecaca",
                  },
                  {
                    icon: <DollarSign size={13} color="#34d399" />,
                    label: "Spend Protected",
                    value: "£487",
                    sub: "Refunded by Google",
                    color: "#f0fdf4",
                    border: "#bbf7d0",
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "16px 14px",
                      borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                      {m.icon}
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.35)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "white",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {m.value}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                      {m.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Snippet stats */}
              <div
                style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Bot size={13} color="#818cf8" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                      Independent Detection: Last 30 days
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 600 }}>
                    via landing page snippet
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Total Visits", value: "6,840" },
                    { label: "Suspicious", value: "23", highlight: true },
                    { label: "Block Rate", value: "0.3%" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 4,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: s.highlight ? "#f87171" : "white",
                        }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Reason breakdown pills */}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    {
                      label: "Bot UA: 11",
                      color: "rgba(239,68,68,0.15)",
                      text: "#fca5a5",
                      border: "rgba(239,68,68,0.25)",
                    },
                    {
                      label: "Headless: 7",
                      color: "rgba(234,88,12,0.15)",
                      text: "#fdba74",
                      border: "rgba(234,88,12,0.25)",
                    },
                    {
                      label: "No interaction: 5",
                      color: "rgba(161,98,7,0.15)",
                      text: "#fde047",
                      border: "rgba(161,98,7,0.25)",
                    },
                  ].map((pill) => (
                    <span
                      key={pill.label}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: pill.color,
                        color: pill.text,
                        border: `1px solid ${pill.border}`,
                      }}
                    >
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Insight */}
              <div style={{ padding: "14px 22px" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  Google intercepted <strong style={{ color: "white" }}>142</strong> invalid clicks
                  protecting <strong style={{ color: "#34d399" }}>£487</strong> in spend. Your
                  independent snippet flagged <strong style={{ color: "#f87171" }}>23</strong>{" "}
                  additional bot visits. Fraud rate of{" "}
                  <strong style={{ color: "white" }}>2.8%</strong> is well below the 14% industry
                  average.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        id="stats-row"
        className="reveal-section"
        style={{
          padding: "80px 40px",
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.04) 0%, rgba(99,102,241,0.03) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
            className="stats-grid"
          >
            {[
              {
                val: s1,
                suffix: "%",
                label: "Average click fraud rate across paid search",
                note: "Industry average 2025/26",
                color: "#ef4444",
              },
              {
                val: s2,
                suffix: "bn",
                prefix: "£",
                label: "Wasted annually on fraudulent ad clicks globally",
                note: "Per year, paid search & social",
                color: "#f59e0b",
              },
              {
                val: s3,
                suffix: "",
                prefix: "",
                label: "Layers of protection: platform API plus independent snippet",
                note: "Dual detection system",
                color: "#10b981",
              },
              {
                val: s4,
                suffix: "%",
                label: "Of paid clicks we monitor for every client, every month",
                note: "Full account coverage",
                color: "#6366f1",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="stat-card-3d stagger-in"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "32px 24px",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${s.color}, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                  }}
                >
                  {s.prefix}
                  {s.val}
                  {s.suffix}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.55)",
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    marginTop: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section id="problem" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#f87171",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              The problem
            </p>
            <h2
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              You&apos;re paying for every click.
              <br />
              Not all of them are real.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Google catches some of it. Meta catches almost none. Neither tells you the full
              picture. We built something that does.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
            className="pains-grid"
          >
            {[
              {
                icon: <Globe size={20} color="#4285f4" />,
                platform: "Google Ads",
                color: "#4285f4",
                bg: "rgba(66,133,244,0.08)",
                border: "rgba(66,133,244,0.2)",
                title: "Google catches fraud. They just don't make it easy to see.",
                points: [
                  "Their filters catch a lot of invalid clicks automatically",
                  "The data's buried in a report most agencies never look at",
                  "You have no way to know how many got through their filters",
                  "And you're taking their word for it. There's no independent check",
                  "Refunds can happen, but entirely on Google's terms",
                ],
              },
              {
                icon: <Target size={20} color="#1877f2" />,
                platform: "Meta Ads",
                color: "#1877f2",
                bg: "rgba(24,119,242,0.08)",
                border: "rgba(24,119,242,0.2)",
                title: "Meta counts clicks their end. What reaches your site is usually fewer.",
                points: [
                  "Meta nearly always records more clicks than your site ever sees",
                  "That gap is money spent on traffic that never showed up",
                  "Meta Ads Manager has no invalid click report",
                  "Audience Network is particularly bad for this. Low-quality traffic by default",
                  "Without external monitoring, you'd never know the size of the problem",
                ],
              },
            ].map((p, i) => (
              <div
                key={i}
                className="pain-card stagger-in"
                style={{
                  borderRadius: 18,
                  padding: "32px",
                  background: p.bg,
                  border: `1px solid ${p.border}`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `rgba(255,255,255,0.08)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.9)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p.platform}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1.5,
                    marginBottom: 18,
                  }}
                >
                  {p.title}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.points.map((pt, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <AlertTriangle
                        size={13}
                        color="#fbbf24"
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                      <span
                        style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}
                      >
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="reveal-section"
        style={{
          padding: "120px 40px",
          background:
            "linear-gradient(180deg, rgba(99,102,241,0.03) 0%, rgba(16,185,129,0.03) 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6ee7b7",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              Two layers. One dashboard.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              Most tools do one thing. We run platform data and independent detection at the same
              time, then surface it all in your monthly report.
            </p>
          </div>

          {/* Steps */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginBottom: 64,
            }}
            className="kit-grid"
          >
            {[
              {
                n: "01",
                icon: <BarChart3 size={22} color="#818cf8" />,
                title: "Platform data, pulled automatically",
                desc: "We connect directly to Google and Meta's own APIs. Invalid click data, outbound click counts, and landing page view totals come through at each reporting cycle. No exports, no manual digging.",
                color: "#6366f1",
              },
              {
                n: "02",
                icon: <Activity size={22} color="#34d399" />,
                title: "A second set of eyes on your landing pages",
                desc: "A single line of code goes on your landing pages. It spots bot signatures, headless browsers, and visits with no real human interaction, independently of whatever the ad platform reports. If Google or Meta miss something, this catches it.",
                color: "#10b981",
              },
              {
                n: "03",
                icon: <Eye size={22} color="#f59e0b" />,
                title: "It's all in your monthly report",
                desc: "Everything lands in the existing dashboard. Invalid clicks flagged, wasted spend estimated, bot breakdown, traffic integrity score, sitting alongside all the other channel data. Nothing separate to log into.",
                color: "#f59e0b",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="stagger-in"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  padding: "32px 28px",
                  position: "relative",
                  overflow: "hidden",
                  animationDelay: `${i * 0.12}s`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${step.color}, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.05)",
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {step.n}
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `rgba(255,255,255,0.05)`,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1.4,
                    marginBottom: 12,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Flow diagram */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18,
              padding: "32px 40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Google/Meta APIs", icon: <Globe size={16} />, color: "#6366f1" },
              null,
              { label: "Landing Page Snippet", icon: <Activity size={16} />, color: "#10b981" },
              null,
              { label: "StratOS Dashboard", icon: <BarChart3 size={16} />, color: "#f59e0b" },
              null,
              { label: "Monthly Client Report", icon: <Eye size={16} />, color: "#a855f7" },
            ].map((item, i) =>
              item ? (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `rgba(255,255,255,0.04)`,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.5)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ) : (
                <ChevronRight key={i} size={16} color="rgba(255,255,255,0.15)" />
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── GOOGLE MODULE ── */}
      <section id="google" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 72,
              alignItems: "center",
            }}
          >
            {/* Left: copy */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: "rgba(66,133,244,0.12)",
                  border: "1px solid rgba(66,133,244,0.25)",
                  marginBottom: 24,
                }}
              >
                <Globe size={12} color="#93c5fd" />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#93c5fd",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Google Ads
                </span>
              </div>
              <h2
                className="blur-reveal"
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: 20,
                  color: "white",
                  lineHeight: 1.1,
                }}
              >
                Google catches fraud.
                <br />
                We make sure you know about it.
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.8,
                  marginBottom: 28,
                }}
              >
                Google&apos;s filters automatically catch bots, scrapers, and known fraud networks.
                The data exists. Most agencies just never show it to their clients.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {[
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "We pull directly from the same Traffic Quality data Google uses internally. Direct API, nothing manual",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "Invalid click count, invalid rate, and estimated wasted spend in every report",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "Google typically credits confirmed invalid clicks. We surface the estimated amount in your report",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "Our landing page snippet runs independently on top, catching anything their filters miss",
                  },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#34d399" }}>What you&apos;ll see in your report:</strong>
                &nbsp; &ldquo;Google intercepted 142 invalid clicks this month, protecting an
                estimated <strong style={{ color: "white" }}>£487</strong> in spend. Our snippet
                flagged 23 more suspicious visits on top. Fraud rate of 2.8%, well below the 14%
                average.&rdquo;
              </div>
            </div>

            {/* Right: mockup */}
            <div className="stagger-in" style={{ animationDelay: "0.2s" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(66,133,244,0.2)",
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "18px 22px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(66,133,244,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Shield size={16} color="#93c5fd" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                    Invalid Click Audit: Google Ads
                  </span>
                  <div
                    style={{
                      marginLeft: "auto",
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#6ee7b7" }}>
                      PROTECTED
                    </span>
                  </div>
                </div>
                {/* Metrics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {[
                    { label: "Invalid Clicks", value: "142", sub: "Caught by Google", warn: true },
                    { label: "Invalid Rate", value: "2.8%", sub: "vs 14% avg", warn: false },
                    {
                      label: "Est. Protected",
                      value: "£487",
                      sub: "Typically refunded",
                      warn: false,
                      green: true,
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "18px 16px",
                        borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          marginBottom: 6,
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: m.green ? "#34d399" : m.warn ? "#f87171" : "white",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {m.value}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                        {m.sub}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Fraud rate bar */}
                <div
                  style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}
                  >
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}
                    >
                      Your fraud rate vs industry average
                    </span>
                    <span style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700 }}>Good ↓</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 4,
                      position: "relative",
                      overflow: "visible",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "14%",
                        background: "rgba(255,255,255,0.15)",
                        borderRadius: 4,
                        position: "absolute",
                      }}
                    />
                    <div
                      style={{
                        height: "100%",
                        width: "2.8%",
                        background: "linear-gradient(90deg, #10b981, #34d399)",
                        borderRadius: 4,
                        position: "absolute",
                        boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "14%",
                        top: -18,
                        fontSize: 9,
                        color: "rgba(255,255,255,0.3)",
                        transform: "translateX(-50%)",
                      }}
                    >
                      Avg 14%
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: "2.8%",
                        bottom: -18,
                        fontSize: 9,
                        color: "#34d399",
                        transform: "translateX(-50%)",
                        fontWeight: 700,
                      }}
                    >
                      You: 2.8%
                    </div>
                  </div>
                </div>
                {/* Bot detection breakdown */}
                <div style={{ padding: "18px 22px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.45)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    Independent snippet: reason breakdown
                  </div>
                  {[
                    { label: "Known bot user-agent", count: 11, pct: 48, color: "#ef4444" },
                    { label: "Headless browser", count: 7, pct: 30, color: "#f97316" },
                    { label: "No user interaction", count: 5, pct: 22, color: "#eab308" },
                  ].map((r, i) => (
                    <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                          {r.label}
                        </span>
                        <span
                          style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}
                        >
                          {r.count}
                        </span>
                      </div>
                      <div
                        style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${r.pct}%`,
                            background: r.color,
                            borderRadius: 2,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── META MODULE ── */}
      <section
        id="meta"
        className="reveal-section"
        style={{
          padding: "120px 40px",
          background:
            "linear-gradient(180deg, rgba(24,119,242,0.03) 0%, rgba(16,185,129,0.02) 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 72,
              alignItems: "center",
            }}
          >
            {/* Left: mockup */}
            <div className="stagger-in" style={{ animationDelay: "0.1s" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(24,119,242,0.2)",
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "18px 22px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(24,119,242,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Target size={16} color="#93c5fd" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                    Traffic Quality Monitor: Meta Ads
                  </span>
                  <div
                    style={{
                      marginLeft: "auto",
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: "rgba(234,179,8,0.15)",
                      border: "1px solid rgba(234,179,8,0.3)",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fde68a" }}>
                      MONITORING
                    </span>
                  </div>
                </div>

                {/* Integrity score */}
                <div
                  style={{
                    padding: "24px 22px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
                    <svg viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
                      <circle
                        cx="44"
                        cy="44"
                        r="36"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="44"
                        cy="44"
                        r="36"
                        fill="none"
                        stroke="url(#metaGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36 * 0.847} ${2 * Math.PI * 36}`}
                      />
                      <defs>
                        <linearGradient id="metaGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 18, fontWeight: 800, color: "white" }}>84.7%</span>
                      <span
                        style={{
                          fontSize: 8,
                          color: "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                        }}
                      >
                        integrity
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 6 }}>
                      Click-Through Integrity Score
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                      <strong style={{ color: "white" }}>3,200</strong> outbound clicks recorded by
                      Meta.
                      <br />
                      <strong style={{ color: "white" }}>2,710</strong> landing page views confirmed
                      on site.
                      <br />
                      <strong style={{ color: "#f87171" }}>490</strong> clicks that never arrived.
                    </div>
                  </div>
                </div>

                {/* Wasted spend breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 18px",
                      borderRight: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 6,
                      }}
                    >
                      Missing Clicks
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171" }}>490</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                      15.3% of total clicks
                    </div>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 6,
                      }}
                    >
                      Est. Spend on Lost Traffic
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171" }}>£612</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                      Proportional to click gap
                    </div>
                  </div>
                </div>

                {/* Placement breakdown */}
                <div
                  style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.45)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    Integrity by placement
                  </div>
                  {[
                    { label: "Instagram Feed", score: 97, color: "#10b981" },
                    { label: "Facebook Feed", score: 93, color: "#10b981" },
                    { label: "Stories", score: 88, color: "#6366f1" },
                    { label: "Audience Network", score: 61, color: "#ef4444", warn: true },
                  ].map((pl, i) => (
                    <div key={i} style={{ marginBottom: i < 3 ? 10 : 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                          {pl.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: pl.warn ? "#f87171" : "#6ee7b7",
                          }}
                        >
                          {pl.score}%
                        </span>
                      </div>
                      <div
                        style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pl.score}%`,
                            background: pl.color,
                            borderRadius: 2,
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendation */}
                <div
                  style={{
                    padding: "14px 22px",
                    background: "rgba(239,68,68,0.06)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <AlertTriangle
                    size={13}
                    color="#fca5a5"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    Audience Network has a 39% drop-off rate. Recommend pausing or excluding this
                    placement to recover an estimated
                    <strong style={{ color: "#fca5a5" }}> £180/month</strong> in wasted spend.
                  </span>
                </div>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: "rgba(24,119,242,0.12)",
                  border: "1px solid rgba(24,119,242,0.25)",
                  marginBottom: 24,
                }}
              >
                <Target size={12} color="#93c5fd" />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#93c5fd",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Meta Ads
                </span>
              </div>
              <h2
                className="blur-reveal"
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: 20,
                  color: "white",
                  lineHeight: 1.1,
                }}
              >
                Meta doesn&apos;t report fraud.
                <br />
                So we built our own monitor.
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.8,
                  marginBottom: 28,
                }}
              >
                Meta records more clicks than your site ever receives. That gap is budget spent on
                traffic that never arrived. We measure it, calculate the estimated waste, and break
                it down by placement, so we can do something about it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {[
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "We compare Meta's click count against landing page views actually confirmed on your site",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "Click-Through Integrity Score: one number showing what percentage of paid traffic actually landed",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "Broken down by placement, so we can see exactly which ones are dragging the numbers",
                  },
                  {
                    icon: <CheckCircle2 size={14} color="#34d399" />,
                    text: "When a placement falls below our threshold, we flag it and recommend action",
                  },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: "rgba(234,179,8,0.08)",
                  border: "1px solid rgba(234,179,8,0.2)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#fde68a" }}>A note on language:</strong> we call this
                Traffic Quality, not click fraud. The gap between Meta&apos;s numbers and yours
                isn&apos;t always intentional, but the effect is the same. Budget wasted. We show
                you where.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPETITOR COMPARISON ── */}
      <section id="comparison" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#a5b4fc",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              vs the alternatives
            </p>
            <h2
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              Other tools cost extra.
              <br />
              This one comes with us.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 500,
                margin: "0 auto",
              }}
            >
              ClickCease, Lunio, and TrafficGuard all do a decent job. They&apos;re also separate
              subscriptions, separate logins, and completely disconnected from your reporting.
            </p>
          </div>

          {/* Table */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ padding: "18px 24px" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Feature
                </span>
              </div>
              {competitors.map((c) => (
                <div
                  key={c.name}
                  style={{
                    padding: "18px 16px",
                    textAlign: "center",
                    background: c.highlight ? "rgba(16,185,129,0.08)" : "transparent",
                    borderLeft: "1px solid rgba(255,255,255,0.05)",
                    position: "relative",
                  }}
                >
                  {c.highlight && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: "linear-gradient(90deg, #059669, #10b981)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: c.highlight ? "white" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: c.extra ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                      border: c.extra
                        ? "1px solid rgba(239,68,68,0.25)"
                        : "1px solid rgba(16,185,129,0.25)",
                      display: "inline-block",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: c.extra ? "#fca5a5" : "#6ee7b7",
                      }}
                    >
                      {c.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {compFeatures.map((feat, fi) => (
              <div
                key={feat.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  borderBottom:
                    fi < compFeatures.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: fi % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}
              >
                <div style={{ padding: "14px 24px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{feat.label}</span>
                </div>
                {competitors.map((c) => {
                  const val = c[feat.key];
                  return (
                    <div
                      key={c.name}
                      style={{
                        padding: "14px 16px",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: c.highlight ? "rgba(16,185,129,0.04)" : "transparent",
                        borderLeft: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {val === true ? (
                        <CheckCircle2 size={16} color={c.highlight ? "#34d399" : "#4ade80"} />
                      ) : val === false ? (
                        <XCircle size={16} color="rgba(255,255,255,0.15)" />
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          {String(val)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "16px 24px",
              borderRadius: 12,
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <ShieldCheck size={20} color="#34d399" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              Every other tool charges separately and lives in a silo. This is built into your i3
              dashboard, reports alongside all 16 channels, and needs nothing more than our snippet
              to get going.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        className="reveal-section"
        style={{
          padding: "120px 40px",
          background:
            "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(16,185,129,0.03) 100%)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6ee7b7",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              Pricing
            </p>
            <h2
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 16,
                color: "white",
              }}
              className="blur-reveal"
            >
              Included. Full stop.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              Ad Traffic Protection is standard with every i3 Media management contract. Want to go
              further? Add Active Threat Blocking.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Standard card */}
            <div
              className="stagger-in"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "36px 32px",
                animationDelay: "0.05s",
              }}
            >
              <div style={{ marginBottom: 24 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Standard
                </span>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: "-0.04em",
                    marginTop: 8,
                    marginBottom: 6,
                  }}
                >
                  Included
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  with every management contract
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {[
                  "Google invalid click API audit",
                  "Meta traffic quality monitoring",
                  "Landing page protection snippet",
                  "Monthly protection report section",
                  "Bot & suspicious visit detection",
                  "Placement quality insights (Meta)",
                  "Fraud rate vs industry benchmark",
                ].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={14} color="#34d399" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 12,
                  color: "#6ee7b7",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                Already included in your contract
              </div>
            </div>

            {/* Bolt-on card */}
            <div
              className="stagger-in"
              style={{
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 20,
                padding: "36px 32px",
                position: "relative",
                overflow: "hidden",
                animationDelay: "0.15s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "linear-gradient(90deg, #6366f1, #a855f7)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  right: 20,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.4)",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a5b4fc" }}>BOLT-ON</span>
              </div>
              <div style={{ marginBottom: 24 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Active Threat Blocking
                </span>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: "-0.04em",
                    marginTop: 8,
                  }}
                >
                  from £99
                  <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>
                    /mo
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                  £99 under £10k spend · £149 up to £30k · £199 above
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {[
                  { f: "Everything in Standard", included: true },
                  { f: "Automated Google Ads IP exclusion", included: true },
                  {
                    f: "Confirmed bad actors blocked from seeing ads within hours",
                    included: true,
                  },
                  {
                    f: "Monthly blocklist report (which IPs, why, how much saved)",
                    included: true,
                  },
                  { f: "Managed IP rotation (stays within Google's 500-IP limit)", included: true },
                  {
                    f: "Smart thresholds: only blocks IPs with repeated confirmed signals",
                    included: true,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2
                      size={14}
                      color={item.included ? "#818cf8" : "#34d399"}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{item.f}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.6,
                }}
              >
                On a £5k/month Google Ads account, blocking even half the residual fraud typically
                saves <strong style={{ color: "white" }}>more than the bolt-on costs</strong>.
              </div>
            </div>
          </div>

          {/* ROI calculator note */}
          <div
            style={{
              marginTop: 24,
              padding: "20px 28px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            {[
              { label: "Monthly ad spend", example: "£5,000", note: "Google Ads account" },
              {
                label: "Typical residual fraud rate",
                example: "5%",
                note: "After Google's own filtering",
              },
              { label: "Your bolt-on ROI", example: "1.5–3×", note: "At £99/month price point" },
            ].map((r, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{r.example}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                  {r.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        id="cta"
        className="reveal-section"
        style={{
          padding: "120px 40px 140px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "80%",
            paddingBottom: "40%",
            bottom: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.25)",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.6)",
              }}
              className="stratum-pulse"
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#6ee7b7",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Already included in your contract
            </span>
          </div>
          <h2
            style={{
              fontSize: 50,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 20,
              color: "white",
              lineHeight: 1.05,
            }}
            className="blur-reveal"
          >
            Your ad budget is being
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #34d399, #10b981, #6366f1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              protected right now.
            </span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.8,
              marginBottom: 40,
            }}
          >
            It&apos;s running for every i3 client. If the snippet isn&apos;t on your landing pages
            yet, speak to your account manager. It takes ten minutes. Thinking about Active Threat
            Blocking? We&apos;ll look at your numbers first and tell you whether it&apos;s worth it.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 28px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #059669, #10b981)",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 32px rgba(16,185,129,0.4)",
              }}
              className="cta-green-pulse"
            >
              <Lock size={16} />
              Sign in to your dashboard
            </a>
            <a
              href="mailto:nick@bettsandburton.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 28px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Talk to us about Active Threat Blocking
            </a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            No separate login. No extra tools. Already running in your StratOS dashboard.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 18, opacity: 0.4 }} alt="Betts & Burton" />
          <span>
            © {new Date().getFullYear()} i3 Media. Ad Traffic Protection is part of StratOS.
          </span>
        </div>
        <a
          href="/login"
          style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 12 }}
        >
          ← Back to StratOS
        </a>
      </div>

      {/* ── Styles ── */}
      <style>{`
        .atp-side-nav { display: flex; }
        @media (max-width: 1100px) { .atp-side-nav { display: none !important; } }

        @keyframes atp-orb1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(40px, -30px) scale(1.1); }
          70% { transform: translate(-20px, 20px) scale(0.92); }
        }
        @keyframes atp-orb2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          35% { transform: translate(-30px, 25px) scale(0.9); }
          70% { transform: translate(30px, -40px) scale(1.12); }
        }
        .atp-orb-1 { animation: atp-orb1 16s ease-in-out infinite; }
        .atp-orb-2 { animation: atp-orb2 20s ease-in-out infinite; }

        @keyframes hw-in {
          from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); }
        }
        .hw { display: inline-block; animation: hw-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; }
        .hw2 { animation-delay: 0.18s; }
        .hw3 { animation-delay: 0.55s; }
        .hw4 { animation-delay: 0.32s; }
        .hw5 { animation-delay: 0.45s; }

        @keyframes particle-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-22px) scale(1.4); }
        }
        .hero-particle { animation: particle-float linear infinite; }

        @keyframes stratum-pulse-anim {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(16,185,129,0.9); }
          50% { opacity: 0.35; box-shadow: 0 0 24px rgba(16,185,129,0.2); }
        }
        .stratum-pulse { animation: stratum-pulse-anim 2.5s ease-in-out infinite; }

        .reveal-section {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }

        @keyframes fadeInBlur {
          from { opacity: 0; filter: blur(10px); transform: translateY(12px); }
          to   { opacity: 1; filter: blur(0); transform: translateY(0); }
        }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 40px rgba(16,185,129,0.75), 0 0 80px rgba(16,185,129,0.15); }
        }
        .cta-green-pulse { animation: pulse-green 2.5s ease-in-out infinite; }
        .cta-green-pulse:hover { transform: translateY(-2px) scale(1.02); }

        .pain-card, .stat-card-3d, .stagger-in {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .pain-card:hover {
          transform: translateY(-6px) scale(1.015) !important;
          box-shadow: 0 16px 48px rgba(16,185,129,0.12);
        }
        .stat-card-3d:hover {
          transform: translateY(-6px) scale(1.025) !important;
          border-color: rgba(16,185,129,0.2) !important;
          box-shadow: 0 16px 48px rgba(16,185,129,0.12);
        }

        @keyframes card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes card-glow {
          0%, 100% { box-shadow: 0 4px 32px rgba(16,185,129,0.08), 0 0 0 1px rgba(16,185,129,0.1); }
          50% { box-shadow: 0 8px 48px rgba(16,185,129,0.22), 0 0 0 1px rgba(16,185,129,0.2); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(-2px); opacity: 0; }
          5%   { opacity: 1; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(600px); opacity: 0; }
        }
        .mockup-3d {
          animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite;
        }
        .mockup-3d::after {
          content: '';
          position: absolute; left: 0; right: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.6) 40%, rgba(16,185,129,0.8) 50%, rgba(52,211,153,0.6) 60%, transparent 100%);
          animation: scan-line 8s ease-in-out infinite;
          pointer-events: none;
        }

        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .kit-grid { grid-template-columns: 1fr !important; }
          .pains-grid { grid-template-columns: 1fr !important; }
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

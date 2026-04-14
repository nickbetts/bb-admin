"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Radar,
  FileText,
  Brain,
  TrendingUp,
  Target,
  Monitor,
  Activity,
  MessageSquare,
  Briefcase,
  CheckCircle2,
  Sparkles,
  BarChart3,
  DollarSign,
  Share2,
  ListTodo,
  Layers,
  Search,
  Palette,
  BookOpen,
  Rocket,
  Terminal,
  Quote,
} from "lucide-react";

// Animated counter hook
function useCountUp(end: number, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, shouldStart]);
  
  return count;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("");
  const [scrollPct, setScrollPct] = useState(0);
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [parallaxY, setParallaxY] = useState(0);
  
  // Stats animation trigger
  const [statsVisible, setStatsVisible] = useState(false);
  const [showBar, setShowBar] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setParallaxY(el.scrollTop * 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  useEffect(() => {
    const ids = [
      "problems",
      "stats",
      "channels",
      "meridian",
      "signals",
      "ai-analyst",
      "reports",
      "features",
      "toolkit",
      "how-it-works",
      "about",
      "testimonials",
      "access",
    ];
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-35% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
            if (entry.target.id === "stats") setStatsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll<Element>(".reveal-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    top: `${8 + (i * 4.1) % 82}%`,
    left: `${3 + (i * 7.3) % 94}%`,
    size: 1 + (i % 3),
    dur: `${3.5 + (i % 6)}s`,
    delay: `${-(i * 0.65)}s`,
    opacity: 0.06 + (i % 5) * 0.05,
  }));

  const channelList = [
    "Google Analytics 4", "Google Ads", "Google Search Console", "Meta Ads",
    "Microsoft Advertising", "TikTok Ads", "LinkedIn Ads", "SemRush", "Moz",
    "Klaviyo", "HubSpot", "CallRail", "WooCommerce", "Shopify", "YouTube Analytics", "Core Web Vitals",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          router.push("/change-password");
        } else {
          router.push("/dashboard");
        }
      } else {
        const data = await res.json();
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const pains = [
    { q: "\"Why did traffic drop last week?\"", a: "Every account manager's least favourite question. You know the answer is in there somewhere. It just takes 45 minutes to find it." },
    { q: "Reporting day. Again.", a: "Block out Tuesday afternoon, open 11 tabs, copy numbers into a spreadsheet, write the same commentary you wrote last month. There's got to be a better way." },
    { q: "ROAS is tanking. When did that happen?", a: "The worst version of this is your client telling you before you've noticed. StratOS spots these shifts automatically." },
    { q: "Three platforms. Three numbers. None match.", a: "GA4 says one thing. Google Ads says another. Meta has its own view. Someone has to reconcile all of this. Every single week." },
  ];

  const steps = [
    {
      n: "01",
      title: "Connect your channels",
      desc: "Add your credentials once. GA4, Google Ads, Meta, TikTok, LinkedIn: everything starts pulling in. Most clients are live in under half an hour.",
    },
    {
      n: "02",
      title: "See what moved overnight",
      desc: "Open Signals first thing. Every anomaly across every channel is already surfaced, sorted by severity, with context attached.",
    },
    {
      n: "03",
      title: "Dig in with all the context",
      desc: "Every channel tab has the full picture: campaigns, creatives, landing pages, goals. Meridian reads data from all other channels before it gives you an insight.",
    },
    {
      n: "04",
      title: "Act, report, repeat",
      desc: "Assign actions to the team, generate a client report with a click, share a strategy document. From spotting the issue to presenting the solution, all in one place.",
    },
  ];
  
  // Animated stat values
  const stat1 = useCountUp(16, 1800, statsVisible);
  const stat2 = useCountUp(19, 2000, statsVisible);
  const stat3 = useCountUp(30, 1600, statsVisible);
  const stat4 = useCountUp(20, 1900, statsVisible);

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>

      {/* Announcement bar */}
      {showBar && (
        <div className="callout-bar" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, height: 44,
          background: "rgba(99,102,241,0.12)",
          borderBottom: "1px solid rgba(99,102,241,0.25)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(16,185,129,1)", boxShadow: "0 0 8px rgba(16,185,129,0.6)", flexShrink: 0 }} className="stratum-pulse" />
            <span>
              StratOS is now in private beta.{" "}
              <a
                href="#access"
                onClick={(e) => { e.preventDefault(); document.getElementById("access")?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ color: "#a5b4fc", textDecoration: "underline", cursor: "pointer" }}
              >
                apply for early access
              </a>
            </span>
          </div>
          <button
            onClick={() => setShowBar(false)}
            style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px 8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        </div>
      )}

      {/* Cursor glow */}
      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 1,
        width: 600, height: 600, borderRadius: "50%",
        left: mouse.x - 300, top: mouse.y - 300,
        background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)",
        transition: "left 0.2s ease-out, top 0.2s ease-out",
      }} />

      {/* ── STICKY SIDE NAV ── */}
      <nav
        className="side-nav"
        style={{
          position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
          zIndex: 40,
          display: "flex", flexDirection: "column", gap: 1,
          background: "rgba(9,9,15,0.88)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "10px 6px",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {([
          { id: "problems", label: "Problems" },
          { id: "stats", label: "In numbers" },
          { id: "channels", label: "Channels" },
          { id: "meridian", label: "Meridian AI" },
          { id: "signals", label: "Signals" },
          { id: "ai-analyst", label: "AI Analyst" },
          { id: "reports", label: "Reports" },
          { id: "features", label: "Features" },
          { id: "toolkit", label: "Toolkit" },
          { id: "how-it-works", label: "How it works" },
          { id: "about", label: "About" },
          { id: "testimonials", label: "Testimonials" },
          { id: "access", label: "Get access" },
        ] as { id: string; label: string }[]).map(({ id, label }) => (
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
              color: activeSection === id ? "#a5b4fc" : "rgba(255,255,255,0.2)",
              textDecoration: "none",
              borderLeft: activeSection === id ? "2px solid #6366f1" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </a>
        ))}
        {/* Vertical scroll progress */}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: "linear-gradient(180deg, #6366f1, #a855f7, #ec4899)", transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>

      {/* ── NAV ── */}
      <nav className="top-nav" style={{
        position: "fixed", top: showBar ? 44 : 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(9,9,15,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: 64,
        display: "flex", alignItems: "center",
        padding: "0 40px", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/primary-logo.svg" style={{ height: 26, width: "auto" }} alt="i3MEDIA" />
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.02em" }}>StratOS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href="/ad-traffic-protection"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 8,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#6ee7b7", fontSize: 12, fontWeight: 600, textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)", display: "inline-block", flexShrink: 0 }} />
            Ad Traffic Protection
          </a>
          <a
            href="/meridian"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 8,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "#c4b5fd", fontSize: 12, fontWeight: 600, textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", boxShadow: "0 0 6px rgba(139,92,246,0.6)", display: "inline-block", flexShrink: 0 }} />
            Meridian AI
            <span style={{ fontSize: 8, fontWeight: 800, color: "#a78bfa", background: "rgba(124,58,237,0.2)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Alpha</span>
          </a>
          <a
            href="#access"
            style={{
              padding: "9px 20px", borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              border: "none",
              color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
              transition: "all 0.3s ease",
            }}
            className="cta-pulse"
          >
            Sign in →
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", paddingTop: showBar ? 108 : 64,
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center",
      }}>
        <div className="login-orb-1" style={{
          position: "absolute", width: "70%", paddingBottom: "70%",
          top: "-20%", left: "-18%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.42) 0%, transparent 65%)",
          transform: `translateY(${parallaxY * -0.3}px)`,
          transition: "transform 0.1s ease-out",
        }} />
        <div className="login-orb-2" style={{
          position: "absolute", width: "60%", paddingBottom: "60%",
          bottom: "-20%", right: "-12%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 65%)",
          transform: `translateY(${parallaxY * -0.2}px)`,
          transition: "transform 0.1s ease-out",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.022,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {/* Floating particles */}
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{
            position: "absolute", top: p.top, left: p.left, pointerEvents: "none",
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.id % 3 === 0 ? "rgba(168,85,247,0.9)" : p.id % 3 === 1 ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.8)",
            opacity: p.opacity,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }} />
        ))}

        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "80px 40px",
          display: "grid", gridTemplateColumns: "1fr 400px", gap: 80,
          alignItems: "center", width: "100%", position: "relative",
          boxSizing: "border-box",
        }} className="hero-grid">

          {/* Left */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>Built by i3MEDIA · 22+ years in the game</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)", boxShadow: "0 0 6px rgba(255,255,255,0.3)" }} className="stratum-pulse" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by Meridian AI</span>
              </div>
            </div>
            <h1 style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1.0,
              letterSpacing: "-0.04em", marginBottom: 28, color: "white",
            }} className="hero-headline">
              <span className="hw hw1">Every</span>{" "}
              <span className="hw hw2">channel.</span>
              <br />
              <span className="hw hw4">One</span>{" "}
              <span className="hw hw5">platform.</span>
              <br />
              <span className="hw hw3" style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sorted.</span>
            </h1>
            <p style={{
              fontSize: 19, color: "rgba(255,255,255,0.65)", lineHeight: 1.75,
              maxWidth: 520, marginBottom: 40, fontWeight: 400,
            }}>
              StratOS connects 16 marketing channels, flags anomalies before your client does, and turns hours of manual reporting into minutes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {[
                { icon: <Radar style={{ width: 14, height: 14 }} />, text: "Anomaly detection across all channels, surfaced automatically" },
                { icon: <Brain style={{ width: 14, height: 14 }} />, text: "AI that reads every platform before giving you an answer" },
                { icon: <FileText style={{ width: 14, height: 14 }} />, text: "Client reports generated in minutes, not Tuesday afternoons" },
                { icon: <Monitor style={{ width: 14, height: 14 }} />, text: "Branded client portals. They see what you want them to see" },
              ].map((f) => (
                <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 19, height: 19, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                    background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#a5b4fc",
                  }}>{f.icon}</div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontWeight: 400 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <div
            id="login-form"
            className="login-card-3d"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "36px 32px",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: 6 }}>
                Back to work
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Your accounts are waiting. Let&apos;s see what happened.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="login-email" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@youragency.com"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: 14,
                    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <label htmlFor="login-password" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "12px 44px 12px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white", fontSize: 14,
                      outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                      cursor: "pointer", padding: 4, display: "flex",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5", fontSize: 12,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "13px 20px", borderRadius: 10,
                  background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                  border: "none", color: "white",
                  fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: loading ? "none" : "0 0 20px rgba(99,102,241,0.4)",
                }}
                className={loading ? "" : "cta-pulse"}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "8px 0" }}>or</div>

              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/google"}
                style={{
                  padding: "13px 20px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* ── SECTION 2: PAIN POINTS ── */}
      <section id="problems" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, #09090f 0%, rgba(99,102,241,0.02) 50%, #09090f 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">
              Sound familiar?
            </p>
            <h2 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              We&apos;ve been there.<br />Got the t-shirt.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>
              These are the conversations we were having at i3MEDIA before we built StratOS. If any of them land, you&apos;re in the right place.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }} className="pains-grid">
            {pains.map((p, i) => (
              <div key={p.q} className="pain-card stagger-in" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18,
                padding: "32px",
                transition: "all 0.4s ease",
                animationDelay: `${i * 0.1}s`,
              }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.4, fontStyle: "italic", marginBottom: 14 }}>
                  {p.q}
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  {p.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: STATS WITH ANIMATED NUMBERS ── */}
      <section id="stats" className="reveal-section" style={{
        padding: "100px 40px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.03) 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
              The platform, in numbers
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 600, margin: "0 auto" }}>
              No marketing speak. Just what&apos;s actually running under the bonnet.
            </p>
          </div>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }} className="stats-grid">
            {[
              { val: stat1, label: "Channels\nConnected", suffix: "", prefix: "", color: "#6366f1" },
              { val: stat2, label: "AI\nEndpoints", suffix: "", prefix: "", color: "#a855f7" },
              { val: stat3, label: "Minutes to\nOnboard", suffix: "m", prefix: "<", color: "#ec4899" },
              { val: stat4, label: "Years'\nExperience", suffix: "+", prefix: "", color: "#f59e0b" },
            ].map((stat, i) => (
              <div key={i} className="stat-card-3d stagger-in" style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.4s ease",
                animationDelay: `${i * 0.12}s`,
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${stat.color}, transparent)`,
                  opacity: 0.8,
                }} />
                <div style={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: "white",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  marginBottom: 14,
                  background: `linear-gradient(135deg, ${stat.color}, rgba(255,255,255,0.9))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>{stat.prefix}{stat.val}{stat.suffix}</div>
                <div style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <div style={{
        padding: "32px 40px",
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>
          Trusted by agencies across the UK
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", alignItems: "center" }}>
          {["Agency One", "Agency Two", "Agency Three", "Agency Four", "Agency Five"].map((name) => (
            <div key={name} style={{ padding: "8px 22px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
              {name}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.12)" }}>
          * Names anonymised pending public launch
        </p>
      </div>

      {/* ── SECTION 4: CHANNEL MARQUEE ── */}
      <section id="channels" style={{
        padding: "80px 0",
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(99,102,241,0.02) 0%, #09090f 100%)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 48, padding: "0 40px" }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14, color: "white" }}>
            {channelList.length} channels. One dashboard.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 600, margin: "0 auto" }}>
            All your platforms feeding live data. No exports, no copy-paste, no matching row 47 to campaign X.
          </p>
        </div>

        <div className="marquee-wrap" style={{ position: "relative", overflow: "hidden" }}>
          <div className="marquee-row" style={{ display: "flex", gap: 16 }}>
            {[...channelList, ...channelList, ...channelList].map((ch, i) => (
              <div key={`a-${i}`} style={{
                padding: "12px 22px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.65)",
                flexShrink: 0,
              }}>
                {ch}
              </div>
            ))}
          </div>
          <div className="marquee-row-rev" style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[...channelList, ...channelList, ...channelList].reverse().map((ch, i) => (
              <div key={`b-${i}`} style={{
                padding: "12px 22px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.45)",
                flexShrink: 0,
              }}>
                {ch}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: MERIDIAN AI ── */}
      <section id="meridian" className="reveal-section" style={{
        padding: "120px 40px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="stratum-glow" style={{
          position: "absolute",
          inset: "-50%",
          background: "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />
        
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 24,
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              marginBottom: 20,
            }}>
              <Brain style={{ width: 16, height: 16, color: "#c4b5fd" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Meridian AI · Alpha
              </span>
            </div>
            
            <h2 style={{
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 20,
              color: "white",
              background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }} className="blur-reveal">
              The world&apos;s first<br />marketing-native LLM
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 680, margin: "0 auto", lineHeight: 1.8 }}>
              Meridian is a large language model built from scratch for marketing. Not a wrapper around GPT. Not a prompt template. A purpose-built model trained on 24 million real campaign outcomes across 15 channels, 12 sectors, and 6 budget tiers. Every time a campaign runs through StratOS, Meridian gets smarter. Every second of every day, new data flows in. No other AI on earth has this.
            </p>
          </div>

          <div className="gradient-border-rotating" style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 20,
            padding: 48,
            position: "relative",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}>
              {[
                { icon: <Activity style={{ width: 20, height: 20 }} />, title: "Anomaly Detection", desc: "Spots performance shifts across all channels before your client does", color: "#a78bfa" },
                { icon: <MessageSquare style={{ width: 20, height: 20 }} />, title: "Natural Language Queries", desc: "Ask in plain English. Meridian reads every connected platform before responding.", color: "#a78bfa" },
                { icon: <TrendingUp style={{ width: 20, height: 20 }} />, title: "Predictive Forecasting", desc: "90-day forecasts with confidence intervals, built from your actual data", color: "#a78bfa" },
                { icon: <Target style={{ width: 20, height: 20 }} />, title: "Budget Intelligence", desc: "Tells you exactly where to move spend and backs it up with benchmark data", color: "#a78bfa" },
                { icon: <BarChart3 style={{ width: 20, height: 20 }} />, title: "Sector Benchmarking", desc: "Percentile rankings against 800,000+ ad accounts in your sector and budget tier", color: "#a78bfa" },
                { icon: <Sparkles style={{ width: 20, height: 20 }} />, title: "Auto Commentary", desc: "Generates report commentary that reads like you wrote it, not like a chatbot did", color: "#a78bfa" },
              ].map((item, i) => (
                <div key={i} className="stagger-in" style={{
                  animationDelay: `${i * 0.08}s`,
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c4b5fd",
                    marginBottom: 16,
                  }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 8, letterSpacing: "-0.01em" }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA to Meridian page */}
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <a
                href="/meridian"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "14px 28px", borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none",
                  boxShadow: "0 0 24px rgba(124,58,237,0.4)",
                  transition: "all 0.3s ease",
                }}
                className="cta-pulse"
              >
                <Brain style={{ width: 16, height: 16 }} />
                Learn more about Meridian AI →
              </a>
              <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                Currently in alpha. Growing every second with real campaign data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: HERO FEATURE 1 - SIGNALS ── */}
      <section id="signals" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, #09090f 0%, rgba(168,85,247,0.02) 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }} className="feature-hero-grid">
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(236,72,153,0.1)",
                border: "1px solid rgba(236,72,153,0.25)",
                marginBottom: 20,
              }}>
                <Radar style={{ width: 14, height: 14, color: "#f9a8d4" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f9a8d4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Signals
                </span>
              </div>
              
              <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20, color: "white", lineHeight: 1.15 }}>
                See what moved<br />before your client does
              </h2>
              
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Signals is the first thing you open. Every morning, every anomaly across every channel is already surfaced, sorted by severity, with full context attached. The stuff that matters is at the top.
              </p>
              
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  "Automatic anomaly detection across all 16 channels",
                  "Severity scoring. Know what needs attention first",
                  "Historical context and pattern recognition",
                  "One-click drill-down to channel detail",
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mockup-3d" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Signals · Acme Corp · Live</span>
                <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} className="stratum-pulse" />
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {([
                  { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", ch: "Meta Ads", metric: "ROAS −34%", detail: "vs 7-day avg · Critical · 2 hrs ago" },
                  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", ch: "Google Ads", metric: "CPC +18%", detail: "Brand campaigns · Warning · 4 hrs ago" },
                  { color: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.2)", ch: "Organic Search", metric: "Sessions +22%", detail: "Week on week · Positive · 8 hrs ago" },
                  { color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)", ch: "LinkedIn Ads", metric: "CTR −12%", detail: "All campaigns · Warning · 6 hrs ago" },
                ] as { color: string; bg: string; border: string; ch: string; metric: string; detail: string }[]).map((a, si) => (
                  <div key={a.ch} className={`signal-card sc${si + 1}`} style={{ padding: "11px 14px", borderRadius: 10, background: a.bg, border: `1px solid ${a.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.ch}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{a.metric}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{a.detail}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(129,140,248,0.7)", fontWeight: 600 }}>4 signals detected today</span>
                  <span style={{ fontSize: 11, color: "rgba(129,140,248,0.45)" }}>View all →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: HERO FEATURE 2 - AI ANALYST / CHAT ── */}
      <section id="ai-analyst" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, rgba(168,85,247,0.02) 0%, rgba(99,102,241,0.02) 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }} className="feature-hero-grid">
            <div className="mockup-3d" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Meridian AI · Acme Corp</span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)", maxWidth: "80%", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                    Why did sessions drop on Thursday?
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#818cf8", marginTop: 2 }}>S</div>
                  <div style={{ padding: "12px 14px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", flex: 1, fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.7 }}>
                    Thursday saw a <span style={{ color: "#ef4444", fontWeight: 700 }}>−31% drop</span> in organic sessions (1,247 vs 7-day avg of 1,803). Cross-referencing Search Console, avg. position for non-brand terms fell from <strong style={{ color: "white" }}>4.2 to 6.8</strong>. Paid traffic was unaffected (+3%). <span style={{ color: "rgba(129,140,248,0.8)" }}>Recommend refreshing content on your 3 highest-traffic landing pages.</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)", maxWidth: "80%", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                    Which campaign should we pause?
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#818cf8", marginTop: 2 }}>S</div>
                  <div style={{ padding: "12px 16px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 5, alignItems: "center" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8" }} className="stratum-pulse" />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", opacity: 0.6 }} className="stratum-pulse" />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", opacity: 0.35 }} className="stratum-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                marginBottom: 20,
              }}>
                <Brain style={{ width: 14, height: 14, color: "#a5b4fc" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  AI Analyst
                </span>
              </div>
              
              <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20, color: "white", lineHeight: 1.15 }}>
                Ask anything.<br />Get answers that actually make sense.
              </h2>
              
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Meridian reads every connected platform before it answers. Ask it why CPC spiked on Thursday, and it&apos;ll check GA4, Google Ads, Meta, landing page performance, and historical patterns before it responds.
              </p>
              
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  "Natural language queries. Ask like you're talking to a human",
                  "Cross-platform analysis before every response",
                  "Cites sources with drill-down links to the data",
                  "Remembers conversation context for follow-up questions",
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: HERO FEATURE 3 - REPORTS ── */}
      <section id="reports" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.02) 0%, #09090f 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }} className="feature-hero-grid">
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                marginBottom: 20,
              }}>
                <FileText style={{ width: 14, height: 14, color: "#6ee7b7" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6ee7b7", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Reports
                </span>
              </div>
              
              <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20, color: "white", lineHeight: 1.15 }}>
                Client reports in minutes,<br />not Tuesday afternoon
              </h2>
              
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Drag in the blocks you want. Meridian writes the commentary. You tweak if needed. Generate a PDF or share a live link. The entire process takes 10 minutes instead of three hours.
              </p>
              
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  "90+ pre-built report blocks across all 16 channels",
                  "AI-generated commentary that reads like you wrote it",
                  "Branded PDFs or live shareable links",
                  "Schedule reports to generate and send automatically",
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mockup-3d" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Report Builder · Acme Corp · March 2026</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {([
                    { label: "Executive Summary", tag: "Meridian AI", tagColor: "#7c3aed" },
                    { label: "GA4: Website Performance", tag: "Live data", tagColor: "#6366f1" },
                    { label: "Google Ads: Paid Search", tag: "Live data", tagColor: "#6366f1" },
                    { label: "Meta Ads: Paid Social", tag: "Live data", tagColor: "#6366f1" },
                    { label: "SEO Overview", tag: "Live data", tagColor: "#6366f1" },
                  ] as { label: string; tag: string; tagColor: string }[]).map((s) => (
                    <div key={s.label} style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2.5, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", flex: 1, fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${s.tagColor}18`, color: s.tagColor, fontWeight: 700, whiteSpace: "nowrap" }}>{s.tag}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 5 }}>Meridian AI Commentary</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    &ldquo;Sessions were up 14% on the previous period, driven primarily by organic (+22%) and paid search (+9%). ROAS across paid channels averaged 4.2x, though Meta underperformed…&rdquo;
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", textAlign: "center", fontSize: 11, color: "#a5b4fc", fontWeight: 700 }}>Share link →</div>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Export PDF</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: BENTO GRID - REMAINING FEATURES ── */}
      <section id="features" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, #09090f 0%, rgba(99,102,241,0.02) 50%, #09090f 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
              Built to run your whole operation
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
              Beyond the headline features, StratOS includes all the tools a modern agency needs to run client accounts efficiently.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gridTemplateRows: "repeat(4, minmax(200px, auto))",
            gap: 20,
          }} className="bento-grid">
            {/* Budget Intelligence - Large */}
            <div className="bento-card stagger-in" style={{
              gridColumn: "span 3",
              gridRow: "span 2",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.4s ease",
              animationDelay: "0s",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <DollarSign style={{ width: 22, height: 22, color: "#fbbf24" }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 12, letterSpacing: "-0.02em" }}>
                  Budget Intelligence
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  Cross-channel budget recommendations. StratOS shows you exactly where to move the spend and backs it up with performance data.
                </p>
              </div>
              <div style={{
                background: "rgba(245,158,11,0.05)",
                borderRadius: 12,
                padding: 16,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Channel ROAS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {([
                    { ch: "Google Search", roas: "6.2x", w: "88%", color: "#10b981" },
                    { ch: "Meta Ads", roas: "1.9x", w: "27%", color: "#ef4444" },
                    { ch: "LinkedIn", roas: "2.1x", w: "30%", color: "#f59e0b" },
                  ] as { ch: string; roas: string; w: string; color: string }[]).map((c) => (
                    <div key={c.ch}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{c.ch}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "white" }}>{c.roas}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                        <div style={{ height: 4, width: c.w, background: c.color, borderRadius: 2, opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Forecasting */}
            <div className="bento-card stagger-in" style={{
              gridColumn: "span 3",
              gridRow: "span 2",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "all 0.4s ease",
              animationDelay: "0.1s",
            }}>
              <div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <TrendingUp style={{ width: 22, height: 22, color: "#60a5fa" }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 12, letterSpacing: "-0.02em" }}>
                  90-Day Forecasting
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  Predictive forecasting with confidence intervals. Built from your actual data, not industry benchmarks.
                </p>
              </div>
              <div style={{
                background: "rgba(59,130,246,0.05)",
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  {[
                    { val: "£48.2k", label: "Expected", color: "#a5b4fc" },
                    { val: "£58.4k", label: "Best", color: "#10b981" },
                    { val: "£36.1k", label: "Worst", color: "rgba(239,68,68,0.75)" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 300 80" style={{ width: "100%", height: "auto", display: "block" }}>
                  <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="130" y1="0" x2="130" y2="75" stroke="rgba(99,102,241,0.25)" strokeWidth="1" strokeDasharray="3,2" />
                  <polyline points="10,65 50,55 90,48 130,42" fill="none" stroke="rgba(129,140,248,0.55)" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="130,42 180,38 230,34 280,28" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="5,3" strokeLinecap="round" />
                  <polyline points="130,42 180,34 230,26 280,16" fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="1" strokeDasharray="3,3" />
                  <polyline points="130,42 180,46 230,52 280,60" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="130" cy="42" r="3" fill="#818cf8" />
                </svg>
              </div>
            </div>

            {/* Client Portal */}
            <div className="bento-card stagger-in" style={{
              gridColumn: "span 2",
              gridRow: "span 2",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              transition: "all 0.4s ease",
              animationDelay: "0.2s",
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(168,85,247,0.15)",
                border: "1px solid rgba(168,85,247,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}>
                <Monitor style={{ width: 20, height: 20, color: "#c084fc" }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 10, letterSpacing: "-0.01em" }}>
                Client Portal
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                Branded dashboards. Clients see the KPIs you choose. Magic-link login. No passwords.
              </p>
            </div>

            {/* Portfolio View */}
            <div className="bento-card stagger-in" style={{
              gridColumn: "span 2",
              gridRow: "span 2",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              transition: "all 0.4s ease",
              animationDelay: "0.25s",
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(236,72,153,0.15)",
                border: "1px solid rgba(236,72,153,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}>
                <Briefcase style={{ width: 20, height: 20, color: "#f9a8d4" }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 10, letterSpacing: "-0.01em" }}>
                Portfolio View
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                See all client accounts at once. Spot trends across your entire book. Surface issues before the client calls.
              </p>
            </div>

            {/* Actions & Tasks */}
            <div className="bento-card stagger-in" style={{
              gridColumn: "span 2",
              gridRow: "span 2",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              transition: "all 0.4s ease",
              animationDelay: "0.3s",
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}>
                <ListTodo style={{ width: 20, height: 20, color: "#6ee7b7" }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 10, letterSpacing: "-0.01em" }}>
                Actions & Tasks
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                Assign actions to team members. Track follow-up. Turn insights into accountable next steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: AGENCY TOOLKIT ── */}
      <section id="toolkit" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, #09090f 0%, rgba(168,85,247,0.02) 100%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
              Built-in agency tools
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
              StratOS isn&apos;t just reporting. We&apos;ve built the tools agencies actually use day-to-day, all AI-powered, all in one place.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }} className="toolkit-grid">
            {[
              { icon: <Search style={{ width: 22, height: 22 }} />, title: "Keyword Planner", desc: "SemRush-backed research with volume, difficulty, CPC, and trend data. Export to CSV or use inline.", color: "#3b82f6" },
              { icon: <Rocket style={{ width: 22, height: 22 }} />, title: "PPC Proposal Generator", desc: "Interactive forecaster with pipeline CRM, view tracking, and enquiry capture. Share a link and see who's read it.", color: "#10b981" },
              { icon: <Layers style={{ width: 22, height: 22 }} />, title: "Media Plan Builder", desc: "Multi-channel budget allocation with AI forecast outputs and shareable strategy docs.", color: "#f59e0b" },
              { icon: <BookOpen style={{ width: 22, height: 22 }} />, title: "Content Strategy", desc: "Sector-specific content plans with topics, keywords, and publishing schedules.", color: "#a855f7" },
              { icon: <Monitor style={{ width: 22, height: 22 }} />, title: "Landing Page Analyser", desc: "CRO/SEO/Mobile/Forms scoring with AI recommendations. Know what's broken before you publish.", color: "#ef4444" },
              { icon: <Terminal style={{ width: 22, height: 22 }} />, title: "LLM.txt Generator", desc: "Sector-specific LLM context files for AI-ready brand visibility.", color: "#6366f1" },
              { icon: <Share2 style={{ width: 22, height: 22 }} />, title: "Competitor Intelligence", desc: "Share of voice, competitive monitoring, and ongoing snapshots with Meridian-powered commentary.", color: "#ec4899" },
              { icon: <Palette style={{ width: 22, height: 22 }} />, title: "Creative Intelligence", desc: "Ad creative performance analysis and fatigue detection across all paid channels.", color: "#14b8a6" },
            ].map((tool, i) => (
              <div key={i} className="tool-card stagger-in" style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 32,
                transition: "all 0.4s ease",
                animationDelay: `${i * 0.08}s`,
                position: "relative",
              }}>
                {i >= 6 && (
                  <div style={{
                    position: "absolute", top: 16, right: 16,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 10, fontWeight: 600,
                    color: "rgba(255,255,255,0.15)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>
                    Coming soon
                  </div>
                )}
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: `${tool.color}18`,
                  border: `1px solid ${tool.color}35`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tool.color,
                  marginBottom: 20,
                }}>
                  {tool.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 10, letterSpacing: "-0.01em" }}>
                  {tool.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 11: HOW IT WORKS ── */}
      <section id="how-it-works" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, rgba(168,85,247,0.02) 0%, #09090f 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
              How it works
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              From setup to daily workflow. Here&apos;s how StratOS fits into your agency&apos;s operations.
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 48, position: "relative" }}>
              {steps.map((step, i) => (
                <div key={i} className="step-card stagger-in" style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  gap: 28,
                  alignItems: "flex-start",
                  animationDelay: `${i * 0.15}s`,
                }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))",
                    border: "2px solid rgba(99,102,241,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#a5b4fc",
                    boxShadow: "0 0 24px rgba(99,102,241,0.3)",
                  }}>
                    {step.n}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 12, letterSpacing: "-0.02em" }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 12: ABOUT ── */}
      <section id="about" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, #09090f 0%, rgba(99,102,241,0.03) 100%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20, color: "white" }} className="blur-reveal">
            Built by i3MEDIA
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.85, marginBottom: 24 }}>
            We&apos;ve been running digital campaigns for ambitious brands for over 22 years. StratOS is what we built for ourselves, because we were tired of opening 11 tabs every morning, reconciling numbers that don&apos;t match, and spending Tuesday afternoons writing reports.
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.85, marginBottom: 40 }}>
            This isn&apos;t a product built by developers who&apos;ve never run a campaign. It&apos;s built by people who do this work every day. That&apos;s why it feels different.
          </p>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <img src="/primary-logo.svg" style={{ height: 24, width: "auto", opacity: 0.8 }} alt="i3MEDIA" />
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
              Est. 2004 · Manchester, UK
            </span>
          </div>
        </div>
      </section>

      {/* ── SECTION 13: TESTIMONIALS ── */}
      <section id="testimonials" className="reveal-section" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.03) 0%, #09090f 100%)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 24,
              background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
              marginBottom: 20,
            }}>
              <Quote style={{ width: 15, height: 15, color: "#a5b4fc" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                What agencies are saying
              </span>
            </div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }} className="blur-reveal">
              Real people. Real campaigns.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              We built StratOS for agencies like ours. Here&apos;s what they&apos;re saying.
            </p>
          </div>

          <div className="testimonials-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}>
            {[
              {
                quote: "Before StratOS, reporting week was genuinely dread-inducing. Now I generate the whole thing in about ten minutes. The AI commentary is so good our clients think we've hired a new member of staff.",
                name: "Sarah M.",
                role: "Head of Performance · Digital Agency, London",
              },
              {
                quote: "The Signals feature alone is worth it. I caught a Meta ROAS crash on a Monday morning before the client had even looked at their phone. That kind of visibility changes the conversation completely.",
                name: "Tom B.",
                role: "Paid Media Director · Growth Agency, Manchester",
              },
              {
                quote: "We run 30+ client accounts. Having everything in one place, with anomalies surfaced automatically and reports that basically write themselves, it's transformed what our team can take on.",
                name: "Priya K.",
                role: "Agency Principal · Performance Agency, Birmingham",
              },
            ].map((t, i) => (
              <div key={i} className="stagger-in" style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                animationDelay: `${i * 0.12}s`,
              }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: 5 }).map((_, si) => (
                    <span key={si} style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, fontStyle: "italic", flex: 1 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 3 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 14: BOTTOM CTA + LOGIN ── */}
      <section id="access" className="reveal-section" style={{
        padding: "120px 40px 80px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.03) 0%, #09090f 100%)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
            Get access
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 48, lineHeight: 1.75 }}>
            StratOS is currently available to i3MEDIA clients and select agency partners. If you&apos;re already set up, sign in below.
          </p>

          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "40px",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            textAlign: "left",
          }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label htmlFor="access-email" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Email
                </label>
                <input
                  id="access-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@youragency.com"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "14px 16px", borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: 14,
                    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <label htmlFor="access-password" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="access-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "14px 44px 14px 16px", borderRadius: 10,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white", fontSize: 14,
                      outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                      cursor: "pointer", padding: 4, display: "flex",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5", fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "15px 24px", borderRadius: 10,
                  background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                  border: "none", color: "white",
                  fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: loading ? "none" : "0 0 24px rgba(99,102,241,0.5)",
                }}
                className={loading ? "" : "cta-pulse"}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "8px 0" }}>or</div>

              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/google"}
                style={{
                  padding: "15px 24px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </form>
          </div>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 32, lineHeight: 1.6 }}>
            New to StratOS? Get in touch:{" "}
            <a href="mailto:hello@i3media.net" style={{ color: "#818cf8", textDecoration: "underline" }}>hello@i3media.net</a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
        color: "rgba(255,255,255,0.25)",
        fontSize: 12,
      }}>
        <div style={{ marginBottom: 16 }}>
          <img src="/primary-logo.svg" style={{ height: 20, width: "auto", opacity: 0.4, margin: "0 auto" }} alt="i3MEDIA" />
        </div>
        <p>© {new Date().getFullYear()} i3MEDIA Ltd. All rights reserved.</p>
        <p style={{ marginTop: 8 }}>
          <a href="https://i3media.net" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", marginRight: 16 }}>i3media.net</a>
          <a href="https://i3media.net/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Privacy</a>
        </p>
      </footer>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }

        /* ─── ORB ANIMATIONS ─── */
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -40px) scale(1.12); }
          66% { transform: translate(-30px, 25px) scale(0.93); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.88); }
          66% { transform: translate(35px, -50px) scale(1.14); }
        }
        .login-orb-1 { animation: orb1 14s ease-in-out infinite; }
        .login-orb-2 { animation: orb2 18s ease-in-out infinite; }

        /* ─── HERO WORD STAGGER ─── */
        @keyframes hw-in {
          from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); }
        }
        .hw { display: inline-block; animation: hw-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; }
        .hw2 { animation-delay: 0.15s; }
        .hw3 { animation-delay: 0.6s; }
        .hw4 { animation-delay: 0.3s; }
        .hw5 { animation-delay: 0.42s; }

        /* ─── PARTICLES ─── */
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-22px) scale(1.4); }
        }
        .hero-particle { animation: particle-float linear infinite; }

        /* ─── STRATUM PULSE ─── */
        @keyframes stratum-pulse-anim {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(129,140,248,0.9); }
          50% { opacity: 0.35; box-shadow: 0 0 24px rgba(129,140,248,0.25); }
        }
        .stratum-pulse { animation: stratum-pulse-anim 2.5s ease-in-out infinite; }

        /* ─── MARQUEE ─── */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeRev {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .marquee-row { animation: marquee 35s linear infinite; }
        .marquee-row-rev { animation: marqueeRev 40s linear infinite; }
        .marquee-row:hover, .marquee-row-rev:hover { animation-play-state: paused; }

        .marquee-wrap::before, .marquee-wrap::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 140px; z-index: 2; pointer-events: none;
        }
        .marquee-wrap::before { left: 0; background: linear-gradient(90deg, #09090f 20%, transparent); }
        .marquee-wrap::after  { right: 0; background: linear-gradient(-90deg, #09090f 20%, transparent); }

        /* ─── SCROLL REVEAL ─── */
        .reveal-section {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }

        /* ─── BLUR REVEAL ─── */
        @keyframes fadeInBlur {
          from { opacity: 0; filter: blur(10px); transform: translateY(12px); }
          to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
        }
        .blur-reveal {
          opacity: 0;
          animation: none;
        }
        .section-visible .blur-reveal {
          animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
        }

        /* ─── STAGGER IN (only triggers when parent section is visible) ─── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger-in {
          opacity: 0;
          transform: translateY(28px);
        }
        .section-visible .stagger-in {
          animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* ─── SIGNAL CARDS STAGGER ─── */
        .signal-card { opacity: 0; transform: translateX(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .section-visible .sc1 { opacity: 1; transform: none; transition-delay: 0.35s; }
        .section-visible .sc2 { opacity: 1; transform: none; transition-delay: 0.55s; }
        .section-visible .sc3 { opacity: 1; transform: none; transition-delay: 0.75s; }
        .section-visible .sc4 { opacity: 1; transform: none; transition-delay: 0.95s; }

        /* ─── CTA PULSE GLOW ─── */
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.75), 0 0 80px rgba(99,102,241,0.15); }
        }
        .cta-pulse { animation: pulse-glow 2.5s ease-in-out infinite; }
        .cta-pulse:hover { transform: translateY(-2px) scale(1.02); }

        /* ─── CARD HOVER EFFECTS ─── */
        .pain-card {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, box-shadow 0.3s ease;
          cursor: default;
        }
        .pain-card:hover {
          transform: translateY(-6px) scale(1.015);
          border-color: rgba(99,102,241,0.3) !important;
          box-shadow: 0 16px 48px rgba(99,102,241,0.18), 0 0 0 1px rgba(99,102,241,0.1);
        }

        .stat-card-3d,
        .tool-card,
        .bento-card {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .stat-card-3d:hover,
        .tool-card:hover,
        .bento-card:hover {
          transform: translateY(-6px) scale(1.025);
          border-color: rgba(99,102,241,0.2) !important;
          box-shadow: 0 16px 48px rgba(99,102,241,0.18);
        }

        /* ─── MOCKUP 3D TILT + GLOW + SCAN LINE ─── */
        @keyframes card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes card-glow {
          0%, 100% { box-shadow: 0 4px 32px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 8px 48px rgba(99,102,241,0.3), 0 0 0 1px rgba(99,102,241,0.22); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(-2px); opacity: 0; }
          5%   { opacity: 1; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(600px); opacity: 0; }
        }
        .mockup-3d {
          animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite;
          transition: transform 0.4s ease;
        }
        .mockup-3d:hover {
          transform: perspective(1000px) rotateY(2deg) rotateX(2deg) scale(1.02);
        }
        .mockup-3d::after {
          content: '';
          position: absolute; left: 0; right: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(165,180,252,0.6) 40%, rgba(99,102,241,0.8) 50%, rgba(165,180,252,0.6) 60%, transparent 100%);
          animation: scan-line 8s ease-in-out infinite;
          pointer-events: none;
        }

        /* ─── LOGIN CARD 3D ─── */
        .login-card-3d:hover {
          transform: perspective(1200px) rotateY(-2deg);
          box-shadow: 0 20px 60px rgba(99,102,241,0.2);
        }

        /* ─── GRADIENT BORDER (STATIC GLOW) ─── */
        .gradient-border-rotating {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(99,102,241,0.3) !important;
          box-shadow: 0 0 0 1px rgba(168,85,247,0.15), inset 0 0 60px rgba(99,102,241,0.04);
        }
        .gradient-border-rotating::before {
          display: none;
        }

        /* ─── HOW-IT-WORKS CONNECTOR ─── */
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
        .connector-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
        }
        .section-visible .connector-line {
          animation: draw-line 2.5s ease forwards 0.5s;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1100px) {
          .side-nav { display: none !important; }
        }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-headline { font-size: 48px !important; }
          .feature-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .pains-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .toolkit-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
          .bento-card { grid-column: span 1 !important; grid-row: span 1 !important; }
          .marquee-row { animation-duration: 22s !important; }
          .marquee-row-rev { animation-duration: 26s !important; }
          .mockup-3d { animation: card-glow 4s ease-in-out infinite; }
        }
        @media (max-width: 700px) {
          .hero-headline { font-size: 38px !important; }
          .toolkit-grid { grid-template-columns: 1fr !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          .top-nav { padding-left: 16px !important; padding-right: 16px !important; }
          .hero-grid { padding-left: 20px !important; padding-right: 20px !important; padding-top: 56px !important; padding-bottom: 56px !important; }
          .cta-pulse { width: 100% !important; justify-content: center !important; box-sizing: border-box !important; }
        }
        @media (max-width: 700px) {
          .callout-bar { display: none !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 960px) {
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mockup-3d { animation: none !important; }
          .mockup-3d::after { display: none !important; }
          .hero-particle { animation: none !important; }
          .hw { animation: none !important; opacity: 1 !important; }
          .stagger-in { animation: none !important; opacity: 1 !important; transform: none !important; }
          .blur-reveal { animation: none !important; opacity: 1 !important; }
        }

        .side-nav { display: flex; }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Activity, TrendingUp, Zap, FileText, MessageSquare, Users, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    { q: "ROAS is tanking. When did that happen?", a: "The worst version of this is your client telling you before you've noticed. StratOS spots these shifts automatically and puts them front and centre." },
    { q: "Where should we move the budget?", a: "You know Meta's underperforming and Google Ads is flying. But without hard numbers side by side, it's still a gut-feel conversation." },
    { q: "Three platforms. Three numbers. None of them match.", a: "GA4 says one thing. Google Ads says another. Meta has its own view. Someone has to reconcile all of this. Every. Single. Week." },
    { q: "Is this account actually performing well?", a: "Without a cross-channel view, you're always looking at a piece of the puzzle. StratOS shows the whole board." },
  ];

  const channels = [
    { group: "Web & Analytics", items: ["Google Analytics 4", "Google Search Console", "Core Web Vitals"] },
    { group: "Paid Search", items: ["Google Ads", "Microsoft Advertising"] },
    { group: "Paid Social", items: ["Meta Ads", "TikTok Ads", "LinkedIn Ads"] },
    { group: "SEO", items: ["SemRush", "Moz"] },
    { group: "Email & CRM", items: ["Klaviyo", "HubSpot", "CallRail"] },
    { group: "E-Commerce & Video", items: ["WooCommerce", "Shopify", "YouTube Analytics"] },
  ];

  const capabilities = [
    {
      icon: <Activity style={{ width: 18, height: 18 }} />,
      title: "You'll know before your client does",
      desc: "StratOS watches every channel automatically. The second ROAS drops, rankings slip, or spend spikes — you get the alert. No more finding out on a call.",
    },
    {
      icon: <TrendingUp style={{ width: 18, height: 18 }} />,
      title: "Stop guessing where to put the money",
      desc: "The budget advisor compares performance across every paid channel and tells you exactly where a shift in spend would have the biggest impact — with projected numbers attached.",
    },
    {
      icon: <Zap style={{ width: 18, height: 18 }} />,
      title: "Reports that don't wreck your Wednesday",
      desc: "Build the report, generate the commentary, reorder sections by dragging them, export to a branded PDF and share the link. The whole thing in under 20 minutes.",
    },
    {
      icon: <FileText style={{ width: 18, height: 18 }} />,
      title: "See 90 days ahead, not just last month",
      desc: "Forecasting uses your actual historical data to project 30, 60 and 90 days forward — with best, expected and worst-case bands so you can plan with real confidence.",
    },
    {
      icon: <MessageSquare style={{ width: 18, height: 18 }} />,
      title: "Just ask it",
      desc: "Every client dashboard has an AI analyst built in. Ask why sessions are down, which campaign to pause, or what you should focus on this week. It reads the data. It answers.",
    },
    {
      icon: <Users style={{ width: 18, height: 18 }} />,
      title: "Clients get a view that makes sense",
      desc: "The client portal shows each client their goals, reports and key numbers — nothing overwhelming. They get a magic link. They log in. No extra accounts to manage.",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Connect your channels",
      desc: "Add your credentials once. GA4, Google Ads, Meta, TikTok, LinkedIn — everything starts pulling in. Most clients are live in under half an hour.",
    },
    {
      n: "02",
      title: "See what moved overnight",
      desc: "Open Signals first thing. Every anomaly across every channel is already surfaced, sorted by severity, with context attached. The important stuff is at the top.",
    },
    {
      n: "03",
      title: "Dig in with all the context",
      desc: "Every channel tab has the full picture — campaigns, creatives, landing pages, goals. The AI reads data from all other channels before it gives you an insight.",
    },
    {
      n: "04",
      title: "Act, report, repeat",
      desc: "Assign actions to the team, generate a client report with a click, share a strategy document. From spotting the issue to presenting the solution — all in one place.",
    },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
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
        <a
          href="#login-form"
          style={{
            padding: "8px 18px", borderRadius: 8,
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            color: "#a5b4fc", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}
        >
          Sign in →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", paddingTop: 64,
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center",
      }}>
        <div className="login-orb-1" style={{
          position: "absolute", width: "65%", paddingBottom: "65%",
          top: "-15%", left: "-15%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.32) 0%, transparent 65%)",
        }} />
        <div className="login-orb-2" style={{
          position: "absolute", width: "55%", paddingBottom: "55%",
          bottom: "-20%", right: "-10%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

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
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>Built by i3MEDIA · 20 years in the game</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)", boxShadow: "0 0 6px rgba(255,255,255,0.3)" }} className="stratum-pulse" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by Stratum</span>
              </div>
            </div>
            <h1 style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1.0,
              letterSpacing: "-0.04em", marginBottom: 28, color: "white",
            }} className="hero-headline">
              We got tired<br />of it too.
            </h1>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.75,
              maxWidth: 520, marginBottom: 40,
            }}>
              After 20 years managing campaigns for ambitious brands, i3MEDIA built StratOS because we were sick of the same problem — too much data, spread across too many platforms, taking too long to do anything useful with.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "15 channels pulled into one view — no more tab-switching",
                "Automatic anomaly detection so you know before your client does",
                "Reports with full commentary generated in minutes, not hours",
                "Ask the AI analyst anything — it reads every connected channel",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#818cf8", fontSize: 10, fontWeight: 900,
                  }}>✓</div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <div
            id="login-form"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "36px 32px",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
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
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.35)", padding: 0, display: "flex",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" style={{
                  padding: "11px 14px", borderRadius: 8,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  fontSize: 13, color: "#fca5a5",
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px 20px", borderRadius: 10, marginTop: 4,
                  background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                  border: "none", color: "white", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 28px rgba(99,102,241,0.4)",
                  transition: "opacity 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {loading ? "Signing in…" : "Access StratOS →"}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              Don&apos;t have access? <a href="mailto:hello@i3media.net" style={{ color: "rgba(99,102,241,0.7)", textDecoration: "none" }}>Get in touch</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: PAIN POINTS ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Sound familiar?
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              We&apos;ve been there.<br />Got the t-shirt.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              These are the conversations we were having at i3MEDIA before we built StratOS. If any of them land, you&apos;re in the right place.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="pains-grid">
            {pains.map((p) => (
              <div key={p.q} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "28px 28px 32px",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.35, fontStyle: "italic" }}>
                  {p.q}
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                  {p.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CHANNELS ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Integrations
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              All your platforms. Finally in one place.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Connect once, read everything. No manual exports, no copy-pasting, no version-control nightmares.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="channels-grid">
            {channels.map((group) => (
              <div key={group.group} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "24px 28px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                  {group.group}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.items.map((ch) => (
                    <div key={ch} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(99,102,241,0.5)", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{ch}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "rgba(255,255,255,0.22)" }}>
            15 platforms. One login. Updated automatically — no Monday morning setup ritual.
          </p>
        </div>
      </section>

      {/* ── SECTION 4: STRATUM ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden", background: "rgba(99,102,241,0.015)" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.035,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "60%",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)",
        }} />

        <div style={{ maxWidth: 880, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "6px 16px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 10px rgba(129,140,248,0.9)" }} className="stratum-pulse" />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: "0.12em", textTransform: "uppercase" }}>Proprietary technology · i3MEDIA</span>
          </div>

          <h2 style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.9, marginBottom: 20, color: "white" }}>
            Stratum
          </h2>
          <p style={{ fontSize: 18, color: "rgba(99,102,241,0.75)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: 32, textTransform: "uppercase" }}>
            Cross-channel intelligence framework
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 640, margin: "0 auto 52px" }}>
            Stratum is the intelligence layer beneath everything you see in StratOS. It works across all 15 connected channels simultaneously — reading signals, finding correlations, and surfacing insights that only emerge when you stop looking at platforms in isolation. We&apos;ve spent years building it. You won&apos;t find it anywhere else.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 52 }} className="stratum-grid">
            {[
              "Cross-channel signal weighting",
              "Continuous model refinement",
              "Anomaly correlation engine",
              "Predictive pattern extraction",
            ].map((label) => (
              <div key={label} style={{
                padding: "18px 16px", borderRadius: 12,
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                fontSize: 12, color: "rgba(129,140,248,0.9)", fontWeight: 700,
                letterSpacing: "0.03em", lineHeight: 1.45, textAlign: "center",
              }}>
                {label}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontStyle: "italic", letterSpacing: "0.02em" }}>
            We could explain exactly how it works. We just choose not to.
          </p>
        </div>
      </section>

      {/* ── SECTION 5: CAPABILITIES ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "50%", paddingBottom: "30%",
          top: "10%", right: "-15%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              What StratOS does
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              Less firefighting.<br />More deciding.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Everything you wish your reporting stack did. Built by people who spent years frustrated that it didn&apos;t.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="capabilities-grid">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "28px 28px 32px",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 20,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#818cf8",
                }}>
                  {cap.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 10, lineHeight: 1.3 }}>
                  {cap.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: MORE DEPTH ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="depth-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
                Under the bonnet
              </p>
              <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 20, color: "white" }}>
                There&apos;s a lot going on underneath
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 32 }}>
                Beyond the day-to-day dashboards, StratOS has a full operations layer — proposal building, media planning, competitive monitoring, keyword research, and a client communication hub. It&apos;s the whole agency in one tool.
              </p>
              <a
                href="#login-form"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 22px", borderRadius: 10,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                Sign in and see for yourself <ArrowRight style={{ width: 14, height: 14 }} />
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Multi-touch attribution", desc: "Five models side by side — last-click, first-click, linear, time-decay, position-based. See who actually gets the credit." },
                { title: "90-day performance forecasting", desc: "Real projections from real historical data. Best, expected and worst case — so you can plan with actual confidence." },
                { title: "Seasonality intelligence", desc: "Automatic pattern detection from historical snapshots. Catch seasonal trends before they catch you out." },
                { title: "Share of voice tracking", desc: "Organic and paid competitive position against your rivals, updated with live SemRush data." },
                { title: "Quarterly strategy documents", desc: "Forward-looking strategy docs per client, generated and shareable via link. No more building decks from scratch." },
                { title: "Competitor monitoring", desc: "Ongoing competitive snapshots with AI commentary, saved to history so you can see how the landscape is shifting." },
              ].map((item) => (
                <div key={item.title} style={{
                  display: "flex", gap: 14,
                  padding: "16px 20px", borderRadius: 12,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 3 }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: HOW IT WORKS ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              How it works
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              You&apos;re up and running faster than you&apos;d expect
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, position: "relative" }} className="steps-grid">
            <div style={{
              position: "absolute", top: 35, left: "12.5%", right: "12.5%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3) 20%, rgba(99,102,241,0.3) 80%, transparent)",
              pointerEvents: "none",
            }} className="steps-line" />
            {steps.map((step) => (
              <div key={step.n} style={{ position: "relative" }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", marginBottom: 24,
                  background: "rgba(99,102,241,0.1)", border: "2px solid rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: "#818cf8",
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: BUILT BY i3MEDIA ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "40%",
          bottom: "-20%", left: "-10%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            The story behind it
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 28, color: "white" }}>
            We&apos;re not a startup.<br />We&apos;re an agency that got fed up.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 20px" }}>
            i3MEDIA has been running digital campaigns for ambitious brands for over 20 years. Websites, SEO, paid social, PPC — we&apos;ve done it all, for clients of all shapes and sizes, across two continents.
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 20px" }}>
            And for 20 years, we had the same problem every other agency has. Too many platforms. Too much time pulling data. Not enough time actually using it. So we built StratOS — for ourselves first, and now for the wider world.
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 44px" }}>
            It&apos;s opinionated because we&apos;ve made every mistake in the book. It&apos;s fast because slow tools don&apos;t get used. And it&apos;s honest because that&apos;s how we work.
          </p>
          <a
            href="https://i3media.net"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            Learn more about i3MEDIA <ArrowRight style={{ width: 14, height: 14 }} />
          </a>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 64 }}>
            {[
              { stat: "20+", label: "Years in marketing" },
              { stat: "52", label: "In-house team members" },
              { stat: "15", label: "Channels connected" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{s.stat}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 8, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            Right then
          </p>
          <h2 style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.0, marginBottom: 20, color: "white" }}>
            Ready to stop<br />flying blind?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 460, margin: "0 auto 40px" }}>
            Already have a StratOS account? Sign in above. Want to get set up? Drop us a line — we&apos;re a real team and we actually reply.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#login-form"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "white", fontSize: 15, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 32px rgba(99,102,241,0.4)",
              }}
            >
              Sign in to StratOS <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
            <a
              href="mailto:hello@i3media.net"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Request access
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "28px 40px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 20, opacity: 0.35 }} alt="i3MEDIA" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>StratOS</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} i3MEDIA Ltd. All rights reserved. &nbsp;·&nbsp;{" "}
          <a href="https://i3media.net" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>i3media.net</a>
        </p>
      </footer>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.9); }
          66% { transform: translate(25px, -40px) scale(1.1); }
        }
        .login-orb-1 { animation: orb1 12s ease-in-out infinite; }
        .login-orb-2 { animation: orb2 15s ease-in-out infinite; }
        @keyframes stratum-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(129,140,248,0.9); }
          50% { opacity: 0.45; box-shadow: 0 0 20px rgba(129,140,248,0.3); }
        }
        .stratum-pulse { animation: stratum-pulse 2.5s ease-in-out infinite; }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-headline { font-size: 48px !important; }
          .pains-grid { grid-template-columns: 1fr 1fr !important; }
          .channels-grid { grid-template-columns: 1fr 1fr !important; }
          .capabilities-grid { grid-template-columns: 1fr 1fr !important; }
          .stratum-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-line { display: none !important; }
          .depth-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
        @media (max-width: 600px) {
          .hero-headline { font-size: 40px !important; }
          .pains-grid { grid-template-columns: 1fr !important; }
          .channels-grid { grid-template-columns: 1fr !important; }
          .capabilities-grid { grid-template-columns: 1fr !important; }
          .stratum-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

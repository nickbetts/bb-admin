"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ArrowRight,
  Lock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  Calendar,
  DollarSign,
  FileSignature,
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
  { icon: <Layers size={20} />, title: "Ad group segmentation", desc: "Keywords are automatically grouped into logical ad groups. Start your campaigns with structure already in place, not a flat keyword list." },
  { icon: <TrendingUp size={20} />, title: "Forecast modelling", desc: "30, 60, and 90-day forecasts for clicks, impressions, and spend. Based on real Google Ads data, not estimates from third-party tools." },
  { icon: <DollarSign size={20} />, title: "Budget estimation", desc: "See estimated monthly spend based on your target position and competition level. High, medium, and low bid ranges for each keyword." },
  { icon: <Calendar size={20} />, title: "Seasonal trends", desc: "12-month search volume trends for every keyword. Spot seasonal patterns and plan campaigns around peak demand periods." },
  { icon: <BarChart3 size={20} />, title: "Competition levels", desc: "LOW, MEDIUM, and HIGH competition badges from Google Ads. Know which keywords are contested and which have room to compete." },
  { icon: <FileSignature size={20} />, title: "One-click proposals", desc: "Turn any keyword research project into a proposal with one click. Keywords, forecasts, and ad group structure flow straight into the proposal builder." },
];

const sampleKeywords = [
  { kw: "ppc agency manchester", vol: "1,200", cpc: "£8.40", comp: "HIGH", trend: [40, 55, 48, 62, 70, 65, 80, 75, 90, 85, 78, 72] },
  { kw: "google ads management", vol: "3,600", cpc: "£12.10", comp: "HIGH", trend: [60, 58, 65, 70, 72, 68, 75, 80, 82, 78, 74, 70] },
  { kw: "paid search services uk", vol: "880", cpc: "£6.90", comp: "MED", trend: [30, 35, 28, 40, 42, 38, 45, 50, 48, 44, 40, 36] },
  { kw: "social media advertising", vol: "5,400", cpc: "£4.20", comp: "MED", trend: [80, 82, 78, 85, 90, 88, 92, 95, 98, 94, 90, 86] },
  { kw: "digital marketing agency", vol: "8,100", cpc: "£9.80", comp: "HIGH", trend: [70, 72, 68, 75, 78, 76, 80, 82, 85, 80, 78, 74] },
];

export default function KeywordPlannerPage() {
  const accent = "#3b82f6";
  const accentLight = "#93c5fd";
  const accentGlow = "rgba(59,130,246,0.6)";

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

  const s1 = useCountUp(12, 1800, statsVisible);
  const s2 = useCountUp(3, 1500, statsVisible);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "mockup", label: "In action" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      <div style={{ position: "fixed", pointerEvents: "none", zIndex: 1, width: 600, height: 600, borderRadius: "50%", left: mouse.x - 300, top: mouse.y - 300, background: `radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)`, transition: "left 0.2s ease-out, top 0.2s ease-out" }} />

      <nav style={{ position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 1, background: "rgba(9,9,15,0.88)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "10px 6px", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} className="side-nav">
        {navLinks.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "block", padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: activeSection === id ? accentLight : "rgba(255,255,255,0.2)", textDecoration: "none", borderLeft: activeSection === id ? `2px solid ${accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s" }}>{label}</a>
        ))}
        <div style={{ width: "100%", height: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 2, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${scrollPct}%`, background: `linear-gradient(180deg, ${accent}, #10b981)`, transition: "height 0.1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </nav>

      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: "rgba(9,9,15,0.88)", borderBottom: "1px solid rgba(255,255,255,0.06)", height: 64, display: "flex", alignItems: "center", padding: "0 40px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/login" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
            <img src="/primary-logo.svg" style={{ height: 26, width: "auto" }} alt="i3MEDIA" />
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>StratOS</span>
          </a>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accentGlow}` }} className="accent-pulse" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>Keyword Planner</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/meridian" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#c4b5fd", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8b5cf6", boxShadow: "0 0 6px rgba(139,92,246,0.6)", display: "inline-block" }} />
            Meridian AI
            <span style={{ fontSize: 8, fontWeight: 800, color: "#a78bfa", background: "rgba(124,58,237,0.2)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Alpha</span>
          </a>
          <a href="/ad-traffic-protection" style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Ad Traffic Protection</a>
          <a href="/login" style={{ padding: "9px 18px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Sign in</a>
          <a href="#cta" onClick={(e) => { e.preventDefault(); document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" }); }} style={{ padding: "9px 20px", borderRadius: 8, background: `linear-gradient(135deg, ${accent}, #2563eb)`, color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: `0 0 20px rgba(59,130,246,0.3)` }} className="cta-accent-pulse">Talk to us →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", paddingTop: 64, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", width: "65%", paddingBottom: "65%", top: "-15%", left: "-15%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.25}px)` }} className="orb-1" />
        <div style={{ position: "absolute", width: "55%", paddingBottom: "55%", bottom: "-15%", right: "-10%", pointerEvents: "none", borderRadius: "50%", background: `radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 65%)`, transform: `translateY(${parallaxY * -0.15}px)` }} className="orb-2" />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.02, backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{ position: "absolute", top: p.top, left: p.left, pointerEvents: "none", width: p.size, height: p.size, borderRadius: "50%", background: p.id % 3 === 0 ? `rgba(59,130,246,0.9)` : p.id % 3 === 1 ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.8)", opacity: p.opacity, animationDuration: p.dur, animationDelay: p.delay }} />
        ))}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 500px", gap: 72, alignItems: "center", width: "100%", position: "relative", boxSizing: "border-box" }} className="hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(59,130,246,0.12)`, border: `1px solid rgba(59,130,246,0.3)` }}>
                <Search size={12} color={accentLight} />
                <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Google Ads API</span>
              </div>
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 28, color: "white" }}>
              <span className="hw hw1">Research that turns</span>
              <br />
              <span className="hw hw2" style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>into revenue.</span>
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, maxWidth: 500, marginBottom: 32, fontWeight: 400 }}>
              Keyword research powered by the Google Ads API. Real volume, CPC, competition data, 12-month trends, and forecast modelling. Then generate a proposal in one click.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "12-month search volume trends",
                "30/60/90-day forecast modelling",
                "Competition levels and bid ranges",
                "One-click proposal generation",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#mockup" onClick={(e) => { e.preventDefault(); document.getElementById("mockup")?.scrollIntoView({ behavior: "smooth" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #2563eb)`, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", boxShadow: `0 0 24px rgba(59,130,246,0.35)` }} className="cta-accent-pulse">
                See it in action <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Keyword table mockup */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: `radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div className="mockup-3d" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: `rgba(59,130,246,0.05)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(59,130,246,0.15)`, border: `1px solid rgba(59,130,246,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Search size={16} color={accentLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Keyword Research</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>ppc agency manchester</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: accentLight }}>5 keywords</div>
              </div>

              <div style={{ padding: "10px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 50px 80px", gap: 6, padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Keyword</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Vol.</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>CPC</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Comp.</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Trend</div>
                </div>
                {sampleKeywords.map((kw, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 50px 80px", gap: 6, alignItems: "center", padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{kw.kw}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>{kw.vol}</div>
                    <div style={{ fontSize: 11, color: accentLight, textAlign: "right", fontWeight: 600 }}>{kw.cpc}</div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: kw.comp === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", border: kw.comp === "HIGH" ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(245,158,11,0.25)", color: kw.comp === "HIGH" ? "#fca5a5" : "#fcd34d" }}>{kw.comp}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "end", gap: 1, justifyContent: "flex-end", height: 16 }}>
                      {kw.trend.map((v, j) => (
                        <div key={j} style={{ width: 4, height: `${(v / 100) * 16}px`, borderRadius: 1, background: `rgba(59,130,246,${0.3 + (v / 100) * 0.5})` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "12px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>5 keywords / 3 ad groups</div>
                <div style={{ padding: "6px 10px", borderRadius: 6, background: `rgba(59,130,246,0.12)`, border: `1px solid rgba(59,130,246,0.25)`, fontSize: 10, fontWeight: 600, color: accentLight }}>Generate Proposal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats-row" className="reveal-section" style={{ padding: "80px 40px", background: `linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(16,185,129,0.03) 100%)`, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="stats-grid">
            {[
              { val: s1, suffix: "-month", label: "Search volume trends shown for every keyword you research", note: "Spot seasonal patterns", color: accent },
              { val: s2, suffix: " forecasts", label: "30, 60, and 90-day projections for clicks, impressions, spend", note: "Real Google Ads data", color: "#10b981" },
              { val: "1-click", suffix: "", label: "Generate a proposal from any keyword research project", note: "Keywords flow into proposals", color: "#f59e0b", isText: true },
            ].map((s, i) => (
              <div key={i} className="stat-card stagger-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden", animationDelay: `${i * 0.1}s` }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ fontSize: 48, fontWeight: 900, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{"isText" in s ? s.val : s.val}{s.suffix}</div>
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
              Real data. Real forecasts.<br />Real campaigns.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Every number comes from the Google Ads API. Volume, CPC, competition, and forecasts are all based on actual auction data, not third-party estimates.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card stagger-in" style={{ padding: "28px 24px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: `${i * 0.08}s`, transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(59,130,246,0.12)`, border: `1px solid rgba(59,130,246,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: accentLight, marginBottom: 16 }}>{f.icon}</div>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }} className="blur-reveal">Forecast modelling</p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 18, color: "white" }} className="blur-reveal">
              See what your budget buys.
            </h2>
          </div>
          <div className="mockup-3d" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(59,130,246,0.15)`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 14 }}>90-Day Forecast</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Impressions", val: "142,000", delta: "+12%" },
                  { label: "Clicks", val: "4,260", delta: "+8%" },
                  { label: "Conversions", val: "128", delta: "+15%" },
                  { label: "Est. Spend", val: "£8,400", delta: "" },
                ].map((m, i) => (
                  <div key={i} style={{ padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{m.val}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{m.label}</div>
                    {m.delta && <div style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 600, marginTop: 4 }}>{m.delta} vs prev 90d</div>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { period: "30-day", clicks: "1,420", spend: "£2,800" },
                { period: "60-day", clicks: "2,840", spend: "£5,600" },
                { period: "90-day", clicks: "4,260", spend: "£8,400" },
              ].map((p, i) => (
                <div key={i} style={{ padding: "12px", borderRadius: 8, background: i === 2 ? `rgba(59,130,246,0.08)` : "rgba(255,255,255,0.02)", border: i === 2 ? `1px solid rgba(59,130,246,0.2)` : "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: i === 2 ? accentLight : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{p.period}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{p.clicks} clicks</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{p.spend} est. spend</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="reveal-section" style={{ padding: "120px 40px 140px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "80%", paddingBottom: "40%", bottom: "-20%", left: "50%", transform: "translateX(-50%)", background: `radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `rgba(59,130,246,0.12)`, border: `1px solid rgba(59,130,246,0.25)`, marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accentGlow}` }} className="accent-pulse" />
            <span style={{ fontSize: 12, fontWeight: 700, color: accentLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Included with StratOS</span>
          </div>
          <h2 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 20, color: "white", lineHeight: 1.05 }} className="blur-reveal">
            Stop researching in spreadsheets.<br />
            <span style={{ background: `linear-gradient(90deg, ${accentLight}, ${accent}, #10b981)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Start closing deals.</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 40 }}>
            Research, forecast, propose. All in one tool, all backed by real Google Ads data. No exports, no reformatting, no wasted time.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px", borderRadius: 12, background: `linear-gradient(135deg, ${accent}, #2563eb)`, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: `0 0 32px rgba(59,130,246,0.4)` }} className="cta-accent-pulse">
              <Lock size={16} /> Sign in to your dashboard
            </a>
            <a href="mailto:hello@i3media.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Talk to us</a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Google Ads API integration included. Keyword Planner is part of every StratOS plan.</p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 18, opacity: 0.4 }} alt="i3MEDIA" />
          <span>&copy; {new Date().getFullYear()} i3 Media. Keyword Planner is part of StratOS.</span>
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
        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(59,130,246,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(59,130,246,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }
        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.4); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.75), 0 0 80px rgba(59,130,246,0.15); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }
        .feature-card:hover { transform: translateY(-6px) scale(1.015) !important; border-color: rgba(59,130,246,0.2) !important; box-shadow: 0 16px 48px rgba(59,130,246,0.12); }
        .stat-card:hover { transform: translateY(-6px) scale(1.025) !important; border-color: rgba(59,130,246,0.2) !important; box-shadow: 0 16px 48px rgba(59,130,246,0.12); }
        @keyframes card-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 4px 32px rgba(59,130,246,0.08), 0 0 0 1px rgba(59,130,246,0.1); } 50% { box-shadow: 0 8px 48px rgba(59,130,246,0.22), 0 0 0 1px rgba(59,130,246,0.2); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 92% { opacity: 0.5; } 100% { transform: translateY(600px); opacity: 0; } }
        .mockup-3d { animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.6) 40%, rgba(59,130,246,0.8) 50%, rgba(59,130,246,0.6) 60%, transparent 100%); animation: scan-line 8s ease-in-out infinite; pointer-events: none; }
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

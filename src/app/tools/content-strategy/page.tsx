"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Download,
  Share2,
  Trash2,
  Eye,
  Lock,
  Copy,
  Check,
  ExternalLink,
  X,
  Calendar,
  Users,
  Plus,
  Zap,
  Globe,
  Search,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

interface ContentStrategyItem {
  id: string;
  title: string;
  period: string;
  clientId: string;
  createdBy: string | null;
  shareToken: string | null;
  viewCount: number;
  createdAt: string;
  generationMs: number | null;
  client: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  semrushDomain?: string | null;
  searchConsoleSiteUrl?: string | null;
  contentStrategyLimits?: string | null;
}

type GenerationMode = "semrush" | "upload";

interface DetectedCompetitor {
  domain: string;
  commonKeywords: number;
  manual?: boolean;
}

// ─── Fun mode chaos ──────────────────────────────────────────────────────────

const CHAOS_EMOJIS = [
  "😺","😹","🐈","😻","🙀","😾","🐈‍⬛","🐾","✨","🌟",
  "💕","💖","💗","💞","💓","💘","🥰","😍","😘","💋",
  "💅","🦩","🎈","🎉","🎆","🎇","🐶","🐟","🍓","🥩",
  "🐔","🐣","🦆","🐢","🫶","👋","💀","👀","💫","🌈",
  "🔥","💥","⚡","🌸","🍑","🍆","🦄","🐸","🤌","👁️",
  "🫀","🧠","🫦","💩","👾","🤖","🎪","🎠","🪄","🎭",
];

interface Particle {
  id: number;
  emoji: string;
  x: number;      // vw units
  y: number;      // vh units
  size: number;
  rotation: number;
  initialRotation: number;
  rotationSpeed: number; // degrees/s
  vx: number;     // vw/s
  vy: number;     // vh/s
  wobble: number; // sine wave amplitude in vw
  wobbleSpeed: number;
  scale: number;
  scaleDelta: number;
  opacity: number;
  born: number;
  lifespan: number; // seconds
}

function ChaosOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState(false);
  const nextId = useRef(0);

  useEffect(() => {
    if (!active) {
      // Clean up particles when deactivated
      const t = setTimeout(() => setParticles([]), 0);
      return () => clearTimeout(t);
    }

    const spawnBurst = () => {
      // Flash the screen on each burst
      setFlash(true);
      setTimeout(() => setFlash(false), 120);

      const count = 12 + Math.floor(Math.random() * 10);

      const newParticles: Particle[] = Array.from({ length: count }, () => {
        // Spawn from random edges or center of screen
        const edge = Math.floor(Math.random() * 5);
        let x: number, y: number, vx: number, vy: number;
        if (edge === 0) { x = Math.random() * 100; y = 105; vx = (Math.random() - 0.5) * 8; vy = -(10 + Math.random() * 15); } // bottom
        else if (edge === 1) { x = -5; y = Math.random() * 100; vx = 6 + Math.random() * 8; vy = (Math.random() - 0.5) * 8; } // left
        else if (edge === 2) { x = 105; y = Math.random() * 100; vx = -(6 + Math.random() * 8); vy = (Math.random() - 0.5) * 8; } // right
        else if (edge === 3) { x = Math.random() * 100; y = -5; vx = (Math.random() - 0.5) * 8; vy = 6 + Math.random() * 10; } // top
        else { x = 30 + Math.random() * 40; y = 30 + Math.random() * 40; vx = (Math.random() - 0.5) * 16; vy = (Math.random() - 0.5) * 16; } // center explosion

        return {
          id: nextId.current++,
          emoji: CHAOS_EMOJIS[Math.floor(Math.random() * CHAOS_EMOJIS.length)],
          x, y,
          size: 14 + Math.floor(Math.random() * 16),
          rotation: Math.random() * 360,
          initialRotation: Math.random() * 360,
          rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 40),
          vx, vy,
          wobble: 3 + Math.random() * 8,
          wobbleSpeed: 2 + Math.random() * 5,
          scale: 0.5 + Math.random() * 1.5,
          scaleDelta: (Math.random() - 0.5) * 0.8,
          opacity: 1,
          born: Date.now(),
          lifespan: 2.5 + Math.random() * 2,
        };
      });

      setParticles((prev) => [...prev.slice(-150), ...newParticles]);
    };

    spawnBurst();
    const spawnInterval = setInterval(spawnBurst, 900);

    let raf: number;
    const animate = () => {
      const now = Date.now();
      setParticles((prev) =>
        prev
          .map((p) => {
            const age = (now - p.born) / 1000;
            const t = age;
            // Gravity effect on vy
            const vyWithGravity = p.vy + 3 * t;
            return {
              ...p,
              x: p.x + p.vx * t + Math.sin(t * p.wobbleSpeed * Math.PI * 2) * p.wobble,
              y: p.y + vyWithGravity * t * 0.5,
              rotation: p.initialRotation + t * p.rotationSpeed,
              scale: Math.max(0.1, p.scale + p.scaleDelta * Math.sin(t * 3)),
              opacity: Math.max(0, 1 - (age / p.lifespan) ** 1.5),
            };
          })
          .filter((p) => p.opacity > 0.01)
      );
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => { clearInterval(spawnInterval); cancelAnimationFrame(raf); };
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Full-screen flash on burst */}
      {flash && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none",
          background: "linear-gradient(135deg, rgba(249,168,212,0.25), rgba(167,139,250,0.2), rgba(253,224,71,0.2))",
        }} />
      )}
      {/* Full-viewport particle layer — breaks OUT of the container */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "visible",
      }}>
        {particles.map((p) => (
          <span key={p.id} style={{
            position: "absolute",
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            fontSize: p.size,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            userSelect: "none",
            lineHeight: 1,
            willChange: "transform, opacity",
            filter: p.size > 36 ? "drop-shadow(0 0 8px rgba(249,168,212,0.8))" : "none",
          }}>{p.emoji}</span>
        ))}
      </div>
    </>
  );
}

// ─── Fun progress messages ─────────────────────────────────────────────────

const FUN_MESSAGES = [
  "OMG OMG OMG claude-senpai noticed the brief (⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄",
  "KYAAAAAAA~!! fetching keyword data from SEMrush-chan, sugoi desu ne!!!",
  "h-hewwo?? asking google search console-kun for his wittle receipts uwu",
  "r-reading the brief vewy vewy cawefuwwy (눈_눈) p-pwease be good data…",
  "*notices ur search intent* OwO what's this??",
  "sifting thwough 500 keywords with the POWER OF FWIENDSHIP AND WUUUV~",
  "NANI?! claude-chan is having twoubles with the content cwusters (╯°□°）╯︵ ┻━┻",
  "baka baka BAKA!! 'family' is NOT a search quewy and i will die on this hill",
  "t-teaching the AI what a wong-tail keyword is… it's not listening (┳Д┳)",
  "doing SEO maths with the power of kawaii and also suffering (っ◞‸◟c)",
  "*slams paws on desk* NO SINGLE WORD PRIMARIES. NEVER. NOT TODAY SATAN.",
  "depwoying the content ewves!! ＼(≧▽≦)／ hewp them they're so smol",
  "pweeeease don't say 'digitaw wandscape' i am BEGGING you cwaudie-sama",
  "gwouping keywords into cwusters with MAXIMUM preciousness ✧｡٩(ˊᗜˋ*)و✧",
  "cwaudie-sama is having hewr monthly existentiaw cwisis, pwease understand (｡ŏ_ŏ)",
  "making ABSOWUTEWY sure nothing gets hawwucinated or i will WAWL (╥_╥)",
  "extracting signaw fwom the noise like a mágicaw giww extracts JUSTICE and TWUTH",
  "scanning the sitemap so we don't suggest pages that AWREADY EXIST omg i'm SHAKING",
  "anawysing keyword intent with my ENTIWE HEAWT (♡˙︶˙♡) every query matters to me",
  "bwibing the awgowithm with virtuaw pocky and my wast shred of digitaw dignity~",
  "teaching cwaudie-chan about the weader jouwney uwu she's wearning so fast (｡◕‿◕｡)",
  "pwease give me good data or i will witerawwy CWY into the search vowumes (っ˘̩╭╮˘̩)っ",
  "bwock by bwock, cwuster by cwuster, buiwding ur content woadmap with wuv ✨",
  "checking SEMrush-chan hasn't fawwen asweep at hewr wittle desk again… (ᵕ̣̣̣̣̣̣﹏ᵕ̣̣̣̣̣̣)",
  "ASSEMBWING THE FINAL STWATEGY DOCUMENT~ AWMOST THERE I PWOMISE~!! ✧*｡٩(ˊᗜˋ*)و*｡✧",
];

function useFunProgress(active: boolean): string {
  const [msg, setMsg] = useState(FUN_MESSAGES[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    // Pick a new random message every 3.5s, never repeat until all shown
    const shuffled = [...FUN_MESSAGES].sort(() => Math.random() - 0.5);
    indexRef.current = 0;

    // Defer first message to avoid synchronous setState inside effect body
    const first = setTimeout(() => setMsg(shuffled[0]), 0);

    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % shuffled.length;
      setMsg(shuffled[indexRef.current]);
    }, 3500);

    return () => { clearTimeout(first); clearInterval(id); };
  }, [active]);

  return msg;
}

function useGenerationTimer(active: boolean): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setElapsed(0), 0);
      return () => clearTimeout(t);
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return "";
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Methodology Accordion ─────────────────────────────────────────────────

const METHODOLOGY_STEPS = [
  {
    icon: "🔍",
    label: "Domain & Competitor Discovery",
    detail:
      "We fetch your domain's top 500 organic keywords and monthly traffic from SEMrush, then auto-detect your top 5 competitors by keyword overlap — or you can provide a custom list. A live sitemap crawl maps every existing page on the site so we never suggest content that already exists.",
  },
  {
    icon: "📊",
    label: "Real Click & Impression Data (GSC)",
    detail:
      "When Google Search Console is connected, we pull 90 days of actual click, impression, CTR, and average position data for up to 1,000 query–page combinations. GSC data is layered on top of SEMrush to show what's already driving real traffic — not just estimated volume.",
  },
  {
    icon: "📝",
    label: "Brief Topic Research",
    detail:
      "If you include a client brief, we extract topic seeds (e.g. \u201cqurbani\u201d, \u201cramadan campaign\u201d) and run SEMrush phrase-match queries against each seed — returning real keyword volumes and difficulty scores for terms that may not appear in current rankings. All discovered keywords are added to the verified keyword pool.",
  },
  {
    icon: "🧠",
    label: "Claude Semantic Expansion",
    detail:
      "Claude analyses the brief and your existing organic keyword sample to find synonyms, alternate spellings, and semantically related angles that SEMrush alone would miss — for example identifying \u201cudhiyah\u201d, \u201cudhiya\u201d, and \u201canimal sacrifice donation\u201d from the seed \u201cqurbani\u201d. Each expanded seed is then sent to SEMrush for real volume data, so every term in the final pool is verified. Results are cached to avoid repeated API calls.",
  },
  {
    icon: "🏆",
    label: "Content Gap Analysis",
    detail:
      "We compare your keyword footprint against each competitor's using SEMrush's content gap report to find high-value terms they rank for that you don't. These become the primary candidates for new landing pages and blog posts.",
  },
  {
    icon: "🔑",
    label: "Verified Keyword Pool",
    detail:
      "All organic keywords, GSC queries, content gap terms, brief-researched keywords, and Claude-expanded keywords are merged into a single deduplicated pool with real volumes. The AI is strictly prohibited from using any keyword not in this pool — no invented volumes, no hallucinated terms. Keywords are split into a phrase pool (valid as primary targets) and a single-word pool (contextual only).",
  },
  {
    icon: "💡",
    label: "Low-Competition Quick Win Detection",
    detail:
      "Keywords with a difficulty score of 30 or below and meaningful search volume are surfaced as a dedicated quick-win set within the prompt. The AI is instructed to prioritise these for early-month content — maximising short-term ranking wins while longer-term pillar pages are built out.",
  },
  {
    icon: "🤖",
    label: "Claude AI Strategy Generation",
    detail:
      "Claude Opus generates the full strategy: page optimisations for pages stuck in positions 4–30, new landing pages for commercial intent gaps, blog posts grouped into topical clusters (covering the full reader journey from unaware to converted), and link-building targets — each scored 1–5 for impact and effort. Pillar and mega-guide pages are assigned 5–8 keywords with mandatory H2 section and FAQ outlines.",
  },
  {
    icon: "🏷️",
    label: "Keyword Labelling & Meta Audit",
    detail:
      "Each suggested page receives primary, secondary, and long-tail keyword assignments pulled verbatim from the verified pool. For existing pages, we crawl the live URL to audit the current <title> tag — checking for presence, length, and whether it includes the target keyword. Semantic synonyms flagged during expansion are noted in item copy guidance for writers.",
  },
  {
    icon: "🗺️",
    label: "Prioritised Three-Phase Roadmap",
    detail:
      "Items are distributed across a three-phase roadmap: Month 1 (high-impact, low-effort quick wins using low-KD keywords), Months 2–3 (core new pages and content cluster build-out), and Months 4+ (pillar content, competitive gap pages, link outreach). The finished strategy is exported as a fully self-contained, branded HTML document with a shareable link.",
  },
  {
    icon: "⚙️",
    label: "Per-Client Output Controls",
    detail:
      "Each client's strategy can be capped by content type — page optimisations, landing pages, blog posts, and link targets — so output stays scoped to what the team can actually execute within the retainer. Limits are saved per client and pre-filled on every subsequent generation. Generation time is logged alongside the strategy so you can track how long each run takes.",
  },
];


function MethodologyAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        marginTop: 20,
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          How does this work? — Methodology
        </span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            color: "var(--text-3)",
            flexShrink: 0,
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "20px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {METHODOLOGY_STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                paddingBottom: i < METHODOLOGY_STEPS.length - 1 ? 20 : 0,
                marginBottom: i < METHODOLOGY_STEPS.length - 1 ? 20 : 0,
                borderBottom: i < METHODOLOGY_STEPS.length - 1 ? "1px solid var(--border-subtle, var(--border))" : "none",
              }}
            >
              {/* Step number + connector */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--accent-bg, color-mix(in srgb, var(--accent) 12%, transparent))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>
                {i < METHODOLOGY_STEPS.length - 1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 16, background: "var(--border)", marginTop: 6 }} />
                )}
              </div>
              {/* Content */}
              <div style={{ paddingTop: 4 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {i + 1}. {step.label}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.6 }}>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContentStrategyPage() {
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const [strategies, setStrategies] = useState<ContentStrategyItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState(
    new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  );
  const [dragOver, setDragOver] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewStrategyId, setPreviewStrategyId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Share state
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Mode toggle
  const [mode, setMode] = useState<GenerationMode>("semrush");

  // Inline new-client (SEMrush mode)
  const [creatingClientSemrush, setCreatingClientSemrush] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientDomain, setNewClientDomain] = useState("");
  const [newClientCreating, setNewClientCreating] = useState(false);

  // Inline add-SEMrush-to-existing-client
  const [addingSemrushToClient, setAddingSemrushToClient] = useState(false);
  const [addSemrushDomain, setAddSemrushDomain] = useState("");
  const [addSemrushSaving, setAddSemrushSaving] = useState(false);

  // SEMrush generation state
  const [semrushBrief, setSemrushBrief] = useState("");
  const [semrushDatabase, setSemrushDatabase] = useState("uk");
  const [aiModel, setAiModel] = useState<"gpt-5.4" | "claude-opus-4-6">("claude-opus-4-6");
  // Per-client output limits (empty string = no limit)
  const [limitPageOpts, setLimitPageOpts] = useState("");
  const [limitLandingPages, setLimitLandingPages] = useState("");
  const [limitBlogPosts, setLimitBlogPosts] = useState("");
  const [limitLinkTargets, setLimitLinkTargets] = useState("");
  const [detectedCompetitors, setDetectedCompetitors] = useState<DetectedCompetitor[]>([]);
  const [detectingCompetitors, setDetectingCompetitors] = useState(false);
  const [customCompetitorInput, setCustomCompetitorInput] = useState("");
  const [semrushProgress, setSemrushProgress] = useState("");
  const [semrushDomain, setSemrushDomain] = useState("");
  const [funMode, setFunMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("cs-fun-mode");
    return stored === null ? true : stored === "1";
  });
  const toggleFunMode = () => setFunMode((v) => {
    const next = !v;
    localStorage.setItem("cs-fun-mode", next ? "1" : "0");
    return next;
  });
  const funMessage = useFunProgress(generating);
  const elapsedTime = useGenerationTimer(generating);

  const loadStrategies = useCallback(async () => {
    try {
      const url = urlClientId
        ? `/api/tools/content-strategy?action=list&clientId=${urlClientId}`
        : "/api/tools/content-strategy?action=list";
      const res = await fetch(url);
      const data = await res.json();
      if (data.strategies) setStrategies(data.strategies);
    } catch {
      console.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, [urlClientId]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      // API returns flat array, not { clients: [...] }
      if (Array.isArray(data)) setClients(data);
      else if (data.clients) setClients(data.clients);
    } catch {
      console.error("Failed to load clients");
    }
  }, []);

  useEffect(() => {
    loadStrategies();
    loadClients();
  }, [loadStrategies, loadClients]);

  // postMessage bridge: handles save and regen requests from the strategy HTML iframe
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (!event.data?.type?.startsWith("cs:")) return;

      if (event.data.type === "cs:save") {
        const { html, strategyId } = event.data as { html: string; strategyId: string };
        try {
          const res = await fetch("/api/tools/content-strategy", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: strategyId, generatedHtml: html }),
          });
          const result = await res.json();
          const success = !result.error;
          iframeRef.current?.contentWindow?.postMessage({ type: "cs:save:result", success }, "*");
          if (success) setPreviewHtml(html);
        } catch {
          iframeRef.current?.contentWindow?.postMessage({ type: "cs:save:result", success: false }, "*");
        }
      }

      if (event.data.type === "cs:regen") {
        const { idx, data, strategyId } = event.data as { idx: string; data: Record<string, unknown>; strategyId: string };
        try {
          const res = await fetch("/api/ai/content-strategy-regen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategyId,
              itemType: data.type,
              title: data.title,
              url: data.url,
              keywords: data.keywords,
              currentNotes: data.notes,
              cluster: data.cluster,
            }),
          });
          const result = await res.json();
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:regen:result",
            idx,
            notes: result.notes ?? "",
            error: result.error,
          }, "*");
        } catch {
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:regen:result",
            idx,
            notes: "",
            error: "Network error",
          }, "*");
        }
      }

      if (event.data.type === "cs:add") {
        const { sectionType, strategyId, existing, btnId } = event.data as { sectionType: string; strategyId: string; existing: string[]; btnId: string };
        try {
          const res = await fetch("/api/ai/content-strategy-regen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategyId,
              action: "add",
              itemType: sectionType,
              existing,
            }),
          });
          const result = await res.json();
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:add:result",
            sectionType,
            btnId,
            title: result.title ?? "",
            notes: result.notes ?? "",
            keywords: result.keywords ?? [],
            error: result.error,
          }, "*");
        } catch {
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:add:result",
            sectionType,
            btnId,
            title: "",
            notes: "",
            keywords: [],
            error: "Network error",
          }, "*");
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a spreadsheet file");
      return;
    }
    if (!clientName.trim()) {
      setError("Please enter a client name");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientName", clientName);
      formData.append("period", period);
      if (clientId) formData.append("clientId", clientId);

      const res = await fetch("/api/tools/content-strategy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(
          `Content strategy generated! ${data.stats.totalPageOptimisations} page optimisations, ${data.stats.totalLandingPages} landing pages, ${data.stats.totalBlogPosts} blog posts, ${data.stats.totalLinkTargets} link targets.`
        );
        setFile(null);
        loadStrategies();
      }
    } catch {
      setError("Failed to generate content strategy");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreview(id: string) {
    try {
      const res = await fetch(`/api/tools/content-strategy?action=get&id=${id}`);
      const data = await res.json();
      if (data.strategy) {
        setPreviewHtml(data.strategy.generatedHtml);
        setPreviewTitle(data.strategy.title);
        setPreviewStrategyId(id);
      }
    } catch {
      setError("Failed to load preview");
    }
  }

  async function handleDownload(id: string, title: string) {
    try {
      const res = await fetch(`/api/tools/content-strategy?action=get&id=${id}`);
      const data = await res.json();
      if (data.strategy) {
        const blob = new Blob([data.strategy.generatedHtml], {
          type: "text/html",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Failed to download");
    }
  }

  async function handleShare(id: string) {
    try {
      const res = await fetch(
        `/api/tools/content-strategy?action=share&id=${id}`
      );
      const data = await res.json();
      if (data.shareToken) {
        setSharingId(id);
        setShareToken(data.shareToken);
        setSharePassword("");
      }
    } catch {
      setError("Failed to create share link");
    }
  }

  async function handleSetPassword() {
    if (!sharingId) return;
    try {
      await fetch("/api/tools/content-strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sharingId, sharePassword: sharePassword || null }),
      });
      setSuccess(sharePassword ? "Password set" : "Password removed");
    } catch {
      setError("Failed to set password");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this content strategy?"))
      return;
    try {
      await fetch(`/api/tools/content-strategy?id=${id}`, {
        method: "DELETE",
      });
      loadStrategies();
    } catch {
      setError("Failed to delete");
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/content-strategy/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    const supportedExts = [".xlsx", ".xls", ".csv", ".docx", ".txt"];
    const ext = droppedFile ? "." + (droppedFile.name.split(".").pop()?.toLowerCase() || "") : "";
    if (droppedFile && supportedExts.includes(ext)) {
      setFile(droppedFile);
    } else {
      setError("Please drop a supported file (.xlsx, .xls, .csv, .docx, or .txt)");
    }
  }

  // ── SEMrush helpers ─────────────────────────────────────────────────────

  async function handleAddSemrushToClient() {
    const rawDomain = addSemrushDomain.trim();
    if (!rawDomain || !clientId) return;
    const domain = rawDomain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
    const currentClient = clients.find((c) => c.id === clientId);
    if (!currentClient) return;

    setAddSemrushSaving(true);
    setError("");
    try {
      // 1. Create SEMrush project
      const projRes = await fetch("/api/semrush/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: currentClient.name, domain }),
      });
      const projData = await projRes.json();
      if (projData.error) {
        setError(`SEMrush project error: ${projData.error}`);
        return;
      }

      // 2. Update existing client
      const patchRes = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semrushDomain: projData.domain ?? domain,
          semrushProjectId: projData.projectId ?? null,
        }),
      });
      const patchData = await patchRes.json();
      if (patchData.error) {
        setError(`Failed to update client: ${patchData.error}`);
        return;
      }

      // 3. Update local clients list
      const updatedDomain = projData.domain ?? domain;
      setClients((prev) =>
        prev.map((c) => c.id === clientId ? { ...c, semrushDomain: updatedDomain } : c)
      );
      setSemrushDomain(updatedDomain);
      setAddingSemrushToClient(false);
      setAddSemrushDomain("");
      setSuccess(`SEMrush project created and linked to "${currentClient.name}"`);

      // 4. Kick off competitor detection
      await handleDetectCompetitors(clientId, updatedDomain);
    } catch {
      setError("Failed to create SEMrush project");
    } finally {
      setAddSemrushSaving(false);
    }
  }

  async function handleCreateClientForSemrush() {
    const name = newClientName.trim();
    const rawDomain = newClientDomain.trim();
    if (!name || !rawDomain) return;
    const domain = rawDomain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");

    setNewClientCreating(true);
    setError("");
    try {
      // 1. Create SEMrush project
      const projRes = await fetch("/api/semrush/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: name, domain }),
      });
      const projData = await projRes.json();
      if (projData.error) {
        setError(`SEMrush project error: ${projData.error}`);
        return;
      }

      // 2. Create client with the domain + project ID
      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          website: `https://${domain}`,
          semrushDomain: projData.domain ?? domain,
          semrushProjectId: projData.projectId ?? null,
        }),
      });
      const newClient = await clientRes.json();
      if (newClient.error) {
        setError(`Client creation error: ${newClient.error}`);
        return;
      }

      // 3. Update state and auto-select
      const clientForState: Client = {
        id: newClient.id,
        name: newClient.name,
        semrushDomain: newClient.semrushDomain,
        searchConsoleSiteUrl: newClient.searchConsoleSiteUrl,
      };
      setClients((prev) => [...prev, clientForState].sort((a, b) => a.name.localeCompare(b.name)));
      setClientId(newClient.id);
      setClientName(newClient.name);
      setSemrushDomain(projData.domain ?? domain);
      setCreatingClientSemrush(false);
      setNewClientName("");
      setNewClientDomain("");
      setSuccess(`Client "${newClient.name}" created with SEMrush project`);

      // 4. Kick off competitor detection
      await handleDetectCompetitors(newClient.id, projData.domain ?? domain);
    } catch {
      setError("Failed to create client and SEMrush project");
    } finally {
      setNewClientCreating(false);
    }
  }

  async function handleDetectCompetitors(selectedClientId: string, domainOverride?: string) {
    const domain = domainOverride ?? clients.find((c) => c.id === selectedClientId)?.semrushDomain;
    if (!domain) {
      setDetectedCompetitors([]);
      return;
    }
    setSemrushDomain(domain);
    setDetectingCompetitors(true);
    try {
      const res = await fetch("/api/tools/content-strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          action: "detect-competitors",
          database: semrushDatabase,
        }),
      });
      const data = await res.json();
      if (data.competitors) {
        setDetectedCompetitors(data.competitors);
      }
    } catch {
      console.error("Failed to detect competitors");
    } finally {
      setDetectingCompetitors(false);
    }
  }

  function removeCompetitor(domain: string) {
    setDetectedCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  function addCustomCompetitor() {
    const raw = customCompetitorInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (!raw) return;
    if (detectedCompetitors.some((c) => c.domain === raw)) {
      setCustomCompetitorInput("");
      return;
    }
    setDetectedCompetitors((prev) => [...prev, { domain: raw, commonKeywords: 0, manual: true }]);
    setCustomCompetitorInput("");
  }

  async function handleSemrushGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client");
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client?.semrushDomain) {
      setError("This client has no SEMrush domain configured. Set it in client settings first.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");
    setSemrushProgress("Collecting SEMrush data and analysing keywords…");

    try {
      // Step 1: Generate strategy data from SEMrush
      const genRes = await fetch("/api/tools/content-strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          brief: semrushBrief,
          period,
          database: semrushDatabase,
          competitors: detectedCompetitors.map((c) => c.domain),
          model: aiModel,
          limits: {
            ...(limitPageOpts ? { pageOptimisations: parseInt(limitPageOpts, 10) } : {}),
            ...(limitLandingPages ? { landingPages: parseInt(limitLandingPages, 10) } : {}),
            ...(limitBlogPosts ? { blogPosts: parseInt(limitBlogPosts, 10) } : {}),
            ...(limitLinkTargets ? { linkTargets: parseInt(limitLinkTargets, 10) } : {}),
          },
        }),
      });

      const genData = await genRes.json();
      if (genData.error) {
        setError(genData.error);
        return;
      }

      setSemrushProgress("Building content strategy document…");

      // Step 2: Save the strategy (generates HTML via the main route)
      const saveRes = await fetch("/api/tools/content-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetData: genData.strategyData,
          clientName: genData.clientName,
          period,
          clientId,
          generationMs: genData.generationMs ?? null,
        }),
      });

      const saveData = await saveRes.json();
      if (saveData.error) {
        setError(saveData.error);
        return;
      }

      setSuccess(
        `Content strategy generated from SEMrush! ${saveData.stats.totalPageOptimisations} page optimisations, ${saveData.stats.totalLandingPages} landing pages, ${saveData.stats.totalBlogPosts} blog posts, ${saveData.stats.totalLinkTargets} link targets.`
      );
      setSemrushBrief("");
      loadStrategies();
    } catch {
      setError("Failed to generate content strategy");
    } finally {
      setGenerating(false);
      setSemrushProgress("");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>
      <ClientBackLink />
      <ClientFilterBanner />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Content Strategy Creator</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Generate a polished, shareable content strategy document from SEMrush data or a keyword spreadsheet.</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", color: "var(--danger-text)", fontSize: 13 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--danger-text)" }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}
      {success && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r)", color: "var(--success-text)", fontSize: 13 }}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--success-text)" }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      {/* Generate Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="card-title">Generate New Strategy</h2>
            <p className="card-subtitle">
              {mode === "semrush"
                ? "Automatically generate a content strategy from SEMrush data"
                : "Upload an Excel keyword research spreadsheet to create a client-ready document"}
            </p>
          </div>
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--r)", padding: 3, gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMode("semrush")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: mode === "semrush" ? 600 : 400,
                background: mode === "semrush" ? "var(--surface)" : "transparent",
                color: mode === "semrush" ? "var(--accent)" : "var(--text-3)",
                boxShadow: mode === "semrush" ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Zap style={{ width: 14, height: 14 }} /> SEMrush
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: mode === "upload" ? 600 : 400,
                background: mode === "upload" ? "var(--surface)" : "transparent",
                color: mode === "upload" ? "var(--accent)" : "var(--text-3)",
                boxShadow: mode === "upload" ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Upload style={{ width: 14, height: 14 }} /> Upload
            </button>
          </div>
        </div>
        <div className="card-body">

          {/* ─── SEMrush Mode ─── */}
          {mode === "semrush" && (
            <form onSubmit={handleSemrushGenerate}>
              {/* Client selector + Domain display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="form-label">Client <span style={{ color: "var(--danger)" }}>*</span></label>
                  {creatingClientSemrush ? (
                    <div style={{
                      padding: "14px 16px", borderRadius: "var(--r-sm)",
                      border: "1px solid var(--accent-border, #c4b5fd)",
                      background: "var(--accent-bg)", display: "flex",
                      flexDirection: "column", gap: 10,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", margin: 0 }}>
                        New client + SEMrush project
                      </p>
                      <input
                        type="text"
                        className="form-input"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Client name"
                        autoFocus
                        style={{ marginBottom: 0 }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={newClientDomain}
                        onChange={(e) => setNewClientDomain(e.target.value)}
                        placeholder="Domain (e.g. example.com)"
                        style={{ marginBottom: 0 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          disabled={!newClientName.trim() || !newClientDomain.trim() || newClientCreating}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                          onClick={handleCreateClientForSemrush}
                        >
                          {newClientCreating ? (
                            <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Creating…</>
                          ) : (
                            <><Plus style={{ width: 13, height: 13 }} /> Create &amp; use</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setCreatingClientSemrush(false); setNewClientName(""); setNewClientDomain(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        className="form-input"
                        value={clientId}
                        style={{ flex: 1 }}
                        onChange={(e) => {
                          const selectedClient = clients.find((c) => c.id === e.target.value);
                          setClientId(e.target.value);
                          if (selectedClient) {
                            setClientName(selectedClient.name);
                            setAddingSemrushToClient(false);
                            setAddSemrushDomain("");
                            // Load saved content strategy limits
                            try {
                              const l = selectedClient.contentStrategyLimits
                                ? JSON.parse(selectedClient.contentStrategyLimits)
                                : {};
                              setLimitPageOpts(l.pageOptimisations ? String(l.pageOptimisations) : "");
                              setLimitLandingPages(l.landingPages ? String(l.landingPages) : "");
                              setLimitBlogPosts(l.blogPosts ? String(l.blogPosts) : "");
                              setLimitLinkTargets(l.linkTargets ? String(l.linkTargets) : "");
                            } catch { /* ignore parse errors */ }
                            if (selectedClient.semrushDomain) {
                              handleDetectCompetitors(e.target.value);
                            } else {
                              setDetectedCompetitors([]);
                              setSemrushDomain("");
                            }
                          } else {
                            setClientName("");
                            setDetectedCompetitors([]);
                            setSemrushDomain("");
                          }
                        }}
                      >
                        <option value="">Select client…</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.semrushDomain ? "" : " (no SEMrush domain)"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0, height: 42 }}
                        title="Create a new client and SEMrush project"
                        onClick={() => setCreatingClientSemrush(true)}
                      >
                        <Plus style={{ width: 14, height: 14 }} /> New
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Domain</label>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    fontSize: 13, color: semrushDomain ? "var(--text)" : "var(--text-4)",
                    minHeight: 42,
                  }}>
                    <Globe style={{ width: 14, height: 14, color: "var(--text-4)", flexShrink: 0 }} />
                    {semrushDomain || "Auto-filled from client settings"}
                    {clientId && clients.find((c) => c.id === clientId)?.searchConsoleSiteUrl && (
                      <span style={{
                        marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "var(--success)", fontWeight: 500,
                        padding: "2px 8px", borderRadius: 999, background: "var(--success-bg)",
                      }}>
                        GSC connected — fewer SEMrush units
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* No domain warning — with inline setup option */}
              {clientId && !semrushDomain && !creatingClientSemrush && (
                <div style={{ marginBottom: 16 }}>
                  {addingSemrushToClient ? (
                    <div style={{
                      padding: "14px 16px", borderRadius: "var(--r-sm)",
                      border: "1px solid var(--accent-border, #c4b5fd)",
                      background: "var(--accent-bg)", display: "flex",
                      flexDirection: "column", gap: 10,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", margin: 0 }}>
                        Create SEMrush project for {clients.find((c) => c.id === clientId)?.name}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          className="form-input"
                          value={addSemrushDomain}
                          onChange={(e) => setAddSemrushDomain(e.target.value)}
                          placeholder="Domain (e.g. example.com)"
                          autoFocus
                          style={{ flex: 1, marginBottom: 0 }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSemrushToClient(); } }}
                        />
                        <button
                          type="button"
                          disabled={!addSemrushDomain.trim() || addSemrushSaving}
                          className="btn btn-primary btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={handleAddSemrushToClient}
                        >
                          {addSemrushSaving ? (
                            <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Saving…</>
                          ) : (
                            <>Create &amp; link</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => { setAddingSemrushToClient(false); setAddSemrushDomain(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      background: "var(--warning-bg, #fffbeb)", border: "1px solid var(--warning-border, #fde68a)",
                      borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--warning-text, #92400e)",
                    }}>
                      <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>This client has no SEMrush domain configured.</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => setAddingSemrushToClient(true)}
                      >
                        <Plus style={{ width: 13, height: 13 }} /> Set up SEMrush
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Competitors */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Search style={{ width: 12, height: 12 }} />
                  Competitors
                  {detectingCompetitors && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite", color: "var(--accent)" }} />}
                </label>
                {detectedCompetitors.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {detectedCompetitors.map((c) => (
                      <div
                        key={c.domain}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 10px 6px 12px", borderRadius: 999,
                          background: c.manual ? "var(--bg)" : "var(--accent-bg)",
                          border: `1px solid ${c.manual ? "var(--border)" : "var(--accent-border, #c4b5fd)"}`,
                          fontSize: 13,
                          color: c.manual ? "var(--text-2)" : "var(--accent)",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{c.domain}</span>
                        {c.manual
                          ? <span style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>manual</span>
                          : <span style={{ fontSize: 11, color: "var(--text-3)" }}>({c.commonKeywords.toLocaleString()} common)</span>
                        }
                        <button
                          type="button"
                          onClick={() => removeCompetitor(c.domain)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-4)", display: "flex" }}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!detectedCompetitors.length && (
                  <p style={{ fontSize: 12, color: "var(--text-4)", margin: "0 0 10px" }}>
                    {clientId && semrushDomain
                      ? detectingCompetitors
                        ? "Detecting competitors…"
                        : "SEMrush doesn't have enough organic data for this domain yet — competitor detection typically populates within a few weeks once the site has established rankings. The content gap analysis will be skipped for now."
                      : "Select a client to auto-detect competitors"}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={customCompetitorInput}
                    onChange={(e) => setCustomCompetitorInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCompetitor(); } }}
                    placeholder="Add competitor domain (e.g. competitor.com)"
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, height: 42 }}
                    onClick={addCustomCompetitor}
                    disabled={!customCompetitorInput.trim()}
                  >
                    <Plus style={{ width: 14, height: 14 }} /> Add
                  </button>
                </div>
              </div>

              {/* Brief + Period + Database */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Brief (optional)</label>
                <textarea
                  className="form-input"
                  value={semrushBrief}
                  onChange={(e) => setSemrushBrief(e.target.value)}
                  placeholder="Any specific areas to target? Locations, products, campaigns, seasonal themes…"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Monthly output limits */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>
                  Monthly output limits
                  <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>— leave blank for no limit</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  {([
                    { label: "Page optimisations", value: limitPageOpts, set: setLimitPageOpts },
                    { label: "Landing pages", value: limitLandingPages, set: setLimitLandingPages },
                    { label: "Blog posts", value: limitBlogPosts, set: setLimitBlogPosts },
                    { label: "Link targets", value: limitLinkTargets, set: setLimitLinkTargets },
                  ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        max={999}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder="∞"
                        style={{ textAlign: "center", fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
                <div>
                  <label className="form-label">Period</label>
                  <input
                    type="text"
                    className="form-input"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g. April 2026"
                  />
                </div>
                <div>
                  <label className="form-label">Database</label>
                  <select
                    className="form-input"
                    value={semrushDatabase}
                    onChange={(e) => setSemrushDatabase(e.target.value)}
                  >
                    <option value="uk">UK</option>
                    <option value="us">US</option>
                    <option value="au">Australia</option>
                    <option value="ca">Canada</option>
                    <option value="de">Germany</option>
                    <option value="fr">France</option>
                    <option value="es">Spain</option>
                    <option value="it">Italy</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">AI Model</label>
                  <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--r)", padding: 3, gap: 2, height: 42 }}>
                    <button
                      type="button"
                      onClick={() => setAiModel("claude-opus-4-6")}
                      title="Claude Opus 4.6 — more creative, better at following complex instructions"
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        padding: "6px 10px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: aiModel === "claude-opus-4-6" ? 600 : 400,
                        background: aiModel === "claude-opus-4-6" ? "var(--surface)" : "transparent",
                        color: aiModel === "claude-opus-4-6" ? "var(--accent)" : "var(--text-3)",
                        boxShadow: aiModel === "claude-opus-4-6" ? "var(--shadow-xs)" : "none",
                        transition: "all 0.15s ease", whiteSpace: "nowrap",
                      }}
                    >
                      ✦ Claude
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiModel("gpt-5.4")}
                      title="GPT-5.4 — fast and reliable"
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        padding: "6px 10px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: aiModel === "gpt-5.4" ? 600 : 400,
                        background: aiModel === "gpt-5.4" ? "var(--surface)" : "transparent",
                        color: aiModel === "gpt-5.4" ? "var(--accent)" : "var(--text-3)",
                        boxShadow: aiModel === "gpt-5.4" ? "var(--shadow-xs)" : "none",
                        transition: "all 0.15s ease", whiteSpace: "nowrap",
                      }}
                    >
                      ⚡ GPT-5.4
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={generating || !clientId || !semrushDomain || creatingClientSemrush || addingSemrushToClient}
                    className="btn btn-primary"
                    style={{ whiteSpace: "nowrap", height: 42 }}
                  >
                    {generating ? (
                      <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generating…</>
                    ) : (
                      <><Zap style={{ width: 16, height: 16 }} /> Generate Strategy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Fun mode toggle */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={toggleFunMode}
                  title={funMode ? "Disable uwu chaos mode" : "Enable uwu chaos mode"}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 99,
                    border: `1px solid ${funMode ? "#f9a8d4" : "var(--border)"}`,
                    background: funMode ? "#fdf2f8" : "var(--surface)",
                    color: funMode ? "#db2777" : "var(--text-3)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                >
                  {funMode ? "😺 uwu mode ON" : "😐 uwu mode OFF"}
                </button>
              </div>

              {/* Progress indicator */}
              {generating && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginTop: 16,
                  padding: "12px 16px", borderRadius: "var(--r-sm)",
                  background: funMode ? "linear-gradient(135deg, #fdf2f8 0%, #eff6ff 50%, #fef9c3 100%)" : "var(--accent-bg)",
                  fontSize: 13,
                  color: funMode ? "#9333ea" : "var(--accent)",
                  border: funMode ? "1px solid #f9a8d4" : "none",
                  animation: funMode ? "uwuPulse 2s ease-in-out infinite" : "none",
                }}>
                  <style>{`
                    @keyframes uwuPulse {
                      0%, 100% { box-shadow: 0 0 0 0 rgba(249,168,212,0.4); }
                      50% { box-shadow: 0 0 0 6px rgba(249,168,212,0); }
                    }
                    @keyframes uwuWiggle {
                      0%, 100% { transform: rotate(-2deg); }
                      50% { transform: rotate(2deg); }
                    }
                  `}</style>
                  <ChaosOverlay active={funMode && generating} />
                  <Loader2 style={{
                    width: 14, height: 14,
                    animation: funMode ? "spin 0.6s linear infinite" : "spin 1s linear infinite",
                    flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1,
                    animation: funMode ? "uwuWiggle 0.8s ease-in-out infinite" : "none",
                    display: "inline-block",
                    fontWeight: funMode ? 600 : 400,
                  }}>
                    {funMode ? funMessage : "Generating content strategy…"}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.7, fontSize: 12, whiteSpace: "nowrap" }}>{elapsedTime}</span>
                </div>
              )}
            </form>
          )}

          {/* ─── Upload Mode ─── */}
          {mode === "upload" && (
          <form onSubmit={handleGenerate}>
            <div
              style={{
                border: `2px dashed ${dragOver ? "var(--accent)" : file ? "var(--success)" : "var(--border)"}`,
                borderRadius: "var(--r)",
                padding: file ? "20px 24px" : "40px 24px",
                textAlign: "center",
                background: dragOver ? "var(--accent-bg)" : file ? "#f0fdf4" : "var(--bg)",
                transition: "all 0.15s ease",
                cursor: file ? "default" : "pointer",
                marginBottom: 24,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { if (!file) document.getElementById("file-input")?.click(); }}
            >
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileSpreadsheet style={{ width: 20, height: 20, color: "var(--success)" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-4)", borderRadius: "var(--r-sm)" }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ width: 52, height: 52, borderRadius: "var(--r)", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Upload style={{ width: 24, height: 24, color: "var(--accent)" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", margin: "0 0 4px" }}>Drag & drop your file here</p>
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px" }}>Supports .xlsx, .xls, .csv, .docx, and .txt files up to 10 MB</p>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                    Choose File
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv,.docx,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFile(f);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
              <div>
                <label className="form-label">Client <span style={{ color: "var(--danger)" }}>*</span></label>
                {creatingClient ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="New client name"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={!clientName.trim() || generating}
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={async () => {
                        if (!clientName.trim()) return;
                        try {
                          const res = await fetch("/api/clients", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: clientName.trim() }),
                          });
                          const newClient = await res.json();
                          if (newClient.error) {
                            setError(newClient.error);
                            return;
                          }
                          setClients((prev) => [...prev, { id: newClient.id, name: newClient.name }].sort((a, b) => a.name.localeCompare(b.name)));
                          setClientId(newClient.id);
                          setClientName(newClient.name);
                          setCreatingClient(false);
                          setSuccess(`Client "${newClient.name}" created`);
                        } catch {
                          setError("Failed to create client");
                        }
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> Create
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={() => { setCreatingClient(false); setClientName(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="form-input"
                      value={clientId}
                      onChange={(e) => {
                        const selectedClient = clients.find((c) => c.id === e.target.value);
                        setClientId(e.target.value);
                        if (selectedClient) setClientName(selectedClient.name);
                        else setClientName("");
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={() => setCreatingClient(true)}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> New
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Period</label>
                <input
                  type="text"
                  className="form-input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. April 2026"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={generating || !file || !clientId}
                  className="btn btn-primary"
                  style={{ whiteSpace: "nowrap", height: 42 }}
                >
                  {generating ? (
                    <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generating…</>
                  ) : (
                    <><FileSpreadsheet style={{ width: 16, height: 16 }} /> Generate Strategy</>
                  )}
                </button>
              </div>
            </div>
          </form>
          )}
        </div>
      </div>

      {/* Strategies List */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Generated Strategies</h2>
            <p className="card-subtitle">{strategies.length} {strategies.length === 1 ? "strategy" : "strategies"} created</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", color: "var(--accent)", margin: "0 auto 10px", display: "block" }} />
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>Loading strategies…</p>
          </div>
        ) : strategies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileSpreadsheet style={{ width: 24, height: 24 }} /></div>
            <p className="empty-state-title">No content strategies yet</p>
            <p className="empty-state-desc">Generate a content strategy from SEMrush data or upload a keyword research spreadsheet to get started.</p>
          </div>
        ) : (
          <div>
            {strategies.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px",
                  borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileSpreadsheet style={{ width: 18, height: 18, color: "var(--accent)" }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    {s.client?.name && (
                      <>
                        <Users style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.client.name}</span>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                      </>
                    )}
                    <Calendar style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.period}</span>
                    <span style={{ color: "var(--text-4)" }}>·</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
                      {new Date(s.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {s.createdBy && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>by {s.createdBy}</span>
                      </>
                    )}
                    {s.generationMs && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                          {s.generationMs >= 60000
                            ? `${Math.floor(s.generationMs / 60000)}m ${Math.round((s.generationMs % 60000) / 1000)}s`
                            : `${Math.round(s.generationMs / 1000)}s`}
                        </span>
                      </>
                    )}
                    {s.viewCount > 0 && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <Eye style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.viewCount} views</span>
                      </>
                    )}
                    {s.shareToken && (
                      <span className="badge badge-indigo" style={{ fontSize: 11, padding: "2px 8px", marginLeft: 4 }}>Shared</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button onClick={() => handlePreview(s.id)} className="btn btn-ghost btn-sm" title="Preview" style={{ padding: 8 }}>
                    <Eye style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleDownload(s.id, s.title)} className="btn btn-ghost btn-sm" title="Download" style={{ padding: 8 }}>
                    <Download style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleShare(s.id)} className="btn btn-ghost btn-sm" title="Share" style={{ padding: 8 }}>
                    <Share2 style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="btn btn-ghost btn-sm" title="Delete" style={{ padding: 8, color: "var(--danger)" }}>
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Methodology */}
      <MethodologyAccordion />

      {/* Share Modal */}
      {sharingId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow)", maxWidth: 460, width: "100%", padding: 28, margin: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Share Strategy</h3>
              <button onClick={() => setSharingId(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Share link */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Share link</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/content-strategy/${shareToken}`}
                  style={{ background: "var(--bg)", fontSize: 13, fontFamily: "monospace" }}
                />
                <button onClick={copyShareLink} className="btn btn-primary" style={{ flexShrink: 0 }}>
                  {copied ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Password protection */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Lock style={{ width: 12, height: 12 }} />
                Password protection (optional)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
                <button onClick={handleSetPassword} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                  {sharePassword ? "Set" : "Remove"}
                </button>
              </div>
            </div>

            {/* Open link */}
            <a
              href={`/share/content-strategy/${shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <ExternalLink style={{ width: 15, height: 15 }} />
              Open share link
            </a>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow)", width: "95vw", height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>{previewTitle}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    if (previewStrategyId) {
                      setPreviewHtml("");
                      setPreviewTitle("");
                      setPreviewStrategyId(null);
                      handleShare(previewStrategyId);
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Share2 style={{ width: 14, height: 14 }} /> Share
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([previewHtml], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${previewTitle}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Download style={{ width: 14, height: 14 }} /> Download
                </button>
                <button onClick={() => { setPreviewHtml(""); setPreviewTitle(""); setPreviewStrategyId(null); }} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              style={{ flex: 1, width: "100%", border: "none" }}
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}

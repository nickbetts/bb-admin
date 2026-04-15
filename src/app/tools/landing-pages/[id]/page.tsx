"use client";

import { useState, useEffect, useCallback, useRef, use, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Share2,
  Download,
  Check,
  Eye,
  Users,
  ExternalLink,
  RotateCcw,
  History,
  X,
  Save,
  MessageSquare,
  Wand2,
  FileCode,
} from "lucide-react";

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  currentHtml: string;
  status: string;
  shareToken: string | null;
  viewCount: number;
  briefJson: string;
  brandContextJson: string;
  formConfig: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; slug: string } | null;
  versions: Version[];
  _count: { leads: number };
}

interface Version {
  id: string;
  versionNumber: number;
  html: string;
  prompt: string;
  createdAt: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--border)", borderRadius: "var(--r)",
  fontSize: 13, color: "var(--text)", background: "var(--surface)",
  outline: "none", fontFamily: "inherit",
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft: { background: "var(--border-subtle)", color: "var(--text-3)" },
  published: { background: "var(--success-bg)", color: "var(--success-text)" },
  archived: { background: "var(--warning-bg)", color: "var(--warning-text)" },
};

// ── Markdown helpers (for chat bubble rendering) ─────────────────────────────

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={key++} style={{ background: "rgba(0,0,0,0.12)", padding: "1px 4px", borderRadius: 3, fontSize: "0.88em", fontFamily: "monospace" }}>{match[4]}</code>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let k = 0;
  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={k++} style={{ margin: "4px 0", paddingLeft: 18, listStyleType: "disc" }}>
          {bulletBuffer.map((b, j) => <li key={j} style={{ margin: "2px 0" }}>{renderInline(b)}</li>)}
        </ul>
      );
      bulletBuffer = [];
    }
  };
  for (const line of lines) {
    const stripped = line.trim();
    if (/^[-*]\s+/.test(stripped)) {
      bulletBuffer.push(stripped.replace(/^[-*]\s+/, ""));
    } else {
      flushBullets();
      if (stripped === "") {
        // skip blank lines
      } else if (/^###\s+/.test(stripped)) {
        elements.push(<h4 key={k++} style={{ margin: "6px 0 2px", fontSize: "0.88em", fontWeight: 700 }}>{renderInline(stripped.replace(/^###\s+/, ""))}</h4>);
      } else if (/^##\s+/.test(stripped)) {
        elements.push(<h3 key={k++} style={{ margin: "6px 0 3px", fontSize: "0.92em", fontWeight: 700 }}>{renderInline(stripped.replace(/^##\s+/, ""))}</h3>);
      } else if (/^#\s+/.test(stripped)) {
        elements.push(<h2 key={k++} style={{ margin: "5px 0 4px", fontSize: "0.95em", fontWeight: 700 }}>{renderInline(stripped.replace(/^#\s+/, ""))}</h2>);
      } else {
        elements.push(<p key={k++} style={{ margin: "2px 0" }}>{renderInline(line)}</p>);
      }
    }
  }
  flushBullets();
  return <>{elements}</>;
}

export default function LandingPageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [lp, setLp] = useState<LandingPage | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [copied, setCopied] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Chat state
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string; version?: number; type?: "chat" | "refine"; refinementPrompt?: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatting, setChatting] = useState(false);

  // Reference HTML upload state
  const [referenceHtml, setReferenceHtml] = useState<string | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Staged changes (accumulated via STACK_CHANGE tags)
  const [stagedChanges, setStagedChanges] = useState<string[]>([]);

  // Template save state
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("lead-gen");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchLP = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/landing-pages/${id}`);
      if (!res.ok) {
        router.push("/tools/landing-pages");
        return;
      }
      const data = await res.json();
      setLp(data.landingPage);
      setPreviewHtml(data.landingPage.currentHtml);

      // Build initial chat history from versions
      const versions = data.landingPage.versions as Version[];
      const history: { role: "user" | "assistant"; content: string; version?: number }[] = [];
      for (const v of [...versions].reverse()) {
        history.push({ role: "user", content: v.prompt, version: v.versionNumber });
        history.push({ role: "assistant", content: `Generated version ${v.versionNumber}`, version: v.versionNumber });
      }
      setChatHistory(history);
    } catch {
      router.push("/tools/landing-pages");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchLP(); }, [fetchLP]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleRefine = async (overridePrompt?: string) => {
    const userPrompt = (overridePrompt ?? prompt).trim();
    if (!userPrompt || refining || chatting) return;

    if (!overridePrompt) setPrompt("");
    setRefining(true);

    setChatHistory((prev) => [...prev, { role: "user", content: userPrompt, type: "refine" as const }]);

    try {
      const aiHistory = chatHistory
        .filter((m) => !m.content.startsWith("Applied changes →") && !m.content.startsWith("Reverted to") && !m.content.startsWith("Generated version"))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/tools/landing-pages/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          conversationHistory: aiHistory,
          referenceHtml: referenceHtml ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${data.error ?? "Refinement failed"}`, type: "refine" as const }]);
        setRefining(false);
        return;
      }

      const data = await res.json();
      setPreviewHtml(data.html);
      setLp((prev) => prev ? { ...prev, currentHtml: data.html } : prev);

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Applied changes → version ${data.version.versionNumber}`,
          version: data.version.versionNumber,
          type: "refine" as const,
        },
      ]);

      const refreshRes = await fetch(`/api/tools/landing-pages/${id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setLp(refreshData.landingPage);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`, type: "refine" as const }]);
    } finally {
      setRefining(false);
    }
  };

  const handleChat = async () => {
    const userMessage = prompt.trim();
    if (!userMessage || chatting || refining) return;

    setPrompt("");
    setChatting(true);

    setChatHistory((prev) => [...prev, { role: "user", content: userMessage, type: "chat" as const }]);

    try {
      const aiHistory = chatHistory
        .filter((m) => !m.content.startsWith("Applied changes →") && !m.content.startsWith("Reverted to") && !m.content.startsWith("Generated version"))
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/tools/landing-pages/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: aiHistory,
          referenceHtml: referenceHtml ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${data.error ?? "Chat failed"}`, type: "chat" as const }]);
        return;
      }

      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          type: "chat" as const,
          refinementPrompt: data.refinementPrompt,
        },
      ]);
      // Accumulate any STACK_CHANGE items into the staged list
      if (data.stackedChanges?.length) {
        setStagedChanges((prev) => [...prev, ...data.stackedChanges]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`, type: "chat" as const }]);
    } finally {
      setChatting(false);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceHtml(ev.target?.result as string);
      setReferenceFileName(file.name);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleApplyAll = async () => {
    if (stagedChanges.length === 0 || refining || chatting) return;
    const combined = stagedChanges
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n");
    setStagedChanges([]);
    await handleRefine(`Apply all of the following changes:\n${combined}`);
  };

  const handleRevert = async (versionNumber: number) => {
    const res = await fetch(`/api/tools/landing-pages/${id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreviewHtml(data.html);
      setLp((prev) => prev ? { ...prev, currentHtml: data.html } : prev);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: `Reverted to version ${versionNumber}`, version: versionNumber },
      ]);
    }
  };

  const handlePreviewVersion = (version: Version) => {
    setPreviewHtml(version.html);
    setShowVersions(false);
  };

  const handleShare = async () => {
    const res = await fetch(`/api/tools/landing-pages/${id}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}/api/share/landing-page/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setLp((prev) => prev ? { ...prev, shareToken: data.shareToken } : prev);
    }
  };

  const handleDownload = () => {
    if (!lp) return;
    const blob = new Blob([lp.currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lp.slug || "landing-page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/tools/landing-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setLp((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !lp) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/tools/landing-pages/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDesc || undefined,
          category: templateCategory,
          html: lp.currentHtml,
        }),
      });
      if (res.ok) {
        setShowSaveTemplate(false);
        setTemplateName("");
        setTemplateDesc("");
      }
    } catch {} finally {
      setSavingTemplate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        handleRefine();
      } else {
        handleChat();
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "var(--accent)" }} />
      </div>
    );
  }

  if (!lp) return null;

  const toolbarBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "6px 10px", fontSize: 12, fontWeight: 500,
    color: "var(--text-3)", background: "none", border: "none",
    borderRadius: "var(--r-sm)", cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <Link
          href="/tools/landing-pages"
          style={{ display: "flex", color: "var(--text-4)", textDecoration: "none" }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lp.title}</h1>
          {lp.client && (
            <p style={{ fontSize: 12, color: "var(--text-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lp.client.name}</p>
          )}
        </div>

        {/* Status dropdown */}
        <select
          value={lp.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px",
            borderRadius: 99, border: "none", cursor: "pointer",
            ...(STATUS_STYLES[lp.status] ?? STATUS_STYLES.draft),
          }}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-4)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} title="Views"><Eye style={{ width: 13, height: 13 }} /> {lp.viewCount}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} title="Leads"><Users style={{ width: 13, height: 13 }} /> {lp._count.leads}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={() => setShowVersions(!showVersions)}
            style={toolbarBtn}
            title="Version history"
          >
            <History style={{ width: 14, height: 14 }} />
            v{lp.versions.length}
          </button>

          <button onClick={() => setShowSaveTemplate(true)} style={toolbarBtn} title="Save as template">
            <Save style={{ width: 14, height: 14 }} />
          </button>

          <button onClick={handleDownload} style={toolbarBtn} title="Download HTML">
            <Download style={{ width: 14, height: 14 }} />
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleShare}
            style={{ fontSize: 12, padding: "6px 12px" }}
            title="Generate share link"
          >
            {copied ? <Check style={{ width: 14, height: 14 }} /> : <Share2 style={{ width: 14, height: 14 }} />}
            {copied ? "Copied!" : "Share"}
          </button>

          {lp.shareToken && (
            <a
              href={`/api/share/landing-page/${lp.shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...toolbarBtn, textDecoration: "none" }}
              title="Open preview"
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
            </a>
          )}
        </div>
      </div>

      {/* Version history panel (slide-down) */}
      {showVersions && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "12px 16px", maxHeight: 200, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Version History</span>
            <button onClick={() => setShowVersions(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {lp.versions.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ flexShrink: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "50%", fontWeight: 600, fontSize: 11 }}>
                  {v.versionNumber}
                </span>
                <span style={{ flex: 1, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.prompt}</span>
                <span style={{ flexShrink: 0, color: "var(--text-4)", fontSize: 11 }}>
                  {new Date(v.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={() => handlePreviewVersion(v)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--accent)", padding: "2px 6px", borderRadius: "var(--r-sm)" }}
                >
                  Preview
                </button>
                <button
                  onClick={() => handleRevert(v.versionNumber)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: "2px 6px", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center" }}
                  title="Revert to this version"
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content — split view */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Preview panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--border-subtle)", minWidth: 0 }}>
          {/* Device toggle bar */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 0", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                style={{
                  padding: 6, borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                  background: device === mode ? "var(--accent-bg)" : "transparent",
                  color: device === mode ? "var(--accent)" : "var(--text-4)",
                  transition: "all 0.15s",
                }}
                title={mode}
              >
                <Icon style={{ width: 16, height: 16 }} />
              </button>
            ))}
          </div>

          {/* iframe preview */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflow: "auto" }}>
            <div
              style={{
                width: DEVICE_WIDTHS[device], maxWidth: "100%", height: "100%",
                background: "#fff", borderRadius: "var(--r)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                overflow: "hidden", transition: "width 0.3s ease",
              }}
            >
              <iframe
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Landing page preview"
              />
            </div>
          </div>
        </div>

        {/* Chat panel (right sidebar) */}
        <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
          {/* Chat header */}
          <div style={{ flexShrink: 0, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>Refine with AI</h2>
                <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>Chat to discuss · ⌘+Enter to apply directly</p>
              </div>
              {/* Hidden file input */}
              <input
                ref={referenceInputRef}
                type="file"
                accept=".html"
                onChange={handleReferenceUpload}
                style={{ display: "none" }}
              />
              <button
                onClick={() => referenceInputRef.current?.click()}
                title="Upload a reference HTML page for inspiration"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "5px 8px", fontSize: 11, fontWeight: 500,
                  color: referenceHtml ? "var(--accent)" : "var(--text-3)",
                  background: referenceHtml ? "var(--accent-bg)" : "var(--border-subtle)",
                  border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <FileCode style={{ width: 13, height: 13 }} />
                {referenceHtml ? "Ref loaded" : "Upload ref"}
              </button>
            </div>
            {/* Reference file chip */}
            {referenceHtml && referenceFileName && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 8px", background: "var(--accent-bg)", borderRadius: "var(--r-sm)" }}>
                <FileCode style={{ width: 12, height: 12, color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--accent)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referenceFileName}</span>
                <button
                  onClick={() => { setReferenceHtml(null); setReferenceFileName(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0, display: "flex", alignItems: "center" }}
                  title="Remove reference"
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
          </div>

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 32 }}>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>Your landing page is ready!</p>
                <p style={{ fontSize: 12, color: "var(--text-4)" }}>Try asking:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {["What would make this page convert better?", "What's the weakest section?", "Change the CTA colour to green", "Add more social proof and testimonials"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", fontSize: 12,
                        padding: "8px 12px", borderRadius: "var(--r)", border: "none",
                        background: "var(--border-subtle)", color: "var(--text-3)", cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  style={{
                    maxWidth: "85%", borderRadius: 12, padding: "8px 12px", fontSize: 12, lineHeight: 1.5,
                    ...(msg.role === "user"
                      ? { background: "var(--gradient-accent)", color: "#fff" }
                      : { background: "var(--border-subtle)", color: "var(--text-2)" }
                    ),
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {msg.role === "assistant" && msg.type === "chat"
                      ? renderMarkdown(msg.content)
                      : msg.content}
                  </p>
                  {/* Refine version badges */}
                  {msg.role === "assistant" && msg.version && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(128,128,128,0.15)" }}>
                      <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 99, fontWeight: 600 }}>
                        v{msg.version}
                      </span>
                      <button
                        onClick={() => {
                          const v = lp?.versions.find((ver) => ver.versionNumber === msg.version);
                          if (v) handlePreviewVersion(v);
                        }}
                        style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRevert(msg.version!)}
                        style={{ fontSize: 10, color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 2 }}
                      >
                        <RotateCcw style={{ width: 10, height: 10 }} /> Revert
                      </button>
                    </div>
                  )}
                  {/* Apply this change button (chat messages only) */}
                  {msg.role === "assistant" && msg.type === "chat" && msg.refinementPrompt && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(128,128,128,0.15)" }}>
                      <button
                        onClick={() => handleRefine(msg.refinementPrompt)}
                        disabled={refining || chatting}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 600, padding: "5px 10px",
                          background: "var(--success-bg)", color: "var(--success-text)",
                          border: "none", borderRadius: 99, cursor: "pointer",
                          opacity: (refining || chatting) ? 0.5 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <Wand2 style={{ width: 11, height: 11 }} />
                        Apply this change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatting && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "var(--border-subtle)", borderRadius: 12, padding: "8px 12px", fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  Thinking...
                </div>
              </div>
            )}

            {refining && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "var(--border-subtle)", borderRadius: 12, padding: "8px 12px", fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  Generating changes...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Staged changes tray */}
          {stagedChanges.length > 0 && (
            <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "10px 12px", background: "var(--success-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success-text)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Wand2 style={{ width: 11, height: 11 }} />
                  Staged changes ({stagedChanges.length})
                </span>
                <button
                  onClick={() => setStagedChanges([])}
                  style={{ fontSize: 10, color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Clear all
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: 120, overflowY: "auto" }}>
                {stagedChanges.map((change, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, background: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "4px 8px" }}>
                    <span style={{ flexShrink: 0, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--success-text)", color: "#fff", borderRadius: "50%", fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ flex: 1, color: "var(--text-2)", lineHeight: 1.4 }}>{change}</span>
                    <button
                      onClick={() => setStagedChanges((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 0, display: "flex", alignItems: "center" }}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleApplyAll}
                disabled={refining || chatting}
                className="btn btn-primary btn-sm"
                style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
              >
                {refining ? (
                  <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Applying...</>
                ) : (
                  <><Wand2 style={{ width: 12, height: 12 }} /> Apply all {stagedChanges.length} changes</>
                )}
              </button>
            </div>
          )}

          {/* Chat input */}
          <div style={{ flexShrink: 0, padding: 12, borderTop: "1px solid var(--border)" }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or describe a change..."
              rows={2}
              disabled={refining || chatting}
              style={{
                ...inputStyle, width: "100%", fontSize: 12,
                resize: "none" as const,
                opacity: (refining || chatting) ? 0.5 : 1,
                marginBottom: 8,
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleChat}
                disabled={refining || chatting || !prompt.trim()}
                title="Chat — discuss and get advice (Enter)"
                style={{
                  flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "7px 10px", fontSize: 12, fontWeight: 500,
                  background: "var(--border-subtle)", color: "var(--text-2)",
                  border: "1px solid var(--border)", borderRadius: "var(--r-sm)", cursor: "pointer",
                  opacity: (refining || chatting || !prompt.trim()) ? 0.45 : 1,
                  transition: "opacity 0.15s, background 0.15s",
                }}
              >
                <MessageSquare style={{ width: 13, height: 13 }} />
                Chat
              </button>
              <button
                onClick={() => handleRefine()}
                disabled={refining || chatting || !prompt.trim()}
                title="Apply — generate updated HTML (⌘+Enter)"
                className="btn btn-primary btn-sm"
                style={{
                  flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                  fontSize: 12,
                }}
              >
                <Wand2 style={{ width: 13, height: 13 }} />
                Apply
              </button>
            </div>
            <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 6 }}>Enter to chat · ⌘+Enter to apply · Shift+Enter new line</p>
          </div>
        </div>
      </div>

      {/* Save as Template modal */}
      {showSaveTemplate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
          <div className="card" style={{ width: "100%", maxWidth: 420, margin: "0 16px" }}>
            <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="card-title">Save as Template</span>
              <button onClick={() => setShowSaveTemplate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Lead Gen — Dark Theme"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  style={inputStyle}
                >
                  <option value="lead-gen">Lead Generation</option>
                  <option value="event">Event / Campaign</option>
                  <option value="product-launch">Product Launch</option>
                  <option value="service">Service Landing</option>
                  <option value="ecommerce">E-commerce</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Description (optional)</label>
                <input
                  type="text"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of the template style"
                  style={inputStyle}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveTemplate}
                disabled={!templateName || savingTemplate}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {savingTemplate ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 16, height: 16 }} />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

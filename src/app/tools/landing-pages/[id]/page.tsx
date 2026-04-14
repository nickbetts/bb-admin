"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Send,
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
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string; version?: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      // Versions come in desc order — reverse for chronological display
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

  const handleRefine = async () => {
    if (!prompt.trim() || refining) return;

    const userPrompt = prompt.trim();
    setPrompt("");
    setRefining(true);

    // Add user message immediately
    setChatHistory((prev) => [...prev, { role: "user", content: userPrompt }]);

    try {
      // Build conversation history for AI context (text-only, last 6 messages)
      const aiHistory = chatHistory
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/tools/landing-pages/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          conversationHistory: aiHistory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${data.error ?? "Refinement failed"}` }]);
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
        },
      ]);

      // Refresh full LP data (versions list etc.)
      const refreshRes = await fetch(`/api/tools/landing-pages/${id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setLp(refreshData.landingPage);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` }]);
    } finally {
      setRefining(false);
    }
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
      handleRefine();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!lp) return null;

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    archived: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => router.push("/tools/landing-pages")}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lp.title}</h1>
          {lp.client && (
            <p className="text-xs text-slate-400 truncate">{lp.client.name}</p>
          )}
        </div>

        {/* Status dropdown */}
        <select
          value={lp.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer ${statusColors[lp.status] ?? statusColors.draft}`}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1" title="Views"><Eye className="h-3.5 w-3.5" /> {lp.viewCount}</span>
          <span className="flex items-center gap-1" title="Leads"><Users className="h-3.5 w-3.5" /> {lp._count.leads}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Version history"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">v{lp.versions.length}</span>
          </button>

          <button
            onClick={() => setShowSaveTemplate(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Save as template"
          >
            <Save className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Download HTML"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            title="Generate share link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </button>

          {lp.shareToken && (
            <a
              href={`/api/share/landing-page/${lp.shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Open preview"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Version history panel (slide-down) */}
      {showVersions && (
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Version History</span>
            <button onClick={() => setShowVersions(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {lp.versions.map((v) => (
              <div key={v.id} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                  {v.versionNumber}
                </span>
                <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{v.prompt}</span>
                <span className="shrink-0 text-slate-400">
                  {new Date(v.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={() => handlePreviewVersion(v)}
                  className="shrink-0 text-indigo-500 hover:text-indigo-700 px-1.5 py-0.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded"
                >
                  Preview
                </button>
                <button
                  onClick={() => handleRevert(v.versionNumber)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  title="Revert to this version"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content — split view */}
      <div className="flex-1 flex min-h-0">
        {/* Preview panel */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 min-w-0">
          {/* Device toggle bar */}
          <div className="shrink-0 flex items-center justify-center gap-1 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                className={`p-1.5 rounded transition-colors ${device === mode ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                title={mode}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* iframe preview */}
          <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
            <div
              className="bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300"
              style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%", height: "100%" }}
            >
              <iframe
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                title="Landing page preview"
              />
            </div>
          </div>
        </div>

        {/* Chat panel (right sidebar) */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {/* Chat header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Refine with AI</h2>
            <p className="text-xs text-slate-400">Describe changes — Claude will update the page</p>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 mb-3">Your landing page is ready!</p>
                <p className="text-xs text-slate-400">Try prompts like:</p>
                <div className="space-y-1.5 mt-2">
                  {["Make the hero section more impactful", "Add a countdown timer for urgency", "Change the CTA colour to green", "Add more social proof and testimonials"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.role === "assistant" && msg.version && (
                    <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                        v{msg.version}
                      </span>
                      <button
                        onClick={() => {
                          const v = lp?.versions.find((ver) => ver.versionNumber === msg.version);
                          if (v) handlePreviewVersion(v);
                        }}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRevert(msg.version!)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-0.5"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> Revert
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {refining && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating changes...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to change..."
                rows={2}
                disabled={refining}
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none disabled:opacity-50"
              />
              <button
                onClick={handleRefine}
                disabled={refining || !prompt.trim()}
                className="shrink-0 self-end bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 p-2.5 rounded-lg transition-colors"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      {/* Save as Template modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Save as Template</h3>
              <button onClick={() => setShowSaveTemplate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Lead Gen — Dark Theme"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="lead-gen">Lead Generation</option>
                  <option value="event">Event / Campaign</option>
                  <option value="product-launch">Product Launch</option>
                  <option value="service">Service Landing</option>
                  <option value="ecommerce">E-commerce</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of the template style"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName || savingTemplate}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white disabled:text-slate-500 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

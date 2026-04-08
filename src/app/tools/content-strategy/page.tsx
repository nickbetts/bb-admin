"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

interface ContentStrategyItem {
  id: string;
  title: string;
  period: string;
  clientId: string;
  shareToken: string | null;
  viewCount: number;
  createdAt: string;
  client: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function ContentStrategyPage() {
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

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Share state
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStrategies = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/content-strategy?action=list");
      const data = await res.json();
      if (data.strategies) setStrategies(data.strategies);
    } catch {
      console.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.clients) setClients(data.clients);
    } catch {
      console.error("Failed to load clients");
    }
  }, []);

  useEffect(() => {
    loadStrategies();
    loadClients();
  }, [loadStrategies, loadClients]);

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
    if (
      droppedFile &&
      (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))
    ) {
      setFile(droppedFile);
    } else {
      setError("Please drop an Excel file (.xlsx or .xls)");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Content Strategy Creator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a keyword research spreadsheet and generate a polished,
          shareable content strategy document.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Generate New Strategy
        </h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Drag & drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-purple-400 bg-purple-50"
                : file
                  ? "border-green-300 bg-green-50"
                  : "border-slate-200 hover:border-slate-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-4 text-slate-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-1">
                  Drag & drop your Excel spreadsheet here
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  or click to browse (.xlsx, .xls)
                </p>
                <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 cursor-pointer transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  const selectedClient = clients.find(
                    (c) => c.id === e.target.value
                  );
                  setClientId(e.target.value);
                  if (selectedClient) setClientName(selectedClient.name);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select client or type below</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Or enter client name manually"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Period
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. March 2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={generating || !file}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    Generate Strategy
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Strategies List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Generated Strategies
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        ) : strategies.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No content strategies yet. Upload a spreadsheet to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {strategies.map((s) => (
              <div
                key={s.id}
                className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {s.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">
                      {s.client?.name || "No client"}
                    </span>
                    <span className="text-xs text-slate-300">&middot;</span>
                    <span className="text-xs text-slate-400">{s.period}</span>
                    <span className="text-xs text-slate-300">&middot;</span>
                    <span className="text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    {s.viewCount > 0 && (
                      <>
                        <span className="text-xs text-slate-300">
                          &middot;
                        </span>
                        <span className="text-xs text-slate-400">
                          {s.viewCount} views
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handlePreview(s.id)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(s.id, s.title)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Download HTML"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShare(s.id)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {sharingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Share Strategy
              </h3>
              <button
                onClick={() => setSharingId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Share link */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Share link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/content-strategy/${shareToken}`}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password protection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Lock className="h-3.5 w-3.5 inline mr-1" />
                  Password protection (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Leave empty for no password"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSetPassword}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    {sharePassword ? "Set" : "Remove"}
                  </button>
                </div>
              </div>

              {/* Open link */}
              <a
                href={`/share/content-strategy/${shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open share link
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[95vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {previewTitle}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([previewHtml], {
                      type: "text/html",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${previewTitle}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setPreviewHtml("");
                    setPreviewTitle("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 w-full border-0"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}

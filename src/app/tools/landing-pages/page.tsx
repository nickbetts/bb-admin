"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Eye,
  Users,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Globe,
  FileText,
  Search,
} from "lucide-react";

interface LandingPageItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  shareToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  _count: { leads: number; versions: number };
}

export default function LandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/landing-pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data.landingPages ?? []);
      }
    } catch {
      // Silently handle for now
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this landing page? This cannot be undone.")) return;
    await fetch(`/api/tools/landing-pages/${id}`, { method: "DELETE" });
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCopyLink = async (shareToken: string, id: string) => {
    const url = `${window.location.origin}/api/share/landing-page/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (id: string) => {
    const res = await fetch(`/api/tools/landing-pages/${id}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}/api/share/landing-page/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      fetchPages(); // Refresh to show share token
    }
  };

  const filteredPages = pages.filter((p) => {
    const matchesText = !filter ||
      p.title.toLowerCase().includes(filter.toLowerCase()) ||
      (p.client?.name ?? "").toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "published": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "draft": return "bg-slate-50 text-slate-600 border-slate-200";
      case "archived": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LP Generator</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AI-powered landing pages for ad campaigns
          </p>
        </div>
        <button
          onClick={() => router.push("/tools/landing-pages/new")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Landing Page
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or client..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
          <Globe className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-900 dark:text-white mb-1">
            {pages.length === 0 ? "No landing pages yet" : "No matching results"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {pages.length === 0 ? "Generate your first AI landing page" : "Try a different search or filter"}
          </p>
          {pages.length === 0 && (
            <button
              onClick={() => router.push("/tools/landing-pages/new")}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Landing Page
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPages.map((page) => (
            <div
              key={page.id}
              onClick={() => router.push(`/tools/landing-pages/${page.id}`)}
              className="group border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Card header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {page.title}
                  </h3>
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeColor(page.status)}`}>
                    {page.status}
                  </span>
                </div>
                {page.client && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {page.client.name}
                  </p>
                )}
              </div>

              {/* Card stats */}
              <div className="px-4 py-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1" title="Views">
                  <Eye className="h-3.5 w-3.5" /> {page.viewCount}
                </span>
                <span className="flex items-center gap-1" title="Leads">
                  <Users className="h-3.5 w-3.5" /> {page._count.leads}
                </span>
                <span className="flex items-center gap-1" title="Versions">
                  v{page._count.versions}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(page.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>

              {/* Card actions */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/50 flex gap-1">
                {page.shareToken ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyLink(page.shareToken!, page.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                    title="Copy share link"
                  >
                    {copiedId === page.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedId === page.id ? "Copied!" : "Copy link"}
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(page.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                    title="Generate share link"
                  >
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                )}
                {page.shareToken && (
                  <a
                    href={`/api/share/landing-page/${page.shareToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                    title="Preview in new tab"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors ml-auto"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

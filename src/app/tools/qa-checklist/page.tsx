"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Globe,
  CheckSquare,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Checklist definitions ─────────────────────────────────────────────────

interface CheckItem {
  id: string;
  label: string;
}

interface CheckCategory {
  id: string;
  label: string;
  items: CheckItem[];
}

const MARKETING_CATEGORIES: CheckCategory[] = [
  {
    id: "content",
    label: "Content & Copy",
    items: [
      { id: "content_proofread", label: "All copy has been proofread and is free of spelling/grammar errors" },
      { id: "content_ctas", label: "All CTAs are clear, compelling, and linking correctly" },
      { id: "content_brand_voice", label: "Copy is consistent with brand voice and guidelines" },
      { id: "content_contact", label: "Contact details (phone, email, address) are accurate" },
      { id: "content_legal", label: "Legal/compliance copy is in place (privacy policy, T&Cs, cookie notice)" },
      { id: "content_no_placeholder", label: "No placeholder or lorem ipsum text remains" },
      { id: "content_dates", label: "All dates, offers, and time-sensitive content are current" },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    items: [
      { id: "seo_title_tags", label: "All pages have unique, keyword-rich title tags (50–60 chars)" },
      { id: "seo_meta_descriptions", label: "All pages have unique meta descriptions (140–160 chars)" },
      { id: "seo_h1", label: "Each page has exactly one H1 containing the primary keyword" },
      { id: "seo_alt_text", label: "All images have descriptive alt text" },
      { id: "seo_url_slugs", label: "URL slugs are lowercase, hyphenated, and keyword-relevant" },
      { id: "seo_internal_links", label: "Internal linking structure is logical and functional" },
      { id: "seo_ga4", label: "Google Analytics 4 is installed and tracking verified" },
      { id: "seo_gsc", label: "Google Search Console is connected and sitemap submitted" },
      { id: "seo_robots", label: "robots.txt is correct and not blocking important pages" },
      { id: "seo_schema", label: "Relevant schema markup is implemented and validated" },
      { id: "seo_canonicals", label: "Canonical tags are set correctly on all key pages" },
    ],
  },
  {
    id: "tracking",
    label: "Tracking & Social",
    items: [
      { id: "tracking_meta_pixel", label: "Meta Pixel is installed and firing correctly" },
      { id: "tracking_og_tags", label: "Open Graph tags are set (og:title, og:description, og:image)" },
      { id: "tracking_social_images", label: "Social sharing images are sized correctly (1200×630px)" },
      { id: "tracking_linkedin", label: "LinkedIn Insight Tag is installed (if applicable)" },
      { id: "tracking_tiktok", label: "TikTok Pixel is installed (if applicable)" },
      { id: "tracking_conversions", label: "Conversion events (form submits, purchases) are firing correctly" },
    ],
  },
  {
    id: "ux",
    label: "UX & Design",
    items: [
      { id: "ux_mobile", label: "Site is fully responsive and tested on mobile and tablet" },
      { id: "ux_fonts", label: "Font sizes are legible (body ≥16px) and line heights are comfortable" },
      { id: "ux_contrast", label: "Colour contrast meets WCAG AA standards (4.5:1 for text)" },
      { id: "ux_button_states", label: "Buttons have visible hover, focus, and active states" },
      { id: "ux_forms", label: "Forms have clear validation messages and confirmation states" },
      { id: "ux_404", label: "A branded 404 page is in place" },
      { id: "ux_favicon", label: "Favicon is set correctly" },
    ],
  },
];

const DEV_CATEGORIES: CheckCategory[] = [
  {
    id: "performance",
    label: "Performance",
    items: [
      { id: "perf_cwv", label: "Core Web Vitals pass (LCP <2.5s, INP <200ms, CLS <0.1)" },
      { id: "perf_pagespeed", label: "Google PageSpeed score ≥80 on mobile" },
      { id: "perf_images", label: "Images are served in WebP/AVIF format and correctly sized" },
      { id: "perf_fonts", label: "Web fonts use display:swap and are self-hosted or preconnected" },
      { id: "perf_lazy", label: "Offscreen images and iframes use lazy loading" },
      { id: "perf_unused_code", label: "Unused CSS/JS is removed or code-split" },
    ],
  },
  {
    id: "tech_seo",
    label: "Technical SEO",
    items: [
      { id: "techseo_sitemap", label: "sitemap.xml is accessible at /sitemap.xml and up to date" },
      { id: "techseo_robots", label: "robots.txt is accessible at /robots.txt and correctly configured" },
      { id: "techseo_https", label: "HTTPS is enforced with a valid SSL certificate" },
      { id: "techseo_redirects", label: "All 301 redirects from the old site are in place and tested" },
      { id: "techseo_canonical", label: "Canonical tags are consistent with the sitemap" },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      { id: "sec_https_redirect", label: "HTTP redirects to HTTPS (HSTS enabled)" },
      { id: "sec_no_secrets", label: "No API keys or secrets are exposed in client-side code or git history" },
      { id: "sec_headers", label: "HTTP security headers are set (CSP, X-Frame-Options, X-Content-Type)" },
      { id: "sec_form_spam", label: "Forms have spam protection (honeypot, reCAPTCHA, or equivalent)" },
      { id: "sec_admin_auth", label: "Admin area requires strong authentication (2FA where possible)" },
      { id: "sec_deps", label: "No known critical vulnerabilities in dependencies (npm audit / composer)" },
    ],
  },
  {
    id: "functionality",
    label: "Functionality",
    items: [
      { id: "func_forms", label: "All forms submit successfully and trigger the correct notifications" },
      { id: "func_links", label: "All CTA and navigation links have been tested and are error-free" },
      { id: "func_console", label: "Browser console has no errors or warnings on any page" },
      { id: "func_live_keys", label: "All third-party integrations are using live (not test) API keys" },
      { id: "func_ecommerce", label: "E-commerce checkout flow has been tested end-to-end (if applicable)" },
      { id: "func_404_status", label: "Missing pages return a genuine 404 HTTP status code" },
      { id: "func_search", label: "Site search is functional (if applicable)" },
    ],
  },
  {
    id: "hosting",
    label: "Hosting & Deployment",
    items: [
      { id: "host_dns", label: "DNS records are correctly configured and propagated" },
      { id: "host_ssl_renew", label: "SSL certificate is set to auto-renew" },
      { id: "host_env_vars", label: "All environment variables are set correctly in production" },
      { id: "host_monitoring", label: "Uptime monitoring and error tracking (Sentry / equivalent) are active" },
      { id: "host_backups", label: "Automated backups are configured" },
      { id: "host_cache", label: "CDN/caching rules are configured and edge cache has been cleared" },
    ],
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  website?: string | null;
}

interface ChecklistSummary {
  id: string;
  clientId: string;
  websiteUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Checklist extends ChecklistSummary {
  marketingChecks: string;
  devChecks: string;
  notes: string | null;
  aiSummary: string | null;
}

// ─── Helper ────────────────────────────────────────────────────────────────

function computeProgress(checksJson: string, categories: CheckCategory[]) {
  const checks = JSON.parse(checksJson) as Record<string, boolean>;
  const allItems = categories.flatMap((c) => c.items);
  const total = allItems.length;
  const passed = allItems.filter((item) => checks[item.id]).length;
  return { passed, total };
}

function categoryProgress(checksJson: string, category: CheckCategory) {
  const checks = JSON.parse(checksJson) as Record<string, boolean>;
  const passed = category.items.filter((item) => checks[item.id]).length;
  return { passed, total: category.items.length };
}

// ─── Component ────────────────────────────────────────────────────────────

export default function QaChecklistPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
  const [activeTab, setActiveTab] = useState<"marketing" | "dev">("marketing");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(
    [...MARKETING_CATEGORIES, ...DEV_CATEGORIES].map((c) => c.id)
  ));
  const [isCreating, setIsCreating] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      })
      .catch(console.error);
  }, []);

  // Load checklists when client changes
  useEffect(() => {
    if (!selectedClientId) return;
    setIsLoadingChecklists(true);
    setActiveChecklist(null);
    fetch(`/api/tools/qa-checklist?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data: ChecklistSummary[]) => setChecklists(data))
      .catch(console.error)
      .finally(() => setIsLoadingChecklists(false));
  }, [selectedClientId]);

  const openChecklist = useCallback(async (id: string) => {
    const res = await fetch(`/api/tools/qa-checklist/${id}`);
    const data = await res.json() as Checklist;
    setActiveChecklist(data);
    setActiveTab("marketing");
  }, []);

  // Debounced save
  const scheduleSave = useCallback((updated: Partial<Checklist>) => {
    if (!activeChecklist) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/tools/qa-checklist/${activeChecklist.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        const saved = await res.json() as Checklist;
        setActiveChecklist((prev) => prev ? { ...prev, ...saved } : saved);
        // Update the list-level status
        setChecklists((prev) =>
          prev.map((c) => c.id === saved.id ? { ...c, status: saved.status, updatedAt: saved.updatedAt } : c)
        );
      } finally {
        setIsSaving(false);
      }
    }, 600);
  }, [activeChecklist]);

  const toggleCheck = useCallback((itemId: string, tab: "marketing" | "dev") => {
    if (!activeChecklist) return;
    const field = tab === "marketing" ? "marketingChecks" : "devChecks";
    const current = JSON.parse(activeChecklist[field]) as Record<string, boolean>;
    const updated = { ...current, [itemId]: !current[itemId] };
    const updatedChecklist = { ...activeChecklist, [field]: JSON.stringify(updated) };
    setActiveChecklist(updatedChecklist);
    scheduleSave({ [field]: updated });
  }, [activeChecklist, scheduleSave]);

  const handleNotesChange = useCallback((notes: string) => {
    if (!activeChecklist) return;
    setActiveChecklist((prev) => prev ? { ...prev, notes } : prev);
    scheduleSave({ notes });
  }, [activeChecklist, scheduleSave]);

  const markComplete = useCallback(async () => {
    if (!activeChecklist) return;
    const newStatus = activeChecklist.status === "complete" ? "in_progress" : "complete";
    setIsSaving(true);
    const res = await fetch(`/api/tools/qa-checklist/${activeChecklist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const saved = await res.json() as Checklist;
    setActiveChecklist((prev) => prev ? { ...prev, status: saved.status } : prev);
    setChecklists((prev) => prev.map((c) => c.id === saved.id ? { ...c, status: saved.status } : c));
    setIsSaving(false);
  }, [activeChecklist]);

  const generateAI = useCallback(async () => {
    if (!activeChecklist) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai/qa-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId: activeChecklist.id }),
      });
      const data = await res.json() as { summary: string };
      setActiveChecklist((prev) => prev ? { ...prev, aiSummary: data.summary } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [activeChecklist]);

  const createChecklist = useCallback(async () => {
    if (!selectedClientId) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tools/qa-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, websiteUrl: newWebsiteUrl || undefined }),
      });
      const created = await res.json() as ChecklistSummary;
      setChecklists((prev) => [created, ...prev]);
      setShowNewDialog(false);
      setNewWebsiteUrl("");
      await openChecklist(created.id);
    } finally {
      setIsCreating(false);
    }
  }, [selectedClientId, newWebsiteUrl, openChecklist]);

  const deleteChecklist = useCallback(async (id: string) => {
    await fetch(`/api/tools/qa-checklist/${id}`, { method: "DELETE" });
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    if (activeChecklist?.id === id) setActiveChecklist(null);
    setDeleteConfirmId(null);
  }, [activeChecklist]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeCategories = activeTab === "marketing" ? MARKETING_CATEGORIES : DEV_CATEGORIES;
  const activeChecksField = activeTab === "marketing" ? "marketingChecks" : "devChecks";

  const marketingProgress = activeChecklist
    ? computeProgress(activeChecklist.marketingChecks, MARKETING_CATEGORIES)
    : null;
  const devProgress = activeChecklist
    ? computeProgress(activeChecklist.devChecks, DEV_CATEGORIES)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-xl font-semibold text-white">Client QA</h1>
            <p className="text-sm text-zinc-400">Pre-launch checklists for marketing and development</p>
          </div>
        </div>
      </div>

      {/* Client selector + New button */}
      <div className="flex items-center gap-3">
        <select
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1 max-w-xs"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowNewDialog(true)}
          disabled={!selectedClientId}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New QA Checklist
        </button>
      </div>

      {/* New checklist dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">New QA Checklist</h2>
              <button onClick={() => setShowNewDialog(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm text-zinc-400 mb-1">Website URL <span className="text-zinc-600">(optional)</span></label>
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 mb-5">
              <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
              <input
                type="url"
                placeholder="https://example.com"
                value={newWebsiteUrl}
                onChange={(e) => setNewWebsiteUrl(e.target.value)}
                className="bg-transparent text-white text-sm flex-1 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewDialog(false)}
                className="text-sm text-zinc-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createChecklist}
                disabled={isCreating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checklists list */}
      {!activeChecklist && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {isLoadingChecklists ? (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading checklists…
            </div>
          ) : checklists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
              <ClipboardCheck className="h-8 w-8 opacity-30" />
              <p className="text-sm">No checklists yet. Create one to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {checklists.map((cl) => (
                  <tr
                    key={cl.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onClick={() => openChecklist(cl.id)}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {cl.websiteUrl ?? <span className="text-zinc-500 italic">No URL</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cl.status === "complete"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {cl.status === "complete" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {cl.status === "complete" ? "Approved" : "In Progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(cl.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {deleteConfirmId === cl.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => deleteChecklist(cl.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-zinc-500 hover:text-zinc-300 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(cl.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Active checklist */}
      {activeChecklist && (
        <div className="space-y-4">
          {/* Checklist header */}
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveChecklist(null)}
                className="text-zinc-500 hover:text-white text-sm transition-colors"
              >
                ← All checklists
              </button>
              <span className="text-zinc-700">|</span>
              <span className="text-white font-medium text-sm">
                {activeChecklist.websiteUrl ?? "No URL"}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                activeChecklist.status === "complete"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}>
                {activeChecklist.status === "complete" ? "Approved" : "In Progress"}
              </span>
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={markComplete}
                disabled={isSaving}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeChecklist.status === "complete"
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                {activeChecklist.status === "complete" ? "Reopen" : "Mark Complete"}
              </button>
              <button
                onClick={generateAI}
                disabled={isGeneratingAI}
                className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Sign-off
              </button>
            </div>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Marketing", progress: marketingProgress, tab: "marketing" as const, color: "bg-blue-500" },
              { label: "Dev", progress: devProgress, tab: "dev" as const, color: "bg-violet-500" },
            ].map(({ label, progress, tab, color }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left bg-zinc-900 border rounded-xl px-5 py-4 transition-colors ${
                  activeTab === tab ? "border-zinc-600" : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{label} QA</span>
                  <span className="text-sm text-zinc-400">
                    {progress?.passed ?? 0}/{progress?.total ?? 0}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all`}
                    style={{ width: progress && progress.total > 0 ? `${(progress.passed / progress.total) * 100}%` : "0%" }}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {(["marketing", "dev"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors capitalize ${
                  activeTab === tab ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab === "marketing" ? "Marketing" : "Development"}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {activeCategories.map((category) => {
              const { passed, total } = categoryProgress(activeChecklist[activeChecksField], category);
              const isExpanded = expandedCategories.has(category.id);
              const checks = JSON.parse(activeChecklist[activeChecksField]) as Record<string, boolean>;

              return (
                <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white text-sm">{category.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        passed === total ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {passed}/{total}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                      {category.items.map((item) => {
                        const isChecked = !!checks[item.id];
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => toggleCheck(item.id, activeTab)}
                              className={`mt-0.5 shrink-0 transition-colors ${
                                isChecked ? "text-emerald-500" : "text-zinc-600 hover:text-zinc-400"
                              }`}
                            >
                              {isChecked ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <span className={`text-sm leading-relaxed ${
                              isChecked ? "text-zinc-500 line-through" : "text-zinc-300"
                            }`}>
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={activeChecklist.notes ?? ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add any notes, context, or outstanding actions…"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-zinc-600"
            />
          </div>

          {/* AI summary */}
          {activeChecklist.aiSummary && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">AI Sign-off Summary</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{activeChecklist.aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

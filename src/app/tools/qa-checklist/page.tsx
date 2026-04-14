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
  Tag,
} from "lucide-react";
import { CHECKLIST_TYPES, getCategories, CheckCategory } from "@/lib/qa-checklist-items";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  website?: string | null;
}

interface ChecklistSummary {
  id: string;
  clientId: string;
  checklistType: string;
  label: string | null;
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<string>("website");
  const [newLabel, setNewLabel] = useState("");
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
    const type = data.checklistType ?? "website";
    const allCats = [...getCategories(type, "marketing"), ...getCategories(type, "dev")];
    setExpandedCategories(new Set(allCats.map((c) => c.id)));
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
        body: JSON.stringify({
          clientId: selectedClientId,
          checklistType: newChecklistType,
          label: newLabel || undefined,
          websiteUrl: newWebsiteUrl || undefined,
        }),
      });
      const created = await res.json() as ChecklistSummary;
      setChecklists((prev) => [created, ...prev]);
      setShowNewDialog(false);
      setNewWebsiteUrl("");
      setNewLabel("");
      setNewChecklistType("website");
      await openChecklist(created.id);
    } finally {
      setIsCreating(false);
    }
  }, [selectedClientId, newChecklistType, newLabel, newWebsiteUrl, openChecklist]);

  const deleteChecklist = useCallback(async (id: string) => {
    await fetch(`/api/tools/qa-checklist/${id}`, { method: "DELETE" });
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    if (activeChecklist?.id === id) setActiveChecklist(null);
    setDeleteConfirmId(null);
  }, [activeChecklist]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const activeCategories = activeChecklist
    ? getCategories(activeChecklist.checklistType ?? "website", activeTab)
    : ([] as CheckCategory[]);
  const activeChecksField = activeTab === "marketing" ? "marketingChecks" : "devChecks";

  const marketingProgress = activeChecklist
    ? computeProgress(activeChecklist.marketingChecks, getCategories(activeChecklist.checklistType ?? "website", "marketing"))
    : null;
  const devProgress = activeChecklist
    ? computeProgress(activeChecklist.devChecks, getCategories(activeChecklist.checklistType ?? "website", "dev"))
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

            <label className="block text-sm text-zinc-400 mb-1">Checklist Type</label>
            <select
              value={newChecklistType}
              onChange={(e) => setNewChecklistType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {CHECKLIST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <label className="block text-sm text-zinc-400 mb-1">
              {newChecklistType === "website" ? "Site name / label" : "Campaign name"}{" "}
              <span className="text-zinc-600">(optional)</span>
            </label>
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 mb-4">
              <Tag className="h-4 w-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder={newChecklistType === "website" ? "e.g. Client Redesign 2025" : "e.g. Summer Sale Campaign"}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="bg-transparent text-white text-sm flex-1 outline-none"
              />
            </div>

            <label className="block text-sm text-zinc-400 mb-1">
              {newChecklistType === "website" ? "Website URL" : "Landing page URL"}{" "}
              <span className="text-zinc-600">(optional)</span>
            </label>
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
                onClick={() => { setShowNewDialog(false); setNewLabel(""); setNewWebsiteUrl(""); setNewChecklistType("website"); }}
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
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Label / URL</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {checklists.map((cl) => {
                  const typeMeta = CHECKLIST_TYPES.find((t) => t.id === cl.checklistType);
                  const typeColors: Record<string, string> = {
                    website: "bg-blue-500/15 text-blue-400",
                    google_ads: "bg-orange-500/15 text-orange-400",
                    meta_ads: "bg-violet-500/15 text-violet-400",
                  };
                  const typeColor = typeColors[cl.checklistType] ?? "bg-zinc-700 text-zinc-400";
                  return (
                    <tr
                      key={cl.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      onClick={() => openChecklist(cl.id)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
                          {typeMeta?.label ?? cl.checklistType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium max-w-xs">
                        {cl.label
                          ? <span>{cl.label}{cl.websiteUrl && <span className="text-zinc-500 font-normal ml-2 text-xs">{cl.websiteUrl}</span>}</span>
                          : cl.websiteUrl ?? <span className="text-zinc-500 italic font-normal">No label</span>
                        }
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Active checklist */}
      {activeChecklist && (
        <div className="space-y-4">
          {/* Checklist header — two rows */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-3">
            {/* Row 1: breadcrumb + meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setActiveChecklist(null)}
                className="text-zinc-500 hover:text-white text-sm transition-colors shrink-0"
              >
                ← All checklists
              </button>
              <span className="text-zinc-700 shrink-0">|</span>
              {(() => {
                const typeMeta = CHECKLIST_TYPES.find((t) => t.id === activeChecklist.checklistType);
                const typeColors: Record<string, string> = {
                  website: "bg-blue-500/15 text-blue-400",
                  google_ads: "bg-orange-500/15 text-orange-400",
                  meta_ads: "bg-violet-500/15 text-violet-400",
                };
                const typeColor = typeColors[activeChecklist.checklistType] ?? "bg-zinc-700 text-zinc-400";
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${typeColor}`}>
                    {typeMeta?.label ?? activeChecklist.checklistType}
                  </span>
                );
              })()}
              <span className="text-white font-medium text-sm truncate max-w-xs">
                {activeChecklist.label ?? activeChecklist.websiteUrl ?? <span className="text-zinc-500 italic font-normal">No label</span>}
              </span>
              {activeChecklist.websiteUrl && activeChecklist.label && (
                <span className="text-zinc-500 text-xs truncate max-w-xs">{activeChecklist.websiteUrl}</span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                activeChecklist.status === "complete"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}>
                {activeChecklist.status === "complete" ? "Approved for launch" : "In Progress"}
              </span>
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
            </div>
            {/* Row 2: actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={markComplete}
                disabled={isSaving}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
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
                className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate AI Sign-off
              </button>
            </div>
          </div>

          {/* Combined tab + progress cards (single selector, no duplicate tab strip) */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Marketing", progress: marketingProgress, tab: "marketing" as const, color: "bg-blue-500", accent: "border-blue-500" },
              { label: "Development", progress: devProgress, tab: "dev" as const, color: "bg-violet-500", accent: "border-violet-500" },
            ].map(({ label, progress, tab, color, accent }) => {
              const pct = progress && progress.total > 0 ? Math.round((progress.passed / progress.total) * 100) : 0;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-left bg-zinc-900 border-2 rounded-xl px-5 py-4 transition-all ${
                    isActive ? `${accent} shadow-lg` : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-zinc-400"}`}>{label} QA</span>
                    <span className={`text-sm font-medium tabular-nums ${isActive ? "text-white" : "text-zinc-500"}`}>
                      {progress?.passed ?? 0}<span className="text-zinc-600">/{progress?.total ?? 0}</span>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className={`${color} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>{pct}% complete</p>
                </button>
              );
            })}
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

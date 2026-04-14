"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  CheckSquare,
  AlertTriangle,
  X,
} from "lucide-react";
import { CHECKLIST_TYPES, getCategories, CheckCategory } from "@/lib/qa-checklist-items";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
}

interface ChecklistSummary {
  id: string;
  clientId: string;
  client: { name: string };
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

// ─── Type badge styles (theme-aware via CSS vars) ─────────────────────────

const TYPE_BADGE_STYLE: Record<string, React.CSSProperties> = {
  website:    { background: "var(--info-bg)",    color: "var(--info-text)",    border: "1px solid var(--info-border)" },
  google_ads: { background: "rgba(66,133,244,0.12)", color: "#2563eb", border: "1px solid rgba(66,133,244,0.25)" },
  meta_ads:   { background: "var(--accent-bg)",  color: "var(--accent-text)",  border: "1px solid rgba(99,102,241,0.2)" },
};

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
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const [clients, setClients] = useState<Client[]>([]);
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]);   // empty = all
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
  const [activeTab, setActiveTab] = useState<"marketing" | "dev">("marketing");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Create dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<string>("website");
  const [newLabel, setNewLabel] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load clients + all checklists on mount
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(data))
      .catch(console.error);

    setIsLoadingChecklists(true);
    fetch("/api/tools/qa-checklist")
      .then((r) => r.json())
      .then((data: ChecklistSummary[]) => setChecklists(data))
      .catch(console.error)
      .finally(() => setIsLoadingChecklists(false));
  }, []);

  // Auto-apply client filter from URL params
  useEffect(() => {
    if (urlClientId) {
      setFilterClientIds([urlClientId]);
    }
  }, [urlClientId]);

  // Client filter helpers
  const toggleClientFilter = (clientId: string) => {
    setFilterClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const visibleChecklists = filterClientIds.length === 0
    ? checklists
    : checklists.filter((cl) => filterClientIds.includes(cl.clientId));

  // Open dialog pre-filled with filtered client if exactly one is selected
  const openNewDialog = () => {
    setNewClientId(filterClientIds.length === 1 ? filterClientIds[0] : (clients[0]?.id ?? ""));
    setNewChecklistType("website");
    setNewLabel("");
    setNewWebsiteUrl("");
    setShowNewDialog(true);
  };

  const openChecklist = useCallback(async (id: string) => {
    const res = await fetch(`/api/tools/qa-checklist/${id}`);
    const data = await res.json() as Checklist;
    // Attach client name from local clients list if missing
    if (!data.client?.name) {
      const match = clients.find((c) => c.id === data.clientId);
      if (match) data.client = { name: match.name };
    }
    setActiveChecklist(data);
    setActiveTab("marketing");
    const type = data.checklistType ?? "website";
    const allCats = [...getCategories(type, "marketing"), ...getCategories(type, "dev")];
    setExpandedCategories(new Set(allCats.map((c) => c.id)));
  }, [clients]);

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
    setActiveChecklist({ ...activeChecklist, [field]: JSON.stringify(updated) });
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

  const changeClient = useCallback(async (newClientId: string) => {
    if (!activeChecklist || newClientId === activeChecklist.clientId) return;
    const newClientName = clients.find((c) => c.id === newClientId)?.name ?? "";
    setIsSaving(true);
    const res = await fetch(`/api/tools/qa-checklist/${activeChecklist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: newClientId }),
    });
    const saved = await res.json() as Checklist;
    const updated = { ...saved, client: { name: newClientName } };
    setActiveChecklist((prev) => prev ? { ...prev, clientId: saved.clientId, client: { name: newClientName } } : prev);
    setChecklists((prev) => prev.map((c) => c.id === saved.id ? { ...c, clientId: saved.clientId, client: { name: newClientName }, updatedAt: updated.updatedAt } : c));
    setIsSaving(false);
  }, [activeChecklist, clients]);

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
    if (!newClientId) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tools/qa-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newClientId,
          checklistType: newChecklistType,
          label: newLabel || undefined,
          websiteUrl: newWebsiteUrl || undefined,
        }),
      });
      const created = await res.json() as ChecklistSummary;
      setChecklists((prev) => [created, ...prev]);
      setShowNewDialog(false);
      await openChecklist(created.id);
    } finally {
      setIsCreating(false);
    }
  }, [newClientId, newChecklistType, newLabel, newWebsiteUrl, openChecklist]);

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

  // Clients that actually have checklists (for the filter bar)
  const clientsWithChecklists = clients.filter((c) => checklists.some((cl) => cl.clientId === c.id));

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <ClientBackLink />
      <ClientFilterBanner />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardCheck style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Client QA</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Pre-launch checklists for marketing and development</p>
          </div>
        </div>
        <button
          onClick={openNewDialog}
          className="btn btn-primary btn-sm"
          style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          New QA Checklist
        </button>
      </div>

      {/* ── Client filter pills ────────────────────────────────────── */}
      {!activeChecklist && clientsWithChecklists.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setFilterClientIds([])}
            className="btn btn-sm"
            style={{
              padding: "5px 12px", fontSize: 12,
              background: filterClientIds.length === 0 ? "var(--gradient-accent)" : "var(--glass-bg)",
              color: filterClientIds.length === 0 ? "white" : "var(--text-2)",
              border: filterClientIds.length === 0 ? "none" : "1px solid var(--border)",
              boxShadow: filterClientIds.length === 0 ? "0 2px 8px -2px rgba(99,102,241,0.35)" : "var(--glass-shine)",
            }}
          >
            All Clients
          </button>
          {clientsWithChecklists.map((c) => {
            const active = filterClientIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleClientFilter(c.id)}
                className="btn btn-sm"
                style={{
                  padding: "5px 12px", fontSize: 12,
                  background: active ? "var(--accent-bg)" : "var(--glass-bg)",
                  color: active ? "var(--accent-text)" : "var(--text-2)",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border)",
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? "0 0 0 3px rgba(99,102,241,0.08)" : "var(--glass-shine)",
                }}
              >
                {c.name}
                <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-3)" }}>
                  {checklists.filter((cl) => cl.clientId === c.id).length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Create dialog ──────────────────────────────────────────── */}
      {showNewDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: "100%", maxWidth: 420, padding: 28, overflow: "visible" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>New QA Checklist</h2>
              <button onClick={() => setShowNewDialog(false)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Client <span style={{ color: "var(--danger)" }}>*</span></label>
                <select className="form-input" value={newClientId} onChange={(e) => setNewClientId(e.target.value)}>
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Checklist Type</label>
                <select className="form-input" value={newChecklistType} onChange={(e) => setNewChecklistType(e.target.value)}>
                  {CHECKLIST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 5 }}>
                  {newChecklistType === "website" ? "Site name / label" : "Campaign name"}{" "}
                  <span style={{ color: "var(--text-4)" }}>(optional)</span>
                </label>
                <input type="text" className="form-input"
                  placeholder={newChecklistType === "website" ? "e.g. Client Redesign 2025" : "e.g. Summer Sale Campaign"}
                  value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 5 }}>
                  {newChecklistType === "website" ? "Website URL" : "Landing page URL"}{" "}
                  <span style={{ color: "var(--text-4)" }}>(optional)</span>
                </label>
                <input type="url" className="form-input" placeholder="https://example.com"
                  value={newWebsiteUrl} onChange={(e) => setNewWebsiteUrl(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowNewDialog(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={createChecklist}
                disabled={isCreating || !newClientId}
                className="btn btn-primary btn-sm"
                style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
              >
                {isCreating && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                Create Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist list ─────────────────────────────────────────── */}
      {!activeChecklist && (
        <div className="card" style={{ overflow: "hidden" }}>
          {isLoadingChecklists ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px", color: "var(--text-3)", gap: 8 }}>
              <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Loading checklists…</span>
            </div>
          ) : visibleChecklists.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", color: "var(--text-4)", gap: 12 }}>
              <ClipboardCheck style={{ width: 32, height: 32, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>
                {checklists.length === 0 ? "No checklists yet. Create one to get started." : "No checklists match the selected filter."}
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Client", "Type", "Label / URL", "Status", "Updated", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleChecklists.map((cl) => {
                  const typeMeta = CHECKLIST_TYPES.find((t) => t.id === cl.checklistType);
                  const typeBadge = TYPE_BADGE_STYLE[cl.checklistType] ?? TYPE_BADGE_STYLE.website;
                  return (
                    <tr
                      key={cl.id}
                      onClick={() => openChecklist(cl.id)}
                      style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {cl.client?.name ?? "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ ...typeBadge, display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {typeMeta?.label ?? cl.checklistType}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>
                        {cl.label
                          ? <span>{cl.label}{cl.websiteUrl && <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{cl.websiteUrl}</span>}</span>
                          : cl.websiteUrl
                            ? <span style={{ color: "var(--text-2)" }}>{cl.websiteUrl}</span>
                            : <span style={{ color: "var(--text-4)", fontStyle: "italic", fontWeight: 400 }}>No label</span>
                        }
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {cl.status === "complete" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)" }}>
                            <CheckCircle2 style={{ width: 11, height: 11 }} />Approved
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" }}>
                            <AlertTriangle style={{ width: 11, height: 11 }} />In Progress
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {new Date(cl.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === cl.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => deleteChecklist(cl.id)} style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>Confirm</button>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cl.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 6, color: "var(--text-4)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-4)"; }}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
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

      {/* ── Active checklist ───────────────────────────────────────── */}
      {activeChecklist && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Header card */}
          <div className="card" style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Row 1: breadcrumb + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setActiveChecklist(null)} className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: "4px 8px", gap: 4 }}>
                ← All checklists
              </button>
              <span style={{ color: "var(--border)", fontSize: 16 }}>|</span>

              {/* Client — inline select for reassignment */}
              <select
                className="form-input"
                value={activeChecklist.clientId}
                onChange={(e) => changeClient(e.target.value)}
                style={{ width: "auto", fontSize: 13, padding: "4px 28px 4px 10px", height: "auto", borderRadius: "var(--r-sm)", fontWeight: 600, color: "var(--text)", cursor: "pointer" }}
              >
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <span style={{ ...(TYPE_BADGE_STYLE[activeChecklist.checklistType] ?? TYPE_BADGE_STYLE.website), display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                {CHECKLIST_TYPES.find((t) => t.id === activeChecklist.checklistType)?.label ?? activeChecklist.checklistType}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {activeChecklist.label ?? activeChecklist.websiteUrl ?? <span style={{ color: "var(--text-4)", fontStyle: "italic", fontWeight: 400 }}>No label</span>}
              </span>
              {activeChecklist.websiteUrl && activeChecklist.label && (
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{activeChecklist.websiteUrl}</span>
              )}
              {activeChecklist.status === "complete" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)" }}>
                  Approved for launch
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" }}>
                  In Progress
                </span>
              )}
              {isSaving && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)" }}>
                  <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  Saving…
                </span>
              )}
            </div>
            {/* Row 2: actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={markComplete}
                disabled={isSaving}
                className="btn btn-sm"
                style={activeChecklist.status === "complete"
                  ? { gap: 6, display: "inline-flex", alignItems: "center", background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)" }
                  : { gap: 6, display: "inline-flex", alignItems: "center", background: "var(--glass-bg)", color: "var(--text-2)", border: "1px solid var(--border)" }
                }
              >
                <CheckSquare style={{ width: 14, height: 14 }} />
                {activeChecklist.status === "complete" ? "Reopen" : "Mark Complete"}
              </button>
              <button
                onClick={generateAI}
                disabled={isGeneratingAI}
                className="btn btn-sm"
                style={{ gap: 6, display: "inline-flex", alignItems: "center", background: "var(--accent-bg)", color: "var(--accent-text)", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                {isGeneratingAI ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 14, height: 14 }} />}
                Generate AI Sign-off
              </button>
            </div>
          </div>

          {/* Tab / progress selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([
              { label: "Marketing", progress: marketingProgress, tab: "marketing" as const, accentColor: "var(--accent)",   trackColor: "rgba(99,102,241,0.12)" },
              { label: "Development", progress: devProgress,    tab: "dev"       as const, accentColor: "var(--accent-2)", trackColor: "rgba(168,85,247,0.12)" },
            ] as const).map(({ label, progress, tab, accentColor, trackColor }) => {
              const pct = progress && progress.total > 0 ? Math.round((progress.passed / progress.total) * 100) : 0;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="card"
                  style={{
                    textAlign: "left", padding: "18px 20px",
                    border: isActive ? `2px solid ${accentColor}` : "2px solid var(--border)",
                    boxShadow: isActive ? `0 0 0 4px ${trackColor}, var(--shadow-sm)` : undefined,
                    background: "var(--glass-bg)",
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-3)" }}>{label} QA</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-3)" }}>
                      {progress?.passed ?? 0}<span style={{ color: "var(--text-4)" }}>/{progress?.total ?? 0}</span>
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: accentColor, transition: "width 0.5s ease" }} />
                  </div>
                  <p style={{ fontSize: 12, color: isActive ? "var(--text-3)" : "var(--text-4)", marginTop: 8 }}>{pct}% complete</p>
                </button>
              );
            })}
          </div>

          {/* Category accordions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCategories.map((category) => {
              const { passed, total } = categoryProgress(activeChecklist[activeChecksField], category);
              const isExpanded = expandedCategories.has(category.id);
              const checks = JSON.parse(activeChecklist[activeChecksField]) as Record<string, boolean>;
              const allDone = passed === total;

              return (
                <div key={category.id} className="card" style={{ overflow: "visible" }}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", gap: 12 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{category.label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                        background: allDone ? "var(--success-bg)" : "var(--bg)",
                        color: allDone ? "var(--success-text)" : "var(--text-3)",
                        border: `1px solid ${allDone ? "var(--success-border)" : "var(--border)"}`,
                      }}>
                        {passed}/{total}
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronUp style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                      : <ChevronDown style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      {category.items.map((item, idx) => {
                        const isChecked = !!checks[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleCheck(item.id, activeTab)}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 20px",
                              borderBottom: idx < category.items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                              cursor: "pointer", transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                          >
                            <div style={{ marginTop: 1, flexShrink: 0, color: isChecked ? "var(--success)" : "var(--text-4)", transition: "color 0.15s" }}>
                              {isChecked ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <Circle style={{ width: 18, height: 18 }} />}
                            </div>
                            <span style={{ fontSize: 13, lineHeight: 1.6, color: isChecked ? "var(--text-4)" : "var(--text-2)", textDecoration: isChecked ? "line-through" : "none", transition: "all 0.15s" }}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="card" style={{ padding: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>Notes</label>
            <textarea
              value={activeChecklist.notes ?? ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add any notes, context, or outstanding actions…"
              rows={3}
              className="form-input"
              style={{ resize: "none" }}
            />
          </div>

          {/* AI summary */}
          {activeChecklist.aiSummary && (
            <div style={{ background: "var(--accent-bg)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--r-lg)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles style={{ width: 15, height: 15, color: "var(--accent)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-text)" }}>AI Sign-off Summary</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{activeChecklist.aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

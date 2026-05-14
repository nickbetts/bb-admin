"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, ExternalLink, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClickUpFolder {
  id: string;
  name: string;
  spaceName: string;
}

interface ClickUpList {
  id: string;
  name: string;
}

interface ClickUpMember {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

interface ClickUpTaskModalProps {
  lpTitle: string;
  lpId: string;
  clientName?: string;
  onClose: () => void; // called after success OR skip
}

// ─── Predefined checklist items ───────────────────────────────────────────────

const DEFAULT_CHECKLIST_ITEMS = [
  "Conversion tracking set up",
  "Test form submission",
  "Mobile responsiveness checked",
  "Get client sign-off on copy",
  "Get client sign-off on design",
  "UTM parameters configured",
  "Page speed / Core Web Vitals reviewed",
  "QA review completed",
  "Confirm live URL and verify publish",
];

// ─── Shared style constants ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-sm, var(--r))",
  fontSize: 13,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 5,
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 18px",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--r-sm, var(--r))",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 18px",
  background: "none",
  color: "var(--text-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-sm, var(--r))",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClickUpTaskModal({ lpTitle, onClose }: ClickUpTaskModalProps) {
  // Folder / list data
  const [folders, setFolders] = useState<ClickUpFolder[]>([]);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [members, setMembers] = useState<ClickUpMember[]>([]);

  // Selections
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [taskName, setTaskName] = useState(`LP: ${lpTitle}`);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");

  // Checklist toggles — all on by default
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DEFAULT_CHECKLIST_ITEMS.map((item) => [item, true])),
  );

  // Loading / error states
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success state
  const [taskUrl, setTaskUrl] = useState<string | null>(null);

  // ── Load folders on mount ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingFolders(true);
    setFoldersError(null);
    fetch("/api/clickup")
      .then(async (res) => {
        const data = await res.json() as { folders?: ClickUpFolder[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load folders");
        setFolders(data.folders ?? []);
      })
      .catch((err: unknown) => {
        setFoldersError(err instanceof Error ? err.message : "Failed to load folders");
      })
      .finally(() => setLoadingFolders(false));
  }, []);

  // ── Load members independently ────────────────────────────────────────────
  useEffect(() => {
    setLoadingMembers(true);
    fetch("/api/clickup/members")
      .then(async (res) => {
        const data = await res.json() as { members?: ClickUpMember[] };
        setMembers(res.ok ? (data.members ?? []) : []);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  // ── Load lists when folder changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedFolderId) {
      setLists([]);
      setSelectedListId("");
      return;
    }
    setLoadingLists(true);
    setListsError(null);
    setSelectedListId("");
    fetch(`/api/clickup/lists?folderId=${encodeURIComponent(selectedFolderId)}`)
      .then(async (res) => {
        const data = await res.json() as { lists?: ClickUpList[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load lists");
        setLists(data.lists ?? []);
      })
      .catch((err: unknown) => {
        setListsError(err instanceof Error ? err.message : "Failed to load lists");
      })
      .finally(() => setLoadingLists(false));
  }, [selectedFolderId]);

  // ── Toggle a checklist item ────────────────────────────────────────────────
  const toggleItem = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  function toggleAssignee(id: number) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedListId || !taskName.trim()) return;
    const activeItems = DEFAULT_CHECKLIST_ITEMS.filter((item) => checkedItems[item]);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/clickup/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: selectedListId,
          taskName: taskName.trim(),
          checklistItems: activeItems,
          assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
          dueDate: dueDate || undefined,
        }),
      });
      const data = await res.json() as { taskUrl?: string; taskId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create task");
      setTaskUrl(data.taskUrl ?? null);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      // Close on backdrop click only if not in a loading/success state
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !taskUrl) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r)",
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 28,
          position: "relative",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>
                Create ClickUp Task
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 5, marginBottom: 0 }}>
                Landing page created — set up a go-live checklist
              </p>
            </div>
            {!taskUrl && (
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: "var(--text-3)",
                  display: "flex",
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            )}
          </div>
        </div>

        {/* ── Success state ───────────────────────────────────────────────── */}
        {taskUrl && (
          <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--success-bg, #f0fdf4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Check style={{ width: 24, height: 24, color: "var(--success, #16a34a)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Task created successfully!
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
              Your go-live checklist is ready in ClickUp.
            </p>
            <a
              href={taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "var(--r-sm, var(--r))",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 12,
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              Open in ClickUp
            </a>
            <div style={{ marginTop: 12 }}>
              <button onClick={onClose} style={btnSecondary}>
                Continue to landing page
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {!taskUrl && loadingFolders && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 0", color: "var(--text-3)" }}>
            <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading ClickUp workspaces…</span>
          </div>
        )}

        {/* ── Error fetching folders ────────────────────────────────────────── */}
        {!taskUrl && !loadingFolders && foldersError && (
          <div>
            <div
              style={{
                background: "var(--danger-bg, #fef2f2)",
                border: "1px solid var(--danger-border, #fecaca)",
                borderRadius: "var(--r-sm, var(--r))",
                padding: "12px 14px",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 13, color: "var(--danger, #dc2626)", margin: 0 }}>
                {foldersError}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, marginBottom: 0 }}>
                Configure your ClickUp token in <strong>Settings → ClickUp Integration</strong>.
              </p>
            </div>
            <button onClick={onClose} style={btnSecondary}>
              Close
            </button>
          </div>
        )}

        {/* ── Main form ────────────────────────────────────────────────────── */}
        {!taskUrl && !loadingFolders && !foldersError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Client Folder */}
            <div>
              <label style={labelStyle}>Client Folder</label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select a folder…</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                    {folder.spaceName ? ` — ${folder.spaceName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* List */}
            <div>
              <label style={labelStyle}>List</label>
              {loadingLists ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13, height: 38 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  Loading lists…
                </div>
              ) : (
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  style={inputStyle}
                  disabled={!selectedFolderId}
                >
                  <option value="">{selectedFolderId ? "Select a list…" : "Select a folder first"}</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              )}
              {listsError && (
                <p style={{ fontSize: 12, color: "var(--danger, #dc2626)", marginTop: 4 }}>{listsError}</p>
              )}
            </div>

            {/* Task name */}
            <div>
              <label style={labelStyle}>Task Name</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                style={inputStyle}
                placeholder={`LP: ${lpTitle}`}
              />
            </div>

            {/* Assignees */}
            <div>
              <label style={labelStyle}>
                Assign To
                {selectedAssignees.length > 0 && (
                  <span style={{ fontWeight: 400, color: "var(--text-4)", marginLeft: 6 }}>
                    ({selectedAssignees.length} selected)
                  </span>
                )}
              </label>
              {loadingMembers ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13, height: 38 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  Loading members…
                </div>
              ) : members.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0, fontStyle: "italic" }}>No workspace members found</p>
              ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm, var(--r))", overflow: "hidden", maxHeight: 160, overflowY: "auto" }}>
                  {members.map((m, idx) => (
                    <label
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: idx < members.length - 1 ? "1px solid var(--border)" : "none",
                        background: selectedAssignees.includes(m.id) ? "var(--accent-bg, var(--surface))" : "var(--surface)",
                        transition: "background 0.1s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(m.id)}
                        onChange={() => toggleAssignee(m.id)}
                        style={{ accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.3 }}>
                        <span style={{ fontWeight: selectedAssignees.includes(m.id) ? 600 : 400 }}>{m.username}</span>
                        <span style={{ color: "var(--text-4)", marginLeft: 6, fontSize: 12 }}>{m.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Due date */}
            <div>
              <label style={labelStyle}>
                Due Date
                <span style={{ fontWeight: 400, color: "var(--text-4)", marginLeft: 6 }}>(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "auto" }}
              />
            </div>

            {/* Checklist items */}
            <div>
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                Go-Live Checklist
                <span style={{ fontWeight: 400, color: "var(--text-4)", marginLeft: 6 }}>
                  ({DEFAULT_CHECKLIST_ITEMS.filter((i) => checkedItems[i]).length} of {DEFAULT_CHECKLIST_ITEMS.length} selected)
                </span>
              </label>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm, var(--r))",
                  overflow: "hidden",
                }}
              >
                {DEFAULT_CHECKLIST_ITEMS.map((item, idx) => (
                  <label
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      cursor: "pointer",
                      borderBottom: idx < DEFAULT_CHECKLIST_ITEMS.length - 1 ? "1px solid var(--border)" : "none",
                      background: checkedItems[item] ? "var(--accent-bg, var(--surface))" : "var(--surface)",
                      transition: "background 0.1s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems[item] ?? false}
                      onChange={() => toggleItem(item)}
                      style={{ accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: checkedItems[item] ? "var(--text)" : "var(--text-4)",
                        textDecoration: checkedItems[item] ? "none" : "line-through",
                      }}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <p style={{ fontSize: 13, color: "var(--danger, #dc2626)", margin: 0 }}>{submitError}</p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedListId || !taskName.trim()}
                style={{
                  ...btnPrimary,
                  opacity: submitting || !selectedListId || !taskName.trim() ? 0.6 : 1,
                  cursor: submitting || !selectedListId || !taskName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    Creating task…
                  </>
                ) : (
                  "Create ClickUp Task"
                )}
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{ ...btnSecondary, opacity: submitting ? 0.5 : 1 }}
              >
                Skip
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, ExternalLink, RefreshCw } from "lucide-react";

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

const iStyle = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--text)",
  background: "var(--bg)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

const labelSt: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-3)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export function SidebarClickUpPanel() {
  const [folders, setFolders] = useState<ClickUpFolder[]>([]);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [members, setMembers] = useState<ClickUpMember[]>([]);

  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DEFAULT_CHECKLIST_ITEMS.map((item) => [item, true])),
  );

  const [loadingFolders, setLoadingFolders] = useState(true);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [taskUrl, setTaskUrl] = useState<string | null>(null);

  function loadFolders() {
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
  }

  function loadMembers() {
    setLoadingMembers(true);
    fetch("/api/clickup/members")
      .then(async (res) => {
        const data = await res.json() as { members?: ClickUpMember[] };
        setMembers(res.ok ? (data.members ?? []) : []);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }

  useEffect(() => { loadFolders(); loadMembers(); }, []);

  useEffect(() => {
    if (!selectedFolderId) { setLists([]); setSelectedListId(""); return; }
    setLoadingLists(true);
    setSelectedListId("");
    fetch(`/api/clickup/lists?folderId=${encodeURIComponent(selectedFolderId)}`)
      .then(async (res) => {
        const data = await res.json() as { lists?: ClickUpList[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load lists");
        setLists(data.lists ?? []);
      })
      .catch(() => setLists([]))
      .finally(() => setLoadingLists(false));
  }, [selectedFolderId]);

  const toggleItem = (item: string) =>
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));

  function toggleAssignee(id: number) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
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
      const data = await res.json() as { taskUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create task");
      setTaskUrl(data.taskUrl ?? null);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setTaskUrl(null);
    setTaskName("");
    setSelectedFolderId("");
    setSelectedListId("");
    setLists([]);
    setSelectedAssignees([]);
    setDueDate("");
    setCheckedItems(Object.fromEntries(DEFAULT_CHECKLIST_ITEMS.map((item) => [item, true])));
    setSubmitError(null);
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (taskUrl) {
    return (
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--success-bg, #f0fdf4)", border: "1px solid var(--success-border, #bbf7d0)", borderRadius: 8 }}>
          <Check style={{ width: 14, height: 14, color: "var(--success, #16a34a)", flexShrink: 0 }} />
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--success, #16a34a)", margin: 0 }}>Task created!</p>
        </div>
        <a
          href={taskUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
          Open in ClickUp
        </a>
        <button
          onClick={handleReset}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} />
          Create another
        </button>
      </div>
    );
  }

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (loadingFolders) {
    return (
      <div style={{ padding: "16px 12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
        <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 12 }}>Loading workspaces…</span>
      </div>
    );
  }

  if (foldersError) {
    return (
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: 11, color: "var(--danger)", marginBottom: 6, lineHeight: 1.4 }}>{foldersError}</p>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, lineHeight: 1.4 }}>
          Add your token in <strong>Settings → ClickUp Integration</strong>.
        </p>
        <button
          onClick={loadFolders}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} /> Retry
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Folder */}
      <div>
        <label style={labelSt}>Client Folder</label>
        <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} style={iStyle}>
          <option value="">Select folder…</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div>
        <label style={labelSt}>List</label>
        {loadingLists ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 30, color: "var(--text-3)", fontSize: 12 }}>
            <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Loading…
          </div>
        ) : (
          <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} style={iStyle} disabled={!selectedFolderId}>
            <option value="">{selectedFolderId ? "Select list…" : "Select folder first"}</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Task name */}
      <div>
        <label style={labelSt}>Task Name</label>
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="e.g. LP: Summer Campaign"
          style={iStyle}
        />
      </div>

      {/* Assignees */}
      <div>
        <label style={labelSt}>
          Assign To
          {selectedAssignees.length > 0 && (
            <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 4 }}>
              ({selectedAssignees.length} selected)
            </span>
          )}
        </label>
        {loadingMembers ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 11, height: 28 }}>
            <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> Loading…
          </div>
        ) : members.length === 0 ? (
          <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0, fontStyle: "italic" }}>No members found</p>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", maxHeight: 140, overflowY: "auto" }}>
            {members.map((m, idx) => (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px",
                  cursor: "pointer",
                  borderBottom: idx < members.length - 1 ? "1px solid var(--border)" : "none",
                  background: selectedAssignees.includes(m.id) ? "var(--accent-bg, var(--bg))" : "var(--bg)",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAssignees.includes(m.id)}
                  onChange={() => toggleAssignee(m.id)}
                  style={{ accentColor: "var(--accent)", width: 13, height: 13, flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.3, minWidth: 0 }}>
                  <span style={{ fontWeight: selectedAssignees.includes(m.id) ? 600 : 400 }}>{m.username}</span>
                  <span style={{ color: "var(--text-4)", marginLeft: 4 }}>{m.email}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Due date */}
      <div>
        <label style={labelSt}>Due Date <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ ...iStyle, colorScheme: "auto" }}
        />
      </div>

      {/* Checklist */}
      <div>
        <label style={{ ...labelSt, marginBottom: 6 }}>
          Checklist
          <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 4 }}>
            ({DEFAULT_CHECKLIST_ITEMS.filter((i) => checkedItems[i]).length}/{DEFAULT_CHECKLIST_ITEMS.length})
          </span>
        </label>
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          {DEFAULT_CHECKLIST_ITEMS.map((item, idx) => (
            <label
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 8px",
                cursor: "pointer",
                borderBottom: idx < DEFAULT_CHECKLIST_ITEMS.length - 1 ? "1px solid var(--border)" : "none",
                background: checkedItems[item] ? "var(--accent-bg, var(--bg))" : "var(--bg)",
              }}
            >
              <input
                type="checkbox"
                checked={checkedItems[item] ?? false}
                onChange={() => toggleItem(item)}
                style={{ accentColor: "var(--accent)", width: 13, height: 13, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: checkedItems[item] ? "var(--text)" : "var(--text-4)", textDecoration: checkedItems[item] ? "none" : "line-through", lineHeight: 1.4 }}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {submitError && (
        <p style={{ fontSize: 11, color: "var(--danger)", margin: 0 }}>{submitError}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedListId || !taskName.trim()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          padding: "8px 12px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: submitting || !selectedListId || !taskName.trim() ? "not-allowed" : "pointer",
          opacity: submitting || !selectedListId || !taskName.trim() ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        {submitting ? (
          <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Creating…</>
        ) : (
          "Create ClickUp Task"
        )}
      </button>

    </div>
  );
}

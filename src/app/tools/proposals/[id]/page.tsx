"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, Check, X, Trash2, Loader2, RefreshCw } from "lucide-react";

interface ProposalFull {
  id: string;
  title: string;
  clientName: string;
  website: string;
  html: string;
  researchId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProposalViewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/tools/proposals/${id}`);
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json() as { proposal: ProposalFull };
        setProposal(data.proposal);
        setTitleInput(data.proposal.title);
        // Create blob URL for iframe
        const blob = new Blob([data.proposal.html], { type: "text/html" });
        setBlobUrl(URL.createObjectURL(blob));
      } catch { setNotFound(true); } finally {
        setLoading(false);
      }
    }
    load();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveTitle() {
    if (!titleInput.trim() || !proposal) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/tools/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json() as { proposal: ProposalFull };
        setProposal((prev) => prev ? { ...prev, title: data.proposal.title } : prev);
        setEditingTitle(false);
      }
    } finally { setSavingTitle(false); }
  }

  function handleDownload() {
    if (!proposal) return;
    const blob = new Blob([proposal.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposal.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client"}-proposal.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/tools/proposals/${id}`, { method: "DELETE" });
    router.push("/tools/proposals");
  }

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-3)" }} className="animate-spin" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>Proposal not found.</p>
        <Link href="/tools/proposals" className="btn btn-ghost btn-sm" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Proposals
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        borderBottom: "1px solid var(--border-subtle)", background: "var(--surface)", flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <Link href="/tools/proposals" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Proposals
        </Link>

        <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />

        {/* Editable title */}
        {editingTitle ? (
          <form style={{ display: "flex", alignItems: "center", gap: 6 }} onSubmit={(e) => { e.preventDefault(); handleSaveTitle(); }}>
            <input
              autoFocus
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              style={{
                padding: "5px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)",
                border: "1px solid var(--accent)", borderRadius: "var(--r)", background: "var(--surface)",
                minWidth: 280, outline: "none",
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingTitle}>
              {savingTitle ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Check style={{ width: 13, height: 13 }} />}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingTitle(false); setTitleInput(proposal.title); }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{proposal.title}</span>
            <button className="btn btn-ghost btn-sm" style={{ padding: 5 }} onClick={() => setEditingTitle(true)}>
              <Pencil style={{ width: 12, height: 12 }} />
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        {proposal.researchId && (
          <Link href="/tools/keyword-planner" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Source Research
          </Link>
        )}
        <button className="btn btn-secondary btn-sm" style={{ gap: 5 }} onClick={handleDownload}>
          <Download style={{ width: 14, height: 14 }} /> Download HTML
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ gap: 5, color: "#ef4444" }}
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Trash2 style={{ width: 13, height: 13 }} />}
          Delete
        </button>
      </div>

      {/* Proposal iframe preview */}
      {blobUrl && (
        <iframe
          src={blobUrl}
          style={{ flex: 1, border: "none", background: "#fff" }}
          title="Proposal Preview"
          sandbox="allow-same-origin"
        />
      )}
    </div>
  );
}

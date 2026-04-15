"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, Check, X, Trash2, Loader2, RefreshCw, Share2, Copy, Eye, EyeOff, BarChart3, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface ProposalFull {
  id: string;
  title: string;
  clientName: string;
  website: string;
  html: string;
  shareToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  enquiryCount: number;
  researchId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProposalEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

  // Share state
  const [sharingBusy, setSharingBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Enquiries panel
  const [enquiries, setEnquiries] = useState<ProposalEnquiry[]>([]);
  const [enquiriesOpen, setEnquiriesOpen] = useState(false);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

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

  async function handleLoadEnquiries() {
    if (enquiriesLoading) return;
    setEnquiriesOpen((v) => {
      if (!v && enquiries.length === 0) {
        setEnquiriesLoading(true);
        fetch(`/api/tools/proposals/${id}/enquiries`)
          .then((r) => r.json() as Promise<{ enquiries: ProposalEnquiry[] }>)
          .then((data) => setEnquiries(data.enquiries ?? []))
          .finally(() => setEnquiriesLoading(false));
      }
      return !v;
    });
  }

  async function handleToggleShare() {
    if (!proposal) return;
    setSharingBusy(true);
    try {
      const action = proposal.shareToken ? "revoke" : "enable";
      const res = await fetch(`/api/tools/proposals/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json() as { shareToken: string | null };
        setProposal((prev) => prev ? { ...prev, shareToken: data.shareToken } : prev);
      }
    } finally { setSharingBusy(false); }
  }

  function handleCopyShareLink() {
    if (!proposal?.shareToken) return;
    const link = `${window.location.origin}/share/proposal/${proposal.shareToken}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
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
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-3)" }} className="animate-spin" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="page" style={{ textAlign: "center" }}>
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

        {/* Share button */}
        {proposal.shareToken ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-4)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Shared
            </span>
            <button className="btn btn-primary btn-sm" style={{ gap: 5 }} onClick={handleCopyShareLink}>
              {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <Link
              href={`/share/proposal/${proposal.shareToken}`}
              target="_blank"
              className="btn btn-ghost btn-sm"
              style={{ gap: 5 }}
            >
              <Eye style={{ width: 12, height: 12 }} /> Preview
            </Link>
            <button className="btn btn-ghost btn-sm" style={{ gap: 5, color: "#64748b" }} disabled={sharingBusy} onClick={handleToggleShare} title="Revoke share link">
              {sharingBusy ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <EyeOff style={{ width: 12, height: 12 }} />}
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" style={{ gap: 5 }} disabled={sharingBusy} onClick={handleToggleShare}>
            {sharingBusy ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Share2 style={{ width: 13, height: 13 }} />}
            Share with Client
          </button>
        )}

        <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />

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
          style={{ gap: 5, color: "var(--danger)" }}
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Trash2 style={{ width: 13, height: 13 }} />}
          Delete
        </button>
      </div>

      {/* Share info banner */}
      {proposal.shareToken && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 20px",
          background: "var(--success-bg)", borderBottom: "1px solid var(--success-border)", flexShrink: 0, flexWrap: "wrap",
        }}>
          <Share2 style={{ width: 13, height: 13, color: "var(--success)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--success-text)", flex: 1, minWidth: 0 }}>
            Client link:{" "}
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--success-text)", wordBreak: "break-all" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/share/proposal/${proposal.shareToken}` : ""}
            </span>
          </span>
          <button className="btn btn-ghost btn-sm" style={{ gap: 4, fontSize: 11 }} onClick={handleCopyShareLink}>
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {/* View stats + enquiries bar */}
      {(proposal.viewCount > 0 || proposal.enquiryCount > 0) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: "8px 20px",
          background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0, flexWrap: "wrap",
        }}>
          {proposal.viewCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <BarChart3 style={{ width: 13, height: 13, color: "var(--text-3)" }} />
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Viewed <strong style={{ color: "var(--text-2)" }}>{proposal.viewCount} {proposal.viewCount === 1 ? "time" : "times"}</strong>
                {proposal.lastViewedAt && (
                  <> · last seen <strong style={{ color: "var(--text-2)" }}>{timeAgo(proposal.lastViewedAt)}</strong></>
                )}
              </span>
            </div>
          )}
          {proposal.enquiryCount > 0 && (
            <button
              onClick={handleLoadEnquiries}
              style={{
                display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                cursor: "pointer", padding: 0,
              }}
            >
              <MessageSquare style={{ width: 13, height: 13, color: "var(--accent)" }} />
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                {proposal.enquiryCount} {proposal.enquiryCount === 1 ? "enquiry" : "enquiries"}
              </span>
              {enquiriesOpen ? <ChevronUp style={{ width: 12, height: 12, color: "var(--accent)" }} /> : <ChevronDown style={{ width: 12, height: 12, color: "var(--accent)" }} />}
            </button>
          )}
        </div>
      )}

      {/* Enquiries panel */}
      {enquiriesOpen && (
        <div style={{
          background: "var(--bg)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
          maxHeight: 320, overflowY: "auto", padding: "12px 20px",
        }}>
          {enquiriesLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
              <Loader2 style={{ width: 14, height: 14, color: "var(--text-3)" }} className="animate-spin" />
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>Loading enquiries…</span>
            </div>
          ) : enquiries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, padding: "8px 0" }}>No enquiries yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {enquiries.map((enq) => (
                <div key={enq.id} style={{
                  background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 13, color: "var(--text)" }}>{enq.name}</strong>
                      <a href={`mailto:${enq.email}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>{enq.email}</a>
                      {enq.phone && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{enq.phone}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-4)" }}>{timeAgo(enq.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{enq.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proposal iframe preview — use live interactive share page when shared, fall back to static blob */}
      {proposal.shareToken ? (
        <iframe
          src={`/share/proposal/${proposal.shareToken}`}
          style={{ flex: 1, border: "none", background: "var(--surface)" }}
          title="Proposal Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : blobUrl ? (
        <iframe
          src={blobUrl}
          style={{ flex: 1, border: "none", background: "var(--surface)" }}
          title="Proposal Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Preview unavailable</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Share this proposal with the client to preview the interactive version.</p>
          </div>
        </div>
      )}
    </div>
  );
}

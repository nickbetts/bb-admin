"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Plus, Trash2, ExternalLink, Clock, Eye, Share2 } from "lucide-react";

interface ProposalSummary {
  id: string;
  title: string;
  clientName: string;
  website: string;
  shareToken: string | null;
  researchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/proposals");
      if (res.ok) {
        const data = await res.json() as { proposals: ProposalSummary[] };
        setProposals(data.proposals ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this proposal?")) return;
    setDeleting(id);
    await fetch(`/api/tools/proposals/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Client Proposals</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>AI-generated proposals saved from the Keyword Planner</p>
          </div>
        </div>
        <Link href="/tools/keyword-planner" className="btn btn-primary btn-sm" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
          <Plus style={{ width: 14, height: 14 }} /> New from Keyword Planner
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading proposals…</div>
      ) : proposals.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <FileText style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No proposals yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
            Generate a proposal from the Keyword Planner tool — it will be automatically saved here.
          </p>
          <Link href="/tools/keyword-planner" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20 }}>
            <Plus style={{ width: 14, height: 14 }} /> Go to Keyword Planner
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {proposals.map((p) => (
            <div key={p.id} className="card" style={{ padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText style={{ width: 16, height: 16, color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{p.clientName}</span>
                    {p.website && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-4)" }}>{p.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                      </>
                    )}
                    <span style={{ color: "var(--text-4)" }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-4)" }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {p.shareToken && (
                    <Link
                      href={`/share/proposal/${p.shareToken}`}
                      target="_blank"
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 4, color: "#16a34a", fontSize: 11 }}
                      title="Open client link"
                    >
                      <Share2 style={{ width: 11, height: 11 }} /> Shared
                    </Link>
                  )}
                  <Link href={`/tools/proposals/${p.id}`} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                    <Eye style={{ width: 13, height: 13 }} /> View
                  </Link>
                  {p.researchId && (
                    <Link href="/tools/keyword-planner" className="btn btn-ghost btn-sm" style={{ gap: 5 }} title="Open source research">
                      <ExternalLink style={{ width: 13, height: 13 }} /> Research
                    </Link>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 8px", color: "#ef4444" }}
                    disabled={deleting === p.id}
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

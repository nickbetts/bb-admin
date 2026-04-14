"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  Users,
  Share2,
  Copy,
  Check,
  Trash2,
  Globe,
  Clock,
  BarChart3,
} from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";

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

function statusBadge(status: string): { label: string; style: React.CSSProperties } {
  switch (status) {
    case "published":
      return { label: "Published", style: { background: "var(--success-bg)", color: "var(--success-text)" } };
    case "archived":
      return { label: "Archived", style: { background: "var(--warning-bg)", color: "var(--warning-text)" } };
    default:
      return { label: "Draft", style: { background: "var(--border-subtle)", color: "var(--text-3)" } };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/landing-pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data.landingPages ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this landing page?")) return;
    setDeleting(id);
    await fetch(`/api/tools/landing-pages/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  async function handleCopyLink(shareToken: string, id: string) {
    const url = `${window.location.origin}/api/share/landing-page/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleShare(id: string) {
    const res = await fetch(`/api/tools/landing-pages/${id}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      await handleCopyLink(data.shareToken, id);
      load();
    }
  }

  const filtered = pages.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.client?.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Globe style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>LP Generator</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>AI-powered landing pages for ad campaigns</p>
          </div>
        </div>
        <Link href="/tools/landing-pages/new" className="btn btn-primary btn-sm" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
          <Plus style={{ width: 14, height: 14 }} /> New Landing Page
        </Link>
      </div>

      {!loading && pages.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search landing pages..." />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading landing pages…</div>
      ) : pages.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Globe style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No landing pages yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
            Generate your first AI-powered landing page with Claude Sonnet.
          </p>
          <Link href="/tools/landing-pages/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20 }}>
            <Plus style={{ width: 14, height: 14 }} /> Create Landing Page
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card" style={{ padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Globe style={{ width: 16, height: 16, color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                    {p.client && (
                      <>
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{p.client.name}</span>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                      </>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, ...statusBadge(p.status).style }}>
                      {statusBadge(p.status).label}
                    </span>
                    <span style={{ color: "var(--text-4)" }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-4)" }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span style={{ color: "var(--text-4)" }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-4)" }}>
                      v{p._count.versions}
                    </span>
                    {p.viewCount > 0 && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-3)" }}>
                          <BarChart3 style={{ width: 10, height: 10 }} />
                          {p.viewCount} view{p.viewCount !== 1 ? "s" : ""}
                          {p.lastViewedAt && ` · ${timeAgo(p.lastViewedAt)}`}
                        </span>
                      </>
                    )}
                    {p._count.leads > 0 && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                          <Users style={{ width: 10, height: 10 }} />
                          {p._count.leads} lead{p._count.leads !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {p.shareToken ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 4, color: "var(--success)", fontSize: 11 }}
                      onClick={() => handleCopyLink(p.shareToken!, p.id)}
                      title="Copy share link"
                    >
                      {copiedId === p.id ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
                      {copiedId === p.id ? "Copied!" : "Shared"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 4, fontSize: 11 }}
                      onClick={() => handleShare(p.id)}
                      title="Generate share link"
                    >
                      <Share2 style={{ width: 11, height: 11 }} /> Share
                    </button>
                  )}
                  <Link href={`/tools/landing-pages/${p.id}`} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                    <Eye style={{ width: 13, height: 13 }} /> Open
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 8px", color: "var(--danger)" }}
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

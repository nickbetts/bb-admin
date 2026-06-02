"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";
import { ClientFolderGroup } from "@/components/ui/ClientFolderGroup";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface LandingPageItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  shareToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  clientId: string | null;
  platforms: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  user: { id: string; name: string | null; email: string };
  _count: { leads: number; versions: number };
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" role="img" aria-label="Google Ads">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" role="img" aria-label="Meta Ads">
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"
        fill="#1877F2"
      />
      <path
        d="M15.893 14.89l.443-2.89h-2.773v-1.876c0-.791.387-1.562 1.63-1.562h1.26v-2.46s-1.144-.195-2.238-.195c-2.285 0-3.777 1.384-3.777 3.89V12h-2.54v2.89h2.54v6.988a10.06 10.06 0 003.124 0V14.89h2.33z"
        fill="white"
      />
    </svg>
  );
}

function PlatformBadges({ platforms }: { platforms: string }) {
  let list: string[] = [];
  try {
    list = JSON.parse(platforms);
  } catch {
    /* ignore */
  }
  if (!list.length) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      {list.includes("google") && (
        <span
          title="Google Ads"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "1px solid #cfe0fb",
            background: "#f5f9ff",
            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
            flexShrink: 0,
          }}
        >
          <GoogleIcon />
        </span>
      )}
      {list.includes("meta") && (
        <span
          title="Meta Ads"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "1px solid #cde0ff",
            background: "#f4f8ff",
            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
            flexShrink: 0,
          }}
        >
          <MetaIcon />
        </span>
      )}
    </div>
  );
}

function statusBadge(status: string): { label: string; style: React.CSSProperties } {
  switch (status) {
    case "published":
      return {
        label: "Published",
        style: { background: "var(--success-bg)", color: "var(--success-text)" },
      };
    case "archived":
      return {
        label: "Archived",
        style: { background: "var(--warning-bg)", color: "var(--warning-text)" },
      };
    default:
      return {
        label: "Draft",
        style: { background: "var(--border-subtle)", color: "var(--text-3)" },
      };
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
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const confirm = useConfirm();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId
        ? `/api/tools/landing-pages?clientId=${clientId}`
        : "/api/tools/landing-pages";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPages(data.landingPages ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (
      !(await confirm({ title: "Delete this landing page?", confirmLabel: "Delete", danger: true }))
    )
      return;
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

  function renderCard(p: LandingPageItem) {
    return (
      <div key={p.id} className="card" style={{ padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--accent-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Globe style={{ width: 16, height: 16, color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {p.title}
              </p>
              <PlatformBadges platforms={p.platforms} />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              {p.client && clientId && (
                <>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>{p.client.name}</span>
                  <span style={{ color: "var(--text-4)" }}>·</span>
                </>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 99,
                  ...statusBadge(p.status).style,
                }}
              >
                {statusBadge(p.status).label}
              </span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--text-4)",
                }}
              >
                <Clock style={{ width: 10, height: 10 }} />
                {new Date(p.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--text-4)",
                }}
              >
                {p.user.name ?? p.user.email.split("@")[0]}
              </span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--text-4)",
                }}
              >
                v{p._count.versions}
              </span>
              {p.viewCount > 0 && (
                <>
                  <span style={{ color: "var(--text-4)" }}>·</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      color: "var(--text-3)",
                    }}
                  >
                    <BarChart3 style={{ width: 10, height: 10 }} />
                    {p.viewCount} view{p.viewCount !== 1 ? "s" : ""}
                    {p.lastViewedAt && ` · ${timeAgo(p.lastViewedAt)}`}
                  </span>
                </>
              )}
              {p._count.leads > 0 && (
                <>
                  <span style={{ color: "var(--text-4)" }}>·</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 600,
                    }}
                  >
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
                {copiedId === p.id ? (
                  <Check style={{ width: 11, height: 11 }} />
                ) : (
                  <Copy style={{ width: 11, height: 11 }} />
                )}
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
            <Link
              href={`/tools/landing-pages/${p.id}`}
              className="btn btn-ghost btn-sm"
              style={{ gap: 5 }}
            >
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
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <ClientBackLink />
      <ClientFilterBanner />
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Globe style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              LP Generator
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              AI-powered landing pages for ad campaigns
            </p>
          </div>
        </div>
        <Link
          href="/tools/landing-pages/new"
          className="btn btn-primary btn-sm"
          style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New Landing Page
        </Link>
      </div>

      {!loading && pages.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search landing pages..." />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>
          Loading landing pages…
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={<Globe style={{ width: 40, height: 40 }} />}
          title="No landing pages yet"
          description="Generate your first AI-powered landing page with Claude Sonnet."
          actions={[{ label: "Create Landing Page", href: "/tools/landing-pages/new" }]}
        />
      ) : clientId ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(renderCard)}
        </div>
      ) : (
        <ClientFolderGroup items={filtered} getClient={(p) => p.client} renderItem={renderCard} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Map,
  Plus,
  Trash2,
  Eye,
  Share2,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface GrandPlanSummary {
  id: string;
  title: string;
  status: string;
  purpose: string;
  shareToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  generationMs: number | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  _count: { versions: number };
}

export default function GrandPlansPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const confirm = useConfirm();
  const [plans, setPlans] = useState<GrandPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId
        ? `/api/tools/grand-plan?clientId=${clientId}`
        : "/api/tools/grand-plan";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { grandPlans: GrandPlanSummary[] };
        setPlans(data.grandPlans ?? []);
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

  function timeAgo(dateStr: string): string {
    const diff = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000
    );
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Delete this grand plan?", confirmLabel: "Delete", danger: true }))) return;
    setDeleting(id);
    await fetch(`/api/tools/grand-plan/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: "var(--bg-2)", color: "var(--text-3)", label: "Draft" },
      generating: {
        bg: "var(--warning-bg)",
        color: "var(--warning)",
        label: "Generating",
      },
      complete: {
        bg: "var(--success-bg)",
        color: "var(--success)",
        label: "Complete",
      },
      failed: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Failed" },
    };
    const s = map[status] ?? map.draft;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        }}
      >
        {s.label}
      </span>
    );
  };

  const purposeBadge = (purpose: string) => {
    const label =
      purpose === "pitch"
        ? "Pitch"
        : purpose === "onboarding"
        ? "Onboarding"
        : "Strategy";
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: "var(--accent-bg)",
          color: "var(--accent)",
        }}
      >
        {label}
      </span>
    );
  };

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
            <Map style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1,
              }}
            >
              Grand Plans
            </h1>
            <p
              style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}
            >
              AI-generated go-to-market plans combining proposals, campaigns,
              content, and media planning
            </p>
          </div>
        </div>
        <Link
          href="/tools/grand-plan/new"
          className="btn btn-primary btn-sm"
          style={{
            gap: 6,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New Plan
        </Link>
      </div>

      {!loading && plans.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search grand plans..."
          />
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-3)",
            fontSize: 14,
          }}
        >
          <Loader2
            style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }}
          />{" "}
          Loading...
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Map style={{ width: 40, height: 40 }} />}
          title="No grand plans yet"
          description="Create a grand plan to combine your proposals, keyword research, content strategy, and media plans into a single client-facing document."
          actions={[{ label: "Create Grand Plan", href: "/tools/grand-plan/new" }]}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plans
            .filter((p) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                p.title.toLowerCase().includes(q) ||
                p.client?.name.toLowerCase().includes(q)
              );
            })
            .map((p) => (
              <div key={p.id} className="card" style={{ padding: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 20px",
                  }}
                >
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
                    <Map
                      style={{
                        width: 16,
                        height: 16,
                        color: "var(--accent)",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.title}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {p.client && (
                        <span
                          style={{ fontSize: 12, color: "var(--text-3)" }}
                        >
                          {p.client.name}
                        </span>
                      )}
                      <span style={{ color: "var(--text-4)" }}>·</span>
                      {statusBadge(p.status)}
                      {purposeBadge(p.purpose)}
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
                      {p._count.versions > 0 && (
                        <>
                          <span style={{ color: "var(--text-4)" }}>·</span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-4)",
                            }}
                          >
                            v{p._count.versions}
                          </span>
                        </>
                      )}
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
                            {p.viewCount} view
                            {p.viewCount !== 1 ? "s" : ""}
                            {p.lastViewedAt &&
                              ` · ${timeAgo(p.lastViewedAt)}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    {p.shareToken && (
                      <Link
                        href={`/share/grand-plan/${p.shareToken}`}
                        target="_blank"
                        className="btn btn-ghost btn-sm"
                        style={{
                          gap: 4,
                          color: "var(--success)",
                          fontSize: 11,
                        }}
                        title="Open shared link"
                      >
                        <Share2 style={{ width: 11, height: 11 }} /> Shared
                      </Link>
                    )}
                    <Link
                      href={`/tools/grand-plan/${p.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 5 }}
                    >
                      <Eye style={{ width: 13, height: 13 }} /> View
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: "5px 8px",
                        color: "var(--danger)",
                      }}
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

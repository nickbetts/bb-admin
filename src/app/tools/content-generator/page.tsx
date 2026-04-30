"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PencilLine, Plus, Trash2, Eye, Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface ContentGeneratorSummary {
  id: string;
  title: string;
  brief: string;
  contentTypes: string;
  status: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  blog: "Blog",
  whitepaper: "Whitepaper",
  case_study: "Case Study",
  social: "Social",
};

const TYPE_COLOURS: Record<string, string> = {
  blog: "var(--accent)",
  whitepaper: "#7c3aed",
  case_study: "#059669",
  social: "#ea580c",
};

export default function ContentGeneratorPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const confirm = useConfirm();

  const [items, setItems] = useState<ContentGeneratorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId
        ? `/api/tools/content-generator?clientId=${clientId}`
        : "/api/tools/content-generator";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { items: ContentGeneratorSummary[] };
        setItems(data.items ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Delete this content pack?", confirmLabel: "Delete", danger: true }))) return;
    setDeleting(id);
    await fetch(`/api/tools/content-generator/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: "var(--bg-2)", color: "var(--text-3)", label: "Draft" },
      researching: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Researching" },
      ideas_ready: { bg: "var(--accent-bg)", color: "var(--accent)", label: "Ideas Ready" },
      generating: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Generating" },
      complete: { bg: "var(--success-bg)", color: "var(--success)", label: "Complete" },
      failed: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Failed" },
    };
    const s = map[status] ?? map.draft;
    return (
      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  }

  const filtered = items.filter(
    (i) =>
      !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      i.brief.toLowerCase().includes(search.toLowerCase()),
  );

  const newHref = clientId
    ? `/tools/content-generator/new?clientId=${clientId}`
    : "/tools/content-generator/new";

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <ClientBackLink />
      <ClientFilterBanner />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PencilLine style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              Content Generator
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              AI-powered blogs, whitepapers, case studies and social copy — SEO-researched and human-toned
            </p>
          </div>
        </div>
        <Link
          href={newHref}
          className="btn btn-primary btn-sm"
          style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          New Content Pack
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader2 style={{ width: 24, height: 24, color: "var(--text-3)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<PencilLine style={{ width: 32, height: 32 }} />}
          title="No content packs yet"
          description="Generate research-backed blogs, whitepapers, case studies and social media copy for your clients."
          actions={[{ label: "Create Your First Pack", href: newHref }]}
        />
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by title, client, or brief…"
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 14 }}>No results for &quot;{search}&quot;</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((item) => {
                const types = JSON.parse(item.contentTypes) as string[];
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </span>
                        {statusBadge(item.status)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {item.client && (
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{item.client.name}</span>
                        )}
                        <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
                        {types.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "1px 7px",
                              borderRadius: 10,
                              background: `${TYPE_COLOURS[t] ?? "var(--accent)"}18`,
                              color: TYPE_COLOURS[t] ?? "var(--accent)",
                            }}
                          >
                            {TYPE_LABELS[t] ?? t}
                          </span>
                        ))}
                        <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{timeAgo(item.updatedAt)}</span>
                      </div>

                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>
                        {item.brief}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Link
                        href={`/tools/content-generator/${item.id}`}
                        className="btn btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                        View
                      </Link>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        {deleting === item.id
                          ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                          : <Trash2 style={{ width: 13, height: 13 }} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

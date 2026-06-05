"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Globe,
  BookOpen,
  Map,
  ClipboardCheck,
  LogOut,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  permissions: string;
  client: {
    id: string;
    name: string;
    slug: string;
    website: string | null;
    logoUrl: string | null;
  };
}

interface ReportItem {
  id: string;
  title: string;
  period: string;
  shareToken: string | null;
  portalPublishedAt: string | null;
}

interface GrandPlanItem {
  id: string;
  title: string;
  purpose: string;
  shareToken: string | null;
  portalPublishedAt: string | null;
}

interface ContentStrategyItem {
  id: string;
  title: string;
  period: string;
  shareToken: string | null;
  portalPublishedAt: string | null;
}

interface LandingPageItem {
  id: string;
  title: string;
  shareToken: string | null;
  publicSlug: string | null;
  portalPublishedAt: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  clientCompletedAt: string | null;
  category: { name: string; color: string | null; icon: string | null } | null;
}

interface PortalData {
  reports: ReportItem[];
  grandPlans: GrandPlanItem[];
  contentStrategies: ContentStrategyItem[];
  landingPages: LandingPageItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function landingPageUrl(p: LandingPageItem): string | null {
  if (p.shareToken) return `/api/share/landing-page/${p.shareToken}`;
  return null;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/portal/me/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/portal/data").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([me, portalData]: [PortalUser | null, PortalData | null]) => {
        if (!me) {
          router.push("/portal/login");
          return;
        }
        setUser(me);
        setData(portalData);
        const perms: string[] = (() => {
          try {
            return JSON.parse(me.permissions) as string[];
          } catch {
            return [];
          }
        })();
        if (perms.includes("tasks")) {
          void loadTasks();
        }
      })
      .catch(() => router.push("/portal/login"))
      .finally(() => setLoading(false));
  }, [router, loadTasks]);

  async function handleLogout() {
    await fetch("/api/portal/auth", { method: "DELETE" }).catch(() => null);
    router.push("/portal/login");
  }

  async function toggleTask(task: TaskItem) {
    setUpdatingTask(task.id);
    try {
      const done = !task.clientCompletedAt;
      await fetch("/api/portal/me/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done }),
      });
      await loadTasks();
    } finally {
      setUpdatingTask(null);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          style={{ width: 24, height: 24, color: "var(--accent)" }}
          className="animate-spin"
        />
      </div>
    );
  }

  if (!user) return null;

  const permissions: string[] = (() => {
    try {
      return JSON.parse(user.permissions) as string[];
    } catch {
      return [];
    }
  })();
  const openTasks = tasks.filter((t) => !t.clientCompletedAt);
  const doneTasks = tasks.filter((t) => t.clientCompletedAt);

  const sectionConfigs: Array<{
    key: string;
    perm: string;
    icon: typeof FileText;
    iconColor: string;
    title: string;
    items: Array<{
      id: string;
      title: string;
      subtitle: string;
      href: string | null;
      published: string | null;
    }>;
  }> = [
    {
      key: "reports",
      perm: "reports",
      icon: FileText,
      iconColor: "var(--accent)",
      title: "Reports",
      items: (data?.reports ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.period,
        href: r.shareToken ? `/share/report/${r.shareToken}` : null,
        published: r.portalPublishedAt,
      })),
    },
    {
      key: "grandPlans",
      perm: "grand_plans",
      icon: Map,
      iconColor: "#0f172a",
      title: "Grand Plans",
      items: (data?.grandPlans ?? []).map((gp) => ({
        id: gp.id,
        title: gp.title,
        subtitle:
          gp.purpose === "pitch"
            ? "Pitch"
            : gp.purpose === "onboarding"
              ? "Onboarding"
              : "Strategy refresh",
        href: gp.shareToken ? `/share/grand-plan/${gp.shareToken}` : null,
        published: gp.portalPublishedAt,
      })),
    },
    {
      key: "contentStrategies",
      perm: "content_strategies",
      icon: BookOpen,
      iconColor: "#f59e0b",
      title: "Content Strategies",
      items: (data?.contentStrategies ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.period,
        href: s.shareToken ? `/share/content-strategy/${s.shareToken}` : null,
        published: s.portalPublishedAt,
      })),
    },
    {
      key: "landingPages",
      perm: "landing_pages",
      icon: Globe,
      iconColor: "#22c55e",
      title: "Landing Pages",
      items: (data?.landingPages ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.publicSlug ? `/lp/${p.publicSlug}` : "Live preview",
        href: landingPageUrl(p),
        published: p.portalPublishedAt,
      })),
    },
  ];

  const visibleSections = sectionConfigs.filter((s) => permissions.includes(s.perm));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/primary-logo-dark.svg"
            style={{ height: 22, width: "auto" }}
            alt="Betts & Burton"
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {user.client.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{user.name ?? user.email}</span>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
          >
            <LogOut style={{ width: 13, height: 13 }} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ padding: "32px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", marginTop: 6 }}>
            Everything we&rsquo;ve published for you, in one place.
          </p>
        </div>

        {/* Tasks for the client */}
        {permissions.includes("tasks") && (
          <section className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <ClipboardCheck style={{ width: 16, height: 16, color: "var(--accent)" }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Your tasks</h2>
              {openTasks.length > 0 && (
                <span className="badge badge-orange" style={{ fontSize: 11 }}>
                  {openTasks.length} to do
                </span>
              )}
            </div>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No tasks for you right now.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...openTasks, ...doneTasks].map((t) => {
                  const done = !!t.clientCompletedAt;
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: done ? "transparent" : "var(--bg)",
                        border: "1px solid var(--border)",
                        opacity: done ? 0.55 : 1,
                      }}
                    >
                      <button
                        onClick={() => toggleTask(t)}
                        disabled={updatingTask === t.id}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          marginTop: 2,
                        }}
                        aria-label={done ? "Mark as not done" : "Mark as done"}
                      >
                        {updatingTask === t.id ? (
                          <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                        ) : done ? (
                          <CheckCircle2
                            style={{ width: 16, height: 16, color: "var(--success)" }}
                          />
                        ) : (
                          <Circle style={{ width: 16, height: 16, color: "var(--text-3)" }} />
                        )}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                            textDecoration: done ? "line-through" : "none",
                          }}
                        >
                          {t.title}
                        </p>
                        {t.description && (
                          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                            {t.description}
                          </p>
                        )}
                        <div
                          style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}
                        >
                          {t.category && (
                            <span
                              style={{ fontSize: 11, color: t.category.color ?? "var(--text-3)" }}
                            >
                              {t.category.name}
                            </span>
                          )}
                          {t.dueDate && (
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                              Due{" "}
                              {new Date(t.dueDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Deliverable sections */}
        {visibleSections.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>
              We haven&rsquo;t published anything to your portal yet. Your account manager will let
              you know when something is ready.
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.key} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Icon style={{ width: 16, height: 16, color: section.iconColor }} />
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {section.title}
                  </h2>
                </div>
                {section.items.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>Nothing published yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.items.map((item) => {
                      const inner = (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            gap: 12,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </p>
                            <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {item.subtitle}
                              {item.published ? ` · published ${timeAgo(item.published)}` : ""}
                            </p>
                          </div>
                          {item.href && (
                            <ArrowRight
                              style={{
                                width: 14,
                                height: 14,
                                color: "var(--text-3)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>
                      );
                      return item.href ? (
                        <a
                          key={item.id}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          {inner}
                        </a>
                      ) : (
                        <div key={item.id}>{inner}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Check, MessageSquare } from "lucide-react";
import Link from "next/link";

interface PortalTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string } }[];
  dueDate: string | null;
  approvalNotes: string | null;
  internalApprovedAt: string | null;
  updatedAt: string;
}

interface PortalUser {
  id: string;
  permissions: string;
  client: { name: string; slug: string };
}

export default function PortalTasksPage() {
  const router = useRouter();
  const [me, setMe] = useState<PortalUser | null>(null);
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const meRes = await fetch("/api/portal/me");
        if (!meRes.ok) {
          router.push("/portal/login");
          return;
        }
        const meData = await meRes.json() as PortalUser;
        setMe(meData);

        const perms = JSON.parse(meData.permissions || "[]") as string[];
        if (!perms.includes("task_approvals")) {
          router.push("/portal/dashboard");
          return;
        }

        const tasksRes = await fetch("/api/portal/tasks");
        if (tasksRes.ok) setTasks(await tasksRes.json() as PortalTask[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function decide(taskId: string, decision: "approve" | "request_changes") {
    setWorking(taskId);
    try {
      const res = await fetch(`/api/portal/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes[taskId] || undefined }),
      });
      if (res.ok) {
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        setNotes((n) => { const copy = { ...n }; delete copy[taskId]; return copy; });
      }
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link href="/portal/dashboard" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to dashboard
          </Link>
          <h1 className="page-title">Tasks awaiting your review</h1>
          {me && <p className="page-desc">{me.client.name} · {tasks.length} task{tasks.length === 1 ? "" : "s"}</p>}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
          <Check style={{ width: 32, height: 32, color: "var(--success)", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14 }}>You&apos;re all caught up — nothing awaiting your approval.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    {task.category && (
                      <span className="badge" style={{ background: (task.category.color ?? "#64748b") + "22", color: task.category.color ?? "var(--text-2)", fontSize: 11 }}>
                        {task.category.name}
                      </span>
                    )}
                    {task.status === "signed_off_internal" && (
                      <span className="badge badge-purple" style={{ fontSize: 11 }}>Reviewed by team</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>{task.title}</h3>
                  {task.description && (
                    <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>{task.description}</p>
                  )}
                  {task.approvalNotes && (
                    <div style={{ marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text-3)", whiteSpace: "pre-wrap" }}>
                      <strong style={{ color: "var(--text-2)" }}>Notes:</strong>
                      {"\n"}{task.approvalNotes}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="form-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare style={{ width: 13, height: 13 }} /> Optional message to the team
                </label>
                <textarea
                  rows={2}
                  value={notes[task.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [task.id]: e.target.value }))}
                  className="form-input"
                  placeholder="Add any feedback or change requests…"
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={() => void decide(task.id, "request_changes")}
                  disabled={working === task.id}
                  className="btn btn-secondary btn-sm"
                >
                  Request changes
                </button>
                <button
                  onClick={() => void decide(task.id, "approve")}
                  disabled={working === task.id}
                  className="btn btn-primary btn-sm"
                >
                  {working === task.id ? "Saving…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

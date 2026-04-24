"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MailCheck,
  Loader2,
  Upload,
  Send,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";

// ─── Types ─────────────────────────────────────────────────────────────────

interface VerificationRow {
  id: string;
  email: string;
  status: string;
  subStatus: string | null;
  account: string | null;
  domain: string | null;
  mxFound: boolean;
  mxRecord: string | null;
  smtpProvider: string | null;
  didYouMean: string | null;
  freeEmail: boolean;
  role: boolean;
  disposable: boolean;
  toxic: boolean;
  errorMessage: string | null;
  processedAt: string | null;
}

interface JobSummary {
  id: string;
  title: string;
  status: string;
  clientId: string | null;
  totalCount: number;
  processedCount: number;
  validCount: number;
  invalidCount: number;
  catchAllCount: number;
  unknownCount: number;
  abuseCount: number;
  spamtrapCount: number;
  doNotMailCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  client: { name: string } | null;
}

interface JobDetail extends JobSummary {
  results: VerificationRow[];
}

interface SingleResult {
  email: string;
  status: string;
  subStatus: string | null;
  errorMessage: string | null;
  freeEmail: boolean;
  role: boolean;
  disposable: boolean;
  didYouMean: string | null;
  mxFound: boolean;
}

type Tab = "quick" | "bulk" | "history";

// ─── Status styling ────────────────────────────────────────────────────────

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "valid":
      return { background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)" };
    case "catch-all":
      return { background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" };
    case "invalid":
    case "abuse":
    case "spamtrap":
    case "do_not_mail":
      return { background: "var(--danger-bg)", color: "var(--danger-text)", border: "1px solid var(--danger-border)" };
    default:
      return { background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" };
  }
}

function StatusPill({ status, subStatus }: { status: string; subStatus?: string | null }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      title={subStatus ?? undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        ...statusStyle(status),
      }}
    >
      {label}
      {subStatus ? <span style={{ opacity: 0.7, fontWeight: 400 }}>· {subStatus.replace(/_/g, " ")}</span> : null}
    </span>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function EmailVerifierPage() {
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const urlClientName = searchParams.get("clientName");

  const [tab, setTab] = useState<Tab>("quick");

  // Credits
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Quick check
  const [quickInput, setQuickInput] = useState("");
  const [quickResults, setQuickResults] = useState<SingleResult[]>([]);
  const [quickRunning, setQuickRunning] = useState(false);
  const [quickProgress, setQuickProgress] = useState({ done: 0, total: 0 });

  // Bulk
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobDetail | null>(null);
  const [polling, setPolling] = useState(false);

  // History
  const [history, setHistory] = useState<JobSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const pollAbortRef = useRef(false);

  // ─── Loaders ─────────────────────────────────────────────────────────────
  const refreshCredits = useCallback(async () => {
    setLoadingCredits(true);
    try {
      const res = await fetch("/api/tools/email-verifier/credits");
      if (res.ok) {
        const data = (await res.json()) as { credits: number | null };
        setCredits(data.credits);
      }
    } catch {
      // Silent — surfaced when user actually tries to verify.
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const url = urlClientId
        ? `/api/tools/email-verifier/jobs?clientId=${encodeURIComponent(urlClientId)}`
        : "/api/tools/email-verifier/jobs";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { jobs: JobSummary[] };
        setHistory(data.jobs);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [urlClientId]);

  useEffect(() => {
    refreshCredits();
    refreshHistory();
  }, [refreshCredits, refreshHistory]);

  // ─── Quick check ─────────────────────────────────────────────────────────
  async function runQuickCheck() {
    setError(null);
    const lines = quickInput
      .split(/\r?\n|,|;/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const unique = Array.from(new Set(lines)).slice(0, 20);
    if (unique.length === 0) {
      setError("Paste at least one email address (one per line).");
      return;
    }

    setQuickRunning(true);
    setQuickResults([]);
    setQuickProgress({ done: 0, total: unique.length });
    try {
      for (const email of unique) {
        const res = await fetch("/api/tools/email-verifier/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          setError(errBody.error ?? "Verification failed");
          break;
        }
        const data = (await res.json()) as { result: SingleResult };
        setQuickResults((prev) => [...prev, data.result]);
        setQuickProgress((prev) => ({ done: prev.done + 1, total: prev.total }));
      }
      refreshCredits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quick check failed");
    } finally {
      setQuickRunning(false);
    }
  }

  // ─── Bulk submit + polling ───────────────────────────────────────────────
  async function submitBulk() {
    setError(null);
    setActiveJob(null);
    setActiveJobId(null);

    let response: Response;
    try {
      if (bulkFile) {
        const formData = new FormData();
        formData.append("file", bulkFile);
        if (bulkTitle.trim()) formData.append("title", bulkTitle.trim());
        if (urlClientId) formData.append("clientId", urlClientId);
        setBulkSubmitting(true);
        response = await fetch("/api/tools/email-verifier/jobs", { method: "POST", body: formData });
      } else {
        const emails = bulkText
          .split(/\r?\n|,|;/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        if (emails.length === 0) {
          setError("Paste emails or upload a CSV/XLSX file.");
          return;
        }
        setBulkSubmitting(true);
        response = await fetch("/api/tools/email-verifier/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails,
            title: bulkTitle.trim() || undefined,
            clientId: urlClientId ?? null,
          }),
        });
      }
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `Server returned ${response.status}`);
      }
      const data = (await response.json()) as { jobId: string; totalCount: number };
      setActiveJobId(data.jobId);
      setBulkFile(null);
      setBulkText("");
      setBulkTitle("");
      await refreshHistory();
      await pollJob(data.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk submission failed");
    } finally {
      setBulkSubmitting(false);
    }
  }

  const pollJob = useCallback(
    async (jobId: string) => {
      setPolling(true);
      pollAbortRef.current = false;
      try {
        let safety = 0;
        while (!pollAbortRef.current && safety < 1000) {
          safety++;
          // Trigger next batch.
          const runRes = await fetch(`/api/tools/email-verifier/jobs/${jobId}/run`, { method: "POST" });
          if (!runRes.ok) {
            const errBody = (await runRes.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? "Verification failed");
          }
          const runData = (await runRes.json()) as { status: string; processedCount: number; totalCount: number };

          // Refresh job detail for live UI.
          const detailRes = await fetch(`/api/tools/email-verifier/jobs/${jobId}`);
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as { job: JobDetail };
            setActiveJob(detail.job);
          }

          if (runData.status === "complete") break;
          // Brief pause to keep UI smooth and avoid hammering.
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await refreshCredits();
        await refreshHistory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Polling failed");
      } finally {
        setPolling(false);
      }
    },
    [refreshCredits, refreshHistory],
  );

  async function loadJob(jobId: string) {
    setActiveJobId(jobId);
    setActiveJob(null);
    try {
      const res = await fetch(`/api/tools/email-verifier/jobs/${jobId}`);
      if (res.ok) {
        const data = (await res.json()) as { job: JobDetail };
        setActiveJob(data.job);
      }
    } catch {
      // ignore
    }
  }

  async function deleteJob(jobId: string) {
    try {
      await fetch(`/api/tools/email-verifier/jobs/${jobId}`, { method: "DELETE" });
      if (activeJobId === jobId) {
        setActiveJobId(null);
        setActiveJob(null);
      }
      await refreshHistory();
    } catch {
      // ignore
    } finally {
      setConfirmDeleteId(null);
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const liveJob = activeJob;
  const progress = liveJob && liveJob.totalCount > 0 ? liveJob.processedCount / liveJob.totalCount : 0;

  const tableColumns: DataTableColumn<VerificationRow>[] = useMemo(
    () => [
      { key: "email", label: "Email", sortable: true, minWidth: "220px" },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (_v, row) => <StatusPill status={row.status} subStatus={row.subStatus} />,
      },
      { key: "subStatus", label: "Sub-status", sortable: true, render: (_v, row) => row.subStatus ?? "—" },
      { key: "domain", label: "Domain", sortable: true, render: (_v, row) => row.domain ?? "—" },
      {
        key: "flags",
        label: "Flags",
        render: (_v, row) => {
          const flags: string[] = [];
          if (row.role) flags.push("role");
          if (row.disposable) flags.push("disposable");
          if (row.freeEmail) flags.push("free");
          if (row.toxic) flags.push("toxic");
          if (!row.mxFound) flags.push("no-mx");
          return flags.length ? flags.join(", ") : "—";
        },
      },
      { key: "didYouMean", label: "Did you mean?", render: (_v, row) => row.didYouMean ?? "—" },
      { key: "smtpProvider", label: "SMTP", render: (_v, row) => row.smtpProvider ?? "—" },
    ],
    [],
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px 80px" }}>
      <ClientBackLink />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--accent-bg)",
              color: "var(--accent)",
            }}
          >
            <MailCheck style={{ width: 20, height: 20 }} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Email Verifier</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              Validate email addresses one-by-one or in bulk via ZeroBounce.
            </p>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              padding: "6px 10px",
              borderRadius: 999,
            }}
          >
            {loadingCredits ? "Loading credits…" : credits === null ? "Credits unavailable" : `${credits.toLocaleString()} credits`}
          </span>
          <button
            type="button"
            onClick={refreshCredits}
            title="Refresh credit balance"
            style={iconBtnStyle}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </header>

      <ClientFilterBanner />

      {error ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "var(--danger-bg)",
            color: "var(--danger-text)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--r)",
            fontSize: 13,
            margin: "12px 0",
          }}
        >
          <AlertTriangle style={{ width: 14, height: 14 }} />
          {error}
        </div>
      ) : null}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginTop: 16 }}>
        {([
          { key: "quick", label: "Quick check" },
          { key: "bulk", label: "Bulk verification" },
          { key: "history", label: "History" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t.key ? "var(--text)" : "var(--text-3)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUICK ─────────────────────────────────────────────── */}
      {tab === "quick" && (
        <section style={cardStyle}>
          <label style={labelStyle}>Paste emails (one per line, max 20)</label>
          <textarea
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={"alice@example.com\nbob@example.com"}
            rows={6}
            style={textareaStyle}
            disabled={quickRunning}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {quickRunning
                ? `Verifying ${quickProgress.done + 1} of ${quickProgress.total}…`
                : "Each address consumes one ZeroBounce credit."}
            </span>
            <button type="button" onClick={runQuickCheck} disabled={quickRunning || !quickInput.trim()} style={primaryBtnStyle}>
              {quickRunning ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Send style={{ width: 14, height: 14 }} />}
              {quickRunning ? "Verifying…" : "Verify"}
            </button>
          </div>

          {quickResults.length > 0 && (
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {quickResults.map((r, idx) => (
                <div
                  key={`${r.email}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <StatusIcon status={r.status} />
                    <span style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.email}</span>
                    {r.didYouMean ? (
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>· did you mean <strong>{r.didYouMean}</strong>?</span>
                    ) : null}
                  </div>
                  <StatusPill status={r.status} subStatus={r.subStatus} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── BULK ──────────────────────────────────────────────── */}
      {tab === "bulk" && (
        <section style={cardStyle}>
          <label style={labelStyle}>Job title (optional)</label>
          <input
            type="text"
            value={bulkTitle}
            onChange={(e) => setBulkTitle(e.target.value)}
            placeholder={urlClientName ? `${urlClientName} — list cleanup` : "List cleanup"}
            style={inputStyle}
            disabled={bulkSubmitting || polling}
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>Upload CSV / XLSX</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={fileBtnStyle}>
              <Upload style={{ width: 14, height: 14 }} />
              {bulkFile ? bulkFile.name : "Choose file"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
                disabled={bulkSubmitting || polling}
              />
            </label>
            {bulkFile && (
              <button type="button" onClick={() => setBulkFile(null)} style={iconBtnStyle} title="Clear file">
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            )}
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              First column with “email” in the header is used; otherwise any cell containing “@”.
            </span>
          </div>

          <label style={{ ...labelStyle, marginTop: 16 }}>Or paste emails (one per line)</label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
            rows={6}
            style={textareaStyle}
            disabled={bulkSubmitting || polling || !!bulkFile}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {urlClientId
                ? `Job will be tagged to ${urlClientName ?? "the selected client"}.`
                : "Job will be saved to your personal history."}
            </span>
            <button
              type="button"
              onClick={submitBulk}
              disabled={bulkSubmitting || polling || (!bulkFile && !bulkText.trim())}
              style={primaryBtnStyle}
            >
              {bulkSubmitting || polling ? (
                <Loader2 style={{ width: 14, height: 14 }} className="spin" />
              ) : (
                <Send style={{ width: 14, height: 14 }} />
              )}
              {bulkSubmitting ? "Uploading…" : polling ? "Verifying…" : "Start verification"}
            </button>
          </div>

          {liveJob && activeJobId && (
            <ActiveJobView job={liveJob} progress={progress} columns={tableColumns} polling={polling} />
          )}
        </section>
      )}

      {/* ── HISTORY ───────────────────────────────────────────── */}
      {tab === "history" && (
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Past verifications</h2>
            <button type="button" onClick={refreshHistory} style={iconBtnStyle} title="Refresh">
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {historyLoading ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>Loading…</p>
          ) : history.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>No jobs yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((job) => (
                <div
                  key={job.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    background: activeJobId === job.id ? "var(--accent-bg)" : "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    cursor: "pointer",
                  }}
                  onClick={() => loadJob(job.id)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{job.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      {new Date(job.createdAt).toLocaleString("en-GB")}
                      {job.client?.name ? ` · ${job.client.name}` : ""}
                      {" · "}
                      {job.processedCount}/{job.totalCount} processed
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusPill status={job.status === "complete" ? "valid" : job.status === "failed" ? "invalid" : "unknown"} subStatus={job.status} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(job.id);
                      }}
                      style={iconBtnStyle}
                      title="Delete job"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {liveJob && activeJobId && tab === "history" && (
            <ActiveJobView job={liveJob} progress={progress} columns={tableColumns} polling={polling} />
          )}
        </section>
      )}

      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: 20,
              maxWidth: 380,
              width: "calc(100% - 32px)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Delete verification job</h3>
            <p style={{ margin: "8px 0 16px", fontSize: 13, color: "var(--text-2)" }}>
              This permanently removes the job and its results. Continue?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setConfirmDeleteId(null)} style={fileBtnStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteId && deleteJob(confirmDeleteId)}
                style={{ ...primaryBtnStyle, background: "var(--danger-text)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

// ─── Active job view ───────────────────────────────────────────────────────

function ActiveJobView({
  job,
  progress,
  columns,
  polling,
}: {
  job: JobDetail;
  progress: number;
  columns: DataTableColumn<VerificationRow>[];
  polling: boolean;
}) {
  return (
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{job.title}</h3>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          {job.processedCount}/{job.totalCount} processed
          {polling ? " · polling…" : ""}
        </span>
      </div>

      <ProgressBar value={Math.round(progress * 100)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 14 }}>
        <Tile label="Valid" value={job.validCount} tone="success" />
        <Tile label="Invalid" value={job.invalidCount} tone="danger" />
        <Tile label="Catch-all" value={job.catchAllCount} tone="warning" />
        <Tile label="Unknown" value={job.unknownCount} tone="muted" />
        <Tile label="Abuse" value={job.abuseCount} tone="danger" />
        <Tile label="Spamtrap" value={job.spamtrapCount} tone="danger" />
        <Tile label="Do not mail" value={job.doNotMailCount} tone="danger" />
      </div>

      {job.errorMessage ? (
        <p style={{ marginTop: 12, color: "var(--danger-text)", fontSize: 12 }}>
          {job.errorMessage}
        </p>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <DataTable
          data={job.results}
          columns={columns}
          searchable
          searchPlaceholder="Filter by email, status, domain…"
          exportable
          exportFilename={`email-verification-${job.id}`}
          pageSize={25}
          stickyHeader
        />
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "warning" | "muted" }) {
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: "var(--success-bg)", color: "var(--success-text)", border: "var(--success-border)" },
    danger: { bg: "var(--danger-bg)", color: "var(--danger-text)", border: "var(--danger-border)" },
    warning: { bg: "var(--warning-bg)", color: "var(--warning-text)", border: "var(--warning-border)" },
    muted: { bg: "var(--surface-2)", color: "var(--text-2)", border: "var(--border)" },
  };
  const p = palette[tone];
  return (
    <div
      style={{
        padding: "10px 12px",
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: "var(--r)",
        color: p.color,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const size = 14;
  if (status === "valid") return <CheckCircle2 style={{ width: size, height: size, color: "var(--success-text)" }} />;
  if (status === "catch-all") return <ShieldAlert style={{ width: size, height: size, color: "var(--warning-text)" }} />;
  if (status === "invalid" || status === "abuse" || status === "spamtrap" || status === "do_not_mail")
    return <XCircle style={{ width: size, height: size, color: "var(--danger-text)" }} />;
  return <HelpCircle style={{ width: size, height: size, color: "var(--text-3)" }} />;
}

// ─── Inline styles ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 20,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-2)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  color: "var(--text)",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "inherit",
  resize: "vertical",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: "var(--r)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-2)",
  cursor: "pointer",
};

const fileBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 13,
  cursor: "pointer",
  color: "var(--text-2)",
};

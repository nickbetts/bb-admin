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
  ChevronDown,
  ChevronUp,
  Calculator,
} from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";
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
  userId: string;
  createdByName?: string;
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
}

type Tab = "quick" | "bulk" | "history" | "calculator";

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
  const [quickEmails, setQuickEmails] = useState<string[]>([""]);
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
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set());

  // Calculator
  const [calcEmails, setCalcEmails] = useState("");
  const [calcClientRate, setCalcClientRate] = useState("");
  const [calcRateMode, setCalcRateMode] = useState<"per_email" | "flat">("per_email");

  const [error, setError] = useState<string | null>(null);

  const pollAbortRef = useRef(false);

  function toggleResultExpand(id: string) {
    setExpandedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
  function setQuickEmail(idx: number, value: string) {
    setQuickEmails((prev) => prev.map((e, i) => (i === idx ? value : e)));
  }
  function addQuickEmail() {
    setQuickEmails((prev) => [...prev, ""]);
  }
  function removeQuickEmail(idx: number) {
    setQuickEmails((prev) => prev.length === 1 ? [""] : prev.filter((_, i) => i !== idx));
  }

  async function runQuickCheck() {
    setError(null);
    const unique = Array.from(
      new Set(quickEmails.map((s) => s.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 20);
    if (unique.length === 0) {
      setError("Enter at least one email address.");
      return;
    }

    setQuickRunning(true);
    setQuickResults([]);
    setQuickProgress({ done: 0, total: unique.length });
    const collected: SingleResult[] = [];
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
        collected.push(data.result);
        setQuickResults((prev) => [...prev, data.result]);
        setQuickProgress((prev) => ({ done: prev.done + 1, total: prev.total }));
      }
      // Persist to history.
      if (collected.length > 0) {
        await fetch("/api/tools/email-verifier/jobs/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            results: collected,
            clientId: urlClientId ?? null,
          }),
        });
        await refreshHistory();
      }
      await refreshCredits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quick check failed");
    } finally {
      setQuickRunning(false);
    }
  }

  const quickHasValues = quickEmails.some((e) => e.trim().length > 0);

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
          { key: "calculator", label: "Calculator" },
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quickEmails.map((email, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setQuickEmail(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (idx === quickEmails.length - 1 && quickEmails.length < 20) addQuickEmail();
                    }
                  }}
                  placeholder="email@example.com"
                  style={{ ...inputStyle, flex: 1 }}
                  disabled={quickRunning}
                  autoFocus={idx === quickEmails.length - 1 && idx > 0}
                />
                {quickEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuickEmail(idx)}
                    disabled={quickRunning}
                    title="Remove"
                    style={iconBtnStyle}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={addQuickEmail}
              disabled={quickRunning || quickEmails.length >= 20}
              style={{ ...fileBtnStyle, fontSize: 12 }}
            >
              + Add another email
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                {quickRunning
                  ? `Verifying ${quickProgress.done + 1} of ${quickProgress.total}…`
                  : "Each address consumes one credit."}
              </span>
              <button type="button" onClick={runQuickCheck} disabled={quickRunning || !quickHasValues} style={primaryBtnStyle}>
                {quickRunning ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Send style={{ width: 14, height: 14 }} />}
                {quickRunning ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>

          {quickResults.length > 0 && (
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {quickResults.map((r, idx) => {
                const key = `${r.email}-${idx}`;
                const isOpen = expandedResultIds.has(key);
                const flags: string[] = [];
                if (r.role) flags.push("Role address");
                if (r.disposable) flags.push("Disposable");
                if (r.freeEmail) flags.push("Free provider");
                if (r.toxic) flags.push("Toxic");
                if (!r.mxFound) flags.push("No MX record");
                return (
                  <div
                    key={key}
                    style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", background: "var(--surface)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleResultExpand(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <StatusIcon status={r.status} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.email}
                      </span>
                      {r.didYouMean && (
                        <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>→ {r.didYouMean}?</span>
                      )}
                      {flags.length > 0 && (
                        <span style={{ fontSize: 10, color: "var(--warning-text)", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
                          {flags.length} flag{flags.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <StatusPill status={r.status} subStatus={r.subStatus} />
                      {isOpen ? <ChevronUp style={{ width: 13, height: 13, color: "var(--text-3)", flexShrink: 0 }} /> : <ChevronDown style={{ width: 13, height: 13, color: "var(--text-3)", flexShrink: 0 }} />}
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--surface-2)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 16px" }}>
                        <DetailField label="Status" value={r.status} />
                        <DetailField label="Sub-status" value={r.subStatus} />
                        <DetailField label="Domain" value={r.domain} />
                        <DetailField label="Account" value={r.account} />
                        <DetailField label="MX found" value={r.mxFound ? "Yes" : "No"} highlight={!r.mxFound ? "warn" : undefined} />
                        <DetailField label="MX record" value={r.mxRecord} />
                        <DetailField label="SMTP provider" value={r.smtpProvider} />
                        <DetailField label="Free email" value={r.freeEmail ? "Yes" : "No"} />
                        <DetailField label="Role address" value={r.role ? "Yes" : "No"} highlight={r.role ? "warn" : undefined} />
                        <DetailField label="Disposable" value={r.disposable ? "Yes" : "No"} highlight={r.disposable ? "danger" : undefined} />
                        <DetailField label="Toxic" value={r.toxic ? "Yes" : "No"} highlight={r.toxic ? "danger" : undefined} />
                        {r.didYouMean && <DetailField label="Did you mean?" value={r.didYouMean} highlight="warn" />}
                        {r.errorMessage && <DetailField label="Error" value={r.errorMessage} highlight="danger" />}
                      </div>
                    )}
                  </div>
                );
              })}
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
            <ActiveJobView job={liveJob} progress={progress} polling={polling} expandedIds={expandedResultIds} onToggleExpand={toggleResultExpand} />
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((job) => {
                const isQuick = job.title.startsWith("Quick check");
                const creditsUsed = job.processedCount;
                const creditCost = (creditsUsed * 0.014).toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 3 });
                return (
                  <div
                    key={job.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      background: activeJobId === job.id ? "var(--accent-bg)" : "var(--surface)",
                      border: `1px solid ${activeJobId === job.id ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--r)",
                      cursor: "pointer",
                    }}
                    onClick={() => loadJob(job.id)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Title + source badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{job.title}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 6px",
                          borderRadius: 4, border: "1px solid",
                          background: isQuick ? "var(--accent-bg)" : "var(--surface-2)",
                          color: isQuick ? "var(--accent)" : "var(--text-3)",
                          borderColor: isQuick ? "var(--accent)" : "var(--border)",
                        }}>
                          {isQuick ? "Quick" : "Bulk"}
                        </span>
                        {job.client?.name && (
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{job.client.name}</span>
                        )}
                      </div>
                      {/* Meta row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {new Date(job.createdAt).toLocaleString("en-GB")}
                        </span>
                        {job.createdByName && (
                          <span style={{ fontSize: 11, color: "var(--text-2)" }}>by {job.createdByName}</span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>
                          {job.processedCount.toLocaleString()} email{job.processedCount !== 1 ? "s" : ""} verified
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {creditsUsed} credit{creditsUsed !== 1 ? "s" : ""} · {creditCost}
                        </span>
                        {job.totalCount > job.processedCount && (
                          <span style={{ fontSize: 11, color: "var(--warning-text)" }}>
                            {job.totalCount - job.processedCount} pending
                          </span>
                        )}
                      </div>
                      {/* Mini result bar */}
                      {job.processedCount > 0 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {job.validCount > 0 && <span style={{ fontSize: 10, color: "var(--success-text)" }}>✓ {job.validCount} valid</span>}
                          {job.invalidCount > 0 && <span style={{ fontSize: 10, color: "var(--danger-text)" }}>✗ {job.invalidCount} invalid</span>}
                          {job.catchAllCount > 0 && <span style={{ fontSize: 10, color: "var(--warning-text)" }}>~ {job.catchAllCount} catch-all</span>}
                          {(job.abuseCount + job.spamtrapCount + job.doNotMailCount) > 0 && (
                            <span style={{ fontSize: 10, color: "var(--danger-text)" }}>⚠ {job.abuseCount + job.spamtrapCount + job.doNotMailCount} risky</span>
                          )}
                          {job.unknownCount > 0 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>? {job.unknownCount} unknown</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <StatusPill
                        status={job.status === "complete" ? "valid" : job.status === "failed" ? "invalid" : "unknown"}
                        subStatus={job.status}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(job.id); }}
                        style={iconBtnStyle}
                        title="Delete job"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {liveJob && activeJobId && tab === "history" && (
            <ActiveJobView job={liveJob} progress={progress} polling={polling} expandedIds={expandedResultIds} onToggleExpand={toggleResultExpand} />
          )}
        </section>
      )}

      {/* ── CALCULATOR ────────────────────────────────────────── */}
      {tab === "calculator" && (
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Calculator style={{ width: 16, height: 16, color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Pricing calculator</h2>
          </div>

          {/* Credit cost info banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--r)", marginBottom: 20, fontSize: 13,
          }}>
            <span style={{ color: "var(--text-2)" }}>Our cost per credit (email verified):</span>
            <strong style={{ color: "var(--text)", fontSize: 14 }}>£0.014</strong>
            {credits !== null && (
              <span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: 12 }}>
                {credits.toLocaleString()} credits remaining
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Inputs */}
            <div>
              <label style={labelStyle}>Number of emails to verify</label>
              <input
                type="number"
                min={1}
                value={calcEmails}
                onChange={(e) => setCalcEmails(e.target.value)}
                placeholder="e.g. 5000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Charge to client</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={calcRateMode}
                  onChange={(e) => setCalcRateMode(e.target.value as "per_email" | "flat")}
                  style={{ ...inputStyle, width: "auto", paddingRight: 28 }}
                >
                  <option value="per_email">Per email (£)</option>
                  <option value="flat">Flat fee (£)</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={calcClientRate}
                  onChange={(e) => setCalcClientRate(e.target.value)}
                  placeholder={calcRateMode === "per_email" ? "e.g. 0.05" : "e.g. 250"}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* Results */}
          {(() => {
            const emailCount = parseFloat(calcEmails);
            const rate = parseFloat(calcClientRate);
            if (!emailCount || emailCount <= 0 || !rate || rate < 0) return null;

            const OUR_COST_PER_EMAIL = 0.014;
            const totalOurCost = emailCount * OUR_COST_PER_EMAIL;
            const totalRevenue = calcRateMode === "per_email" ? emailCount * rate : rate;
            const profit = totalRevenue - totalOurCost;
            const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
            const markup = totalOurCost > 0 ? (profit / totalOurCost) * 100 : 0;

            const fmt = (n: number) =>
              new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

            const rows: { label: string; value: string; tone?: "success" | "danger" | "muted" }[] = [
              { label: "Emails to verify", value: emailCount.toLocaleString("en-GB") },
              { label: "Our cost", value: fmt(totalOurCost), tone: "danger" },
              {
                label: calcRateMode === "per_email"
                  ? `Client charge (${fmt(rate)} × ${emailCount.toLocaleString("en-GB")})`
                  : "Client charge (flat fee)",
                value: fmt(totalRevenue),
                tone: "muted",
              },
              { label: "Gross profit", value: fmt(profit), tone: profit >= 0 ? "success" : "danger" },
              { label: "Profit margin", value: `${margin.toFixed(1)}%`, tone: profit >= 0 ? "success" : "danger" },
              { label: "Markup on cost", value: `${markup.toFixed(1)}%`, tone: profit >= 0 ? "success" : "danger" },
            ];

            return (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
                {rows.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>{row.label}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: row.tone === "success" ? "var(--success-text)"
                        : row.tone === "danger" ? "var(--danger-text)"
                        : "var(--text)",
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <p style={{ marginTop: 14, fontSize: 11, color: "var(--text-3)" }}>
            Based on £0.014 per ZeroBounce credit. Figures are pre-tax estimates only.
          </p>
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
  polling,
  expandedIds,
  onToggleExpand,
}: {
  job: JobDetail;
  progress: number;
  polling: boolean;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return job.results;
    return job.results.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.subStatus ?? "").toLowerCase().includes(q) ||
        (r.domain ?? "").toLowerCase().includes(q),
    );
  }, [job.results, filter]);

  function exportCsv() {
    const header = "email,status,sub_status,domain,mx_found,mx_record,smtp_provider,free_email,role,disposable,toxic,did_you_mean,error\n";
    const rows = job.results
      .map((r) =>
        [
          r.email, r.status, r.subStatus ?? "", r.domain ?? "",
          r.mxFound, r.mxRecord ?? "", r.smtpProvider ?? "",
          r.freeEmail, r.role, r.disposable, r.toxic,
          r.didYouMean ?? "", r.errorMessage ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `email-verification-${job.id}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

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
        <p style={{ marginTop: 12, color: "var(--danger-text)", fontSize: 12 }}>{job.errorMessage}</p>
      ) : null}

      {job.results.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input
              type="search"
              placeholder="Filter by email, status, domain…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 12 }}
            />
            <button type="button" onClick={exportCsv} style={{ ...fileBtnStyle, fontSize: 12, whiteSpace: "nowrap" }}>
              Export CSV
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map((r) => {
              const isOpen = expandedIds.has(r.id);
              const flags: string[] = [];
              if (r.role) flags.push("Role address");
              if (r.disposable) flags.push("Disposable");
              if (r.freeEmail) flags.push("Free provider");
              if (r.toxic) flags.push("Toxic");
              if (!r.mxFound) flags.push("No MX record");

              return (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    overflow: "hidden",
                    background: "var(--surface)",
                  }}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => onToggleExpand(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <StatusIcon status={r.status} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.email}
                    </span>
                    {r.didYouMean && (
                      <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        → {r.didYouMean}?
                      </span>
                    )}
                    {flags.length > 0 && (
                      <span style={{ fontSize: 10, color: "var(--warning-text)", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
                        {flags.length} flag{flags.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <StatusPill status={r.status} subStatus={r.subStatus} />
                    {isOpen ? <ChevronUp style={{ width: 13, height: 13, color: "var(--text-3)", flexShrink: 0 }} /> : <ChevronDown style={{ width: 13, height: 13, color: "var(--text-3)", flexShrink: 0 }} />}
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        padding: "12px 14px",
                        background: "var(--surface-2)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "8px 16px",
                        fontSize: 12,
                      }}
                    >
                      <DetailField label="Status" value={r.status} />
                      <DetailField label="Sub-status" value={r.subStatus} />
                      <DetailField label="Domain" value={r.domain} />
                      <DetailField label="Account" value={r.account} />
                      <DetailField label="MX found" value={r.mxFound ? "Yes" : "No"} highlight={!r.mxFound ? "warn" : undefined} />
                      <DetailField label="MX record" value={r.mxRecord} />
                      <DetailField label="SMTP provider" value={r.smtpProvider} />
                      <DetailField label="Free email" value={r.freeEmail ? "Yes" : "No"} />
                      <DetailField label="Role address" value={r.role ? "Yes" : "No"} highlight={r.role ? "warn" : undefined} />
                      <DetailField label="Disposable" value={r.disposable ? "Yes" : "No"} highlight={r.disposable ? "danger" : undefined} />
                      <DetailField label="Toxic" value={r.toxic ? "Yes" : "No"} highlight={r.toxic ? "danger" : undefined} />
                      {r.didYouMean && <DetailField label="Did you mean?" value={r.didYouMean} highlight="warn" />}
                      {r.errorMessage && <DetailField label="Error" value={r.errorMessage} highlight="danger" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>No results match your filter.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, highlight }: { label: string; value?: string | null; highlight?: "warn" | "danger" }) {
  if (!value && value !== "No" && value !== "Yes") return null;
  const color = highlight === "danger" ? "var(--danger-text)" : highlight === "warn" ? "var(--warning-text)" : "var(--text)";
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 12, color, marginTop: 1 }}>{value ?? "—"}</div>
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

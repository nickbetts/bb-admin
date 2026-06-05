"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge, Button } from "@/components/ui/shadcn";

// ── Types ────────────────────────────────────────────────────────────────────

interface CronLogEntry {
  id: string;
  jobName: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  clientsTotal: number;
  snapshotsNew: number;
  snapshotsSkipped: number;
  errors: number;
  details: string | null;
}

interface PlatformCoverage {
  label: string;
  configured: boolean;
  count: number;
  latestPeriod: string;
  oldestPeriod: string;
  lastFetched: string;
}

interface ClientCoverage {
  clientId: string;
  clientName: string;
  platforms: Record<string, PlatformCoverage>;
  configuredCount: number;
  coveredCount: number;
}

interface CronStatus {
  schedule: {
    expression: string;
    description: string;
    nextRunAt: string;
    secondsUntilNext: number;
  };
  recentRuns: CronLogEntry[];
  coverage: ClientCoverage[];
  totals: { clients: number; snapshotsStored: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_ORDER = [
  "ga4",
  "googleads",
  "meta",
  "searchconsole",
  "seo",
  "tiktok",
  "microsoftads",
  "woocommerce",
  "shopify",
  "cwv",
];

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "running…";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "due now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function stalenessColor(lastFetched: string): string {
  if (!lastFetched) return "var(--text-3)";
  const daysSince = (Date.now() - new Date(lastFetched).getTime()) / 86400_000;
  if (daysSince <= 1.5) return "#16a34a"; // green — fetched today/yesterday
  if (daysSince <= 7) return "#d97706"; // amber — within a week
  return "#dc2626"; // red — stale
}

function statusBadge(status: string) {
  const map: Record<
    string,
    { variant: "success" | "destructive" | "info" | "secondary"; label: string }
  > = {
    success: { variant: "success", label: "Success" },
    error: { variant: "destructive", label: "Error" },
    running: { variant: "info", label: "Running" },
  };
  const s = map[status] ?? { variant: "secondary" as const, label: status };
  return (
    <Badge variant={s.variant} className="rounded-full px-2 py-0.5 text-[11px] font-semibold">
      {s.label}
    </Badge>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CronDashboard() {
  const [data, setData] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Backfill controls
  const [backfillMonths, setBackfillMonths] = useState(12);
  const [backfillClientId, setBackfillClientId] = useState("");
  const [backfillSkipExisting, setBackfillSkipExisting] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cron-status");
      if (!res.ok) throw new Error("Failed to load cron status");
      const d: CronStatus = await res.json();
      setData(d);
      setCountdown(d.schedule.secondsUntilNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live countdown ticker
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleRunNow() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/run-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: 1, skipExisting: false }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Run failed");
      setRunResult(
        `Done — ${d.totalSnapshots ?? d.snapshotsNew ?? 0} new snapshots, ${d.totalSkipped ?? d.snapshotsSkipped ?? 0} skipped, ${d.totalErrors ?? d.errors ?? 0} errors`,
      );
      await load();
    } catch (e) {
      setRunResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const body: Record<string, unknown> = {
        months: backfillMonths,
        skipExisting: backfillSkipExisting,
      };
      if (backfillClientId) body.clientId = backfillClientId;
      const res = await fetch("/api/admin/run-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Backfill failed");
      const clientLabel = backfillClientId
        ? (data?.coverage.find((c) => c.clientId === backfillClientId)?.clientName ??
          "selected client")
        : "all clients";
      setBackfillResult(
        `Done for ${clientLabel} — ${d.totalSnapshots} new, ${d.totalSkipped} skipped, ${d.totalErrors} errors across ${d.periodsProcessed} months`,
      );
      await load();
    } catch (e) {
      setBackfillResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBackfilling(false);
    }
  }

  if (loading && !data)
    return <p style={{ fontSize: 13, color: "var(--text-3)", padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ fontSize: 13, color: "var(--danger)", padding: 24 }}>{error}</p>;
  if (!data) return null;

  const lastRun = data.recentRuns[0] ?? null;

  // Determine which platforms have any configured clients
  const activePlatforms = PLATFORM_ORDER.filter((key) =>
    data.coverage.some((c) => c.platforms[key]?.configured),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {/* Schedule */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Next Run
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            {formatCountdown(countdown)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
            {data.schedule.description}
          </div>
        </div>

        {/* Last run */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Last Run
          </div>
          {lastRun ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {statusBadge(lastRun.status)}
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {formatRelative(lastRun.startedAt)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                {formatDuration(lastRun.startedAt, lastRun.completedAt)} · {lastRun.triggeredBy}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Never run</div>
          )}
        </div>

        {/* Snapshots */}
        {lastRun && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Last Run Results
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: "var(--success)" }}>
                  {lastRun.snapshotsNew}
                </span>{" "}
                <span style={{ color: "var(--text-3)" }}>new</span>
              </span>
              <span style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: "var(--text-2)" }}>
                  {lastRun.snapshotsSkipped}
                </span>{" "}
                <span style={{ color: "var(--text-3)" }}>skipped</span>
              </span>
              {lastRun.errors > 0 && (
                <span style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: "var(--danger)" }}>{lastRun.errors}</span>{" "}
                  <span style={{ color: "var(--text-3)" }}>errors</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Stored
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            {data.totals.snapshotsStored.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
            snapshots · {data.totals.clients} clients
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button type="button" onClick={handleRunNow} disabled={running} className="min-w-35">
          {running ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg
                style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Running…
            </span>
          ) : (
            "Run Now"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </Button>
        {runResult && (
          <Badge
            variant={runResult.startsWith("Error") ? "destructive" : "success"}
            className="text-[12px] font-medium"
          >
            {runResult}
          </Badge>
        )}
      </div>

      {/* ── API Quota Notes ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
          API Rate Limit Notes
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
            color: "var(--text-3)",
          }}
        >
          <span>
            <span style={{ fontWeight: 600, color: "var(--text-2)" }}>SEO data</span> — snapshot
            coverage depends on connected Search Console/website sources.
          </span>
          <span>
            <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Google Ads</span> — 15,000
            operations/day. Monthly snapshots use ~2 ops per client.
          </span>
          <span>
            <span style={{ fontWeight: 600, color: "var(--text-2)" }}>GA4 / Search Console</span> —
            Daily quota: 200,000 requests. Cron uses ~1 per client per platform.
          </span>
          <span>
            <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Meta Ads</span> — Tier-based
            rate limits. Standard tier supports ~200 calls/hour per access token.
          </span>
          <span style={{ color: "var(--text-3)", fontStyle: "italic", marginTop: 4 }}>
            The nightly cron runs once at 02:00 UTC, skipping platforms already fetched in the last
            23 hours. Use &ldquo;Run Now&rdquo; for a manual refresh.
          </span>
        </div>
      </div>

      {/* ── Recent Runs ─────────────────────────────────────────────────────── */}
      {data.recentRuns.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ padding: "14px 20px 0" }}>
            <h3 className="card-title" style={{ fontSize: 14 }}>
              Recent Runs
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {[
                    "Started",
                    "By",
                    "Status",
                    "Duration",
                    "New",
                    "Skipped",
                    "Errors",
                    "Clients",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--text-2)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentRuns.map((run) => {
                  const details = run.details
                    ? (() => {
                        try {
                          return JSON.parse(run.details!);
                        } catch {
                          return [];
                        }
                      })()
                    : [];
                  const hasDetails = Array.isArray(details) && details.length > 0;
                  return (
                    <>
                      <tr key={run.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          <span title={new Date(run.startedAt).toLocaleString()}>
                            {formatRelative(run.startedAt)}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>
                          {run.triggeredBy}
                        </td>
                        <td style={{ padding: "8px 12px" }}>{statusBadge(run.status)}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>
                          {formatDuration(run.startedAt, run.completedAt)}
                        </td>
                        <td
                          style={{ padding: "8px 12px", fontWeight: 600, color: "var(--success)" }}
                        >
                          {run.snapshotsNew}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>
                          {run.snapshotsSkipped}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            fontWeight: run.errors > 0 ? 600 : 400,
                            color: run.errors > 0 ? "#dc2626" : "var(--text-3)",
                          }}
                        >
                          {run.errors}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>
                          {run.clientsTotal}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {hasDetails && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                              className="h-6 px-0 text-[11px] text-(--accent-text)"
                            >
                              {expandedRun === run.id ? "▲ hide" : "▼ details"}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expandedRun === run.id && hasDetails && (
                        <tr key={`${run.id}-expand`}>
                          <td
                            colSpan={9}
                            style={{
                              padding: "0 12px 12px",
                              background: "var(--bg-subtle, #f9fafb)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                maxHeight: 240,
                                overflowY: "auto",
                                paddingTop: 8,
                              }}
                            >
                              {(
                                details as Array<{
                                  clientName: string;
                                  sections: string[];
                                  skipped: string[];
                                  errors: string[];
                                }>
                              )
                                .filter((r) => r.sections?.length > 0 || r.errors?.length > 0)
                                .map((r, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr 1fr",
                                      gap: 8,
                                      fontSize: 11,
                                      paddingBottom: 2,
                                    }}
                                  >
                                    <span style={{ fontWeight: 500, color: "var(--text)" }}>
                                      {r.clientName}
                                    </span>
                                    <span style={{ color: "var(--success)" }}>
                                      {r.sections?.join(", ")}
                                    </span>
                                    <span style={{ color: "var(--danger)" }}>
                                      {r.errors?.join("; ")}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Coverage Grid ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ padding: "14px 20px 0" }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 14 }}>
              Snapshot Coverage
            </h3>
            <p className="card-subtitle" style={{ fontSize: 12 }}>
              Colour indicates recency:{" "}
              <span style={{ color: "var(--success)", fontWeight: 600 }}>green</span> = fetched
              ≤24h, <span style={{ color: "#d97706", fontWeight: 600 }}>amber</span> = 1–7 days,{" "}
              <span style={{ color: "var(--danger)", fontWeight: 600 }}>red</span> = stale/never. —
              = not configured.
            </p>
          </div>
        </div>
        <div style={{ overflowX: "auto", padding: "0 0 4px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-subtle, #f9fafb)",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Client
                </th>
                {activePlatforms.map((key) => (
                  <th
                    key={key}
                    style={{
                      textAlign: "center",
                      padding: "8px 8px",
                      fontWeight: 600,
                      color: "var(--text-2)",
                      whiteSpace: "nowrap",
                      fontSize: 11,
                    }}
                  >
                    {data.coverage[0]?.platforms[key]?.label ?? key}
                  </th>
                ))}
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px 12px",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Coverage
                </th>
              </tr>
            </thead>
            <tbody>
              {data.coverage.map((client, i) => (
                <tr
                  key={client.clientId}
                  style={{
                    borderBottom:
                      i < data.coverage.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "7px 12px",
                      fontWeight: 500,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.clientName}
                  </td>
                  {activePlatforms.map((key) => {
                    const p = client.platforms[key];
                    if (!p?.configured) {
                      return (
                        <td
                          key={key}
                          style={{
                            textAlign: "center",
                            padding: "7px 8px",
                            color: "var(--border-muted, #d1d5db)",
                          }}
                        >
                          —
                        </td>
                      );
                    }
                    const color = p.lastFetched ? stalenessColor(p.lastFetched) : "#dc2626";
                    if (!p.lastFetched || p.count === 0) {
                      return (
                        <td key={key} style={{ textAlign: "center", padding: "7px 8px" }}>
                          <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>
                            Missing
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={key} style={{ textAlign: "center", padding: "7px 8px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <span style={{ fontWeight: 600, color }}>
                            {p.count}{" "}
                            <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-3)" }}>
                              mo
                            </span>
                          </span>
                          <span
                            style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}
                          >
                            {p.oldestPeriod ? p.oldestPeriod.slice(0, 7) : "—"} →{" "}
                            {p.latestPeriod.slice(0, 7)}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", padding: "7px 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          client.coveredCount === client.configuredCount &&
                          client.configuredCount > 0
                            ? "#16a34a"
                            : "var(--text-3)",
                      }}
                    >
                      {client.coveredCount}/{client.configuredCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

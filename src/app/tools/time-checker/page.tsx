"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FolderKanban,
  Gauge,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";

const DEFAULT_ALLOCATION_LIST_INPUT = "https://app.clickup.com/26455482/v/l/t7bdu-149152";

interface TimeCheckerRow {
  clientName: string;
  prescribedHours: number;
  trackedHours: number;
  remainingHours: number;
  utilisationPct: number | null;
  folderId: string | null;
  folderName: string | null;
  prescribedHoursSource: "custom_field" | "task_name";
  notes: string[];
}

interface TimeCheckerSummary {
  prescribedHoursTotal: number;
  trackedHoursTotal: number;
  remainingHoursTotal: number;
  overBudgetClients: number;
  underBudgetClients: number;
  unmatchedClients: number;
}

interface TimeCheckerResponse {
  workspaceId: string;
  allocationListId: string;
  month: string;
  rows: TimeCheckerRow[];
  summary: TimeCheckerSummary;
  warnings: string[];
}

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-(--text-3)";
const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-(--border) bg-(--bg) px-3 text-sm text-(--text) transition outline-none placeholder:text-(--text-4) focus:border-(--accent) focus:ring-2 focus:ring-(--accent-bg)";

function getCurrentMonthValue(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatHours(value: number): string {
  return `${value.toFixed(2)}h`;
}

function formatMonth(value: string): string {
  const [rawYear, rawMonth] = value.split("-");
  const year = Number.parseInt(rawYear ?? "", 10);
  const month = Number.parseInt(rawMonth ?? "", 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return value;

  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function getStatusMeta(row: TimeCheckerRow): { label: string; className: string } {
  if (!row.folderId) {
    return {
      label: "Unmatched folder",
      className: "border-(--warning-border) bg-(--warning-bg) text-(--warning-text)",
    };
  }

  if (row.remainingHours < 0) {
    return {
      label: `Over by ${formatHours(Math.abs(row.remainingHours))}`,
      className: "border-(--danger-border) bg-(--danger-bg) text-(--danger-text)",
    };
  }

  if (row.remainingHours === 0) {
    return {
      label: "At allocated limit",
      className: "border-(--accent) bg-(--accent-bg) text-(--accent-text)",
    };
  }

  return {
    label: `${formatHours(row.remainingHours)} remaining`,
    className: "border-(--success-border) bg-(--success-bg) text-(--success-text)",
  };
}

function formatUtilisation(value: number | null): string {
  if (value === null) return "-";
  if (value >= 100) return `${value.toFixed(1)}% (over)`;
  return `${value.toFixed(1)}%`;
}

export default function TimeCheckerPage() {
  const [allocationList, setAllocationList] = useState("");
  const [clientFolder, setClientFolder] = useState("");
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [report, setReport] = useState<TimeCheckerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDefaultAllocationList() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");

        const settings = (await response.json()) as Record<string, string>;
        const sharedDefault = settings.clickupTimeCheckerAllocationList?.trim() ?? "";
        if (active) {
          setAllocationList(sharedDefault || DEFAULT_ALLOCATION_LIST_INPUT);
        }
      } catch {
        if (active) {
          setAllocationList(DEFAULT_ALLOCATION_LIST_INPUT);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void loadDefaultAllocationList();
    return () => {
      active = false;
    };
  }, []);

  const runCheck = useCallback(
    async ({ refresh }: { refresh: boolean }) => {
      const trimmedList = allocationList.trim();
      const trimmedFolder = clientFolder.trim();

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ month });
        if (trimmedList) {
          params.set("allocationList", trimmedList);
        }
        if (trimmedFolder) {
          params.set("clientFolder", trimmedFolder);
        }
        if (refresh) {
          params.set("refresh", "1");
        }

        const response = await fetch(`/api/tools/time-checker?${params.toString()}`);
        const payload = (await response.json()) as TimeCheckerResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load time checker data.");
        }

        setReport(payload);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Failed to load time checker data.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [allocationList, clientFolder, month],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCheck({ refresh: false });
  }

  function onRefresh() {
    void runCheck({ refresh: true });
  }

  const summaryCards = useMemo(() => {
    if (!report) return [];

    return [
      {
        title: "Allocated",
        value: formatHours(report.summary.prescribedHoursTotal),
        subtitle: "Prescribed from allocation source",
        tone: "text-(--text)",
      },
      {
        title: "Tracked",
        value: formatHours(report.summary.trackedHoursTotal),
        subtitle: "Captured via ClickUp time entries",
        tone: "text-(--text)",
      },
      {
        title: "Remaining",
        value: formatHours(report.summary.remainingHoursTotal),
        subtitle: report.summary.remainingHoursTotal < 0 ? "Over allocated" : "Available",
        tone: report.summary.remainingHoursTotal < 0 ? "text-(--danger)" : "text-(--success)",
      },
      {
        title: "At Risk",
        value: String(report.summary.overBudgetClients),
        subtitle: `${report.summary.unmatchedClients} unmatched folders`,
        tone: "text-(--warning)",
      },
    ];
  }, [report]);

  return (
    <div className="mx-auto flex w-full max-w-330 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-(--shadow-sm)">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_18%,var(--accent-bg),transparent_42%)]" />
        <div className="relative flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-(--accent) bg-(--accent-bg) px-3 py-1 text-xs font-semibold tracking-wide text-(--accent-text) uppercase">
            <Clock3 className="h-3.5 w-3.5" />
            Time Checker
          </div>
          <h1 className="text-3xl font-bold text-(--text)">ClickUp hours vs allocation</h1>
          <p className="max-w-4xl text-sm leading-relaxed text-(--text-2)">
            Paste your allocation source and, optionally, one client folder URL to run a direct
            single-client check. The checker compares prescribed hours against tracked time for the
            selected month.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-(--shadow-sm)">
        <form
          onSubmit={onSubmit}
          className="grid gap-4 xl:grid-cols-[1.7fr_1.7fr_0.9fr_auto_auto] xl:items-end"
        >
          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Allocation source URL or ID</span>
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--text-3)" />
              <input
                type="text"
                value={allocationList}
                onChange={(event) => setAllocationList(event.target.value)}
                placeholder="https://app.clickup.com/.../v/l/... or 9012..."
                className={`${INPUT_CLASS} pl-10`}
              />
            </div>
            <span className="text-xs text-(--text-3)">
              Leave blank to use the shared default from Admin Settings.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Client folder URL or ID (optional)</span>
            <div className="relative">
              <FolderKanban className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--text-3)" />
              <input
                type="text"
                value={clientFolder}
                onChange={(event) => setClientFolder(event.target.value)}
                placeholder="https://app.clickup.com/.../v/f/.../... or 9012..."
                className={`${INPUT_CLASS} pl-10`}
              />
            </div>
            <span className="text-xs text-(--text-3)">
              Add this to run direct single-client mode without folder auto-matching.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Month</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--text-3)" />
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className={`${INPUT_CLASS} pl-10`}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={!ready || loading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-(--accent) px-4 text-sm font-semibold text-white transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking
              </>
            ) : (
              "Run check"
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={!ready || loading || !report}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-(--border) bg-(--bg) px-4 text-sm font-semibold text-(--text-2) transition hover:bg-(--border-subtle) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </form>
      </section>

      {error && (
        <div className="rounded-xl border border-(--danger-border) bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-text)">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm text-(--text-2) shadow-(--shadow-sm)">
          <Loader2 className="h-4 w-4 animate-spin" />
          Crunching ClickUp hours...
        </div>
      )}

      {report && !loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className="group rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-(--shadow-sm) transition hover:-translate-y-0.5 hover:shadow-(--shadow)"
              >
                <p className="text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                  {card.title}
                </p>
                <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
                <p className="mt-1 text-xs text-(--text-3)">{card.subtitle}</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface) shadow-(--shadow-sm)">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) px-5 py-4">
              <h2 className="text-base font-semibold text-(--text)">
                Client breakdown for {formatMonth(report.month)}
              </h2>
              <div className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--bg) px-3 py-1 text-xs text-(--text-2)">
                <Gauge className="h-3.5 w-3.5 text-(--text-3)" />
                Allocation source: {report.allocationListId}
              </div>
            </div>

            {report.warnings.length > 0 && (
              <div className="border-b border-(--warning-border) bg-(--warning-bg) px-5 py-3 text-sm text-(--warning-text)">
                <div className="mb-1 inline-flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Data quality notes
                </div>
                <ul className="list-disc pl-5">
                  {report.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.rows.length === 0 ? (
              <div className="px-5 py-8 text-sm text-(--text-2)">
                No allocation rows were returned for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-(--border)">
                  <thead className="bg-(--bg)">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Client
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Prescribed
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Tracked
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Remaining
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Utilisation
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-(--text-3) uppercase">
                        Folder
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border) bg-(--surface)">
                    {report.rows.map((row) => {
                      const status = getStatusMeta(row);
                      const clickupFolderUrl = row.folderId
                        ? `https://app.clickup.com/${report.workspaceId}/v/f/${row.folderId}`
                        : null;

                      return (
                        <tr
                          key={`${row.clientName}:${row.folderId ?? "none"}`}
                          className="transition hover:bg-(--bg)"
                        >
                          <td className="px-5 py-4 align-top">
                            <p className="text-sm font-semibold text-(--text)">{row.clientName}</p>
                            {row.notes.length > 0 && (
                              <p className="mt-1 text-xs text-(--text-3)">{row.notes.join(" ")}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-(--text)">
                            {formatHours(row.prescribedHours)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-(--text)">
                            {formatHours(row.trackedHours)}
                          </td>
                          <td
                            className={`px-5 py-4 text-right text-sm font-semibold ${
                              row.remainingHours < 0 ? "text-(--danger)" : "text-(--success)"
                            }`}
                          >
                            {formatHours(row.remainingHours)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-(--text-2)">
                            {formatUtilisation(row.utilisationPct)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-(--text-2)">
                            {clickupFolderUrl ? (
                              <a
                                href={clickupFolderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-(--accent) hover:text-(--accent-hover) hover:underline"
                              >
                                {row.folderName ?? "Open folder"}
                              </a>
                            ) : (
                              <span className="text-(--text-4)">No matched folder</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

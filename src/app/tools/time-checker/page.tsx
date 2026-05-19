"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock3, Loader2, RefreshCw } from "lucide-react";

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
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (row.remainingHours < 0) {
    return {
      label: `Over by ${formatHours(Math.abs(row.remainingHours))}`,
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (row.remainingHours === 0) {
    return {
      label: "At allocated limit",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: `${formatHours(row.remainingHours)} remaining`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700 uppercase">
          <Clock3 className="h-3.5 w-3.5" />
          Time Checker
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ClickUp hours vs allocation</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Compare prescribed client hours from your ClickUp allocation list against tracked hours in
          each matched client folder for a selected month.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={onSubmit}
          className="grid gap-4 lg:grid-cols-[2fr_2fr_1fr_auto_auto] lg:items-end"
        >
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Allocation list URL or ID
            </span>
            <input
              type="text"
              value={allocationList}
              onChange={(event) => setAllocationList(event.target.value)}
              placeholder="https://app.clickup.com/.../v/l/... or 9012..."
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <span className="text-xs text-gray-500">
              Leave blank to use the shared default from Admin Settings.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Client folder URL or ID (optional)
            </span>
            <input
              type="text"
              value={clientFolder}
              onChange={(event) => setClientFolder(event.target.value)}
              placeholder="https://app.clickup.com/.../v/f/.../... or 9012..."
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <span className="text-xs text-gray-500">
              Add this to run direct single-client mode without folder auto-matching.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Month
            </span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <button
            type="submit"
            disabled={!ready || loading}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </form>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Crunching ClickUp hours...
        </div>
      )}

      {report && !loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Allocated
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatHours(report.summary.prescribedHoursTotal)}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Tracked</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatHours(report.summary.trackedHoursTotal)}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Remaining
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  report.summary.remainingHoursTotal < 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatHours(report.summary.remainingHoursTotal)}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">At risk</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {report.summary.overBudgetClients}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {report.summary.unmatchedClients} unmatched folders
              </p>
            </article>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Client breakdown for {formatMonth(report.month)}
              </h2>
              <p className="text-xs text-gray-500">Allocation list ID: {report.allocationListId}</p>
            </div>

            {report.warnings.length > 0 && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
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
              <div className="px-5 py-8 text-sm text-gray-600">
                No allocation rows were returned for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Client
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Prescribed
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Tracked
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Remaining
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Utilisation
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Folder
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {report.rows.map((row) => {
                      const status = getStatusMeta(row);
                      const clickupFolderUrl = row.folderId
                        ? `https://app.clickup.com/${report.workspaceId}/v/f/${row.folderId}`
                        : null;

                      return (
                        <tr key={row.clientName}>
                          <td className="px-5 py-4 align-top">
                            <p className="text-sm font-semibold text-gray-900">{row.clientName}</p>
                            {row.notes.length > 0 && (
                              <p className="mt-1 text-xs text-gray-500">{row.notes.join(" ")}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                            {formatHours(row.prescribedHours)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                            {formatHours(row.trackedHours)}
                          </td>
                          <td
                            className={`px-5 py-4 text-right text-sm font-semibold ${
                              row.remainingHours < 0 ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {formatHours(row.remainingHours)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-gray-700">
                            {row.utilisationPct === null
                              ? "-"
                              : `${row.utilisationPct.toFixed(2)}%`}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {clickupFolderUrl ? (
                              <a
                                href={clickupFolderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                              >
                                {row.folderName ?? "Open folder"}
                              </a>
                            ) : (
                              <span className="text-gray-400">No matched folder</span>
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

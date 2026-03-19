"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Account {
  id: string;
  name: string;
  isManager: boolean;
}

interface Connection {
  id: string;
  label: string;
  email: string;
  createdAt: string;
}

const OAUTH_ERRORS: Record<string, string> = {
  oauth_state_mismatch: "OAuth state mismatch — please try again.",
  token_exchange_failed: "Failed to exchange authorisation code. Check your OAuth credentials.",
  no_refresh_token:
    "Google did not return a refresh token. Please revoke access in your Google account and try again.",
  access_denied: "Access was denied.",
};

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const searchParams = useSearchParams();

  // MCC selector state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mccLoading, setMccLoading] = useState(true);
  const [mccError, setMccError] = useState<string | null>(null);
  const [currentMcc, setCurrentMcc] = useState<string>("");
  const [selectedMcc, setSelectedMcc] = useState<string>("");
  const [mccSaving, setMccSaving] = useState(false);
  const [mccSaved, setMccSaved] = useState(false);

  // Connected accounts state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Banner from OAuth redirect
  const oauthErrorKey = searchParams.get("error");
  const oauthConnected = searchParams.get("connected");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (oauthConnected === "1") {
      setBanner({ type: "success", message: "Google account connected successfully!" });
    } else if (oauthErrorKey) {
      setBanner({
        type: "error",
        message: OAUTH_ERRORS[oauthErrorKey] ?? `OAuth error: ${oauthErrorKey}`,
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("connected");
    window.history.replaceState({}, "", url.pathname);
  }, [oauthConnected, oauthErrorKey]);

  const loadConnections = useCallback(async () => {
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const res = await fetch("/api/settings/connections");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConnections(data);
    } catch (err) {
      setConnectionsError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const loadMcc = useCallback(async () => {
    setMccLoading(true);
    setMccError(null);
    try {
      const [accountsRes, settingsRes] = await Promise.all([
        fetch("/api/google-ads/accounts"),
        fetch("/api/settings"),
      ]);
      const accountsData: Account[] | { error: string } = await accountsRes.json();
      if ("error" in accountsData) throw new Error((accountsData as { error: string }).error);
      const settings: Record<string, string> = settingsRes.ok ? await settingsRes.json() : {};
      setAccounts(accountsData as Account[]);
      const mcc = settings.googleAdsMccId ?? "";
      setCurrentMcc(mcc);
      setSelectedMcc(mcc);
    } catch (err) {
      setMccError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setMccLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    loadMcc();
  }, [loadConnections, loadMcc]);

  async function handleMccSave() {
    setMccSaving(true);
    setMccSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleAdsMccId: selectedMcc }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setCurrentMcc(selectedMcc);
      setMccSaved(true);
      setTimeout(() => setMccSaved(false), 3000);
    } catch (err) {
      setMccError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMccSaving(false);
    }
  }

  async function handleRemoveConnection(id: string) {
    setRemoving(id);
    try {
      await fetch("/api/settings/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setConnections((prev) => prev.filter((c) => c.id !== id));
      // Reload MCC accounts after removing a connection
      loadMcc();
    } catch {
      // Silently handle
    } finally {
      setRemoving(null);
    }
  }

  const managerAccounts = accounts.filter((a) => a.isManager);
  const standardAccounts = accounts.filter((a) => !a.isManager);

  return (
    <div className="max-w-3xl mx-auto py-12 px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global integrations and API configuration</p>
      </div>

      {/* OAuth result banner */}
      {banner && (
        <div
          className={`rounded-xl px-5 py-3.5 text-sm font-medium flex items-center justify-between ${
            banner.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            className="ml-4 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Connected Google Accounts */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Connected Google Accounts</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add multiple Google accounts to access all their Manager (MCC) and client ad accounts. Every
              connected account&apos;s accounts are available in the client settings dropdowns.
            </p>
          </div>
          <a
            href="/api/auth/google-ads"
            className="shrink-0 ml-6 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M12 11h8v2h-8v8h-2v-8H2v-2h8V3h2v8z" />
            </svg>
            Connect account
          </a>
        </div>

        {connectionsLoading && <p className="text-sm text-slate-400 py-4">Loading connections…</p>}
        {connectionsError && !connectionsLoading && (
          <p className="text-sm text-red-600">{connectionsError}</p>
        )}

        {!connectionsLoading && (
          <div className="divide-y divide-slate-100">
            {/* Always show the env-var primary connection row */}
            <div className="flex items-center gap-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <GoogleIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">Primary account</p>
                <p className="text-xs text-slate-400">Configured via environment variable</p>
              </div>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            {connections.length === 0 && (
              <p className="text-sm text-slate-400 py-5 text-center">
                No additional accounts connected. Click &ldquo;Connect account&rdquo; to add one.
              </p>
            )}

            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center gap-4 py-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <GoogleIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{conn.email}</p>
                  <p className="text-xs text-slate-400">
                    Connected{" "}
                    {new Date(conn.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
                <button
                  onClick={() => handleRemoveConnection(conn.id)}
                  disabled={removing === conn.id}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 ml-2"
                  title="Disconnect this account"
                >
                  {removing === conn.id ? "Removing…" : "Disconnect"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default MCC selector */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Default Manager Account</h2>
        <p className="text-sm text-slate-500 mb-6">
          Select which MCC is used as the default{" "}
          <code className="bg-slate-100 px-1 rounded text-xs">login-customer-id</code> when fetching
          data. All accounts across all connected Google accounts are listed here.
        </p>

        {mccLoading && <p className="text-sm text-slate-500">Loading accounts…</p>}
        {mccError && <p className="text-sm text-red-600">{mccError}</p>}

        {!mccLoading && !mccError && (
          <>
            <select
              value={selectedMcc}
              onChange={(e) => setSelectedMcc(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 mb-3 transition shadow-sm"
            >
              <option value="">— Select an account —</option>
              {managerAccounts.length > 0 && (
                <optgroup label="Manager accounts (MCC)">
                  {managerAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name !== a.id ? `${a.name} (${a.id})` : a.id}
                    </option>
                  ))}
                </optgroup>
              )}
              {standardAccounts.length > 0 && (
                <optgroup label="Standard accounts">
                  {standardAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name !== a.id ? `${a.name} (${a.id})` : a.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {currentMcc && (
              <p className="text-xs text-slate-500 mb-5">
                Current:{" "}
                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  {currentMcc}
                </span>
              </p>
            )}

            <button
              onClick={handleMccSave}
              disabled={mccSaving || selectedMcc === currentMcc || !selectedMcc}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {mccSaving ? "Saving…" : mccSaved ? "Saved ✓" : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
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
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}


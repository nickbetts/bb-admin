"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
  oauth_state_mismatch: "OAuth state mismatch. Please try again.",
  token_exchange_failed: "Failed to exchange authorisation code. Check your OAuth credentials.",
  no_refresh_token:
    "Google did not return a refresh token. Please revoke access in your Google account and try again.",
  access_denied: "Access was denied.",
  ms365_token_exchange_failed: "Failed to exchange MS365 authorisation code. Check your Azure AD app credentials.",
  ms365_no_refresh_token: "Microsoft did not return a refresh token. Please try connecting again.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function SettingsPanelInner() {
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mccLoading, setMccLoading] = useState(true);
  const [mccError, setMccError] = useState<string | null>(null);
  const [currentMcc, setCurrentMcc] = useState<string>("");
  const [selectedMcc, setSelectedMcc] = useState<string>("");
  const [mccSaving, setMccSaving] = useState(false);
  const [mccSaved, setMccSaved] = useState(false);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, "ok" | "expired" | "checking">>({});

  const [ms365Connections, setMs365Connections] = useState<Connection[]>([]);
  const [ms365Loading, setMs365Loading] = useState(true);
  const [ms365Error, setMs365Error] = useState<string | null>(null);
  const [removingMs365, setRemovingMs365] = useState<string | null>(null);

  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [openaiKeySaving, setOpenaiKeySaving] = useState(false);
  const [openaiKeySaved, setOpenaiKeySaved] = useState(false);
  const [openaiKeyError, setOpenaiKeyError] = useState<string | null>(null);

  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [anthropicKeySaving, setAnthropicKeySaving] = useState(false);
  const [anthropicKeySaved, setAnthropicKeySaved] = useState(false);
  const [anthropicKeyError, setAnthropicKeyError] = useState<string | null>(null);

  const DEFAULT_BENCHMARKS = [
    { task: "Blog Post (1,000 words)", hours: 3 },
    { task: "Landing Page Copywriting", hours: 4 },
    { task: "Social Media Post", hours: 0.5 },
    { task: "Email Newsletter", hours: 2 },
    { task: "PPC Campaign Setup", hours: 8 },
    { task: "On-page SEO Optimisation", hours: 2 },
    { task: "Monthly Reporting", hours: 2 },
    { task: "Google Ads Monthly Management", hours: 4 },
    { task: "Technical SEO Audit", hours: 5 },
  ];
  const [benchmarks, setBenchmarks] = useState<Array<{ task: string; hours: number }>>(DEFAULT_BENCHMARKS);
  const [benchmarksSaving, setBenchmarksSaving] = useState(false);
  const [benchmarksSaved, setBenchmarksSaved] = useState(false);

  const oauthErrorKey = searchParams.get("error");
  const oauthConnected = searchParams.get("connected");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (oauthConnected === "1") {
      setBanner({ type: "success", message: "Google account connected successfully!" });
    } else if (searchParams.get("ms365_connected") === "1") {
      setBanner({ type: "success", message: "Microsoft 365 account connected successfully!" });
    } else if (oauthErrorKey) {
      setBanner({ type: "error", message: OAUTH_ERRORS[oauthErrorKey] ?? `OAuth error: ${oauthErrorKey}` });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("connected");
    url.searchParams.delete("ms365_connected");
    window.history.replaceState({}, "", url.pathname);
  }, [oauthConnected, oauthErrorKey, searchParams]);

  const loadConnections = useCallback(async () => {
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const res = await fetch("/api/settings/connections");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConnections(data);
      const conns = data as Connection[];
      if (conns.length > 0) {
        setConnectionStatuses(Object.fromEntries(conns.map((c) => [c.id, "checking" as const])));
        fetch("/api/settings/connections/verify")
          .then((r) => r.json())
          .then((statuses: Array<{ id: string; status: "ok" | "expired" }>) => {
            setConnectionStatuses(Object.fromEntries(statuses.map((s) => [s.id, s.status])));
          })
          .catch(() => { setConnectionStatuses({}); });
      }
    } catch (err) {
      setConnectionsError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const loadMs365Connections = useCallback(async () => {
    setMs365Loading(true);
    setMs365Error(null);
    try {
      const res = await fetch("/api/settings/ms365-connections");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMs365Connections(data);
    } catch (err) {
      setMs365Error(err instanceof Error ? err.message : "Failed to load MS365 connections");
    } finally {
      setMs365Loading(false);
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
      const storedKey = settings.openaiApiKey ?? "";
      setOpenaiKey(storedKey);
      setOpenaiKeyInput(storedKey ? "sk-…redacted" : "");
      const storedAnthropicKey = settings.anthropicApiKey ?? "";
      setAnthropicKey(storedAnthropicKey);
      setAnthropicKeyInput(storedAnthropicKey ? "sk-ant-…redacted" : "");
      if (settings.taskBenchmarks) {
        try {
          const stored = JSON.parse(settings.taskBenchmarks) as Array<{ task: string; hours: number }>;
          if (Array.isArray(stored) && stored.length > 0) setBenchmarks(stored);
        } catch { /* keep defaults */ }
      }
    } catch (err) {
      setMccError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setMccLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    loadMcc();
    loadMs365Connections();
  }, [loadConnections, loadMcc, loadMs365Connections]);

  async function handleOpenaiKeySave() {
    setOpenaiKeySaving(true);
    setOpenaiKeySaved(false);
    setOpenaiKeyError(null);
    try {
      const keyToSave = openaiKeyInput.startsWith("sk-…") ? openaiKey : openaiKeyInput;
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: keyToSave }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOpenaiKey(keyToSave);
      setOpenaiKeyInput(keyToSave ? "sk-…redacted" : "");
      setOpenaiKeySaved(true);
      setTimeout(() => setOpenaiKeySaved(false), 3000);
    } catch (err) {
      setOpenaiKeyError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setOpenaiKeySaving(false);
    }
  }

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
      loadMcc();
    } catch {
      // silently handle
    } finally {
      setRemoving(null);
    }
  }

  async function handleRemoveMs365Connection(id: string) {
    setRemovingMs365(id);
    try {
      await fetch("/api/settings/ms365-connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMs365Connections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silently handle
    } finally {
      setRemovingMs365(null);
    }
  }

  async function handleBenchmarksSave() {
    setBenchmarksSaving(true);
    setBenchmarksSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskBenchmarks: JSON.stringify(benchmarks.filter((b) => b.task.trim())) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setBenchmarksSaved(true);
      setTimeout(() => setBenchmarksSaved(false), 3000);
    } catch { /* ignore */ } finally {
      setBenchmarksSaving(false);
    }
  }

  const [snapshotMonths, setSnapshotMonths] = useState(12);
  const [snapshotRunning, setSnapshotRunning] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<{
    clientsProcessed: number;
    periodsProcessed: number;
    totalSnapshots: number;
    totalSkipped: number;
    totalErrors: number;
    results: Array<{ clientName: string; period: string; sections: string[]; skipped: string[]; errors: string[] }>;
  } | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [rowRunning, setRowRunning] = useState<Record<string, boolean>>({});
  const [rowResult, setRowResult] = useState<Record<string, { snapshots: number; errors: number } | null>>({});

  const [snapshotInventory, setSnapshotInventory] = useState<Array<{
    clientId: string;
    clientName: string;
    totalSnapshots: number;
    platforms: Record<string, { count: number; earliest: string; latest: string }>;
  }> | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const loadSnapshotInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await fetch("/api/admin/snapshot-status");
      if (res.ok) setSnapshotInventory(await res.json());
    } catch { /* non-critical */ } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => { loadSnapshotInventory(); }, [loadSnapshotInventory]);

  async function handleRunSnapshots() {
    setSnapshotRunning(true);
    setSnapshotResult(null);
    setSnapshotError(null);
    try {
      const res = await fetch("/api/admin/run-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: snapshotMonths, skipExisting: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Snapshot run failed");
      setSnapshotResult(data);
      loadSnapshotInventory();
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSnapshotRunning(false);
    }
  }

  async function handleRunClientSnapshot(clientId: string) {
    setRowRunning((prev) => ({ ...prev, [clientId]: true }));
    setRowResult((prev) => ({ ...prev, [clientId]: null }));
    try {
      const res = await fetch("/api/admin/run-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: snapshotMonths, skipExisting: true, clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRowResult((prev) => ({ ...prev, [clientId]: { snapshots: data.totalSnapshots ?? 0, errors: data.totalErrors ?? 0 } }));
      loadSnapshotInventory();
    } catch {
      setRowResult((prev) => ({ ...prev, [clientId]: { snapshots: 0, errors: 1 } }));
    } finally {
      setRowRunning((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  const [prereqOpen, setPrereqOpen] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);

  function copyClientId() {
    navigator.clipboard.writeText("960440447654-l1mh1bcondon0eaauab53kt4r8um4d9j.apps.googleusercontent.com");
    setClientIdCopied(true);
    setTimeout(() => setClientIdCopied(false), 2000);
  }

  const managerAccounts = accounts.filter((a) => a.isManager);
  const standardAccounts = accounts.filter((a) => !a.isManager);

  return (
    <div>
      {banner && (
        <div
          style={{
            padding: "12px 18px", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24,
            ...(banner.type === "success"
              ? { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }
              : { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }),
          }}
        >
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} style={{ marginLeft: 16, opacity: 0.6, fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>×</button>
        </div>
      )}

      {/* Connected Google Accounts */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Connected Google Accounts</h2>
            <p className="card-subtitle">
              Add multiple Google accounts to access all their Manager (MCC) and client ad accounts. Every
              connected account&apos;s accounts are available in the client settings dropdowns.
            </p>
          </div>
          <a href="/api/auth/google-ads" className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M12 11h8v2h-8v8h-2v-8H2v-2h8V3h2v8z" /></svg>
            Connect account
          </a>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: 24, borderRadius: "var(--r)", border: "1px solid #fcd34d", background: "#fffbeb", overflow: "hidden" }}>
            <button onClick={() => setPrereqOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Getting a &ldquo;This app is blocked&rdquo; error? Two possible fixes</span>
              </div>
              <svg style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0, transition: "transform 0.2s", transform: prereqOpen ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {prereqOpen && (
              <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #fcd34d", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#78350f", marginBottom: 6 }}>Fix 1: Any Google account (most common cause)</p>
                  <p style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>The OAuth app is in <strong>Testing mode</strong>, which blocks all accounts that haven&apos;t been explicitly added as test users.</p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {["Open Google Cloud Console → APIs &amp; Services → OAuth consent screen", "Scroll to Test users and click Add users", "Add the email address of the Google account you want to connect, then save"].map((step, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: "#78350f" }} dangerouslySetInnerHTML={{ __html: step }} />
                      </li>
                    ))}
                  </ol>
                  <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d97706", color: "#fff", border: "none", width: "fit-content", marginTop: 10 }}>
                    Open OAuth consent screen
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
                <div style={{ borderTop: "1px solid #fcd34d" }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#78350f", marginBottom: 6 }}>Fix 2: Google Workspace accounts only</p>
                  <p style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>Workspace admins can block third-party OAuth apps. The admin needs to trust this app&apos;s Client ID:</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #fcd34d", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 8 }}>
                    <code style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: "#374151", wordBreak: "break-all", userSelect: "all" as const }}>960440447654-l1mh1bcondon0eaauab53kt4r8um4d9j.apps.googleusercontent.com</code>
                    <button onClick={copyClientId} style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#78350f" }}>
                      {clientIdCopied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <a href="https://admin.google.com/ac/owl/list?tab=configuredApps" target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d97706", color: "#fff", border: "none", width: "fit-content", marginTop: 10 }}>
                    Open Google Admin Console
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
            )}
          </div>

          {connectionsLoading && <p style={{ fontSize: 13, color: "var(--text-3)", padding: "16px 0" }}>Loading connections…</p>}
          {connectionsError && !connectionsLoading && <p style={{ fontSize: 13, color: "var(--danger)" }}>{connectionsError}</p>}

          {!connectionsLoading && (
            <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><GoogleIcon /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Primary account</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>Configured via environment variable</p>
                </div>
                <span className="badge badge-green">Active</span>
              </div>
              {connections.length === 0 && <p style={{ fontSize: 13, color: "var(--text-3)", padding: "20px 0", textAlign: "center" }}>No additional accounts connected. Click &ldquo;Connect account&rdquo; to add one.</p>}
              {connections.map((conn) => {
                const tokenStatus = connectionStatuses[conn.id];
                const isExpired = tokenStatus === "expired";
                return (
                  <div key={conn.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><GoogleIcon /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conn.email}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)" }}>Connected {new Date(conn.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {isExpired && <p style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>Token expired — reconnect to restore access.</p>}
                    </div>
                    {tokenStatus === "checking" ? (
                      <span className="badge" style={{ background: "var(--border-subtle)", color: "var(--text-3)" }}>Checking…</span>
                    ) : isExpired ? (
                      <span className="badge" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>Expired</span>
                    ) : (
                      <span className="badge badge-green">Active</span>
                    )}
                    {isExpired && <a href="/api/auth/google-ads" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Reconnect</a>}
                    <button onClick={() => handleRemoveConnection(conn.id)} disabled={removing === conn.id} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", opacity: removing === conn.id ? 0.4 : 1 }}>
                      {removing === conn.id ? "Removing…" : "Disconnect"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Connected Microsoft 365 Accounts */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Connected Microsoft 365 Accounts</h2>
            <p className="card-subtitle">
              Connect your agency&apos;s Microsoft 365 mailboxes. Once connected, you can sync emails and Teams
              meetings for any client by setting their contact email addresses in Client Settings.
            </p>
          </div>
          <a
            href="/api/auth/ms365"
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M12 11h8v2h-8v8h-2v-8H2v-2h8V3h2v8z" /></svg>
            Connect account
          </a>
        </div>
        <div className="card-body">
          {ms365Loading && <p style={{ fontSize: 13, color: "var(--text-3)", padding: "16px 0" }}>Loading connections…</p>}
          {ms365Error && !ms365Loading && <p style={{ fontSize: 13, color: "var(--danger)" }}>{ms365Error}</p>}
          {!ms365Loading && (
            <div>
              {ms365Connections.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)", padding: "16px 0", textAlign: "center" }}>
                  No Microsoft 365 accounts connected. Click &ldquo;Connect account&rdquo; to add one.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  {ms365Connections.map((conn) => (
                    <div key={conn.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f4ff", border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg viewBox="0 0 23 23" style={{ width: 18, height: 18 }} aria-hidden="true">
                          <path fill="#f25022" d="M1 1h10v10H1z" />
                          <path fill="#00a4ef" d="M12 1h10v10H12z" />
                          <path fill="#7fba00" d="M1 12h10v10H1z" />
                          <path fill="#ffb900" d="M12 12h10v10H12z" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conn.email}</p>
                        <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                          Connected {new Date(conn.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="badge badge-green">Active</span>
                      <button
                        onClick={() => handleRemoveMs365Connection(conn.id)}
                        disabled={removingMs365 === conn.id}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)", opacity: removingMs365 === conn.id ? 0.4 : 1 }}
                      >
                        {removingMs365 === conn.id ? "Removing…" : "Disconnect"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text-3)" }}>
                <strong style={{ color: "var(--text-2)" }}>Azure AD setup required:</strong> Create an app registration at{" "}
                <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>portal.azure.com</a>{" "}
                with <code>Mail.Read</code>, <code>Calendars.Read</code>, <code>User.Read</code> and <code>offline_access</code> permissions.
                Add <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/auth/ms365/callback</code> as a redirect URI.
                Set <code>MS365_CLIENT_ID</code> and <code>MS365_CLIENT_SECRET</code> in your environment variables.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">OpenAI API Key</h2>
            <p className="card-subtitle">Required for AI-powered insights, anomaly detection, and automated report commentary. Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>platform.openai.com</a>.</p>
          </div>
        </div>
        <div className="card-body">
          {openaiKeyError && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>{openaiKeyError}</p>}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="password" className="form-input" style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }} placeholder="sk-…" value={openaiKeyInput} onChange={(e) => setOpenaiKeyInput(e.target.value)} onFocus={() => { if (openaiKeyInput === "sk-…redacted") setOpenaiKeyInput(""); }} />
            <button onClick={handleOpenaiKeySave} disabled={openaiKeySaving || !openaiKeyInput || openaiKeyInput === "sk-…redacted"} className="btn btn-primary">
              {openaiKeySaving ? "Saving…" : openaiKeySaved ? "Saved ✓" : "Save"}
            </button>
          </div>
          {openaiKey && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>✓ API key configured. AI insights are enabled across all client dashboards.</p>}
        </div>
      </div>

      {/* Anthropic API Key */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Anthropic API Key</h2>
            <p className="card-subtitle">Required for the Content Strategy Creator (Claude Opus). Get your key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>console.anthropic.com</a>.</p>
          </div>
        </div>
        <div className="card-body">
          {anthropicKeyError && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>{anthropicKeyError}</p>}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="password" className="form-input" style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }} placeholder="sk-ant-…" value={anthropicKeyInput} onChange={(e) => setAnthropicKeyInput(e.target.value)} onFocus={() => { if (anthropicKeyInput === "sk-ant-…redacted") setAnthropicKeyInput(""); }} />
            <button onClick={async () => {
              setAnthropicKeySaving(true);
              setAnthropicKeySaved(false);
              setAnthropicKeyError(null);
              try {
                const keyToSave = anthropicKeyInput.startsWith("sk-ant-…") ? anthropicKey : anthropicKeyInput;
                const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anthropicApiKey: keyToSave }) });
                if (!res.ok) throw new Error("Failed to save");
                setAnthropicKey(keyToSave);
                setAnthropicKeyInput(keyToSave ? "sk-ant-…redacted" : "");
                setAnthropicKeySaved(true);
                setTimeout(() => setAnthropicKeySaved(false), 3000);
              } catch (err) {
                setAnthropicKeyError(err instanceof Error ? err.message : "Failed to save");
              } finally {
                setAnthropicKeySaving(false);
              }
            }} disabled={anthropicKeySaving || !anthropicKeyInput || anthropicKeyInput === "sk-ant-…redacted"} className="btn btn-primary">
              {anthropicKeySaving ? "Saving…" : anthropicKeySaved ? "Saved ✓" : "Save"}
            </button>
          </div>
          {anthropicKey && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>✓ Anthropic API key configured. Content Strategy Creator is ready to use.</p>}
        </div>
      </div>

      {/* Task Benchmarks */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
            <div>
              <h2 className="card-title">Task Time Benchmarks</h2>
              <p className="card-subtitle">Define how long common tasks take. Used by AI when generating proposal timelines to suggest realistic deliverables based on contracted hours.</p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ gap: 5, flexShrink: 0, marginLeft: 16 }} onClick={() => setBenchmarks((prev) => [...prev, { task: "", hours: 1 }])}>
              <Plus size={13} /> Add Task
            </button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {benchmarks.map((b, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
                <input type="text" className="form-input" style={{ fontSize: 13 }} placeholder="Task name (e.g. Blog Post)" value={b.task} onChange={(e) => setBenchmarks((prev) => prev.map((r, idx) => idx === i ? { ...r, task: e.target.value } : r))} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" min="0" step="0.25" className="form-input" style={{ fontSize: 13, width: 90, textAlign: "right" }} value={b.hours || ""} onChange={(e) => setBenchmarks((prev) => prev.map((r, idx) => idx === i ? { ...r, hours: parseFloat(e.target.value) || 0 } : r))} />
                  <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>hours</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: "#ef4444" }} onClick={() => setBenchmarks((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={handleBenchmarksSave} disabled={benchmarksSaving} className="btn btn-primary">
              {benchmarksSaving ? "Saving…" : benchmarksSaved ? "Saved ✓" : "Save Benchmarks"}
            </button>
          </div>
        </div>
      </div>

      {/* Data Snapshots */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Data Snapshots</h2>
            <p className="card-subtitle">Snapshots are collected automatically every night. Run a backfill to seed all historical data immediately — required for Seasonality Intelligence and AI trend analysis. Already-fetched periods are skipped automatically.</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={snapshotMonths} onChange={(e) => setSnapshotMonths(Number(e.target.value))} disabled={snapshotRunning} className="form-input" style={{ width: "auto", fontSize: 13 }}>
              <option value={1}>Latest month only</option>
              <option value={3}>3 months backfill</option>
              <option value={6}>6 months backfill</option>
              <option value={12}>12 months backfill</option>
              <option value={24}>24 months backfill</option>
              <option value={60}>All available (~5 years)</option>
            </select>
            <button onClick={handleRunSnapshots} disabled={snapshotRunning} className="btn btn-primary" style={{ minWidth: 160 }}>
              {snapshotRunning ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Running…
                </span>
              ) : "Run Snapshots Now"}
            </button>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {snapshotMonths === 1 ? "Fetches current month for all clients" : `Fetches up to ${snapshotMonths} months of data per client — skips periods already saved.`}
            </span>
          </div>

          {snapshotError && <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 12 }}>{snapshotError}</p>}

          {snapshotResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { val: snapshotResult.clientsProcessed, label: "clients", color: "var(--text)" },
                  { val: snapshotResult.periodsProcessed, label: "months", color: "var(--text)" },
                  { val: snapshotResult.totalSnapshots, label: "new snapshots", color: "#16a34a" },
                  { val: snapshotResult.totalSkipped, label: "already existed", color: "var(--text-3)" },
                ].map((s) => (
                  <div key={s.label} style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: s.color }}>{s.val}</span>
                    <span style={{ color: "var(--text-3)", marginLeft: 4 }}>{s.label}</span>
                  </div>
                ))}
                {snapshotResult.totalErrors > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: "var(--danger)" }}>{snapshotResult.totalErrors}</span>
                    <span style={{ color: "var(--text-3)", marginLeft: 4 }}>errors</span>
                  </div>
                )}
              </div>
              {snapshotResult.results.filter((r) => r.sections.length > 0 || r.errors.length > 0).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 320, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-sm)" }}>
                  {snapshotResult.results.filter((r) => r.sections.length > 0 || r.errors.length > 0).map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 8, fontSize: 12, padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", alignItems: "start" }}>
                      <span style={{ color: "var(--text-3)", fontFamily: "monospace" }}>{r.period}</span>
                      <span style={{ fontWeight: 500, color: "var(--text)" }}>{r.clientName}</span>
                      <span>
                        {r.sections.length > 0 && <span style={{ color: "#16a34a" }}>{r.sections.join(", ")}</span>}
                        {r.errors.length > 0 && <span style={{ color: "var(--danger)", marginLeft: r.sections.length ? 8 : 0 }}>{r.errors.join("; ")}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Snapshot Inventory</span>
              <button onClick={loadSnapshotInventory} disabled={inventoryLoading} style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {inventoryLoading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>
            {inventoryLoading && !snapshotInventory && <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading…</p>}
            {snapshotInventory && (() => {
              const platformSet = new Set<string>();
              for (const c of snapshotInventory) Object.keys(c.platforms).forEach((p) => platformSet.add(p));
              const platforms = Array.from(platformSet).sort();
              const LABELS: Record<string, string> = { ga4: "GA4", googleads: "G.Ads", meta: "Meta", searchconsole: "Search", seo: "SEO", tiktok: "TikTok", microsoftads: "MS Ads", cwv: "CWV", woocommerce: "WooC.", shopify: "Shopify" };
              return (
                <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-sm)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-subtle, #f9fafb)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>Client</th>
                        {platforms.map((p) => <th key={p} style={{ textAlign: "center", padding: "8px 8px", fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>{LABELS[p] ?? p}</th>)}
                        <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>Total</th>
                        <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>Seasonality</th>
                        <th style={{ padding: "8px 12px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotInventory.map((client, i) => {
                        const ga4Count = client.platforms["ga4"]?.count ?? 0;
                        const seasonalityReady = ga4Count >= 3;
                        return (
                          <tr key={client.clientId} style={{ borderBottom: i < snapshotInventory.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                            <td style={{ padding: "7px 12px", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{client.clientName}</td>
                            {platforms.map((p) => {
                              const entry = client.platforms[p];
                              if (!entry) return <td key={p} style={{ textAlign: "center", padding: "7px 8px", color: "var(--border-muted, #d1d5db)" }}>—</td>;
                              const yyyyMm = (iso: string) => iso.slice(0, 7);
                              const label = entry.earliest === entry.latest.slice(0, 7) + "-01" ? yyyyMm(entry.earliest) : `${yyyyMm(entry.earliest)}–${yyyyMm(entry.latest)}`;
                              return (
                                <td key={p} style={{ textAlign: "center", padding: "7px 8px" }}>
                                  <span title={label} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                    <span style={{ fontWeight: 600, color: "#16a34a" }}>{entry.count}</span>
                                    <span style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>{label}</span>
                                  </span>
                                </td>
                              );
                            })}
                            <td style={{ textAlign: "center", padding: "7px 12px", fontWeight: 600, color: "var(--text)" }}>{client.totalSnapshots > 0 ? client.totalSnapshots : <span style={{ color: "var(--text-3)" }}>0</span>}</td>
                            <td style={{ textAlign: "center", padding: "7px 12px" }}>
                              {seasonalityReady
                                ? <span style={{ color: "#16a34a", fontWeight: 600 }} title={`${ga4Count} GA4 months`}>✓ {ga4Count}mo</span>
                                : <span style={{ color: ga4Count > 0 ? "#d97706" : "var(--text-3)", fontSize: 11 }}>{ga4Count > 0 ? `${ga4Count}/3 mo` : "No GA4"}</span>}
                            </td>
                            <td style={{ padding: "7px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              {rowResult[client.clientId] && (
                                <span style={{ fontSize: 11, marginRight: 6, color: rowResult[client.clientId]!.errors > 0 ? "var(--danger)" : "#16a34a" }}>
                                  {rowResult[client.clientId]!.errors > 0 ? `✗ ${rowResult[client.clientId]!.errors} err` : `+${rowResult[client.clientId]!.snapshots}`}
                                </span>
                              )}
                              <button
                                onClick={() => handleRunClientSnapshot(client.clientId)}
                                disabled={rowRunning[client.clientId] || snapshotRunning}
                                style={{ fontSize: 11, padding: "3px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", cursor: rowRunning[client.clientId] || snapshotRunning ? "not-allowed" : "pointer", opacity: rowRunning[client.clientId] || snapshotRunning ? 0.5 : 1 }}
                              >
                                {rowRunning[client.clientId] ? "…" : "Run"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Default MCC */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Default Manager Account</h2>
            <p className="card-subtitle">Select which MCC is used as the default <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--border-subtle)", padding: "2px 6px", borderRadius: 4 }}>login-customer-id</code> when fetching data.</p>
          </div>
        </div>
        <div className="card-body">
          {mccLoading && <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading accounts…</p>}
          {mccError && <p style={{ fontSize: 13, color: "var(--danger)" }}>{mccError}</p>}
          {!mccLoading && !mccError && (
            <>
              <select value={selectedMcc} onChange={(e) => setSelectedMcc(e.target.value)} className="form-input" style={{ marginBottom: 12 }}>
                <option value="">Select an account</option>
                {managerAccounts.length > 0 && (
                  <optgroup label="Manager accounts (MCC)">{managerAccounts.map((a) => <option key={a.id} value={a.id}>{a.name !== a.id ? `${a.name} (${a.id})` : a.id}</option>)}</optgroup>
                )}
                {standardAccounts.length > 0 && (
                  <optgroup label="Standard accounts">{standardAccounts.map((a) => <option key={a.id} value={a.id}>{a.name !== a.id ? `${a.name} (${a.id})` : a.id}</option>)}</optgroup>
                )}
              </select>
              {currentMcc && (
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
                  Current: <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--border-subtle)", padding: "2px 6px", borderRadius: 4, color: "var(--text-2)" }}>{currentMcc}</code>
                </p>
              )}
              <button onClick={handleMccSave} disabled={mccSaving || selectedMcc === currentMcc || !selectedMcc} className="btn btn-primary">
                {mccSaving ? "Saving…" : mccSaved ? "Saved ✓" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  return (
    <Suspense>
      <SettingsPanelInner />
    </Suspense>
  );
}

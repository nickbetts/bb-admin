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
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Manage global integrations and API configuration</p>
        </div>
      </div>

      {/* OAuth result banner */}
      {banner && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "var(--r-sm)",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            ...(banner.type === "success"
              ? { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }
              : { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }),
          }}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            style={{ marginLeft: 16, opacity: 0.6, fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            ×
          </button>
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
          <a
            href="/api/auth/google-ads"
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M12 11h8v2h-8v8h-2v-8H2v-2h8V3h2v8z" />
            </svg>
            Connect account
          </a>
        </div>

        <div className="card-body">
          {/* Pre-requisite instructions */}
          <div style={{ marginBottom: 24, borderRadius: "var(--r)", border: "1px solid #fcd34d", background: "#fffbeb", overflow: "hidden" }}>
            <button
              onClick={() => setPrereqOpen((o) => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  Getting a &ldquo;This app is blocked&rdquo; error? — two possible fixes
                </span>
              </div>
              <svg
                style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0, transition: "transform 0.2s", transform: prereqOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {prereqOpen && (
              <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #fcd34d", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Cause 1: Testing mode */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#78350f", marginBottom: 6 }}>
                    Fix 1 — Any Google account (most common cause)
                  </p>
                  <p style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>
                    The OAuth app is in <strong>Testing mode</strong>, which blocks all accounts that haven&apos;t been explicitly added as test users. To fix, add the Google account email as a test user in Google Cloud Console:
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                      <span style={{ fontSize: 13, color: "#78350f" }}>Open Google Cloud Console → <strong>APIs &amp; Services → OAuth consent screen</strong></span>
                    </li>
                    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                      <span style={{ fontSize: 13, color: "#78350f" }}>Scroll to <strong>Test users</strong> and click <strong>Add users</strong></span>
                    </li>
                    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                      <span style={{ fontSize: 13, color: "#78350f" }}>Add the email address of the Google account you want to connect, then save</span>
                    </li>
                  </ol>
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d97706", color: "#fff", border: "none", width: "fit-content", marginTop: 10 }}
                  >
                    Open OAuth consent screen
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <div style={{ borderTop: "1px solid #fcd34d" }} />

                {/* Cause 2: Workspace org */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#78350f", marginBottom: 6 }}>
                    Fix 2 — Google Workspace accounts only (e.g. <code style={{ fontFamily: "monospace", fontSize: 11, background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>name@company.com</code>)
                  </p>
                  <p style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>
                    Workspace admins can block third-party OAuth apps for their org. The admin needs to trust this app:
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                      <span style={{ fontSize: 13, color: "#78350f" }}>Google Admin Console → <strong>Security → API Controls → Manage Third-Party App Access</strong></span>
                    </li>
                    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                      <span style={{ fontSize: 13, color: "#78350f" }}>Click <strong>Add app → OAuth App Name Or Client ID</strong>, paste this Client ID and set to <strong>Trusted</strong>:</span>
                    </li>
                  </ol>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #fcd34d", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 8 }}>
                    <code style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: "#374151", wordBreak: "break-all", userSelect: "all" as const }}>
                      960440447654-l1mh1bcondon0eaauab53kt4r8um4d9j.apps.googleusercontent.com
                    </code>
                    <button
                      onClick={copyClientId}
                      style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#78350f" }}
                    >
                      {clientIdCopied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <a
                    href="https://admin.google.com/ac/owl/list?tab=configuredApps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d97706", color: "#fff", border: "none", width: "fit-content", marginTop: 10 }}
                  >
                    Open Google Admin Console
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

              </div>
            )}
          </div>

          {connectionsLoading && <p style={{ fontSize: 13, color: "var(--text-3)", padding: "16px 0" }}>Loading connections…</p>}
          {connectionsError && !connectionsLoading && (
            <p style={{ fontSize: 13, color: "var(--danger)" }}>{connectionsError}</p>
          )}

          {!connectionsLoading && (
            <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {/* Primary account row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <GoogleIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Primary account</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>Configured via environment variable</p>
                </div>
                <span className="badge badge-green">Active</span>
              </div>

              {connections.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--text-3)", padding: "20px 0", textAlign: "center" }}>
                  No additional accounts connected. Click &ldquo;Connect account&rdquo; to add one.
                </p>
              )}

              {connections.map((conn) => (
                <div key={conn.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <GoogleIcon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conn.email}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                      Connected{" "}
                      {new Date(conn.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="badge badge-green">Active</span>
                  <button
                    onClick={() => handleRemoveConnection(conn.id)}
                    disabled={removing === conn.id}
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--danger)", opacity: removing === conn.id ? 0.4 : 1 }}
                  >
                    {removing === conn.id ? "Removing…" : "Disconnect"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Default MCC selector */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Default Manager Account</h2>
            <p className="card-subtitle">
              Select which MCC is used as the default{" "}
              <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--border-subtle)", padding: "2px 6px", borderRadius: 4 }}>login-customer-id</code>{" "}
              when fetching data. All accounts across all connected Google accounts are listed here.
            </p>
          </div>
        </div>
        <div className="card-body">
          {mccLoading && <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading accounts…</p>}
          {mccError && <p style={{ fontSize: 13, color: "var(--danger)" }}>{mccError}</p>}

          {!mccLoading && !mccError && (
            <>
              <select
                value={selectedMcc}
                onChange={(e) => setSelectedMcc(e.target.value)}
                className="form-input"
                style={{ marginBottom: 12 }}
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
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
                  Current:{" "}
                  <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--border-subtle)", padding: "2px 6px", borderRadius: 4, color: "var(--text-2)" }}>
                    {currentMcc}
                  </code>
                </p>
              )}

              <button
                onClick={handleMccSave}
                disabled={mccSaving || selectedMcc === currentMcc || !selectedMcc}
                className="btn btn-primary"
              >
                {mccSaving ? "Saving…" : mccSaved ? "Saved ✓" : "Save"}
              </button>
            </>
          )}
        </div>
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

